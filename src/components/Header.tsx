import { CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { usePlatform } from '@/contexts/PlatformContext';

export function Header() {
  const { settings } = usePlatform();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-border-dark bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-20 lg:px-40 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between whitespace-nowrap">
        <Link to="/" className="flex items-center gap-3">
          <div className="text-primary size-10 flex items-center justify-center">
            <CheckSquare className="size-8" />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
              {settings.site_name}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs hidden md:block">
              {settings.site_description}
            </p>
          </div>
        </Link>
        <div className="flex flex-1 justify-end gap-8 items-center">
          <nav className="hidden md:flex items-center gap-10">
            <a
              className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-base font-medium leading-normal transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-base font-medium leading-normal transition-colors"
              href="#pricing"
            >
              Pricing
            </a>
          </nav>
          <ThemeToggle />
          <Link
            to="/login"
            className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-11 px-7 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all"
          >
            <span>Login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
