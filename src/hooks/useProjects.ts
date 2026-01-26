import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project, ProjectWithRelations } from '@/types/database';

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_projects')
        .select(`
          *,
          project_members (
            id,
            user_id,
            role,
            profiles!project_members_user_id_fkey (id, full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectWithRelations[];
    },
    enabled: !!user,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await supabase
        .from('tm_projects')
        .select(`
          *,
          project_members (
            id,
            user_id,
            role,
            profiles!project_members_user_id_fkey (id, full_name, avatar_url, role)
          ),
          task_labels (*)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as ProjectWithRelations;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (project: {
      name: string;
      description?: string | null;
      color?: string;
      is_personal?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tm_projects')
        .insert({
          name: project.name,
          description: project.description ?? null,
          color: project.color ?? '#6366f1',
          is_personal: project.is_personal ?? true,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as project member (in case database trigger doesn't exist)
      await supabase
        .from('project_members')
        .upsert({
          project_id: data.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id,user_id',
        });

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        name?: string;
        description?: string | null;
        color?: string;
        is_personal?: boolean;
      };
    }) => {
      const { data, error } = await supabase
        .from('tm_projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('tm_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
