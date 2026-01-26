import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  tm_projects: {
    id: string;
    name: string;
    color: string;
  } | null;
}

const statusColors: Record<string, string> = {
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
};

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Fetch all projects user has access to
  const { data: projects } = useQuery({
    queryKey: ['user-projects-calendar', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          tm_projects (id, name, color)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      return data?.map((d) => d.tm_projects).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  // Fetch all tasks with due dates
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['calendar-tasks', user?.id, selectedProject, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      // Get the start and end of the visible calendar range
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Extend to include visible days from prev/next months
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

      let query = supabase
        .from('tm_tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          tm_projects (id, name, color)
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Task[];
    },
    enabled: !!user,
  });

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Array<{ date: Date; isCurrentMonth: boolean; tasks: Task[] }> = [];

    // Add days from previous month
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, tasks: [] });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true, tasks: [] });
    }

    // Add days from next month
    const endDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, tasks: [] });
    }

    // Assign tasks to days
    tasks?.forEach((task) => {
      if (!task.due_date) return;
      const taskDate = new Date(task.due_date + 'T00:00:00');
      const day = days.find((d) =>
        d.date.getFullYear() === taskDate.getFullYear() &&
        d.date.getMonth() === taskDate.getMonth() &&
        d.date.getDate() === taskDate.getDate()
      );
      if (day) {
        day.tasks.push(task);
      }
    });

    return days;
  }, [currentDate, tasks]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-zinc-400 mt-1">
            View and manage tasks by date
          </p>
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Projects</option>
          {projects?.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={cn(
                'min-h-[120px] p-2 border-b border-r border-zinc-800',
                !day.isCurrentMonth && 'bg-zinc-900/50',
                index % 7 === 6 && 'border-r-0',
                index >= calendarDays.length - 7 && 'border-b-0'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full text-sm',
                    isToday(day.date)
                      ? 'bg-primary text-white font-semibold'
                      : day.isCurrentMonth
                      ? 'text-white'
                      : 'text-zinc-600'
                  )}
                >
                  {day.date.getDate()}
                </span>
                {day.tasks.length > 0 && (
                  <span className="text-xs text-zinc-500">{day.tasks.length}</span>
                )}
              </div>

              {/* Tasks for this day */}
              <div className="space-y-1">
                {day.tasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className={cn(
                      'block px-2 py-1 text-xs rounded border-l-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors truncate',
                      priorityColors[task.priority] || 'border-l-zinc-500'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusColors[task.status])}
                      />
                      <span className={cn(
                        'truncate',
                        task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-300'
                      )}>
                        {task.title}
                      </span>
                    </div>
                  </Link>
                ))}
                {day.tasks.length > 3 && (
                  <p className="text-xs text-zinc-500 px-2">
                    +{day.tasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <span className="font-medium">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-500" />
          To Do
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          In Progress
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Review
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Done
        </div>
      </div>
    </div>
  );
}
