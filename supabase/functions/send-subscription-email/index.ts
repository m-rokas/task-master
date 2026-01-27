// Edge Function: Send subscription-related emails
// Triggered by database webhook on subscriptions INSERT/UPDATE

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail, templates } from '../_shared/resend.ts';
import { supabaseAdmin, corsHeaders } from '../_shared/supabase.ts';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'EXPIRING';
  table: 'subscriptions';
  record: {
    id: string;
    user_id: string;
    status: string;
    plan_id: string | null;
    current_period_end: string | null;
    canceled_at: string | null;
    days_left?: number;
  };
  old_record?: {
    status: string;
    plan_id: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.table !== 'subscriptions') {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, status, plan_id, current_period_end, canceled_at } = payload.record;
    const oldStatus = payload.old_record?.status;
    const oldPlanId = payload.old_record?.plan_id;

    // Get user info
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userError || !user?.email) {
      console.error('Error fetching user:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for language
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, language')
      .eq('id', user_id)
      .single();

    const userName = profile?.full_name || user.email.split('@')[0];
    const language = (profile?.language as 'en' | 'lt') || 'en';

    // Get plan name
    let planName = 'Pro';
    if (plan_id) {
      const { data: plan } = await supabaseAdmin
        .from('plans')
        .select('name')
        .eq('id', plan_id)
        .single();
      planName = plan?.name || 'Pro';
    }

    // Get old plan name if changed
    let oldPlanName = 'Free';
    if (oldPlanId) {
      const { data: oldPlan } = await supabaseAdmin
        .from('plans')
        .select('name')
        .eq('id', oldPlanId)
        .single();
      oldPlanName = oldPlan?.name || 'Free';
    }

    const endDate = current_period_end
      ? new Date(current_period_end).toLocaleDateString(language === 'lt' ? 'lt-LT' : 'en-US')
      : '';

    let emailTemplate;
    let shouldSend = false;

    const daysLeft = payload.record.days_left || 0;

    // Determine which email to send based on status change
    if (payload.type === 'EXPIRING') {
      // Subscription/Trial expiring soon
      if (status === 'trialing') {
        emailTemplate = templates.trialEndingSoon(userName, planName, daysLeft, endDate, language);
        shouldSend = true;
      } else if (status === 'active') {
        emailTemplate = templates.subscriptionExpiringSoon(userName, planName, daysLeft, endDate, language);
        shouldSend = true;
      }
    } else if (payload.type === 'INSERT') {
      // New subscription
      if (status === 'trialing') {
        // Trial started
        const trialDays = current_period_end
          ? Math.ceil((new Date(current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 14;
        emailTemplate = templates.trialStarted(userName, planName, trialDays, endDate, language);
        shouldSend = true;
      } else if (status === 'active') {
        // Subscription purchased
        emailTemplate = templates.subscriptionPurchased(userName, planName, '', endDate, language);
        shouldSend = true;
      }
    } else if (payload.type === 'UPDATE') {
      // Status changed
      if (oldStatus !== status) {
        if (status === 'canceled' || canceled_at) {
          // Subscription canceled
          emailTemplate = templates.subscriptionCanceled(userName, planName, endDate, language);
          shouldSend = true;
        } else if (status === 'active' && oldStatus === 'trialing') {
          // Trial converted to active subscription
          emailTemplate = templates.subscriptionPurchased(userName, planName, '', endDate, language);
          shouldSend = true;
        } else if (status === 'past_due') {
          // Payment failed - could add a template for this
          console.log('Payment past due for user:', user_id);
        }
      }

      // Plan changed
      if (plan_id !== oldPlanId && oldPlanId && plan_id) {
        emailTemplate = templates.subscriptionChanged(userName, oldPlanName, planName, language);
        shouldSend = true;
      }
    }

    if (!shouldSend || !emailTemplate) {
      return new Response(JSON.stringify({ skipped: 'No email needed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!result.success) {
      console.error('Failed to send subscription email:', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Subscription email sent to ${user.email} for status: ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
