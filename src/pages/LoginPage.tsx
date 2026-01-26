import { CheckSquare, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left Side: Visual/Hero Section */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-[#111318]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1920&q=80")`,
          }}
        />
        <div className="absolute inset-0 bg-black/60 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3 text-white">
            <CheckSquare className="size-8 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">TaskMaster</h2>
          </div>
          <div className="max-w-md">
            <h1 className="text-white text-5xl font-bold leading-tight mb-6">
              Master your workflow, achieve more every day.
            </h1>
            <p className="text-gray-300 text-lg">
              Join over 10,000 teams using TaskMaster to organize, track, and
              complete their most important work.
            </p>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 TaskMaster Inc. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side: Login Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-[440px] flex flex-col">
          {/* Branding for mobile */}
          <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-10 md:hidden">
            <CheckSquare className="size-6 text-primary" />
            <h2 className="text-xl font-bold">TaskMaster</h2>
          </div>

          {/* Headline */}
          <div className="mb-8">
            <h2 className="text-slate-900 dark:text-white text-[32px] font-bold leading-tight tracking-tight">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base mt-2">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Form Fields */}
          <form className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-sm font-medium">
                Email Address
              </label>
              <input
                className="w-full rounded-lg text-slate-900 dark:text-white border border-slate-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] focus:border-primary focus:ring-1 focus:ring-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] px-4 text-sm"
                placeholder="name@company.com"
                type="email"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-slate-900 dark:text-white text-sm font-medium">
                  Password
                </label>
                <a
                  className="text-primary text-xs font-semibold hover:underline"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-lg text-slate-900 dark:text-white border border-slate-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] focus:border-primary focus:ring-1 focus:ring-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] px-4 pr-12 text-sm"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 px-1">
              <input
                className="rounded border-slate-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-primary focus:ring-primary h-4 w-4"
                id="remember"
                type="checkbox"
              />
              <label
                className="text-gray-500 dark:text-gray-400 text-sm cursor-pointer"
                htmlFor="remember"
              >
                Remember me for 30 days
              </label>
            </div>

            {/* Sign In Button */}
            <button
              className="w-full flex h-12 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold tracking-wide transition-colors hover:bg-primary/90 mt-2"
              type="submit"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-[#282e39]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-light dark:bg-background-dark px-2 text-slate-400 dark:text-[#9da6b9]">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 h-11 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] rounded-lg text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#282e39] transition-colors">
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 h-11 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] rounded-lg text-slate-700 dark:text-white text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#282e39] transition-colors">
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-semibold hover:underline"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
