import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  CreditCard,
  Search,
  Filter,
  Loader2,
  User,
  Calendar,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserWithSubscription {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  plan_id: string | null;
  plans: {
    name: string;
    display_name: string;
    price_monthly: number;
  } | null;
  subscriptions: {
    id: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    current_period_start: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    created_at: string;
  }[] | null;
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  canceled: { label: 'Canceled', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  past_due: { label: 'Past Due', color: 'bg-yellow-500/10 text-yellow-400', icon: AlertCircle },
  trialing: { label: 'Trial', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  free: { label: 'Free', color: 'bg-zinc-500/10 text-zinc-400', icon: User },
};

export default function SubscriptionManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(14);
  const [showTrialModal, setShowTrialModal] = useState<string | null>(null);
  const [showChangePlanModal, setShowChangePlanModal] = useState<UserWithSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const perPage = 15;

  // Fetch all users with their subscription info
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', search, statusFilter, page],
    queryFn: async () => {
      // Query profiles (all users) with their plan and subscription info
      let query = supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          avatar_url,
          created_at,
          plan_id,
          plans (name, display_name, price_monthly),
          subscriptions (id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_customer_id, created_at)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // Process data and determine status
      let users = (data as any[]).map(user => {
        const subscription = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions;
        const plan = Array.isArray(user.plans) ? user.plans[0] : user.plans;
        const planName = plan?.name || 'free';

        // Determine effective status
        let effectiveStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'free' = 'free';
        if (subscription) {
          effectiveStatus = subscription.status;
        } else if (planName === 'free' || !user.plan_id) {
          effectiveStatus = 'free';
        }

        return {
          ...user,
          plans: plan,
          subscription,
          effectiveStatus,
        };
      });

      // Filter by status
      if (statusFilter !== 'all') {
        users = users.filter(u => u.effectiveStatus === statusFilter);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(searchLower) ||
            u.plans?.display_name?.toLowerCase().includes(searchLower)
        );
      }

      return { users, total: count || 0 };
    },
  });

  // Fetch plans for change plan modal
  const { data: plans } = useQuery({
    queryKey: ['plans-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, price_monthly')
        .eq('is_active', true)
        .order('price_monthly');
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats for all users (separate from paginated data)
  const { data: statsData, error: statsError } = useQuery({
    queryKey: ['admin-subscription-stats'],
    queryFn: async () => {
      // Get all profiles with their subscriptions to calculate accurate stats
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          plan_id,
          plans (name),
          subscriptions (status)
        `);

      if (error) {
        console.error('Error fetching subscription stats:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No profiles found - check RLS policies for admin access');
        return { free: 0, active: 0, trialing: 0, canceled: 0, pastDue: 0 };
      }

      const stats = { free: 0, active: 0, trialing: 0, canceled: 0, pastDue: 0 };

      (data as any[]).forEach(user => {
        const subscription = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions;
        const plan = Array.isArray(user.plans) ? user.plans[0] : user.plans;

        if (subscription) {
          switch (subscription.status) {
            case 'active': stats.active++; break;
            case 'trialing': stats.trialing++; break;
            case 'canceled': stats.canceled++; break;
            case 'past_due': stats.pastDue++; break;
            default: stats.free++;
          }
        } else if (!plan || plan.name === 'free' || !user.plan_id) {
          stats.free++;
        } else {
          stats.free++;
        }
      });

      return stats;
    },
  });

  // Log stats error if any
  if (statsError) {
    console.error('Stats query error:', statsError);
  }

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      setActionMenu(null);
    },
  });

  // Reactivate subscription
  const reactivateSubscription = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      setActionMenu(null);
    },
  });

  // Start trial
  const startTrial = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Get Pro plan ID
      const { data: proPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'pro')
        .single();

      if (!proPlan) throw new Error('Pro plan not found');

      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_id: proPlan.id,
        status: 'trialing',
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        cancel_at_period_end: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      setShowTrialModal(null);
    },
  });

  // Change plan
  const changePlan = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      // Update profile's plan_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan_id: planId })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Update subscription if exists, or create one
      const plan = plans?.find(p => p.id === planId);
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: subError } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_id: planId,
        status: plan?.price_monthly === 0 ? 'canceled' : 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      setShowChangePlanModal(null);
    },
  });

  // Extend trial
  const extendTrial = useMutation({
    mutationFn: async ({ subId, days }: { subId: string; days: number }) => {
      const user = data?.users.find((u) => u.subscription?.id === subId);
      if (!user?.subscription) throw new Error('Subscription not found');

      const currentEnd = user.subscription.current_period_end
        ? new Date(user.subscription.current_period_end)
        : new Date();
      currentEnd.setDate(currentEnd.getDate() + days);

      const { error } = await supabase
        .from('subscriptions')
        .update({
          current_period_end: currentEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      setActionMenu(null);
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / perPage);

  // Stats from separate query (all users, not just current page)
  const stats = statsData || {
    active: 0,
    trialing: 0,
    canceled: 0,
    pastDue: 0,
    free: 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
        <p className="text-zinc-400 mt-1">
          Manage user subscriptions, trials, and billing
        </p>
      </div>

      {/* Stats - clickable to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'free' ? 'all' : 'free')}
          className={cn(
            "bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-zinc-600",
            statusFilter === 'free' ? "border-zinc-400 ring-2 ring-zinc-400/20" : "border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <User className="h-4 w-4" />
            <span className="text-sm">Free</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.free}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          className={cn(
            "bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-green-600",
            statusFilter === 'active' ? "border-green-500 ring-2 ring-green-500/20" : "border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.active}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'trialing' ? 'all' : 'trialing')}
          className={cn(
            "bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-blue-600",
            statusFilter === 'trialing' ? "border-blue-500 ring-2 ring-blue-500/20" : "border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Trialing</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.trialing}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'canceled' ? 'all' : 'canceled')}
          className={cn(
            "bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-red-600",
            statusFilter === 'canceled' ? "border-red-500 ring-2 ring-red-500/20" : "border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Canceled</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.canceled}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'past_due' ? 'all' : 'past_due')}
          className={cn(
            "bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-yellow-600",
            statusFilter === 'past_due' ? "border-yellow-500 ring-2 ring-yellow-500/20" : "border-zinc-800"
          )}
        >
          <div className="flex items-center gap-2 text-yellow-400 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Past Due</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.pastDue}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by user or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="free">Free</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                User
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                Plan
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                Period End
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                Created
              </th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data?.users.map((user: any) => {
              const status = statusConfig[user.effectiveStatus as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              return (
                <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                      <span className="text-white font-medium">
                        {user.full_name || 'Unknown User'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{user.plans?.display_name || 'Free'}</p>
                      <p className="text-xs text-zinc-500">
                        {user.plans?.price_monthly === 0 || !user.plans ? 'Free' : `€${user.plans?.price_monthly}/mo`}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        status.color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                      {user.subscription?.cancel_at_period_end && user.effectiveStatus === 'active' && (
                        <span className="text-yellow-400">(Canceling)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {user.subscription?.current_period_end
                      ? new Date(user.subscription.current_period_end).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {actionMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 py-1">
                          <button
                            onClick={() => {
                              setShowChangePlanModal(user);
                              setSelectedPlanId(user.plan_id || '');
                              setActionMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            Change Plan
                          </button>
                          {user.effectiveStatus === 'free' && (
                            <button
                              onClick={() => setShowTrialModal(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Gift className="h-4 w-4" />
                              Start Trial
                            </button>
                          )}
                          {user.effectiveStatus === 'trialing' && user.subscription && (
                            <button
                              onClick={() => extendTrial.mutate({ subId: user.subscription.id, days: 7 })}
                              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Calendar className="h-4 w-4" />
                              Extend Trial +7 days
                            </button>
                          )}
                          {user.effectiveStatus === 'active' && user.subscription && !user.subscription.cancel_at_period_end && (
                            <button
                              onClick={() => cancelSubscription.mutate(user.subscription.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel Subscription
                            </button>
                          )}
                          {user.subscription && (user.effectiveStatus === 'canceled' || user.subscription.cancel_at_period_end) && (
                            <button
                              onClick={() => reactivateSubscription.mutate(user.subscription.id)}
                              className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Reactivate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data?.users.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No subscriptions found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-400">
              Showing {(page - 1) * perPage + 1} to{' '}
              {Math.min(page * perPage, data?.total || 0)} of {data?.total || 0}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-white">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Change Plan</h2>
            <p className="text-zinc-400 mb-4">
              Change plan for {showChangePlanModal.full_name}
            </p>
            <div className="space-y-2 mb-6">
              {plans?.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-colors',
                    selectedPlanId === plan.id
                      ? 'border-primary bg-primary/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{plan.display_name}</span>
                    <span className="text-zinc-400">
                      {plan.price_monthly === 0 ? 'Free' : `€${plan.price_monthly}/mo`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowChangePlanModal(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  changePlan.mutate({
                    userId: showChangePlanModal.id,
                    planId: selectedPlanId,
                  })
                }
                disabled={changePlan.isPending || selectedPlanId === showChangePlanModal.plan_id}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {changePlan.isPending ? 'Changing...' : 'Change Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Trial Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Gift className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Start Trial</h2>
            </div>
            <p className="text-zinc-400 mb-4">
              Grant Pro plan trial access to this user.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Trial Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
                  min="1"
                  max="90"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
                <span className="text-zinc-400">days</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTrialModal(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  startTrial.mutate({ userId: showTrialModal, days: trialDays })
                }
                disabled={startTrial.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {startTrial.isPending ? 'Starting...' : 'Start Trial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
