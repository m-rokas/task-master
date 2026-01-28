import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserPlus,
  CheckSquare,
  FolderKanban,
  Loader2,
  Clock,
  AlertTriangle,
  CreditCard,
  CalendarClock,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  usersByPlan: { plan: string; count: number }[];
  subscriptionStats: { status: string; count: number }[];
}

interface ExpiringSubscription {
  id: string;
  user_id: string;
  user_name: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  days_left: number;
  has_payment_method: boolean;
}

interface ExpirationStats {
  expiringIn3Days: ExpiringSubscription[];
  expiringIn7Days: ExpiringSubscription[];
  activeTrials: ExpiringSubscription[];
  expiredNoPayment: number;
  autoRenewReady: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expirationStats, setExpirationStats] = useState<ExpirationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch user stats
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) {
          console.error('Error fetching total users:', usersError);
        }

        const { count: activeUsers, error: activeError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (activeError) {
          console.error('Error fetching active users:', activeError);
        }

        // Fetch project stats
        const { count: totalProjects } = await supabase
          .from('tm_projects')
          .select('*', { count: 'exact', head: true });

        // Fetch task stats
        const { count: totalTasks } = await supabase
          .from('tm_tasks')
          .select('*', { count: 'exact', head: true });

        const { count: completedTasks } = await supabase
          .from('tm_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done');

        // Users by plan - include ALL users (those with null plan_id are "free")
        const { data: planData } = await supabase
          .from('profiles')
          .select('plan_id, plans(name)');

        const planCounts: Record<string, number> = {};
        planData?.forEach((p: any) => {
          const planName = p.plans?.name || 'Free';
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        });

        // Fetch subscription stats - direct query to subscriptions table
        const { data: allSubscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('user_id, status');

        if (subsError) {
          console.error('Error fetching subscriptions:', subsError);
        }

        // Get unique users with subscriptions
        const usersWithSubs = new Set(allSubscriptions?.map(s => s.user_id) || []);

        // Count subscriptions by status (using latest subscription per user)
        const subCounts: Record<string, number> = { free: 0, active: 0, trialing: 0, canceled: 0, past_due: 0 };

        // Group by user and get the latest status
        const userSubStatus: Record<string, string> = {};
        allSubscriptions?.forEach((s: any) => {
          // If user already has a status, keep the "best" one (active > trialing > others)
          const priority: Record<string, number> = { active: 3, trialing: 2, past_due: 1, canceled: 0 };
          const currentPriority = priority[userSubStatus[s.user_id]] ?? -1;
          const newPriority = priority[s.status] ?? -1;
          if (newPriority > currentPriority) {
            userSubStatus[s.user_id] = s.status;
          }
        });

        // Count statuses
        Object.values(userSubStatus).forEach(status => {
          subCounts[status] = (subCounts[status] || 0) + 1;
        });

        // Count free users (users without any subscription)
        // Ensure we don't go negative if totalUsers is 0 due to query issues
        subCounts['free'] = Math.max(0, (totalUsers || 0) - usersWithSubs.size);

        // Fetch expiration stats - subscriptions expiring soon
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: expiringSubscriptions } = await supabase
          .from('subscriptions')
          .select(`
            id,
            user_id,
            status,
            current_period_end,
            stripe_customer_id,
            profiles!inner(full_name),
            plans!inner(name, display_name)
          `)
          .in('status', ['active', 'trialing'])
          .not('current_period_end', 'is', null)
          .lte('current_period_end', sevenDaysFromNow.toISOString())
          .gte('current_period_end', now.toISOString())
          .order('current_period_end', { ascending: true });

        const processedExpiring: ExpiringSubscription[] = (expiringSubscriptions || []).map((sub: any) => {
          const endDate = new Date(sub.current_period_end);
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: sub.id,
            user_id: sub.user_id,
            user_name: sub.profiles?.full_name || 'Unknown User',
            plan_name: sub.plans?.display_name || sub.plans?.name || 'Unknown',
            status: sub.status,
            current_period_end: sub.current_period_end,
            days_left: daysLeft,
            has_payment_method: !!sub.stripe_customer_id,
          };
        });

        const expiringIn3Days = processedExpiring.filter(s => s.days_left <= 3);
        const expiringIn7Days = processedExpiring.filter(s => s.days_left > 3 && s.days_left <= 7);
        const activeTrials = processedExpiring.filter(s => s.status === 'trialing');
        const expiredNoPayment = processedExpiring.filter(s => !s.has_payment_method).length;
        const autoRenewReady = processedExpiring.filter(s => s.has_payment_method && s.status === 'active').length;

        setExpirationStats({
          expiringIn3Days,
          expiringIn7Days,
          activeTrials,
          expiredNoPayment,
          autoRenewReady,
        });

        setStats({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalProjects: totalProjects || 0,
          totalTasks: totalTasks || 0,
          completedTasks: completedTasks || 0,
          usersByPlan: Object.entries(planCounts).map(([plan, count]) => ({
            plan,
            count,
          })),
          subscriptionStats: Object.entries(subCounts).map(([status, count]) => ({
            status,
            count,
          })),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: UserPlus,
      color: 'text-green-500',
    },
    {
      label: 'Total Projects',
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      color: 'text-purple-500',
    },
    {
      label: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      color: 'text-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-1">Platform overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-sm">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Task Completion
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Completed</span>
                <span className="text-white">
                  {stats?.completedTasks || 0} / {stats?.totalTasks || 0}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${stats?.totalTasks ? ((stats?.completedTasks || 0) / stats.totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users by Plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Users by Plan
          </h3>
          <div className="space-y-3">
            {stats?.usersByPlan.length ? (
              stats.usersByPlan.map((plan) => (
                <div
                  key={plan.plan}
                  className="flex items-center justify-between"
                >
                  <span className="text-zinc-400 capitalize">{plan.plan}</span>
                  <span className="text-white font-medium">{plan.count}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500">No plan data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Subscription Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {stats?.subscriptionStats.map((stat) => {
            const statusColors: Record<string, string> = {
              free: 'text-zinc-400 bg-zinc-500/10',
              active: 'text-green-400 bg-green-500/10',
              trialing: 'text-blue-400 bg-blue-500/10',
              canceled: 'text-red-400 bg-red-500/10',
              past_due: 'text-yellow-400 bg-yellow-500/10',
            };
            const statusLabels: Record<string, string> = {
              free: 'Free',
              active: 'Active',
              trialing: 'Trial',
              canceled: 'Canceled',
              past_due: 'Past Due',
            };
            return (
              <div
                key={stat.status}
                className={`rounded-lg p-4 ${statusColors[stat.status] || 'bg-zinc-800'}`}
              >
                <p className="text-sm opacity-80">{statusLabels[stat.status] || stat.status}</p>
                <p className="text-2xl font-bold">{stat.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expiration Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Expiration Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Expiring in 3 Days</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {expirationStats?.expiringIn3Days.length || 0}
              </p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Expiring in 7 Days</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {expirationStats?.expiringIn7Days.length || 0}
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Active Trials</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {expirationStats?.activeTrials.length || 0}
              </p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Auto-Renew Ready</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {expirationStats?.autoRenewReady || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Subscriptions Expiring Soon List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Expiring Soon</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {expirationStats?.expiringIn3Days.length === 0 &&
             expirationStats?.expiringIn7Days.length === 0 ? (
              <p className="text-zinc-500 text-sm">No subscriptions expiring soon</p>
            ) : (
              <>
                {expirationStats?.expiringIn3Days.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{sub.user_name}</p>
                      <p className="text-zinc-400 text-xs">
                        {sub.plan_name} • {sub.status === 'trialing' ? 'Trial' : 'Paid'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-medium text-sm">
                        {sub.days_left === 0 ? 'Today' : sub.days_left === 1 ? 'Tomorrow' : `${sub.days_left} days`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {sub.has_payment_method ? '💳 Card on file' : '⚠️ No card'}
                      </p>
                    </div>
                  </div>
                ))}
                {expirationStats?.expiringIn7Days.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{sub.user_name}</p>
                      <p className="text-zinc-400 text-xs">
                        {sub.plan_name} • {sub.status === 'trialing' ? 'Trial' : 'Paid'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 font-medium text-sm">{sub.days_left} days</p>
                      <p className="text-xs text-zinc-500">
                        {sub.has_payment_method ? '💳 Card on file' : '⚠️ No card'}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Trials Detail */}
      {expirationStats && expirationStats.activeTrials.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Active Trials</h3>
            <span className="ml-auto text-sm text-zinc-400">
              {expirationStats.activeTrials.length} active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expirationStats.activeTrials.map((trial) => (
              <div
                key={trial.id}
                className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium text-sm">{trial.user_name}</p>
                  <p className="text-zinc-400 text-xs">{trial.plan_name}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${
                    trial.days_left <= 1 ? 'text-red-400' :
                    trial.days_left <= 3 ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {trial.days_left === 0 ? 'Expires today' :
                     trial.days_left === 1 ? '1 day left' :
                     `${trial.days_left} days left`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {trial.has_payment_method ? '💳 Will charge' : '➡️ Will downgrade'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
