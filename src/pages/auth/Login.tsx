import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signInWithGoogle } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex flex-1 flex-col md:flex-row min-h-screen">
      {/* Left Side: Visual/Hero Section */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-[#111318]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=2072&q=80")',
          }}
        />
        {/* Dark Overlay with Brand Info */}
        <div className="absolute inset-0 bg-black/60 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 text-primary">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{settings.site_name}</h2>
          </div>
          <div className="max-w-md">
            <h1 className="text-white text-5xl font-bold leading-tight mb-6">
              Master your workflow, achieve more every day.
            </h1>
            <p className="text-gray-300 text-lg">
              Join over 10,000 teams using {settings.site_name} to organize, track, and complete their most important work.
            </p>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} {settings.site_name} Inc. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side: Login Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background-dark">
        <div className="w-full max-w-[440px] flex flex-col">
          {/* Branding for mobile */}
          <div className="flex items-center gap-2 text-white mb-10 md:hidden">
            <div className="size-6 text-primary">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">{settings.site_name}</h2>
          </div>

          {/* Headline */}
          <div className="mb-8">
            <h2 className="text-white text-[32px] font-bold leading-tight tracking-tight">Welcome back</h2>
            <p className="text-gray-400 text-base mt-2">Sign in to your account to continue.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg text-white border border-[#3b4354] bg-[#1c1f27] focus:border-primary focus:ring-1 focus:ring-primary h-12 placeholder:text-[#9da6b9] px-4 text-sm"
                placeholder="name@company.com"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-white text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-primary text-xs font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg text-white border border-[#3b4354] bg-[#1c1f27] focus:border-primary focus:ring-1 focus:ring-primary h-12 placeholder:text-[#9da6b9] px-4 pr-12 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9da6b9] hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#3b4354] bg-[#1c1f27] text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="remember" className="text-gray-400 text-sm cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex h-12 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold tracking-wide transition-colors hover:bg-primary/90 mt-2',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#282e39]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-dark px-2 text-[#9da6b9]">Or continue with</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 h-11 border border-[#3b4354] bg-[#1c1f27] rounded-lg text-white text-sm font-medium hover:bg-[#282e39] transition-colors"
            >
              <svg className="size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 h-11 border border-[#3b4354] bg-[#1c1f27] rounded-lg text-white text-sm font-medium hover:bg-[#282e39] transition-colors">
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              Slack
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-10">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
