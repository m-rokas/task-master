import { Bell, HelpCircle, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface DashboardHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardHeader({ title, breadcrumbs }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/80 dark:bg-[#111318]/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-6">
        {breadcrumbs ? (
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-slate-400">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-slate-500 dark:text-[#9da6b9] hover:text-primary transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-900 dark:text-white font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
        )}

        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9da6b9] size-5" />
          <input
            className="w-full bg-slate-100 dark:bg-[#1a2130] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-500"
            placeholder="Search..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <button className="p-2 text-slate-500 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#111318]"></span>
        </button>

        <button className="p-2 text-slate-500 dark:text-[#9da6b9] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <HelpCircle className="size-5" />
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full size-9 border-2 border-slate-200 dark:border-slate-700"
            style={{
              backgroundImage: `url("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop")`,
            }}
          />
          <div className="hidden md:block">
            <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">
              Alex Johnson
            </p>
            <p className="text-xs text-slate-500 dark:text-[#9da6b9] mt-1">
              Lead Manager
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
