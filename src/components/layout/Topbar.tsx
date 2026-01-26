import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  Crown,
  FolderKanban,
  CheckSquare,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { user, profile, plan, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search for projects and tasks
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return { projects: [], tasks: [] };

      const [projectsRes, tasksRes] = await Promise.all([
        supabase
          .from('tm_projects')
          .select('id, name, color')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('tm_tasks')
          .select('id, title, status, tm_projects(id, name, color)')
          .ilike('title', `%${searchQuery}%`)
          .limit(5),
      ]);

      return {
        projects: projectsRes.data || [],
        tasks: tasksRes.data || [],
      };
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSelect = (type: 'project' | 'task', id: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(type === 'project' ? `/projects/${id}` : `/tasks/${id}`);
  };

  const hasSearchResults = searchResults && (searchResults.projects.length > 0 || searchResults.tasks.length > 0);

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0].toUpperCase() || '?';

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks, projects..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
              {searchLoading ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : hasSearchResults ? (
                <div className="max-h-80 overflow-y-auto">
                  {/* Projects */}
                  {searchResults.projects.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50">
                        Projects
                      </div>
                      {searchResults.projects.map((project: any) => (
                        <button
                          key={project.id}
                          onClick={() => handleSearchSelect('project', project.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <FolderKanban className="h-4 w-4 text-zinc-400" />
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="text-sm text-white">{project.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tasks */}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/50">
                        Tasks
                      </div>
                      {searchResults.tasks.map((task: any) => (
                        <button
                          key={task.id}
                          onClick={() => handleSearchSelect('task', task.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <CheckSquare className="h-4 w-4 text-zinc-400" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white truncate block">{task.title}</span>
                            {task.tm_projects && (
                              <span className="text-xs text-zinc-500">{task.tm_projects.name}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Plan Badge */}
        {plan && plan.name !== 'free' && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-sm font-medium">
            <Crown className="h-4 w-4" />
            {plan.display_name}
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {notifications && notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-white">Notifications</h3>
                {notifications && notifications.length > 0 && (
                  <span className="text-xs text-zinc-500">{notifications.length} unread</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className="p-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    >
                      <p className="text-sm text-white">{notification.title}</p>
                      {notification.message && (
                        <p className="text-xs text-zinc-400 mt-1">{notification.message}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-zinc-800">
                <Link
                  to="/notifications"
                  className="block text-center text-sm text-primary hover:text-primary/80"
                  onClick={() => setShowNotifications(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || ''}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 text-zinc-400 transition-transform hidden sm:block',
              showUserMenu && 'rotate-180'
            )} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-zinc-800">
                <p className="font-medium text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
              </div>
              <div className="p-1">
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
              <div className="p-1 border-t border-zinc-800">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
