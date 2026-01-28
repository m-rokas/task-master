// Supabase Edge Function: expire-trials
// Expires trial subscriptions and downgrades users to free plan
// Should be called via cron job (daily)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, templates } from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ExpiredTrial {
  user_id: string;
  plan_name: string;
  user_email: string;
  user_name: string;
  language: 'en' | 'lt';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret or service role
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    // Allow if cron secret matches OR if using service role key
    const isAuthorized =
      (expectedSecret && cronSecret === expectedSecret) ||
      (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''));

    if (!isAuthorized) {
      console.log('Unauthorized request to expire-trials');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get free plan ID
    const { data: freePlan, error: freePlanError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'free')
      .single();

    if (freePlanError || !freePlan) {
      throw new Error('Free plan not found');
    }

    // Find expired trials (not Stripe-managed)
    const { data: expiredTrials, error: trialsError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        plans!inner(name),
        profiles!inner(id, full_name, language)
      `)
      .eq('status', 'trialing')
      .lt('current_period_end', new Date().toISOString())
      .is('stripe_subscription_id', null);

    if (trialsError) {
      throw trialsError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired trials found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ExpiredTrial[] = [];
    const errors: string[] = [];

    // Process each expired trial
    for (const trial of expiredTrials) {
      try {
        const planName = (trial.plans as any)?.name || 'Unknown';
        const profile = trial.profiles as any;
        const userId = trial.user_id;

        // Update subscription status
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_id: freePlan.id,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', trial.id);

        if (subError) {
          errors.push(`Failed to update subscription ${trial.id}: ${subError.message}`);
          continue;
        }

        // Update profile to free plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan_id: freePlan.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          errors.push(`Failed to update profile ${userId}: ${profileError.message}`);
          continue;
        }

        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;
        const userName = profile?.full_name || 'User';
        const language = profile?.language || 'en';

        // Send trial ended email
        if (userEmail) {
          const emailTemplate = templates.trialEnded(userName, planName, language);
          await sendEmail({
            to: userEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
        }

        results.push({
          user_id: userId,
          plan_name: planName,
          user_email: userEmail || 'unknown',
          user_name: userName,
          language,
        });

        // Create notification
        await supabase.from('tm_notifications').insert({
          user_id: userId,
          type: 'system',
          title: language === 'lt' ? 'Bandomasis laikotarpis baigesi' : 'Trial Period Ended',
          body: language === 'lt'
            ? 'Jūsų bandomasis laikotarpis baigėsi. Dabar naudojate nemokamą planą.'
            : 'Your trial period has ended. You are now on the free plan.',
          data: { plan_name: planName },
        });

      } catch (err) {
        errors.push(`Error processing trial ${trial.id}: ${err.message}`);
      }
    }

    // Log results
    console.log(`Expired trials processed: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: results.length,
        expired_trials: results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('expire-trials error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
