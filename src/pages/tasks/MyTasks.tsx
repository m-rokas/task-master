import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'all', label: 'All Priority' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusColors: Record<string, string> = {
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
};

const priorityColors: Record<string, string> = {
  urgent: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-green-500 bg-green-500/10',
};

export default function MyTasks() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks', user?.id, statusFilter, priorityFilter],
    queryFn: async () => {
      if (!user) return [];

      // Fetch ALL tasks - RLS will handle access control
      let query = supabase
        .from('tm_tasks')
        .select(`
          *,
          tm_projects (id, name, color),
          task_assignees (user_id)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTasks = {
    overdue: filteredTasks?.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    ) || [],
    today: filteredTasks?.filter((t) => {
      if (!t.due_date || t.status === 'done') return false;
      const today = new Date().toISOString().split('T')[0];
      return t.due_date === today;
    }) || [],
    upcoming: filteredTasks?.filter((t) => {
      if (!t.due_date || t.status === 'done') return false;
      const today = new Date().toISOString().split('T')[0];
      return t.due_date > today;
    }) || [],
    noDueDate: filteredTasks?.filter((t) => !t.due_date && t.status !== 'done') || [],
    completed: filteredTasks?.filter((t) => t.status === 'done') || [],
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
        <h1 className="text-2xl font-bold text-white">My Tasks</h1>
        <p className="text-zinc-400 mt-1">
          All tasks assigned to you across projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <CheckSquare className="h-4 w-4" />
            Total
          </div>
          <p className="text-2xl font-bold text-white">{filteredTasks?.length || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <AlertCircle className="h-4 w-4" />
            Overdue
          </div>
          <p className="text-2xl font-bold text-red-500">{groupedTasks.overdue.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
            <Clock className="h-4 w-4" />
            In Progress
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {filteredTasks?.filter((t) => t.status === 'in_progress').length || 0}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
            <CheckSquare className="h-4 w-4" />
            Completed
          </div>
          <p className="text-2xl font-bold text-green-500">{groupedTasks.completed.length}</p>
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {groupedTasks.overdue.length > 0 && (
          <TaskGroup
            title="Overdue"
            tasks={groupedTasks.overdue}
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            variant="danger"
          />
        )}
        {groupedTasks.today.length > 0 && (
          <TaskGroup
            title="Due Today"
            tasks={groupedTasks.today}
            icon={<Calendar className="h-5 w-5 text-yellow-500" />}
            variant="warning"
          />
        )}
        {groupedTasks.upcoming.length > 0 && (
          <TaskGroup
            title="Upcoming"
            tasks={groupedTasks.upcoming}
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
          />
        )}
        {groupedTasks.noDueDate.length > 0 && (
          <TaskGroup
            title="No Due Date"
            tasks={groupedTasks.noDueDate}
            icon={<Clock className="h-5 w-5 text-zinc-500" />}
          />
        )}
        {groupedTasks.completed.length > 0 && statusFilter !== 'done' && (
          <TaskGroup
            title="Completed"
            tasks={groupedTasks.completed}
            icon={<CheckSquare className="h-5 w-5 text-green-500" />}
            defaultCollapsed
          />
        )}
      </div>

      {filteredTasks?.length === 0 && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
          <CheckSquare className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
          <p className="text-zinc-400">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : "You don't have any tasks assigned yet"}
          </p>
        </div>
      )}
    </div>
  );
}

interface TaskGroupProps {
  title: string;
  tasks: any[];
  icon: React.ReactNode;
  variant?: 'danger' | 'warning' | 'default';
  defaultCollapsed?: boolean;
}

function TaskGroup({ title, tasks, icon, variant: _variant = 'default', defaultCollapsed = false }: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-white">{title}</span>
          <span className="text-sm text-zinc-500">({tasks.length})</span>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-zinc-400 transition-transform',
            collapsed && '-rotate-90'
          )}
        />
      </button>
      {!collapsed && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors"
    >
      <div
        className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[task.status])}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-white font-medium truncate', task.status === 'done' && 'line-through text-zinc-500')}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {task.tm_projects && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.tm_projects.color }}
              />
              {task.tm_projects.name}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              'text-xs',
              new Date(task.due_date) < new Date() && task.status !== 'done'
                ? 'text-red-500'
                : 'text-zinc-500'
            )}>
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium capitalize',
          priorityColors[task.priority]
        )}
      >
        {task.priority}
      </span>
    </Link>
  );
}
