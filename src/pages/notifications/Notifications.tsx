import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  MessageSquare,
  UserPlus,
  AlertCircle,
  Clock,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  task_comment: MessageSquare,
  task_mention: MessageSquare,
  task_due_soon: Clock,
  task_overdue: AlertCircle,
  project_invite: UserPlus,
  system: Bell,
};

const notificationColors: Record<string, string> = {
  task_assigned: 'bg-blue-500/10 text-blue-500',
  task_comment: 'bg-purple-500/10 text-purple-500',
  task_mention: 'bg-purple-500/10 text-purple-500',
  task_due_soon: 'bg-yellow-500/10 text-yellow-500',
  task_overdue: 'bg-red-500/10 text-red-500',
  project_invite: 'bg-green-500/10 text-green-500',
  system: 'bg-zinc-500/10 text-zinc-500',
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('tm_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('tm_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-zinc-400 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {notifications?.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
            <p className="text-zinc-400">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {notifications?.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const colorClass = notificationColors[notification.type] || notificationColors.system;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-4 p-4 hover:bg-zinc-800/50 transition-colors',
                    !notification.is_read && 'bg-zinc-800/30'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={cn(
                            'font-medium',
                            notification.is_read ? 'text-zinc-300' : 'text-white'
                          )}
                        >
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead.mutate(notification.id)}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification.mutate(notification.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-700 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {notification.data && (notification.data as any).task_id && (
                      <Link
                        to={`/tasks/${(notification.data as any).task_id}`}
                        onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                        className="inline-block mt-2 text-sm text-primary hover:underline"
                      >
                        View task →
                      </Link>
                    )}
                    {notification.data && (notification.data as any).project_id && (
                      <Link
                        to={`/projects/${(notification.data as any).project_id}`}
                        onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                        className="inline-block mt-2 text-sm text-primary hover:underline"
                      >
                        View project →
                      </Link>
                    )}
                  </div>
                  {!notification.is_read && (
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
