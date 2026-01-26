// Edge Function: Send task reminder and overdue emails
// Called by cron job daily

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail, templates } from '../_shared/resend.ts';
import { supabaseAdmin, corsHeaders } from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify authorization (should be called with service role key)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get tasks due tomorrow (for reminders)
    const { data: dueSoonTasks, error: dueSoonError } = await supabaseAdmin
      .from('tm_tasks')
      .select(`
        id,
        title,
        due_date,
        tm_projects (name),
        task_assignees (
          user_id,
          profiles (
            full_name,
            language
          )
        )
      `)
      .eq('due_date', tomorrowStr)
      .neq('status', 'done');

    if (dueSoonError) {
      console.error('Error fetching due soon tasks:', dueSoonError);
    }

    // Get overdue tasks
    const { data: overdueTasks, error: overdueError } = await supabaseAdmin
      .from('tm_tasks')
      .select(`
        id,
        title,
        due_date,
        tm_projects (name),
        task_assignees (
          user_id,
          profiles (
            full_name,
            language
          )
        )
      `)
      .lt('due_date', todayStr)
      .neq('status', 'done');

    if (overdueError) {
      console.error('Error fetching overdue tasks:', overdueError);
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send reminder emails for tasks due tomorrow
    if (dueSoonTasks) {
      for (const task of dueSoonTasks) {
        const assignees = (task.task_assignees as any[]) || [];

        for (const assignee of assignees) {
          try {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(assignee.user_id);
            if (!user?.email) continue;

            const profile = assignee.profiles;
            const emailTemplate = templates.taskReminder(
              profile?.full_name || user.email.split('@')[0],
              task.title,
              (task.tm_projects as any)?.name || 'Unknown Project',
              task.due_date,
              task.id,
              (profile?.language as 'en' | 'lt') || 'en'
            );

            const result = await sendEmail({
              to: user.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            });

            if (result.success) {
              emailsSent.push(`reminder:${user.email}`);
            } else {
              errors.push(`reminder:${user.email}:${result.error}`);
            }
          } catch (e) {
            errors.push(`reminder:${assignee.user_id}:${e.message}`);
          }
        }
      }
    }

    // Send overdue emails
    if (overdueTasks) {
      for (const task of overdueTasks) {
        const assignees = (task.task_assignees as any[]) || [];

        for (const assignee of assignees) {
          try {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(assignee.user_id);
            if (!user?.email) continue;

            const profile = assignee.profiles;
            const emailTemplate = templates.taskOverdue(
              profile?.full_name || user.email.split('@')[0],
              task.title,
              (task.tm_projects as any)?.name || 'Unknown Project',
              task.due_date,
              task.id,
              (profile?.language as 'en' | 'lt') || 'en'
            );

            const result = await sendEmail({
              to: user.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            });

            if (result.success) {
              emailsSent.push(`overdue:${user.email}`);
            } else {
              errors.push(`overdue:${user.email}:${result.error}`);
            }
          } catch (e) {
            errors.push(`overdue:${assignee.user_id}:${e.message}`);
          }
        }
      }
    }

    console.log(`Emails sent: ${emailsSent.length}, Errors: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      emailsSent: emailsSent.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
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
