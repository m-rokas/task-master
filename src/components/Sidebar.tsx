import {
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  CheckCircle,
  Clock,
  Bell,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatform } from '@/contexts/PlatformContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface SidebarProps {
  variant?: 'user' | 'admin';
}

const userNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: CheckCircle, label: 'My Tasks', href: '/tasks' },
  { icon: Clock, label: 'Time Tracking', href: '/time' },
  { icon: CreditCard, label: 'Billing', href: '/billing' },
];

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: CreditCard, label: 'Plans & Permissions', href: '/admin/plans' },
  { icon: Settings, label: 'Site Settings', href: '/admin/settings' },
];

const adminSupportItems: NavItem[] = [
  { icon: HelpCircle, label: 'Support Center', href: '/admin/support' },
];

export function Sidebar({ variant = 'user' }: SidebarProps) {
  const location = useLocation();
  const { settings } = usePlatform();
  const { user, signOut } = useAuth();
  const navItems = variant === 'admin' ? adminNavItems : userNavItems;

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tm_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user && variant === 'user',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111318] sticky top-0 h-screen">
      <div className="p-6 flex flex-col gap-6 h-full">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2 text-white">
            <CheckSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-none">
              {settings.site_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#9da6b9] mt-1">
              {variant === 'admin' ? 'Super Admin' : 'Management Platform'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 grow">
          {variant === 'admin' && (
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
              Main Menu
            </p>
          )}

          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon
                className="size-5"
                fill={isActive(item.href) ? 'currentColor' : 'none'}
                strokeWidth={isActive(item.href) ? 1.5 : 2}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}

          {variant === 'admin' && (
            <>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
                Support
              </p>
              {adminSupportItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="size-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col gap-1 pt-6 border-t border-slate-200 dark:border-slate-800">
          {variant === 'user' && (
            <>
              <Link
                to="/notifications"
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/notifications')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="size-5" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
                {(unreadCount ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/settings')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="size-5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
            </>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full text-left"
          >
            <LogOut className="size-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
