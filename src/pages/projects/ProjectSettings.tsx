import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Loader2,
  Settings,
  Users,
  Trash2,
  X,
  UserPlus,
  Crown,
  Eye,
  Edit3,
  MoreVertical,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

interface ProjectMember {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const roleConfig: Record<MemberRole, { label: string; icon: typeof Crown; color: string; description: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'text-yellow-500', description: 'Full control, can delete project' },
  admin: { label: 'Admin', icon: Settings, color: 'text-purple-500', description: 'Can manage members and settings' },
  member: { label: 'Member', icon: Edit3, color: 'text-blue-500', description: 'Can create and edit tasks' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-zinc-500', description: 'Can only view project' },
};

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'permissions'>('general');

  // Handle tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'members' || tabParam === 'permissions' || tabParam === 'general') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch current user's role in this project
  const { data: currentUserMembership } = useQuery({
    queryKey: ['project-membership', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch role permissions (only for owners)
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['project-role-permissions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_role_permissions')
        .select('*')
        .eq('project_id', id)
        .in('role', ['admin', 'member', 'viewer']);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Update role permission
  const updateRolePermission = useMutation({
    mutationFn: async ({ role, field, value }: { role: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from('project_role_permissions')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('project_id', id)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-role-permissions', id] });
    },
  });

  // Fetch project members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['project-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!project_members_user_id_fkey (id, full_name, avatar_url)
        `)
        .eq('project_id', id)
        .order('role', { ascending: true });

      if (error) throw error;

      // Transform data to flatten profiles
      return (data || []).map((member: any) => ({
        ...member,
        profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
      })) as ProjectMember[];
    },
    enabled: !!id,
  });

  // Update project
  const updateProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_projects')
        .update({
          name: projectName,
          description: projectDescription || null,
          color: projectColor,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setEditingProject(false);
    },
  });

  // Delete project
  const deleteProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tm_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate('/projects');
    },
  });

  // Invite member
  const inviteMember = useMutation({
    mutationFn: async () => {
      // First find user by email
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${inviteEmail}%`)
        .limit(1)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User not found. They must have an account first.');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', userProfile.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this project.');
      }

      // Add member
      const { error } = await supabase.from('project_members').insert({
        project_id: id,
        user_id: userProfile.id,
        role: inviteRole,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', id] });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    },
  });

  // Change member role
  const changeMemberRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: MemberRole }) => {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', id] });
      setActionMenuOpen(null);
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', id] });
    },
  });

  const canManageMembers = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
  const isOwner = currentUserMembership?.role === 'owner';

  const startEditingProject = () => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description || '');
      setProjectColor(project.color);
      setEditingProject(true);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Project not found</p>
        <Link to="/projects" className="text-primary hover:text-primary/80 mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/projects/${id}`}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: project.color }} />
          <div>
            <h1 className="text-2xl font-bold text-white">Project Settings</h1>
            <p className="text-zinc-400 text-sm">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'pb-3 px-1 text-sm font-medium transition-colors border-b-2',
            activeTab === 'general'
              ? 'text-white border-primary'
              : 'text-zinc-400 hover:text-white border-transparent'
          )}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </div>
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'pb-3 px-1 text-sm font-medium transition-colors border-b-2',
            activeTab === 'members'
              ? 'text-white border-primary'
              : 'text-zinc-400 hover:text-white border-transparent'
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members?.length || 0})
          </div>
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('permissions')}
            className={cn(
              'pb-3 px-1 text-sm font-medium transition-colors border-b-2',
              activeTab === 'permissions'
                ? 'text-white border-primary'
                : 'text-zinc-400 hover:text-white border-transparent'
            )}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </div>
          </button>
        )}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Project Details</h2>

            {editingProject ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={projectColor}
                    onChange={(e) => setProjectColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateProject.mutate()}
                    disabled={updateProject.isPending || !projectName.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updateProject.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditingProject(false)}
                    className="px-4 py-2 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: project.color }} />
                  <div>
                    <p className="text-white font-medium">{project.name}</p>
                    <p className="text-sm text-zinc-400">{project.description || 'No description'}</p>
                  </div>
                </div>
                {(isOwner || canManageMembers) && (
                  <button
                    onClick={startEditingProject}
                    className="px-4 py-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="bg-zinc-900 border border-red-900/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h2>
              <p className="text-zinc-400 text-sm mb-4">
                Once you delete a project, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                    deleteProject.mutate();
                  }
                }}
                disabled={deleteProject.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg font-medium hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Add Member Button */}
          {canManageMembers && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {/* Owner Section */}
                {members?.filter(m => m.role === 'owner').map((member) => {
                  const role = roleConfig[member.role as MemberRole] || roleConfig.member;
                  const RoleIcon = role.icon;
                  const isCurrentUser = member.user_id === user?.id;

                  return (
                    <div key={member.id} className="p-4 bg-yellow-500/5 border-b border-yellow-500/20">
                      <div className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mb-3">
                        Project Owner
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center overflow-hidden">
                            {member.profiles?.avatar_url ? (
                              <img
                                src={member.profiles.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-yellow-500 font-medium">
                                {member.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {member.profiles?.full_name || 'Unknown'}
                              {isCurrentUser && <span className="text-zinc-500 text-sm ml-2">(You)</span>}
                            </p>
                            <p className="text-sm text-zinc-500">Full project control</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-yellow-500">
                          <RoleIcon className="h-4 w-4" />
                          {role.label}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Team Members Section Header */}
                {members && members.filter(m => m.role !== 'owner').length > 0 && (
                  <div className="px-4 py-2 bg-zinc-800/50">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                      Team Members ({members.filter(m => m.role !== 'owner').length})
                    </span>
                  </div>
                )}

                {/* Other Members */}
                {members?.filter(m => m.role !== 'owner').map((member) => {
                  const role = roleConfig[member.role as MemberRole] || roleConfig.member;
                  const RoleIcon = role.icon;
                  const isCurrentUser = member.user_id === user?.id;
                  const canModify = canManageMembers && !isCurrentUser && member.role !== 'owner';

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {member.profiles?.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {member.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {member.profiles?.full_name || 'Unknown'}
                            {isCurrentUser && <span className="text-zinc-500 text-sm ml-2">(You)</span>}
                          </p>
                          <p className="text-sm text-zinc-500">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={cn('flex items-center gap-1.5 text-sm', role.color)}>
                          <RoleIcon className="h-4 w-4" />
                          {role.label}
                        </div>

                        {canModify && (
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {actionMenuOpen === member.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1">
                                <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase">
                                  Change Role
                                </div>
                                {(['admin', 'member', 'viewer'] as MemberRole[]).map((newRole) => (
                                  <button
                                    key={newRole}
                                    onClick={() => changeMemberRole.mutate({ memberId: member.id, newRole })}
                                    className={cn(
                                      'w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2',
                                      member.role === newRole && 'bg-zinc-700'
                                    )}
                                  >
                                    {React.createElement(roleConfig[newRole].icon, {
                                      className: cn('h-4 w-4', roleConfig[newRole].color),
                                    })}
                                    <span className="text-white">{roleConfig[newRole].label}</span>
                                  </button>
                                ))}
                                <div className="border-t border-zinc-700 my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm('Remove this member from the project?')) {
                                      removeMember.mutate(member.id);
                                    }
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role Legend */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Role Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(roleConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <Icon className={cn('h-4 w-4 mt-0.5', config.color)} />
                    <div>
                      <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
                      <p className="text-xs text-zinc-500">{config.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {isOwner && (
              <p className="text-xs text-zinc-500 mt-3">
                Go to <button onClick={() => setActiveTab('permissions')} className="text-primary hover:underline">Permissions</button> tab to customize what each role can do.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Permissions Tab - Only for Owner */}
      {activeTab === 'permissions' && isOwner && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Role Permissions</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Customize what each role can do in this project. Owner always has full permissions.
            </p>

            {permissionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                {['admin', 'member', 'viewer'].map((role) => {
                  const roleData = rolePermissions?.find((p) => p.role === role);
                  const config = roleConfig[role as MemberRole];
                  const Icon = config?.icon || Settings;

                  const permissionFields = [
                    { key: 'can_manage_tasks', label: 'Manage Tasks', description: 'Create, edit, delete tasks' },
                    { key: 'can_assign_tasks', label: 'Assign Tasks', description: 'Assign tasks to members' },
                    { key: 'can_comment', label: 'Comment', description: 'Add comments to tasks' },
                    { key: 'can_manage_labels', label: 'Manage Labels', description: 'Create and edit labels' },
                    { key: 'can_upload_files', label: 'Upload Files', description: 'Attach files to tasks' },
                    { key: 'can_invite_members', label: 'Invite Members', description: 'Add new members' },
                    { key: 'can_remove_members', label: 'Remove Members', description: 'Remove existing members' },
                    { key: 'can_change_roles', label: 'Change Roles', description: 'Change member roles' },
                    { key: 'can_edit_project', label: 'Edit Project', description: 'Edit project details' },
                    { key: 'can_view_time_entries', label: 'View Time Entries', description: 'See time tracking data' },
                  ];

                  return (
                    <div key={role} className="border-b border-zinc-800 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon className={cn('h-5 w-5', config?.color)} />
                        <h3 className={cn('text-lg font-semibold', config?.color)}>{config?.label}</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {permissionFields.map((field) => (
                          <label
                            key={field.key}
                            className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800"
                          >
                            <input
                              type="checkbox"
                              checked={roleData?.[field.key as keyof typeof roleData] as boolean || false}
                              onChange={(e) => updateRolePermission.mutate({
                                role,
                                field: field.key,
                                value: e.target.checked,
                              })}
                              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-primary focus:ring-primary focus:ring-offset-zinc-900"
                            />
                            <div>
                              <p className="text-sm font-medium text-white">{field.label}</p>
                              <p className="text-xs text-zinc-500">{field.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Search by name
                </label>
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter user name..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="admin">Admin - Can manage members and settings</option>
                  <option value="member">Member - Can create and edit tasks</option>
                  <option value="viewer">Viewer - Can only view project</option>
                </select>
              </div>

              {inviteMember.error && (
                <p className="text-red-500 text-sm">{(inviteMember.error as Error).message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteMember.mutate()}
                disabled={!inviteEmail.trim() || inviteMember.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {inviteMember.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
