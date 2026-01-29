import { CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePlatform } from '@/contexts/PlatformContext';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  project_limit: number | null;
  task_limit: number | null;
  features: Record<string, boolean> | null;
  features_list: string[];
  is_featured: boolean;
  is_active: boolean;
}

// Generate dynamic features from plan limits
function generatePlanFeatures(plan: Plan): string[] {
  const features: string[] = [];

  // Project limit
  if (plan.project_limit === null) {
    features.push('Unlimited projects');
  } else {
    features.push(`Up to ${plan.project_limit} projects`);
  }

  // Task limit
  if (plan.task_limit === null) {
    features.push('Unlimited tasks');
  } else {
    features.push(`Up to ${plan.task_limit} tasks`);
  }

  // Feature flags
  if (plan.features?.team_collaboration) {
    features.push('Team collaboration');
  }
  if (plan.features?.custom_labels) {
    features.push('Custom labels & tags');
  }
  if (plan.features?.file_attachments) {
    features.push('File attachments');
  }
  if (plan.features?.advanced_time_tracking) {
    features.push('Advanced time tracking');
  }
  if (plan.features?.api_access) {
    features.push('API access');
  }

  return features;
}

function PricingCard({ plan, trialEnabled }: { plan: Plan; trialEnabled: boolean }) {
  const baseCardClass =
    'flex flex-1 flex-col gap-6 rounded-xl p-8 transition-colors';
  const cardClass = plan.is_featured
    ? `${baseCardClass} border-2 border-primary bg-white dark:bg-card-dark relative shadow-2xl shadow-primary/10 transform md:scale-105 z-10`
    : `${baseCardClass} border border-slate-200 dark:border-card-border-dark bg-white dark:bg-card-dark hover:border-primary/50 group`;

  const buttonClass =
    plan.is_featured
      ? 'flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-md'
      : 'flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-4 bg-slate-100 dark:bg-[#282e39] text-slate-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors';

  return (
    <div className={cardClass}>
      {plan.is_featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold py-1 px-4 rounded-full uppercase tracking-wider">
          Most Popular
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
          {plan.display_name}
        </h3>
        <p className="flex items-baseline gap-1 text-slate-900 dark:text-white mt-2">
          <span className="text-4xl font-black leading-tight tracking-[-0.033em]">
            €{Math.round(plan.price_monthly)}
          </span>
          <span className="text-base font-bold leading-tight text-slate-500 dark:text-slate-400">
            /month
          </span>
        </p>
      </div>
      <Link to={`/register?plan=${plan.name}`} className={buttonClass}>
        <span>
          {plan.name === 'free'
            ? 'Get Started'
            : trialEnabled
            ? 'Start Free Trial'
            : 'Subscribe Now'}
        </span>
      </Link>
      <div className="flex flex-col gap-4">
        {generatePlanFeatures(plan).map((feature, index) => (
          <div
            key={index}
            className="text-sm font-normal leading-normal flex gap-3 text-slate-600 dark:text-slate-300"
          >
            <CheckCircle className="text-primary size-5 shrink-0" />
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pricing() {
  const { settings } = usePlatform();
  const { data: plans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, price_monthly, project_limit, task_limit, features, features_list, is_featured, is_active')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return [];
      }
      return data as Plan[];
    },
  });

  return (
    <>
      {/* Section Header */}
      <section
        className="px-6 md:px-16 lg:px-24 pt-20 flex justify-center"
        id="pricing"
      >
        <div className="max-w-[1400px] flex-1 text-center">
          <h2 className="text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight tracking-[-0.015em] px-4">
            Choose the Right Plan for Your Team
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-5 text-xl">
            Flexible options for startups and enterprises alike.
          </p>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="px-6 md:px-16 lg:px-24 py-16 flex justify-center">
        <div className="max-w-[1400px] flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-4 py-3">
              {plans?.map((plan) => (
                <PricingCard key={plan.id} plan={plan} trialEnabled={settings.trial_enabled} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
