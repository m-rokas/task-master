import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserPlus,
  CheckSquare,
  FolderKanban,
  Loader2,
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch user stats
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

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

        // Fetch subscription stats
        const { data: subData } = await supabase
          .from('profiles')
          .select('id, subscriptions(status)');

        const subCounts: Record<string, number> = { free: 0, active: 0, trialing: 0, canceled: 0, past_due: 0 };
        subData?.forEach((p: any) => {
          const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
          if (sub) {
            const status = sub.status || 'free';
            subCounts[status] = (subCounts[status] || 0) + 1;
          } else {
            subCounts['free'] = (subCounts['free'] || 0) + 1;
          }
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
    </div>
  );
}
