import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskWithRelations, TaskStatus } from '@/types/database';

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await supabase
        .from('tm_tasks')
        .select(`
          *,
          task_assignees (
            id,
            user_id,
            profiles!task_assignees_user_id_fkey (id, full_name, avatar_url)
          ),
          task_label_assignments (
            label_id,
            task_labels (id, name, color)
          )
        `)
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!projectId,
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID required');

      const { data, error } = await supabase
        .from('tm_tasks')
        .select(`
          *,
          tm_projects (id, name, color),
          task_assignees (
            id,
            user_id,
            profiles!task_assignees_user_id_fkey (id, full_name, avatar_url)
          ),
          task_comments (
            id,
            content,
            mentions,
            is_edited,
            created_at,
            user_id,
            profiles (id, full_name, avatar_url)
          ),
          task_attachments (*),
          task_label_assignments (
            label_id,
            task_labels (id, name, color)
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as TaskWithRelations;
    },
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: {
      project_id: string;
      title: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: 'urgent' | 'high' | 'medium' | 'low';
      due_date?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tm_tasks')
        .insert({
          project_id: task.project_id,
          title: task.title,
          description: task.description ?? null,
          status: task.status ?? 'todo',
          priority: task.priority ?? 'medium',
          due_date: task.due_date ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        title?: string;
        description?: string | null;
        status?: TaskStatus;
        priority?: 'urgent' | 'high' | 'medium' | 'low';
        due_date?: string | null;
        position?: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('tm_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      position,
    }: {
      taskId: string;
      status: TaskStatus;
      position?: number;
    }) => {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (position !== undefined) {
        updates.position = position;
      }

      const { data, error } = await supabase
        .from('tm_tasks')
        .update(updates as any)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const { error } = await supabase
        .from('tm_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
      projectId,
    }: {
      taskId: string;
      userId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user?.id,
        });

      if (error) throw error;
      return { taskId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
    },
  });
}

export function useUnassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
      projectId,
    }: {
      taskId: string;
      userId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      return { taskId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
    },
  });
}
