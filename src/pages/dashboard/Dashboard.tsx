import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  ArrowRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Project } from '@/types/database';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  projectCount: number;
}

export default function Dashboard() {
  const { user, profile, plan } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    projectCount: 0,
  });
  const [recentTasks, setRecentTasks] = useState<(Task & { project?: Project })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch projects count
      const { count: projectCount } = await supabase
        .from('tm_projects')
        .select('*', { count: 'exact', head: true });

      // Fetch all tasks stats
      const { data: tasks } = await supabase
        .from('tm_tasks')
        .select('id, status, due_date');

      const taskList = (tasks || []) as { id: string; status: string; due_date: string | null }[];
      const today = new Date().toISOString().split('T')[0];
      const totalTasks = taskList.length;
      const completedTasks = taskList.filter((t) => t.status === 'done').length;
      const overdueTasks = taskList.filter(
        (t) => t.due_date && t.due_date < today && t.status !== 'done'
      ).length;

      setStats({
        totalTasks,
        completedTasks,
        overdueTasks,
        projectCount: projectCount || 0,
      });

      // Fetch recent tasks (including completed)
      const { data: recent } = await supabase
        .from('tm_tasks')
        .select(`
          *,
          tm_projects (id, name, color)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);

      setRecentTasks((recent as any) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckCircle2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      subtitle: `${completionRate}% completion rate`,
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Projects',
      value: stats.projectCount,
      icon: FolderKanban,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      subtitle: plan ? `${plan.project_limit ? `${stats.projectCount}/${plan.project_limit}` : 'Unlimited'}` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-zinc-400 mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-zinc-400 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-zinc-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={cn('p-3 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-6 w-6', stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Tasks</h2>
          <Link
            to="/tasks"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : recentTasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 mb-2">No tasks yet</p>
            <p className="text-zinc-500 text-sm mb-4">
              Create your first project to get started
            </p>
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Create project
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors"
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full flex-shrink-0 border-2',
                      task.priority === 'urgent' && 'border-red-500',
                      task.priority === 'high' && 'border-orange-500',
                      task.priority === 'medium' && 'border-yellow-500',
                      task.priority === 'low' && 'border-green-500'
                    )}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    task.status === 'done' ? 'text-zinc-500 line-through' : 'text-white'
                  )}>
                    {task.title}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {(task as any).tm_projects?.name || 'No project'}
                  </p>
                </div>
                {task.due_date && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-sm",
                    task.status === 'done' ? 'text-zinc-600' : 'text-zinc-400'
                  )}>
                    <Clock className="h-4 w-4" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
                <span
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full capitalize',
                    task.status === 'todo' && 'bg-zinc-700 text-zinc-300',
                    task.status === 'in_progress' && 'bg-blue-500/20 text-blue-400',
                    task.status === 'review' && 'bg-purple-500/20 text-purple-400',
                    task.status === 'done' && 'bg-green-500/20 text-green-400'
                  )}
                >
                  {task.status === 'done' ? '✓ Done' : task.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
