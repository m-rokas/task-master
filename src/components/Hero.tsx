import { Link } from 'react-router-dom';
import { usePlatform } from '@/contexts/PlatformContext';

export function Hero() {
  const { settings } = usePlatform();

  return (
    <section
      className="px-6 md:px-16 lg:px-24 py-12 md:py-24 flex justify-center"
      id="features"
    >
      <div className="max-w-[1400px] flex-1">
        <div className="p-4">
          <div
            className="relative flex min-h-[580px] flex-col gap-8 bg-cover bg-center bg-no-repeat rounded-2xl items-center justify-center p-10 overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(rgba(16, 22, 34, 0.85) 0%, rgba(16, 22, 34, 0.95) 100%), url("https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=80")`,
            }}
          >
            <div className="flex flex-col gap-6 text-center max-w-[800px] z-10">
              <h1 className="text-white text-5xl font-black leading-tight tracking-[-0.033em] md:text-7xl">
                Manage Tasks. Empower Teams. Scale Faster.
              </h1>
              <p className="text-slate-300 text-xl font-normal leading-relaxed md:text-2xl">
                {settings.site_description || 'The all-in-one platform to organize work, collaborate in real-time, and hit your deadlines with precision.'}
              </p>
            </div>
            <div className="z-10 flex flex-col items-center gap-3">
              <Link
                to="/register"
                className="flex min-w-[240px] cursor-pointer items-center justify-center rounded-xl h-14 md:h-16 px-10 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                <span>Get Started for Free</span>
              </Link>
              {settings.trial_enabled && settings.trial_days > 0 && (
                <p className="text-slate-400 text-sm">
                  Start with a {settings.trial_days}-day free trial of Pro features
                </p>
              )}
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-primary blur-[120px] rounded-full"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-primary blur-[120px] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
