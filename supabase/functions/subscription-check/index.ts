// Supabase Edge Function: subscription-check
// Checks expired subscriptions, charges if card on file, or downgrades to free
// Should be called via cron job (daily)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ProcessedSubscription {
  user_id: string;
  action: 'charged' | 'downgraded' | 'reminder_sent';
  plan_name: string;
  user_email: string | null;
  details?: string;
}

// Inline email sending (since _shared modules need special handling)
async function sendEmailNotification(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return;
  }

  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@taskmaster.app';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send email:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    const isAuthorized =
      (expectedSecret && cronSecret === expectedSecret) ||
      (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''));

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' }) : null;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get free plan ID
    const { data: freePlan, error: freePlanError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .single();

    if (freePlanError || !freePlan) {
      throw new Error('Free plan not found');
    }

    // Find expired paid subscriptions (active status, past end date, no stripe_subscription_id)
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        status,
        current_period_end,
        stripe_customer_id,
        plans!inner(name, display_name, stripe_price_monthly),
        profiles!inner(id, full_name, language, stripe_customer_id)
      `)
      .in('status', ['active', 'trialing'])
      .lt('current_period_end', now.toISOString())
      .is('stripe_subscription_id', null);

    if (expiredError) {
      throw expiredError;
    }

    const results: ProcessedSubscription[] = [];
    const errors: string[] = [];

    // Process each expired subscription
    for (const sub of expiredSubscriptions || []) {
      try {
        const profile = sub.profiles as any;
        const plan = sub.plans as any;
        const userId = sub.user_id;
        const planName = plan?.display_name || plan?.name || 'Unknown';
        const stripePriceId = plan?.stripe_price_monthly;
        const stripeCustomerId = sub.stripe_customer_id || profile?.stripe_customer_id;
        const language = profile?.language || 'en';

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;

        // Check if user has a payment method (stripe_customer_id)
        if (stripe && stripeCustomerId && stripePriceId) {
          // Try to create a new subscription and charge
          try {
            const stripeSubscription = await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: stripePriceId }],
              payment_behavior: 'error_if_incomplete',
              expand: ['latest_invoice.payment_intent'],
            });

            // Success! Update subscription with new Stripe subscription
            const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

            await supabase
              .from('subscriptions')
              .update({
                stripe_subscription_id: stripeSubscription.id,
                status: 'active',
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.id);

            results.push({
              user_id: userId,
              action: 'charged',
              plan_name: planName,
              user_email: userEmail || null,
              details: `Charged via Stripe subscription ${stripeSubscription.id}`,
            });

            // Send success email
            if (userEmail) {
              const subject = language === 'lt'
                ? 'Jūsų prenumerata pratęsta'
                : 'Your subscription has been renewed';
              const html = language === 'lt'
                ? `<p>Sveiki,</p><p>Jūsų ${planName} prenumerata buvo automatiškai pratęsta.</p>`
                : `<p>Hello,</p><p>Your ${planName} subscription has been automatically renewed.</p>`;
              await sendEmailNotification(userEmail, subject, html);
            }

            continue;
          } catch (stripeError: any) {
            // Charge failed, will downgrade below
            console.log(`Stripe charge failed for user ${userId}: ${stripeError.message}`);
            errors.push(`Stripe charge failed for ${userId}: ${stripeError.message}`);
          }
        }

        // No payment method or charge failed - downgrade to free
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_id: freePlan.id,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        await supabase
          .from('profiles')
          .update({
            plan_id: freePlan.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        results.push({
          user_id: userId,
          action: 'downgraded',
          plan_name: planName,
          user_email: userEmail || null,
          details: stripeCustomerId ? 'Payment failed' : 'No payment method',
        });

        // Create notification
        await supabase.from('tm_notifications').insert({
          user_id: userId,
          type: 'system',
          title: language === 'lt' ? 'Prenumerata baigėsi' : 'Subscription Expired',
          body: language === 'lt'
            ? `Jūsų ${planName} prenumerata baigėsi. Dabar naudojate nemokamą planą.`
            : `Your ${planName} subscription has expired. You are now on the free plan.`,
          data: { plan_name: planName },
        });

        // Send downgrade email
        if (userEmail) {
          const subject = language === 'lt'
            ? 'Jūsų prenumerata baigėsi'
            : 'Your subscription has expired';
          const html = language === 'lt'
            ? `<p>Sveiki,</p><p>Jūsų ${planName} prenumerata baigėsi ir buvote perkeltas į nemokamą planą.</p>`
            : `<p>Hello,</p><p>Your ${planName} subscription has expired. You have been moved to the free plan.</p>`;
          await sendEmailNotification(userEmail, subject, html);
        }

      } catch (err: any) {
        errors.push(`Error processing subscription ${sub.id}: ${err.message}`);
      }
    }

    // Send reminders for subscriptions expiring soon (3-7 days)
    const { data: expiringSoon } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        current_period_end,
        stripe_customer_id,
        plans!inner(name, display_name),
        profiles!inner(full_name, language)
      `)
      .eq('status', 'active')
      .is('stripe_subscription_id', null)
      .gt('current_period_end', now.toISOString())
      .lte('current_period_end', sevenDaysFromNow.toISOString());

    for (const sub of expiringSoon || []) {
      try {
        const profile = sub.profiles as any;
        const plan = sub.plans as any;
        const language = profile?.language || 'en';
        const planName = plan?.display_name || plan?.name || 'Unknown';
        const hasPaymentMethod = !!sub.stripe_customer_id;
        const daysLeft = Math.ceil(
          (new Date(sub.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id);
        const userEmail = authUser?.user?.email;

        // Create reminder notification
        await supabase.from('tm_notifications').insert({
          user_id: sub.user_id,
          type: 'system',
          title: language === 'lt'
            ? `Prenumerata baigiasi po ${daysLeft} d.`
            : `Subscription expires in ${daysLeft} days`,
          body: hasPaymentMethod
            ? (language === 'lt'
                ? `Jūsų ${planName} prenumerata bus automatiškai pratęsta.`
                : `Your ${planName} subscription will be automatically renewed.`)
            : (language === 'lt'
                ? `Pridėkite mokėjimo būdą, kad išvengtumėte perėjimo į nemokamą planą.`
                : `Add a payment method to avoid being moved to the free plan.`),
          data: { days_left: daysLeft, has_payment_method: hasPaymentMethod },
        });

        results.push({
          user_id: sub.user_id,
          action: 'reminder_sent',
          plan_name: planName,
          user_email: userEmail || null,
          details: `${daysLeft} days left, ${hasPaymentMethod ? 'will auto-renew' : 'no payment method'}`,
        });
      } catch (err: any) {
        errors.push(`Reminder error for ${sub.user_id}: ${err.message}`);
      }
    }

    console.log(`Subscription check: ${results.length} processed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('subscription-check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
