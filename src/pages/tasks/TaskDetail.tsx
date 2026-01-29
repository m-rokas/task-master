import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Check,
  Calendar,
  User,
  Send,
  Loader2,
  Trash2,
  UserPlus,
  ChevronDown,
  Tag,
  Plus,
  Paperclip,
  File,
  FileText,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/database';

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-zinc-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-purple-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
];

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasFeature } = useAuth();
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) throw new Error('No task ID');
      const { data, error } = await supabase
        .from('tm_tasks')
        .select(`
          *,
          tm_projects (id, name, color),
          task_assignees (
            id,
            user_id,
            profiles!task_assignees_user_id_fkey (id, full_name, avatar_url)
          ),
          task_comments (
            id,
            content,
            created_at,
            user_id,
            profiles (id, full_name, avatar_url)
          ),
          task_label_assignments (
            label_id,
            task_labels (id, name, color)
          ),
          task_attachments (
            id,
            file_name,
            file_path,
            file_size,
            file_type,
            uploaded_by,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('tm_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tm_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      navigate(-1);
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('task_comments').insert({
        task_id: id,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });

  // Fetch project members for assignment
  const { data: projectMembers } = useQuery({
    queryKey: ['project-members', task?.project_id],
    queryFn: async () => {
      if (!task?.project_id) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          profiles!project_members_user_id_fkey (id, full_name, avatar_url)
        `)
        .eq('project_id', task.project_id);
      if (error) throw error;
      return data;
    },
    enabled: !!task?.project_id,
  });

  // Fetch project labels
  const { data: projectLabels } = useQuery({
    queryKey: ['project-labels', task?.project_id],
    queryFn: async () => {
      if (!task?.project_id) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .eq('project_id', task.project_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!task?.project_id,
  });

  // Add assignee (allows multiple)
  const assignTask = useMutation({
    mutationFn: async (userId: string) => {
      // Check if already assigned
      const existing = task?.task_assignees?.find((a: any) => a.user_id === userId);
      if (existing) return; // Already assigned

      const { error } = await supabase.from('task_assignees').insert({
        task_id: id,
        user_id: userId,
        assigned_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  // Remove specific assignee
  const unassignUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  // Remove all assignees (keep for backwards compatibility)
  const unassignTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowAssigneeDropdown(false);
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  // Create new label
  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!task?.project_id) throw new Error('No project ID');
      const { data, error } = await supabase
        .from('task_labels')
        .insert({ project_id: task.project_id, name, color })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-labels', task?.project_id] });
      // Auto-assign the new label to the task
      addLabelToTask.mutate(data.id);
      setNewLabelName('');
      setNewLabelColor('#6366f1');
    },
  });

  // Add label to task
  const addLabelToTask = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('task_label_assignments')
        .insert({ task_id: id, label_id: labelId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });

  // Remove label from task
  const removeLabelFromTask = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('task_label_assignments')
        .delete()
        .eq('task_id', id)
        .eq('label_id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });

  // Upload file attachment
  const uploadAttachment = async (file: File) => {
    if (!task || !user) return;
    setIsUploadingFile(true);
    setUploadError(null);

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit');
      setIsUploadingFile(false);
      return;
    }

    try {
      const filePath = `tasks/${task.id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('task_attachments').insert({
        task_id: task.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      });

      if (dbError) {
        // Clean up the uploaded file if DB insert fails
        await supabase.storage.from('attachments').remove([filePath]);
        throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ['task', id] });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Delete attachment
  const deleteAttachment = useMutation({
    mutationFn: async ({ attachmentId, filePath }: { attachmentId: string; filePath: string }) => {
      // Delete from storage
      await supabase.storage.from('attachments').remove([filePath]);
      // Delete from database
      const { error } = await supabase.from('task_attachments').delete().eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });

  // Download attachment
  const downloadAttachment = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('attachments').download(filePath);
    if (error) {
      console.error('Download error:', error);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleMarkComplete = () => {
    const newStatus = task?.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ status: newStatus });
  };

  const handleSaveEdit = () => {
    updateTask.mutate({
      title: editTitle,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-white mb-4">Task not found</p>
          <button onClick={handleClose} className="text-primary hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkComplete}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                task.status === 'done'
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-white hover:bg-primary/90'
              )}
            >
              <Check className="h-4 w-4" />
              {task.status === 'done' ? 'Completed' : 'Mark as Complete'}
            </button>
            <button
              onClick={() => deleteTask.mutate()}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-2xl font-bold bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <h1
                className="text-2xl font-bold text-white cursor-pointer hover:text-zinc-300"
                onClick={() => {
                  setEditTitle(task.title);
                  setEditDescription(task.description || '');
                  setIsEditing(true);
                }}
              >
                {task.title}
              </h1>
            )}

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-zinc-800/50 rounded-lg p-4 text-zinc-300 cursor-pointer hover:bg-zinc-800"
                  onClick={() => {
                    setEditTitle(task.title);
                    setEditDescription(task.description || '');
                    setIsEditing(true);
                  }}
                >
                  {task.description || (
                    <span className="text-zinc-500">Click to add description...</span>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Comments
              </h3>
              <div className="space-y-4">
                {task.task_comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {comment.profiles?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {/* Add comment form */}
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addComment.isPending}
                      className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Attachments
              </h3>

              {/* Attachment List */}
              {task.task_attachments && task.task_attachments.length > 0 && (
                <div className="space-y-2 mb-4">
                  {task.task_attachments.map((attachment: any) => {
                    const FileIcon = getFileIcon(attachment.file_type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadAttachment(attachment.file_path, attachment.file_name)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {hasFeature('file_attachments') && (
                            <button
                              onClick={() => deleteAttachment.mutate({ attachmentId: attachment.id, filePath: attachment.file_path })}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload Area - only for paid plans */}
              {hasFeature('file_attachments') ? (
                <div className="space-y-2">
                  <label className="block">
                    <div className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                      uploadError ? "border-red-500/50 hover:border-red-500" : "border-zinc-700 hover:border-primary",
                      isUploadingFile && "opacity-50 cursor-not-allowed"
                    )}>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadAttachment(file);
                            e.target.value = '';
                          }
                        }}
                        disabled={isUploadingFile}
                      />
                      {isUploadingFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-sm text-zinc-400">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Paperclip className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                          <p className="text-sm text-zinc-400">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Max file size: 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                  {uploadError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">
                      <span>{uploadError}</span>
                      <button
                        onClick={() => setUploadError(null)}
                        className="ml-auto p-1 hover:bg-red-500/20 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/billing"
                  className="block border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-primary transition-colors"
                >
                  <Paperclip className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">
                    File attachments (Pro feature)
                  </p>
                  <p className="text-xs text-primary mt-1">
                    Upgrade to upload files
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-zinc-800 p-6 space-y-6">
            {/* Status */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Status
              </h4>
              <select
                value={task.status}
                onChange={(e) => updateTask.mutate({ status: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div className="relative">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Assignees
              </h4>

              {/* Current Assignees List */}
              {task.task_assignees && task.task_assignees.length > 0 && (
                <div className="space-y-2 mb-2">
                  {task.task_assignees.map((assignee: any) => (
                    <div
                      key={assignee.id}
                      className="flex items-center justify-between gap-2 bg-zinc-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                          {assignee.profiles?.avatar_url ? (
                            <img
                              src={assignee.profiles.avatar_url}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-3 w-3 text-zinc-400" />
                          )}
                        </div>
                        <span className="text-sm text-white">
                          {assignee.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <button
                        onClick={() => unassignUser.mutate(assignee.user_id)}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                        title="Remove assignee"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Assignee Button */}
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full flex items-center justify-between gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-500">Add assignee</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-zinc-500 transition-transform",
                  showAssigneeDropdown && "rotate-180"
                )} />
              </button>

              {/* Assignee Dropdown */}
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden max-h-60 overflow-y-auto">
                  {/* Remove all option if there are assignees */}
                  {task.task_assignees && task.task_assignees.length > 0 && (
                    <button
                      onClick={() => unassignTask.mutate()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors border-b border-zinc-700"
                    >
                      <X className="h-4 w-4" />
                      <span>Remove all assignees</span>
                    </button>
                  )}

                  {/* Project members list */}
                  {projectMembers && projectMembers.length > 0 ? (
                    projectMembers.map((member: any) => {
                      const isAssigned = task.task_assignees?.some(
                        (a: any) => a.user_id === member.user_id
                      );
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            if (isAssigned) {
                              unassignUser.mutate(member.user_id);
                            } else {
                              assignTask.mutate(member.user_id);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                            isAssigned
                              ? "bg-zinc-700/50 text-white"
                              : "text-white hover:bg-zinc-700"
                          )}
                        >
                          <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center">
                            {member.profiles?.avatar_url ? (
                              <img
                                src={member.profiles.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-3 w-3 text-zinc-400" />
                            )}
                          </div>
                          <span className="flex-1 text-left">{member.profiles?.full_name || 'Unknown'}</span>
                          {isAssigned && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-500">
                      No team members found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Due Date
              </h4>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={task.due_date || ''}
                  onChange={(e) => updateTask.mutate({ due_date: e.target.value || null })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Priority
              </h4>
              <select
                value={task.priority}
                onChange={(e) => updateTask.mutate({ priority: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            {task.tm_projects && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Project
                </h4>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: task.tm_projects.color }}
                  />
                  <span className="text-sm text-white">{task.tm_projects.name}</span>
                </div>
              </div>
            )}

            {/* Labels */}
            <div className="relative">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Labels
              </h4>

              {/* Current Labels */}
              {task.task_label_assignments?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {task.task_label_assignments.map((assignment: any) => (
                    <span
                      key={assignment.label_id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white group"
                      style={{ backgroundColor: assignment.task_labels?.color }}
                    >
                      {assignment.task_labels?.name}
                      {hasFeature('custom_labels') && (
                        <button
                          onClick={() => removeLabelFromTask.mutate(assignment.label_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Add Label Button - only for paid plans */}
              {hasFeature('custom_labels') ? (
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="w-full flex items-center justify-between gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500">Add label</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-zinc-500 transition-transform",
                    showLabelDropdown && "rotate-180"
                  )} />
                </button>
              ) : (
                <Link
                  to="/billing"
                  className="block w-full text-center bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Tag className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500">Labels (Pro feature)</span>
                  </div>
                  <span className="text-xs text-primary">Upgrade to add labels</span>
                </Link>
              )}

              {/* Label Dropdown */}
              {showLabelDropdown && hasFeature('custom_labels') && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden max-h-60 overflow-y-auto">
                  {/* Existing labels */}
                  {projectLabels && projectLabels.length > 0 ? (
                    projectLabels.map((label: any) => {
                      const isAssigned = task.task_label_assignments?.some(
                        (a: any) => a.label_id === label.id
                      );
                      return (
                        <button
                          key={label.id}
                          onClick={() => {
                            if (isAssigned) {
                              removeLabelFromTask.mutate(label.id);
                            } else {
                              addLabelToTask.mutate(label.id);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                            isAssigned
                              ? "bg-zinc-700/50 text-white"
                              : "text-white hover:bg-zinc-700"
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-left">{label.name}</span>
                          {isAssigned && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-500">
                      No labels yet
                    </div>
                  )}

                  {/* Create new label */}
                  <div className="border-t border-zinc-700 p-2">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="New label..."
                        className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newLabelName.trim()) {
                            createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newLabelName.trim()) {
                            createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor });
                          }
                        }}
                        disabled={!newLabelName.trim() || createLabel.isPending}
                        className="p-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Created {new Date(task.created_at).toLocaleDateString()}
              </p>
              {task.updated_at && (
                <p className="text-xs text-zinc-500">
                  Updated {new Date(task.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
