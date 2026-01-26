import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  Settings,
  Users,
  ChevronLeft,
  Plus,
  CreditCard,
  Calendar,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'My Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Time Tracking', href: '/time', icon: Clock },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];


export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const { getSiteName, getSiteDescription } = usePlatformConfig();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white block truncate">{getSiteName()}</span>
              <span className="text-xs text-zinc-500 block truncate">{getSiteDescription()}</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/dashboard" className="mx-auto">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {/* New Project Button */}
        <Link
          to="/projects/new"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors mb-4',
            collapsed && 'justify-center'
          )}
        >
          <Plus className="h-5 w-5" />
          {!collapsed && <span>New Project</span>}
        </Link>

        {/* Main Navigation */}
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              isActive(item.href)
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
              collapsed && 'justify-center'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}

        {/* Admin Link - only for admins */}
        {profile?.role === 'admin' && (
          <>
            {collapsed && <div className="border-t border-zinc-800 my-2" />}
            {!collapsed && (
              <div className="pt-4 pb-2">
                <span className="px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            )}
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                location.pathname.startsWith('/admin')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                collapsed && 'justify-center'
              )}
            >
              <Shield className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Settings at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            isActive('/settings')
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
