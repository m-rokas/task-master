// Edge Function: Send welcome email after user signup
// Triggered by database webhook on profiles INSERT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail, templates } from '../_shared/resend.ts';
import { supabaseAdmin, corsHeaders } from '../_shared/supabase.ts';

interface WebhookPayload {
  type: 'INSERT';
  table: 'profiles';
  record: {
    id: string;
    full_name: string | null;
    language: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== 'INSERT' || payload.table !== 'profiles') {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id, full_name, language } = payload.record;

    // Get user email from auth.users
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError || !user?.email) {
      console.error('Error fetching user:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send welcome email
    const userName = full_name || user.email.split('@')[0];
    const emailTemplate = templates.welcome(userName, (language as 'en' | 'lt') || 'en');

    const result = await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!result.success) {
      console.error('Failed to send welcome email:', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Welcome email sent to ${user.email}`);

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
