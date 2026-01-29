import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Search,
  Calendar,
  FolderKanban,
  Loader2,
  Crown,
  User,
  MoreVertical,
  UserMinus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectMember {
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  tm_projects: {
    id: string;
    name: string;
    color: string;
  };
}

const roleColors: Record<string, string> = {
  owner: 'bg-yellow-500/20 text-yellow-500',
  admin: 'bg-blue-500/20 text-blue-500',
  member: 'bg-zinc-500/20 text-zinc-400',
};

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [manageUser, setManageUser] = useState<{
    userId: string;
    userName: string;
    projects: Array<{ id: string; name: string; color: string; role: string }>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch all projects user has access to with their roles
  const { data: userProjects } = useQuery({
    queryKey: ['user-projects-with-roles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          tm_projects (id, name, color)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const projects = userProjects?.map((d: any) => d.tm_projects).filter(Boolean) || [];

  // Check if current user can manage a project (owner or admin)
  const canManageProject = (projectId: string) => {
    const membership = userProjects?.find((p: any) => p.project_id === projectId);
    return membership?.role === 'owner' || membership?.role === 'admin';
  };

  // Fetch all team members across user's projects
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team-members', user?.id, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from('project_members')
        .select(`
          project_id,
          user_id,
          role,
          joined_at,
          profiles!project_members_user_id_fkey (id, full_name, avatar_url),
          tm_projects (id, name, color)
        `);

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by user and aggregate
      const userMap = new Map<string, ProjectMember & { projects: Array<{ id: string; name: string; color: string; role: string }> }>();

      ((data || []) as unknown as ProjectMember[]).forEach((member) => {
        if (!member.profiles) return;

        const existing = userMap.get(member.user_id);
        if (existing) {
          existing.projects.push({
            id: member.tm_projects?.id || '',
            name: member.tm_projects?.name || '',
            color: member.tm_projects?.color || '#6366f1',
            role: member.role,
          });
        } else {
          userMap.set(member.user_id, {
            ...member,
            projects: [{
              id: member.tm_projects?.id || '',
              name: member.tm_projects?.name || '',
              color: member.tm_projects?.color || '#6366f1',
              role: member.role,
            }],
          });
        }
      });

      return Array.from(userMap.values());
    },
    enabled: !!user,
  });

  const filteredMembers = teamMembers?.filter((member) =>
    member.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Change member role
  async function changeRole(projectId: string, targetUserId: string, newRole: string) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Update local state
      if (manageUser) {
        setManageUser({
          ...manageUser,
          projects: manageUser.projects.map((p) =>
            p.id === projectId ? { ...p, role: newRole } : p
          ),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setSaving(false);
    }
  }

  // Remove member from project
  async function removeMember(projectId: string, targetUserId: string) {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Update local state
      if (manageUser) {
        const newProjects = manageUser.projects.filter((p) => p.id !== projectId);
        if (newProjects.length === 0) {
          setManageUser(null);
        } else {
          setManageUser({ ...manageUser, projects: newProjects });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setSaving(false);
    }
  }

  // Check if current user can manage any of the member's projects
  const canManageMember = (member: ProjectMember & { projects: Array<{ id: string; name: string; color: string; role: string }> }) => {
    if (!member) return false;
    return member.projects.some((p: { id: string }) => canManageProject(p.id)) && member.user_id !== user?.id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-zinc-400 mt-1">
          View and manage team members across your projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Projects</option>
          {projects?.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Users className="h-4 w-4" />
            Team Members
          </div>
          <p className="text-2xl font-bold text-white">{filteredMembers?.length || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <FolderKanban className="h-4 w-4" />
            Projects
          </div>
          <p className="text-2xl font-bold text-white">{projects?.length || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hidden sm:block">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Crown className="h-4 w-4 text-yellow-500" />
            Owners
          </div>
          <p className="text-2xl font-bold text-white">
            {filteredMembers?.filter((m) => m.projects.some((p) => p.role === 'owner')).length || 0}
          </p>
        </div>
      </div>

      {/* Project Owners Section */}
      {filteredMembers && filteredMembers.filter((m) => m.projects.some((p) => p.role === 'owner')).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-yellow-500 uppercase tracking-wider flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Project Owners
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers
              .filter((m) => m.projects.some((p) => p.role === 'owner'))
              .map((member) => (
                <div
                  key={member.user_id}
                  className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 hover:border-yellow-500/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-12 w-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-yellow-500" />
                      )}
                      <Crown className="absolute -bottom-1 -right-1 h-4 w-4 text-yellow-500 bg-zinc-900 rounded-full p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {member.profiles?.full_name || 'Unnamed User'}
                        {member.user_id === user?.id && <span className="text-zinc-500 text-sm ml-2">(You)</span>}
                      </h3>
                      <p className="text-xs text-yellow-500/70 mt-0.5">
                        Owner of {member.projects.filter((p) => p.role === 'owner').length} project{member.projects.filter((p) => p.role === 'owner').length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {canManageMember(member) && (
                      <button
                        onClick={() => setManageUser({
                          userId: member.user_id,
                          userName: member.profiles?.full_name || 'Unnamed User',
                          projects: member.projects,
                        })}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Projects */}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Owned Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {member.projects.filter((p) => p.role === 'owner').slice(0, 4).map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 rounded-lg"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-xs text-yellow-200 truncate max-w-[100px]">
                            {project.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="mt-4 pt-4 border-t border-yellow-500/20 flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Team Members Section - All members including owners */}
      {filteredMembers && filteredMembers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Team Members
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const isOwner = member.projects.some((p) => p.role === 'owner');
              return (
                <div
                  key={member.user_id}
                  className={cn(
                    "rounded-xl p-5 transition-colors",
                    isOwner
                      ? "bg-zinc-900 border-2 border-yellow-500/30 hover:border-yellow-500/50"
                      : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "relative h-12 w-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0",
                      isOwner ? "bg-yellow-500/20 border-2 border-yellow-500/50" : "bg-zinc-700"
                    )}>
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className={cn("h-6 w-6", isOwner ? "text-yellow-500" : "text-zinc-400")} />
                      )}
                      {isOwner && (
                        <Crown className="absolute -bottom-1 -right-1 h-4 w-4 text-yellow-500 bg-zinc-900 rounded-full p-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate flex items-center gap-2">
                        {member.profiles?.full_name || 'Unnamed User'}
                        {isOwner && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">Owner</span>
                        )}
                        {member.user_id === user?.id && <span className="text-zinc-500 text-sm">(You)</span>}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {member.projects.length} project{member.projects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {canManageMember(member) && (
                      <button
                        onClick={() => setManageUser({
                          userId: member.user_id,
                          userName: member.profiles?.full_name || 'Unnamed User',
                          projects: member.projects,
                        })}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Projects */}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {member.projects.slice(0, 4).map((project) => (
                        <div
                          key={project.id}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                            project.role === 'owner' ? "bg-yellow-500/10" : "bg-zinc-800"
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className={cn(
                            "text-xs truncate max-w-[100px]",
                            project.role === 'owner' ? "text-yellow-200" : "text-zinc-300"
                          )}>
                            {project.name}
                          </span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', roleColors[project.role])}>
                            {project.role}
                          </span>
                        </div>
                      ))}
                      {member.projects.length > 4 && (
                        <span className="text-xs text-zinc-500 px-2 py-1">
                          +{member.projects.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className={cn(
                    "mt-4 pt-4 flex items-center gap-2 text-xs text-zinc-500",
                    isOwner ? "border-t border-yellow-500/20" : "border-t border-zinc-800"
                  )}>
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredMembers?.length === 0 && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No team members found</h3>
          <p className="text-zinc-400">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Invite members to your projects to see them here'}
          </p>
        </div>
      )}

      {/* Manage Member Modal */}
      {manageUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Manage Member</h2>
              <button
                onClick={() => setManageUser(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-zinc-400 mb-6">
              Manage roles for <span className="text-white font-medium">{manageUser.userName}</span>
            </p>

            <div className="space-y-3">
              {manageUser.projects.map((project) => {
                const canManage = canManageProject(project.id);
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-white text-sm">{project.name}</span>
                    </div>
                    {canManage && project.role !== 'owner' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={project.role}
                          onChange={(e) => changeRole(project.id, manageUser.userId, e.target.value)}
                          disabled={saving}
                          className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-xs focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          onClick={() => removeMember(project.id, manageUser.userId)}
                          disabled={saving}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove from project"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={cn('text-xs px-2 py-1 rounded', roleColors[project.role])}>
                        {project.role}
                        {project.role === 'owner' && ' (cannot change)'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setManageUser(null)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
