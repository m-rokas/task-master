import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { Loader2, Eye, EyeOff, Rocket, Users, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, signUp, signInWithGoogle } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
            <p className="text-zinc-400 mb-6">
              We've sent a confirmation link to <span className="text-white">{email}</span>.
              Please click the link to verify your account.
            </p>
            <Link
              to="/login"
              className="text-primary hover:text-primary/80"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Side: Marketing/Value Prop */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-12 bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(16, 22, 34, 0.8), rgba(16, 22, 34, 0.9)), url("https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=2072&q=80")',
        }}
      >
        {/* Logo */}
        <div className="absolute top-10 left-10 flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-white">{settings.site_name}</span>
        </div>

        <div className="max-w-md w-full space-y-8 z-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] text-white">
              Master your productivity.
            </h1>
            <p className="text-lg text-[#9da6b9] font-normal leading-relaxed">
              Organize your workflow, collaborate with ease, and track progress in real-time. Join 10,000+ high-performing teams.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-primary mt-1">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">Organize your workflow</h3>
                <p className="text-sm text-[#9da6b9]">Customizable boards and list views for every project type.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-primary mt-1">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">Collaborate with ease</h3>
                <p className="text-sm text-[#9da6b9]">Real-time comments, file sharing, and team permissions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      </div>

      {/* Right Side: Registration Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-background-dark">
        <div className="w-full max-w-[480px] space-y-8">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden mb-6">
            <div className="bg-primary p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight text-white">{settings.site_name}</span>
          </div>

          {/* Page Heading */}
          <div className="flex flex-col gap-3">
            <h2 className="text-white tracking-tight text-[32px] font-bold leading-tight">Create your account</h2>
            <p className="text-[#9da6b9] text-sm font-normal leading-normal">Join over 10,000 teams managing work effectively.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Social Signup */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg h-12 px-5 border border-[#3b4354] bg-[#1c1f27] text-white text-base font-medium hover:bg-[#252a35] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-[#3b4354]" />
              <span className="flex-shrink mx-4 text-[#9da6b9] text-xs uppercase tracking-widest font-bold">Or with email</span>
              <div className="flex-grow border-t border-[#3b4354]" />
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-base font-medium leading-normal">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg text-white border border-[#3b4354] bg-[#1c1f27] focus:border-primary focus:ring-2 focus:ring-primary/50 h-14 placeholder:text-[#9da6b9] px-4 text-base transition-all"
                placeholder="Enter your full name"
              />
            </div>

            {/* Work Email */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-base font-medium leading-normal">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg text-white border border-[#3b4354] bg-[#1c1f27] focus:border-primary focus:ring-2 focus:ring-primary/50 h-14 placeholder:text-[#9da6b9] px-4 text-base transition-all"
                placeholder="name@company.com"
              />
            </div>

            {/* Create Password */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-base font-medium leading-normal">Create Password</label>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg rounded-r-none border-r-0 text-white border border-[#3b4354] bg-[#1c1f27] focus:border-primary focus:ring-2 focus:ring-primary/50 h-14 placeholder:text-[#9da6b9] px-4 text-base transition-all"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#9da6b9] flex border border-[#3b4354] bg-[#1c1f27] items-center justify-center px-4 rounded-r-lg border-l-0 cursor-pointer hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 py-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 rounded bg-[#1c1f27] border-[#3b4354] text-primary focus:ring-primary focus:ring-offset-background-dark"
              />
              <label htmlFor="terms" className="text-[#9da6b9] text-sm leading-tight cursor-pointer">
                By signing up, I agree to the{' '}
                <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </label>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Get Started'}
            </button>

            {/* Footer Link */}
            <p className="text-center text-[#9da6b9] text-sm py-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
