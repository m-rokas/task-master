import { CheckSquare, Eye, EyeOff, Rocket, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Side: Marketing/Value Prop (Hero Section Style) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-12 bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(16, 22, 34, 0.8), rgba(16, 22, 34, 0.9)), url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80")`,
        }}
      >
        <div className="absolute top-10 left-10 flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <CheckSquare className="size-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            TaskMaster
          </span>
        </div>

        <div className="max-w-md w-full space-y-8 z-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] text-white">
              Master your productivity.
            </h1>
            <p className="text-lg text-[#9da6b9] font-normal leading-relaxed">
              Organize your workflow, collaborate with ease, and track progress
              in real-time. Join 10,000+ high-performing teams.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-primary mt-1">
                <Rocket className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">Organize your workflow</h3>
                <p className="text-sm text-[#9da6b9]">
                  Customizable boards and list views for every project type.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-primary mt-1">
                <Users className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">Collaborate with ease</h3>
                <p className="text-sm text-[#9da6b9]">
                  Real-time comments, file sharing, and team permissions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-[480px] space-y-8">
          {/* Page Heading */}
          <div className="flex flex-col gap-3">
            <h2 className="text-slate-900 dark:text-white tracking-light text-[32px] font-bold leading-tight">
              Create your account
            </h2>
            <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-normal leading-normal">
              Join over 10,000 teams managing work effectively.
            </p>
          </div>

          {/* Registration Form */}
          <form className="space-y-5">
            {/* Social Signup */}
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg h-12 px-5 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-slate-700 dark:text-white text-base font-medium hover:bg-slate-50 dark:hover:bg-[#252a35] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              Sign up with Google
            </button>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-[#3b4354]"></div>
              <span className="flex-shrink mx-4 text-slate-400 dark:text-[#9da6b9] text-xs uppercase tracking-widest font-bold">
                Or with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-[#3b4354]"></div>
            </div>

            {/* TextField: Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-base font-medium leading-normal">
                Full Name
              </label>
              <input
                className="w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] p-4 text-base transition-all"
                placeholder="Enter your full name"
                type="text"
              />
            </div>

            {/* TextField: Work Email */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-base font-medium leading-normal">
                Work Email
              </label>
              <input
                className="w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] p-4 text-base transition-all"
                placeholder="name@company.com"
                type="email"
              />
            </div>

            {/* TextField: Create Password */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 dark:text-white text-base font-medium leading-normal">
                Create Password
              </label>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <input
                  className="w-full rounded-lg rounded-r-none text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] p-4 border-r-0 text-base transition-all"
                  placeholder="At least 8 characters"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 dark:text-[#9da6b9] flex border border-slate-200 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] items-center justify-center px-4 rounded-r-lg border-l-0 cursor-pointer hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 py-1">
              <input
                className="mt-1 rounded bg-white dark:bg-[#1c1f27] border-slate-200 dark:border-[#3b4354] text-primary focus:ring-primary focus:ring-offset-background-light dark:focus:ring-offset-background-dark"
                id="terms"
                type="checkbox"
              />
              <label
                className="text-slate-500 dark:text-[#9da6b9] text-sm leading-tight"
                htmlFor="terms"
              >
                By signing up, I agree to the{' '}
                <a className="text-primary hover:underline" href="#">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a className="text-primary hover:underline" href="#">
                  Privacy Policy
                </a>
                .
              </label>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="truncate">Get Started</span>
            </button>

            {/* Footer Link */}
            <p className="text-center text-slate-500 dark:text-[#9da6b9] text-sm py-4">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary font-bold hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
