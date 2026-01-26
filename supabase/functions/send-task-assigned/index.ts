// Edge Function: Send email when task is assigned
// Triggered by database webhook on task_assignees INSERT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail, templates } from '../_shared/resend.ts';
import { supabaseAdmin, corsHeaders } from '../_shared/supabase.ts';

interface WebhookPayload {
  type: 'INSERT';
  table: 'task_assignees';
  record: {
    id: string;
    task_id: string;
    user_id: string;
    assigned_by: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== 'INSERT' || payload.table !== 'task_assignees') {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { task_id, user_id, assigned_by } = payload.record;

    // Don't send email if self-assigning
    if (user_id === assigned_by) {
      return new Response(JSON.stringify({ skipped: 'self-assignment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get task and project info
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tm_tasks')
      .select(`
        id,
        title,
        tm_projects (
          id,
          name
        )
      `)
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      console.error('Error fetching task:', taskError);
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get assignee info
    const { data: assignee, error: assigneeError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, language')
      .eq('id', user_id)
      .single();

    if (assigneeError || !assignee) {
      console.error('Error fetching assignee:', assigneeError);
      return new Response(JSON.stringify({ error: 'Assignee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get assignee email
    const { data: assigneeUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (!assigneeUser?.email) {
      return new Response(JSON.stringify({ error: 'Assignee email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get assigner name
    let assignerName = 'Someone';
    if (assigned_by) {
      const { data: assigner } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', assigned_by)
        .single();
      assignerName = assigner?.full_name || 'Someone';
    }

    // Send email
    const emailTemplate = templates.taskAssigned(
      assignee.full_name || assigneeUser.email.split('@')[0],
      task.title,
      (task.tm_projects as any)?.name || 'Unknown Project',
      assignerName,
      task_id,
      (assignee.language as 'en' | 'lt') || 'en'
    );

    const result = await sendEmail({
      to: assigneeUser.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (!result.success) {
      console.error('Failed to send task assigned email:', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Task assigned email sent to ${assigneeUser.email}`);

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
