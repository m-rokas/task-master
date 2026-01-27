import { useState } from 'react';
import { CheckSquare, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { usePlatform } from '@/contexts/PlatformContext';
import { cn } from '@/lib/utils';

export function Header() {
  const { settings } = usePlatform();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-border-dark bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 sm:px-6 md:px-20 lg:px-40 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="text-primary size-8 sm:size-10 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="size-6 sm:size-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-slate-900 dark:text-white text-lg sm:text-2xl font-bold leading-tight tracking-[-0.015em] truncate">
              {settings.site_name}
            </h2>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-10">
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

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300',
          mobileMenuOpen ? 'max-h-60 mt-4' : 'max-h-0'
        )}
      >
        <nav className="flex flex-col gap-2 pb-4">
          <a
            className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-base font-medium py-2 transition-colors"
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </a>
          <a
            className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-base font-medium py-2 transition-colors"
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </a>
          <Link
            to="/login"
            className="flex w-full cursor-pointer items-center justify-center rounded-lg h-11 px-7 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all mt-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>Login</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
