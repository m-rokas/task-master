import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Check,
  Loader2,
  AlertCircle,
  Package,
  Receipt,
  Sparkles,
  Zap,
  Crown,
  CreditCard,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  project_limit: number | null;
  task_limit: number | null;
  features_list?: string[];
}

export default function Billing() {
  const { user, plan: currentPlan, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch all plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');
      if (error) throw error;
      return data as Plan[];
    },
  });

  // Fetch user's subscription (including trial)
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user has payment method (stored in profile or separate table)
  const { data: hasPaymentMethod } = useQuery({
    queryKey: ['user-payment-method', user?.id],
    queryFn: async () => {
      // Check if user has stripe_customer_id in profile
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user?.id)
        .single();
      if (error) return false;
      return !!data?.stripe_customer_id;
    },
    enabled: !!user,
  });

  // Fetch payment history
  const { data: payments } = useQuery({
    queryKey: ['user-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch usage counts
  const { data: projectCount } = useQuery({
    queryKey: ['user-project-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tm_projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: taskCount } = useQuery({
    queryKey: ['user-task-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tm_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user?.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    if (isCurrentPlan(plan.id)) return;

    // If downgrading to free, just do it
    if (plan.price_monthly === 0) {
      subscribeToPlan.mutate(plan.id);
      return;
    }

    // For paid plans, check if we have payment method
    setSelectedPlan(plan);
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  // Subscribe to plan
  const subscribeToPlan = useMutation({
    mutationFn: async (planId: string) => {
      const plan = plans?.find((p) => p.id === planId);

      // For paid plans, we need payment method
      if (plan && plan.price_monthly > 0 && !hasPaymentMethod) {
        throw new Error('Payment method required');
      }

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      // Upsert subscription
      const { error: subError } = await supabase.from('subscriptions').upsert({
        user_id: user?.id,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      });
      if (subError) throw subError;

      // Update profile's plan_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan_id: planId })
        .eq('id', user?.id);
      if (profileError) throw profileError;

      // Create payment record for paid plans
      if (plan && plan.price_monthly > 0) {
        const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        await supabase.from('payments').insert({
          user_id: user?.id,
          amount,
          currency: 'EUR',
          status: 'succeeded',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-payments'] });
      refreshProfile();
      setShowPaymentModal(false);
      setSelectedPlan(null);
    },
    onError: (error: Error) => {
      setPaymentError(error.message);
    },
  });

  // Add payment method (simulated - in real app would redirect to Stripe)
  const addPaymentMethod = useMutation({
    mutationFn: async () => {
      // In real implementation, this would:
      // 1. Create Stripe checkout session for setup
      // 2. Redirect to Stripe
      // 3. Handle webhook to save payment method

      // For now, simulate adding a payment method
      const { error } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: 'cus_simulated_' + Date.now() })
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-method'] });
      // After adding payment method, complete the subscription
      if (selectedPlan) {
        subscribeToPlan.mutate(selectedPlan.id);
      }
    },
    onError: (error: Error) => {
      setPaymentError(error.message);
    },
  });

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      if (!subscription) return;

      // Switch to free plan
      const freePlan = plans?.find(p => p.name === 'free');
      if (!freePlan) throw new Error('Free plan not found');

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          plan_id: freePlan.id
        })
        .eq('id', subscription.id);
      if (subError) throw subError;

      // Update profile to free plan
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan_id: freePlan.id })
        .eq('id', user?.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      refreshProfile();
      setShowCancelModal(false);
    },
  });

  // Resume subscription
  const resumeSubscription = useMutation({
    mutationFn: async () => {
      if (!subscription) return;
      const { error } = await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: false })
        .eq('id', subscription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    },
  });

  const planIcons: Record<string, any> = {
    free: Package,
    pro: Zap,
    business: Crown,
  };

  const defaultFeatures: Record<string, string[]> = {
    free: ['Up to 1 project', 'Up to 50 tasks', 'Basic time tracking', 'Email support'],
    pro: ['Up to 20 projects', 'Up to 500 tasks', 'Team collaboration', 'Custom labels', 'File attachments', 'Priority support'],
    business: ['Unlimited projects', 'Unlimited tasks', 'All Pro features', 'API access', 'Advanced analytics', 'Dedicated support'],
  };

  // Determine if this is the current plan
  // If no plan is set, user is on free plan
  const freePlan = plans?.find(p => p.name === 'free');
  const effectiveCurrentPlan = currentPlan || freePlan;
  const isCurrentPlan = (planId: string) => effectiveCurrentPlan?.id === planId;

  // Check if user is on trial
  const isOnTrial = subscription?.status === 'trialing';

  // Get button text based on plan comparison
  const getButtonText = (plan: Plan) => {
    if (isCurrentPlan(plan.id)) {
      return isOnTrial ? 'Trial Active' : 'Current Plan';
    }

    const currentPrice = effectiveCurrentPlan?.price_monthly || 0;
    const targetPrice = plan.price_monthly;

    if (targetPrice === 0) {
      return 'Downgrade to Free';
    } else if (targetPrice > currentPrice) {
      return !hasPaymentMethod ? 'Add Card & Upgrade' : 'Upgrade Now';
    } else {
      return 'Switch Plan';
    }
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-zinc-400 mt-1">
          Choose the plan that works best for you
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <div className={cn(
          "border rounded-xl p-4",
          subscription.status === 'trialing'
            ? "bg-blue-500/10 border-blue-500/20"
            : "bg-green-500/10 border-green-500/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className={cn(
                "h-5 w-5",
                subscription.status === 'trialing' ? "text-blue-400" : "text-green-400"
              )} />
              <div>
                <p className="text-white font-medium">
                  {subscription.status === 'trialing' ? 'Trial Period' : 'Active Subscription'}
                  {currentPlan && ` - ${currentPlan.display_name}`}
                </p>
                <p className={cn(
                  "text-sm",
                  subscription.status === 'trialing' ? "text-blue-300" : "text-green-300"
                )}>
                  {subscription.status === 'trialing' ? 'Trial ends' : 'Renews'}{' '}
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('lt-LT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
            {subscription.status === 'trialing' && (
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">
                  {subscription.current_period_end
                    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 0}
                </p>
                <p className="text-xs text-blue-300">days left</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Method Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-white font-medium">Payment Method</p>
              <p className="text-sm text-zinc-500">
                {hasPaymentMethod ? 'Card ending in •••• 4242' : 'No payment method added'}
              </p>
            </div>
          </div>
          {!hasPaymentMethod ? (
            <button
              onClick={() => {
                setSelectedPlan(null);
                setShowPaymentModal(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Add Card
            </button>
          ) : (
            <button className="px-4 py-2 text-zinc-400 hover:text-white text-sm">
              Update
            </button>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              billingCycle === 'monthly'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              billingCycle === 'yearly'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Yearly
            <span className="ml-1 text-xs text-green-400">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          const PlanIcon = planIcons[plan.name] || Package;
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const isCurrent = isCurrentPlan(plan.id);
          const features = plan.features_list || defaultFeatures[plan.name] || [];

          return (
            <div
              key={plan.id}
              className={cn(
                'relative border rounded-xl p-6 transition-all',
                isCurrent
                  ? 'border-green-500 bg-green-500/5 ring-2 ring-green-500/20'
                  : plan.name === 'pro'
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  Current Plan
                </span>
              )}
              {plan.name === 'pro' && !isCurrent && (
                <span className="absolute -top-3 left-4 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              )}

              <div className="flex items-center gap-3 mb-4 mt-2">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    plan.name === 'free'
                      ? 'bg-zinc-700'
                      : plan.name === 'pro'
                      ? 'bg-primary/20'
                      : 'bg-purple-500/20'
                  )}
                >
                  <PlanIcon
                    className={cn(
                      'h-6 w-6',
                      plan.name === 'free'
                        ? 'text-zinc-400'
                        : plan.name === 'pro'
                        ? 'text-primary'
                        : 'text-purple-400'
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.display_name}</h3>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  {price === 0 ? 'Free' : `€${price}`}
                </span>
                {price > 0 && (
                  <span className="text-zinc-500 ml-1">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent || subscribeToPlan.isPending}
                className={cn(
                  'w-full py-3 rounded-lg font-semibold transition-all',
                  isCurrent
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : plan.name === 'pro'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : price === 0 && !isCurrent
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                )}
              >
                {subscribeToPlan.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  getButtonText(plan)
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscription Status */}
      {subscription?.cancel_at_period_end && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Subscription Canceling</span>
          </div>
          <p className="text-zinc-400 mb-4">
            Your subscription will end on{' '}
            <strong className="text-white">
              {new Date(subscription.current_period_end!).toLocaleDateString()}
            </strong>
            . After that, you'll be downgraded to the Free plan.
          </p>
          <button
            onClick={() => resumeSubscription.mutate()}
            disabled={resumeSubscription.isPending}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {resumeSubscription.isPending ? 'Resuming...' : 'Resume Subscription'}
          </button>
        </div>
      )}

      {/* Usage Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Usage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Projects</span>
              <span className="text-sm font-medium text-white">
                {projectCount ?? 0} / {effectiveCurrentPlan?.project_limit === null ? '∞' : (effectiveCurrentPlan?.project_limit ?? 1)}
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              {effectiveCurrentPlan?.project_limit !== null ? (
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    (projectCount ?? 0) >= (effectiveCurrentPlan?.project_limit ?? 1) ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(((projectCount ?? 0) / (effectiveCurrentPlan?.project_limit ?? 1)) * 100, 100)}%` }}
                />
              ) : (
                <div className="h-2 rounded-full bg-green-500 w-full opacity-30" />
              )}
            </div>
          </div>
          <div className="p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Tasks</span>
              <span className="text-sm font-medium text-white">
                {taskCount ?? 0} / {effectiveCurrentPlan?.task_limit === null ? '∞' : (effectiveCurrentPlan?.task_limit ?? 50)}
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              {effectiveCurrentPlan?.task_limit !== null ? (
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    (taskCount ?? 0) >= (effectiveCurrentPlan?.task_limit ?? 50) ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(((taskCount ?? 0) / (effectiveCurrentPlan?.task_limit ?? 50)) * 100, 100)}%` }}
                />
              ) : (
                <div className="h-2 rounded-full bg-green-500 w-full opacity-30" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">Payment History</h2>
          </div>
        </div>
        {payments && payments.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-white font-medium">€{payment.amount}</p>
                  <p className="text-sm text-zinc-500">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    payment.status === 'succeeded'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  )}
                >
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No payment history yet</p>
          </div>
        )}
      </div>

      {/* Cancel Subscription - only for paid plans */}
      {currentPlan && currentPlan.name !== 'free' && !subscription?.cancel_at_period_end && (
        <div className="text-center">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-zinc-500 hover:text-red-400 text-sm transition-colors"
          >
            Cancel Subscription & Switch to Free
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {selectedPlan ? `Upgrade to ${selectedPlan.display_name}` : 'Add Payment Method'}
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPlan(null);
                  setPaymentError(null);
                }}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paymentError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
                {paymentError}
              </div>
            )}

            {selectedPlan && (
              <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{selectedPlan.display_name}</p>
                    <p className="text-sm text-zinc-500">
                      Billed {billingCycle}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-white">
                    €{billingCycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly}
                  </p>
                </div>
              </div>
            )}

            {!hasPaymentMethod ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm">
                  You need to add a payment method to upgrade to a paid plan.
                </p>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="h-5 w-5 text-zinc-400" />
                    <span className="text-white font-medium">Credit or Debit Card</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Secure payment processed by Stripe. Your card details are never stored on our servers.
                  </p>
                </div>
                <button
                  onClick={() => addPaymentMethod.mutate()}
                  disabled={addPaymentMethod.isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {addPaymentMethod.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Add Payment Method
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">VISA</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">•••• •••• •••• 4242</p>
                        <p className="text-xs text-zinc-500">Expires 12/25</p>
                      </div>
                    </div>
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <button
                  onClick={() => selectedPlan && subscribeToPlan.mutate(selectedPlan.id)}
                  disabled={subscribeToPlan.isPending || !selectedPlan}
                  className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {subscribeToPlan.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    `Pay €${selectedPlan ? (billingCycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly) : 0}`
                  )}
                </button>
              </div>
            )}

            <p className="text-xs text-zinc-500 text-center mt-4">
              By proceeding, you agree to our Terms of Service and authorize recurring charges.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Cancel Subscription?</h2>
            </div>
            <p className="text-zinc-400 mb-6">
              You will be immediately switched to the Free plan and lose access to premium features.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => cancelSubscription.mutate()}
                disabled={cancelSubscription.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {cancelSubscription.isPending ? 'Canceling...' : 'Switch to Free'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
