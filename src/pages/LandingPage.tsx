import { Navigate } from 'react-router-dom';
import { Header, Hero, Pricing, Footer } from '../components';
import { useAuth } from '@/contexts/AuthContext';

export function LandingPage() {
  const { user, loading } = useAuth();

  // If user is logged in, redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300 font-display">
      <Header />
      <main className="flex-1">
        <Hero />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
