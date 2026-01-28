import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import {
  BarChart3,
  Users,
  Package,
  CreditCard,
  Cog,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3, exact: true },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Plans & Pricing', href: '/admin/plans', icon: Package },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Platform Settings', href: '/admin/settings', icon: Cog },
  { name: 'Audit Logs', href: '/admin/audit', icon: Shield },
];

export function AdminLayout() {
  const location = useLocation();
  const { profile, loading, signOut } = useAuth();
  const { getSiteName } = usePlatformConfig();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: hidden by default, shown when mobileOpen
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white block text-sm">{getSiteName()}</span>
                <span className="text-xs text-red-400">Admin Panel</span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link to="/admin" className="mx-auto hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </Link>
          )}
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Collapse/expand button for desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {/* Back to App Button */}
          <Link
            to="/dashboard"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors mb-4',
              collapsed && 'justify-center'
            )}
          >
            <ArrowLeft className="h-5 w-5" />
            {!collapsed && <span>Back to App</span>}
          </Link>

          {!collapsed && (
            <div className="pb-2">
              <span className="px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Administration
              </span>
            </div>
          )}

          {/* Admin Navigation */}
          {adminNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive(item.href, item.exact)
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
          <button
            onClick={() => signOut()}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        {/* Admin Topbar */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:inline">
              Logged in as <span className="text-red-400 font-medium">{profile?.full_name}</span>
            </span>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
