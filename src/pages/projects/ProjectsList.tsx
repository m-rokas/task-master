import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import {
  Plus,
  FolderKanban,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  Loader2,
} from 'lucide-react';

export default function ProjectsList() {
  const { data: projects, isLoading, error } = useProjects();
  const deleteProject = useDeleteProject();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleDelete = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? All tasks will be deleted.')) {
      await deleteProject.mutateAsync(projectId);
    }
    setMenuOpen(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-400 font-medium mb-2">Error loading projects</p>
          <p className="text-red-400/70 text-sm mb-4">
            {(error as Error).message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-400 mt-1">
            Manage your projects and collaborate with your team
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {!projects || projects.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 bg-primary text-white font-medium px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group"
            >
              {/* Color Bar */}
              <div
                className="h-2"
                style={{ backgroundColor: project.color }}
              />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <Link to={`/projects/${project.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </Link>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {menuOpen === project.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                          <Link
                            to={`/projects/${project.id}/settings`}
                            className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                            onClick={() => setMenuOpen(null)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-zinc-700 transition-colors w-full"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    {project.is_personal ? (
                      <span className="text-xs text-zinc-500">Personal</span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">
                          {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Member Avatars */}
                  <div className="flex -space-x-2">
                    {project.members?.slice(0, 3).map((member) => (
                      <div
                        key={member.id}
                        className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-medium text-white"
                        title={member.profiles?.full_name || 'Member'}
                      >
                        {member.profiles?.avatar_url ? (
                          <img
                            src={member.profiles.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          member.profiles?.full_name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                    ))}
                    {(project.members?.length || 0) > 3 && (
                      <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-400">
                        +{(project.members?.length || 0) - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
