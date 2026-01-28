// Supabase Edge Function: subscription-reminders
// Sends reminder emails for subscriptions expiring soon (3 days, 1 day before)
// Works for BOTH trials AND paid plans
// Should be called via cron job (daily)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Inline email sending
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return;
  }
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'TaskMaster <noreply@taskmaster.app>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });
  if (!response.ok) {
    console.error('Failed to send email:', await response.text());
  }
}

function getExpiringEmail(
  userName: string,
  planName: string,
  daysLeft: number,
  endDate: string,
  isTrial: boolean,
  hasPaymentMethod: boolean,
  language: 'en' | 'lt'
) {
  const content = language === 'lt' ? {
    subject: isTrial
      ? `Bandomasis laikotarpis baigiasi po ${daysLeft} d.!`
      : `Prenumerata baigiasi po ${daysLeft} d.`,
    heading: `Sveiki, ${userName}`,
    body: hasPaymentMethod
      ? `Jūsų ${planName} ${isTrial ? 'bandomasis laikotarpis' : 'prenumerata'} baigiasi ${endDate}. Mokėjimas bus automatiškai nuskaitytas.`
      : `Jūsų ${planName} ${isTrial ? 'bandomasis laikotarpis' : 'prenumerata'} baigiasi ${endDate}. Pridėkite mokėjimo būdą, kad išvengtumėte perėjimo į nemokamą planą.`,
    cta: hasPaymentMethod ? 'Peržiūrėti prenumeratą' : 'Pridėti mokėjimo būdą',
    note: hasPaymentMethod ? '💳 Kortelė prijungta - bus automatiškai pratęsta' : '⚠️ Nėra kortelės - būsite perkelti į nemokamą planą',
  } : {
    subject: isTrial
      ? `Trial ending in ${daysLeft} days!`
      : `Subscription expires in ${daysLeft} days`,
    heading: `Hi ${userName}`,
    body: hasPaymentMethod
      ? `Your ${planName} ${isTrial ? 'trial' : 'subscription'} expires on ${endDate}. Payment will be automatically charged.`
      : `Your ${planName} ${isTrial ? 'trial' : 'subscription'} expires on ${endDate}. Add a payment method to avoid being moved to the free plan.`,
    cta: hasPaymentMethod ? 'View Subscription' : 'Add Payment Method',
    note: hasPaymentMethod ? '💳 Card on file - will auto-renew' : '⚠️ No card - will be downgraded to free',
  };

  const urgencyColor = daysLeft <= 1 ? '#ef4444' : '#f59e0b';

  return {
    subject: content.subject,
    html: `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
        <h1 style="color: #6366f1; font-size: 28px; margin: 0 0 32px; text-align: center;">TaskMaster</h1>
        <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
        <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
        <div style="background: ${urgencyColor}20; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid ${urgencyColor};">
          <p style="color: ${urgencyColor}; font-weight: 600; margin: 0 0 8px;">${daysLeft} ${language === 'lt' ? (daysLeft === 1 ? 'diena liko' : 'dienos liko') : (daysLeft === 1 ? 'day left' : 'days left')}</p>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${content.note}</p>
        </div>
        <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing" style="display: inline-block; background: ${urgencyColor}; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${content.cta}</a>
      </div>
    </body></html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    const isAuthorized =
      (expectedSecret && cronSecret === expectedSecret) ||
      (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''));

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find ALL subscriptions (trials AND paid) expiring in 1 day
    const { data: expiringIn1Day } = await supabase
      .from('subscriptions')
      .select(`id, user_id, status, current_period_end, stripe_customer_id, plans!inner(name, display_name), profiles!inner(full_name, language)`)
      .in('status', ['trialing', 'active'])
      .is('stripe_subscription_id', null)
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', oneDayFromNow.toISOString());

    // Find ALL subscriptions expiring in 3 days (but not within 1 day)
    const { data: expiringIn3Days } = await supabase
      .from('subscriptions')
      .select(`id, user_id, status, current_period_end, stripe_customer_id, plans!inner(name, display_name), profiles!inner(full_name, language)`)
      .in('status', ['trialing', 'active'])
      .is('stripe_subscription_id', null)
      .gt('current_period_end', oneDayFromNow.toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString());

    const sentEmails: string[] = [];
    const errors: string[] = [];

    // Process 1-day reminders
    for (const sub of expiringIn1Day || []) {
      try {
        const profile = sub.profiles as any;
        const plan = sub.plans as any;
        const planName = plan?.display_name || plan?.name || 'Premium';
        const userName = profile?.full_name || 'User';
        const language = profile?.language || 'en';
        const isTrial = sub.status === 'trialing';
        const hasPaymentMethod = !!sub.stripe_customer_id;
        const endDate = new Date(sub.current_period_end).toLocaleDateString(language === 'lt' ? 'lt-LT' : 'en-US');

        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          const emailTemplate = getExpiringEmail(userName, planName, 1, endDate, isTrial, hasPaymentMethod, language);
          await sendEmail(userEmail, emailTemplate.subject, emailTemplate.html);
          sentEmails.push(`${userEmail} (1 day, ${isTrial ? 'trial' : 'paid'})`);

          // Create notification
          await supabase.from('tm_notifications').insert({
            user_id: sub.user_id,
            type: 'system',
            title: language === 'lt'
              ? (isTrial ? 'Bandomasis laikotarpis baigiasi rytoj!' : 'Prenumerata baigiasi rytoj!')
              : (isTrial ? 'Trial ending tomorrow!' : 'Subscription ending tomorrow!'),
            body: hasPaymentMethod
              ? (language === 'lt' ? 'Mokėjimas bus automatiškai nuskaitytas.' : 'Payment will be automatically charged.')
              : (language === 'lt' ? 'Pridėkite mokėjimo būdą!' : 'Add a payment method!'),
            data: { days_left: 1, is_trial: isTrial, has_payment_method: hasPaymentMethod },
          });
        }
      } catch (err: any) {
        errors.push(`1-day reminder error for ${sub.user_id}: ${err.message}`);
      }
    }

    // Process 3-day reminders
    for (const sub of expiringIn3Days || []) {
      try {
        const profile = sub.profiles as any;
        const plan = sub.plans as any;
        const planName = plan?.display_name || plan?.name || 'Premium';
        const userName = profile?.full_name || 'User';
        const language = profile?.language || 'en';
        const isTrial = sub.status === 'trialing';
        const hasPaymentMethod = !!sub.stripe_customer_id;
        const endDate = new Date(sub.current_period_end).toLocaleDateString(language === 'lt' ? 'lt-LT' : 'en-US');

        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          const emailTemplate = getExpiringEmail(userName, planName, 3, endDate, isTrial, hasPaymentMethod, language);
          await sendEmail(userEmail, emailTemplate.subject, emailTemplate.html);
          sentEmails.push(`${userEmail} (3 days, ${isTrial ? 'trial' : 'paid'})`);

          // Create notification
          await supabase.from('tm_notifications').insert({
            user_id: sub.user_id,
            type: 'system',
            title: language === 'lt'
              ? (isTrial ? 'Bandomasis laikotarpis baigiasi po 3 dienų' : 'Prenumerata baigiasi po 3 dienų')
              : (isTrial ? 'Trial ending in 3 days' : 'Subscription ending in 3 days'),
            body: hasPaymentMethod
              ? (language === 'lt' ? 'Mokėjimas bus automatiškai nuskaitytas.' : 'Payment will be automatically charged.')
              : (language === 'lt' ? 'Pridėkite mokėjimo būdą.' : 'Add a payment method.'),
            data: { days_left: 3, is_trial: isTrial, has_payment_method: hasPaymentMethod },
          });
        }
      } catch (err: any) {
        errors.push(`3-day reminder error for ${sub.user_id}: ${err.message}`);
      }
    }

    console.log(`Subscription reminders sent: ${sentEmails.length}, Errors: ${errors.length}`);

    return new Response(JSON.stringify({ success: true, reminders_sent: sentEmails.length, emails: sentEmails, errors: errors.length > 0 ? errors : undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('subscription-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
