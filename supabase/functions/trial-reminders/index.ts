// Supabase Edge Function: trial-reminders
// Sends reminder emails for trials expiring soon (3 days, 1 day before)
// Should be called via cron job (daily)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, templates } from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find trials expiring in 1 day
    const { data: expiringIn1Day } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, current_period_end,
        plans!inner(name),
        profiles!inner(full_name, language)
      `)
      .eq('status', 'trialing')
      .is('stripe_subscription_id', null)
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', oneDayFromNow.toISOString());

    // Find trials expiring in 3 days (but not within 1 day)
    const { data: expiringIn3Days } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, current_period_end,
        plans!inner(name),
        profiles!inner(full_name, language)
      `)
      .eq('status', 'trialing')
      .is('stripe_subscription_id', null)
      .gt('current_period_end', oneDayFromNow.toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString());

    const sentEmails: string[] = [];
    const errors: string[] = [];

    // Process 1-day reminders
    for (const trial of expiringIn1Day || []) {
      try {
        const profile = trial.profiles as any;
        const planName = (trial.plans as any)?.name || 'Premium';
        const userName = profile?.full_name || 'User';
        const language = profile?.language || 'en';
        const endDate = new Date(trial.current_period_end).toLocaleDateString(
          language === 'lt' ? 'lt-LT' : 'en-US'
        );

        const { data: authUser } = await supabase.auth.admin.getUserById(trial.user_id);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          const emailTemplate = templates.trialEndingSoon(userName, planName, 1, endDate, language);
          await sendEmail({
            to: userEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
          sentEmails.push(`${userEmail} (1 day)`);

          // Create notification
          await supabase.from('tm_notifications').insert({
            user_id: trial.user_id,
            type: 'system',
            title: language === 'lt' ? 'Bandomasis laikotarpis baigiasi rytoj!' : 'Trial ending tomorrow!',
            body: language === 'lt'
              ? `Jūsų ${planName} bandomasis laikotarpis baigiasi rytoj. Prenumeruokite dabar!`
              : `Your ${planName} trial ends tomorrow. Subscribe now to keep your premium features!`,
            data: { days_left: 1 },
          });
        }
      } catch (err) {
        errors.push(`1-day reminder error for ${trial.user_id}: ${err.message}`);
      }
    }

    // Process 3-day reminders
    for (const trial of expiringIn3Days || []) {
      try {
        const profile = trial.profiles as any;
        const planName = (trial.plans as any)?.name || 'Premium';
        const userName = profile?.full_name || 'User';
        const language = profile?.language || 'en';
        const endDate = new Date(trial.current_period_end).toLocaleDateString(
          language === 'lt' ? 'lt-LT' : 'en-US'
        );

        const { data: authUser } = await supabase.auth.admin.getUserById(trial.user_id);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          const emailTemplate = templates.trialEndingSoon(userName, planName, 3, endDate, language);
          await sendEmail({
            to: userEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
          sentEmails.push(`${userEmail} (3 days)`);

          // Create notification
          await supabase.from('tm_notifications').insert({
            user_id: trial.user_id,
            type: 'system',
            title: language === 'lt' ? 'Bandomasis laikotarpis baigiasi po 3 dienų' : 'Trial ending in 3 days',
            body: language === 'lt'
              ? `Jūsų ${planName} bandomasis laikotarpis baigiasi po 3 dienų.`
              : `Your ${planName} trial ends in 3 days.`,
            data: { days_left: 3 },
          });
        }
      } catch (err) {
        errors.push(`3-day reminder error for ${trial.user_id}: ${err.message}`);
      }
    }

    console.log(`Trial reminders sent: ${sentEmails.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: sentEmails.length,
        emails: sentEmails,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('trial-reminders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
