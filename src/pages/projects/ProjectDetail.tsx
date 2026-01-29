import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useProjectTasks, useCreateTask, useUpdateTaskStatus } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Settings,
  Users,
  Loader2,
  Calendar,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskWithRelations } from '@/types/database';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-zinc-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useProjectTasks(id);
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [newTaskColumn, setNewTaskColumn] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskError, setTaskError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks?.filter((task) => task.status === status) || [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    let newStatus: TaskStatus | null = null;

    // Check if dropped over a column (droppable zone)
    if (COLUMNS.some((col) => col.id === over.id)) {
      newStatus = over.id as TaskStatus;
    } else {
      // Dropped over another task - find which column that task is in
      const overTask = tasks?.find((t) => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (!newStatus) return;

    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await updateTaskStatus.mutateAsync({
        taskId,
        status: newStatus,
      });
      setTaskError(null);
    } catch (error: any) {
      setTaskError(error.message || 'Failed to update task status');
    }
  };

  const handleCreateTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim() || !id) return;

    try {
      await createTask.mutateAsync({
        project_id: id,
        title: newTaskTitle.trim(),
        status,
      });

      setNewTaskTitle('');
      setNewTaskColumn(null);
      setTaskError(null);
    } catch (error: any) {
      setTaskError(error.message || 'Failed to create task');
    }
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Project not found</p>
        <Link to="/projects" className="text-primary hover:text-primary/80 mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && (
              <p className="text-zinc-400 text-sm">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!project.is_personal && (
            <button className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </button>
          )}
          <Link
            to={`/projects/${id}/settings`}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {taskError && (
        <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <span>{taskError}</span>
          <button
            onClick={() => setTaskError(null)}
            className="ml-auto p-1 hover:bg-red-500/20 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                isAddingTask={newTaskColumn === column.id}
                onAddTask={() => setNewTaskColumn(column.id)}
                onCancelAdd={() => {
                  setNewTaskColumn(null);
                  setNewTaskTitle('');
                }}
                newTaskTitle={newTaskTitle}
                onNewTaskTitleChange={setNewTaskTitle}
                onSubmitTask={() => handleCreateTask(column.id)}
                isCreating={createTask.isPending}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: TaskStatus; title: string; color: string };
  tasks: TaskWithRelations[];
  isAddingTask: boolean;
  onAddTask: () => void;
  onCancelAdd: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (value: string) => void;
  onSubmitTask: () => void;
  isCreating: boolean;
}

function KanbanColumn({
  column,
  tasks,
  isAddingTask,
  onAddTask,
  onCancelAdd,
  newTaskTitle,
  onNewTaskTitleChange,
  onSubmitTask,
  isCreating,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-72 flex-shrink-0 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-2 h-2 rounded-full', column.color)} />
        <h3 className="font-medium text-white">{column.title}</h3>
        <span className="text-zinc-500 text-sm">{tasks.length}</span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 min-h-[200px] transition-colors",
          isOver && "border-primary bg-primary/5"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>

        {/* Add Task Form */}
        {isAddingTask ? (
          <div className="mt-2 p-3 bg-zinc-800 rounded-lg">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmitTask();
                if (e.key === 'Escape') onCancelAdd();
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={onCancelAdd}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitTask}
                disabled={isCreating || !newTaskTitle.trim()}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onAddTask}
            className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface SortableTaskCardProps {
  task: TaskWithRelations;
}

function SortableTaskCard({ task }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithRelations;
  isDragging?: boolean;
}

function TaskCard({ task, isDragging }: TaskCardProps) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={cn(
        'block bg-zinc-800 border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-colors cursor-pointer',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
            priorityColors[task.priority]
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{task.title}</p>

          {/* Task Meta */}
          <div className="flex items-center gap-3 mt-2">
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-1">
                {task.assignees.slice(0, 2).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="w-5 h-5 rounded-full bg-zinc-600 border border-zinc-800 flex items-center justify-center text-[10px] font-medium text-white"
                    title={assignee.profiles?.full_name || ''}
                  >
                    {assignee.profiles?.avatar_url ? (
                      <img
                        src={assignee.profiles.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      assignee.profiles?.full_name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
