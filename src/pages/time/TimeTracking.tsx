import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Pause,
  Play,
  Clock,
  Calendar,
  Plus,
  Loader2,
  Trash2,
  CheckSquare,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimeTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    task_id: '',
    duration_minutes: 30,
    description: '',
    started_at: new Date().toISOString().slice(0, 16),
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch time entries
  const { data: timeEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['time-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          tm_tasks (id, title, tm_projects (id, name, color))
        `)
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch tasks for selection - get ALL tasks (RLS handles access)
  const { data: tasks } = useQuery({
    queryKey: ['user-tasks-for-time', user?.id],
    queryFn: async () => {
      // Simply fetch all tasks - RLS will filter based on user access
      const { data, error } = await supabase
        .from('tm_tasks')
        .select(`
          id,
          title,
          status,
          tm_projects (id, name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort: non-done tasks first, then done tasks
      return data?.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return 0;
      }) || [];
    },
    enabled: !!user,
  });

  // Check for running timer
  useEffect(() => {
    const runningEntry = timeEntries?.find((e) => e.is_running);
    if (runningEntry) {
      setActiveTimer(runningEntry.id);
      const startTime = new Date(runningEntry.started_at).getTime();
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }
  }, [timeEntries]);

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const [timerError, setTimerError] = useState<string | null>(null);

  // Start timer
  const startTimer = useMutation({
    mutationFn: async (taskId: string) => {
      setTimerError(null);
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          duration_minutes: 0,
          started_at: new Date().toISOString(),
          is_running: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveTimer(data.id);
      setElapsedTime(0);
      setSelectedTaskId('');
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: Error) => {
      console.error('Failed to start timer:', error);
      setTimerError(error.message || 'Failed to start timer');
    },
  });

  // Stop timer
  const stopTimer = useMutation({
    mutationFn: async () => {
      if (!activeTimer) return;
      setTimerError(null);
      const durationMinutes = Math.ceil(elapsedTime / 60);
      const { error } = await supabase
        .from('time_entries')
        .update({
          duration_minutes: durationMinutes,
          ended_at: new Date().toISOString(),
          is_running: false,
        })
        .eq('id', activeTimer);

      if (error) throw error;
    },
    onSuccess: () => {
      setActiveTimer(null);
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: Error) => {
      console.error('Failed to stop timer:', error);
      setTimerError(error.message || 'Failed to stop timer');
    },
  });

  // Add manual entry
  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('time_entries').insert({
        task_id: manualEntry.task_id,
        user_id: user?.id,
        duration_minutes: manualEntry.duration_minutes,
        description: manualEntry.description || null,
        started_at: new Date(manualEntry.started_at).toISOString(),
        is_running: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowAddEntry(false);
      setManualEntry({
        task_id: '',
        duration_minutes: 30,
        description: '',
        started_at: new Date().toISOString().slice(0, 16),
      });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });

  // Delete entry
  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate totals
  const todayTotal = timeEntries
    ?.filter((e) => {
      const entryDate = new Date(e.started_at).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      return entryDate === today;
    })
    .reduce((acc, e) => acc + (e.duration_minutes || 0), 0) || 0;

  const weekTotal = timeEntries
    ?.filter((e) => {
      const entryDate = new Date(e.started_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    })
    .reduce((acc, e) => acc + (e.duration_minutes || 0), 0) || 0;

  // Filter entries by search
  const filteredEntries = timeEntries?.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const taskTitle = ((entry.tm_tasks as any)?.title || '').toLowerCase();
    const projectName = ((entry.tm_tasks as any)?.tm_projects?.name || '').toLowerCase();
    const description = (entry.description || '').toLowerCase();
    return taskTitle.includes(query) || projectName.includes(query) || description.includes(query);
  });

  if (entriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
          <p className="text-zinc-400 mt-1">Track time spent on your tasks</p>
        </div>
        <button
          onClick={() => setShowAddEntry(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Timer Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Timer</h2>
        {timerError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {timerError}
          </div>
        )}
        <div className="flex items-center gap-6">
          <div className="text-4xl font-mono font-bold text-white">
            {formatTime(elapsedTime)}
          </div>
          {activeTimer ? (
            <button
              onClick={() => stopTimer.mutate()}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
            >
              <Pause className="h-5 w-5" />
              Stop
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <select
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="" disabled>
                  Select task...
                </option>
                {tasks?.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title} - {(task.tm_projects as any)?.name}{task.status === 'done' ? ' (Done)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedTaskId && startTimer.mutate(selectedTaskId)}
                disabled={!selectedTaskId || startTimer.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-5 w-5" />
                Start
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Clock className="h-4 w-4" />
            Today
          </div>
          <p className="text-2xl font-bold text-white">{formatDuration(todayTotal)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Calendar className="h-4 w-4" />
            This Week
          </div>
          <p className="text-2xl font-bold text-white">{formatDuration(weekTotal)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <CheckSquare className="h-4 w-4" />
            Total Entries
          </div>
          <p className="text-2xl font-bold text-white">{timeEntries?.length || 0}</p>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Recent Time Entries</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full sm:w-64 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {filteredEntries?.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No time entries yet</p>
            </div>
          ) : (
            filteredEntries?.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{
                      backgroundColor:
                        (entry.tm_tasks as any)?.tm_projects?.color || '#6366f1',
                    }}
                  />
                  <div>
                    <p className="font-medium text-white">
                      {(entry.tm_tasks as any)?.title || 'Unknown Task'}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {(entry.tm_tasks as any)?.tm_projects?.name || 'No Project'} •{' '}
                      {new Date(entry.started_at).toLocaleDateString()}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-zinc-400 mt-1">{entry.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'font-mono font-medium',
                      entry.is_running ? 'text-green-500' : 'text-white'
                    )}
                  >
                    {entry.is_running ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Running
                      </span>
                    ) : (
                      formatDuration(entry.duration_minutes)
                    )}
                  </span>
                  {!entry.is_running && (
                    <button
                      onClick={() => deleteEntry.mutate(entry.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add Time Entry</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Task
                </label>
                <select
                  value={manualEntry.task_id}
                  onChange={(e) =>
                    setManualEntry({ ...manualEntry, task_id: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a task...</option>
                  {tasks?.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={manualEntry.duration_minutes}
                  onChange={(e) =>
                    setManualEntry({
                      ...manualEntry,
                      duration_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={manualEntry.started_at}
                  onChange={(e) =>
                    setManualEntry({ ...manualEntry, started_at: e.target.value })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={manualEntry.description}
                  onChange={(e) =>
                    setManualEntry({ ...manualEntry, description: e.target.value })
                  }
                  placeholder="What did you work on?"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddEntry(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => addEntry.mutate()}
                disabled={!manualEntry.task_id || addEntry.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
