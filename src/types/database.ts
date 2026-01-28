// Database types for TaskMaster
// Generated based on Supabase schema
// Last updated: 2025-01-28

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum types
export type UserRole = 'user' | 'admin';
export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type NotificationType =
  | 'task_assigned'
  | 'task_comment'
  | 'task_mention'
  | 'task_due_soon'
  | 'task_overdue'
  | 'project_invite'
  | 'system';
export type AuditAction = 'create' | 'update' | 'delete';
export type PlatformConfigCategory = 'general' | 'billing' | 'features' | 'notifications' | 'security';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          plan_id: string | null;
          language: 'en' | 'lt';
          is_active: boolean;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          plan_id?: string | null;
          language?: 'en' | 'lt';
          is_active?: boolean;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          plan_id?: string | null;
          language?: 'en' | 'lt';
          is_active?: boolean;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          project_limit: number | null;
          task_limit: number | null;
          features: Json;
          price_monthly: number;
          price_yearly: number;
          stripe_price_monthly: string | null;
          stripe_price_yearly: string | null;
          stripe_product_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          project_limit?: number | null;
          task_limit?: number | null;
          features?: Json;
          price_monthly?: number;
          price_yearly?: number;
          stripe_price_monthly?: string | null;
          stripe_price_yearly?: string | null;
          stripe_product_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          display_name?: string;
          project_limit?: number | null;
          task_limit?: number | null;
          features?: Json;
          price_monthly?: number;
          price_yearly?: number;
          stripe_price_monthly?: string | null;
          stripe_price_yearly?: string | null;
          stripe_product_id?: string | null;
          is_active?: boolean;
        };
      };
      tm_projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          owner_id: string;
          is_personal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          owner_id: string;
          is_personal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          is_personal?: boolean;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: ProjectRole;
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          role?: ProjectRole;
        };
      };
      tm_tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          position: number;
          recurrence_pattern: RecurrenceType | null;
          recurrence_interval: number;
          recurrence_end_date: string | null;
          parent_task_id: string | null;
          created_by: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          position?: number;
          recurrence_pattern?: RecurrenceType | null;
          recurrence_interval?: number;
          recurrence_end_date?: string | null;
          parent_task_id?: string | null;
          created_by: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          position?: number;
          recurrence_pattern?: RecurrenceType | null;
          recurrence_interval?: number;
          recurrence_end_date?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      task_assignees: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: never;
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          mentions: string[];
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          mentions?: string[];
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          mentions?: string[];
          is_edited?: boolean;
          updated_at?: string;
        };
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          uploaded_by: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          uploaded_by: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          created_at?: string;
        };
        Update: never;
      };
      task_labels: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
      };
      task_label_assignments: {
        Row: {
          id: string;
          task_id: string;
          label_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          label_id: string;
          assigned_at?: string;
        };
        Update: never;
      };
      time_entries: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          duration_minutes: number;
          description: string | null;
          started_at: string;
          ended_at: string | null;
          is_running: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          duration_minutes: number;
          description?: string | null;
          started_at: string;
          ended_at?: string | null;
          is_running?: boolean;
          created_at?: string;
        };
        Update: {
          duration_minutes?: number;
          description?: string | null;
          ended_at?: string | null;
          is_running?: boolean;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: SubscriptionStatus;
          current_period_start?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          stripe_payment_intent_id: string | null;
          stripe_invoice_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          stripe_payment_intent_id?: string | null;
          stripe_invoice_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: PaymentStatus;
        };
      };
      tm_notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          data: Json;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          data?: Json;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id: string;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      platform_config: {
        Row: {
          id: string;
          key: string;
          value: string;
          category: PlatformConfigCategory;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          category?: PlatformConfigCategory;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          category?: PlatformConfigCategory;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      check_project_limit: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      check_task_limit: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      user_has_feature: {
        Args: { p_user_id: string; feature_name: string };
        Returns: boolean;
      };
      get_user_plan: {
        Args: { p_user_id: string };
        Returns: {
          plan_name: string;
          project_limit: number | null;
          task_limit: number | null;
          project_count: number;
          task_count: number;
          features: Json;
        }[];
      };
      get_unread_notification_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      mark_notifications_read: {
        Args: { p_notification_ids: string[] };
        Returns: void;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      expire_trials: {
        Args: Record<string, never>;
        Returns: number;
      };
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      handle_new_project: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      project_role: ProjectRole;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      recurrence_type: RecurrenceType;
      subscription_status: SubscriptionStatus;
      payment_status: PaymentStatus;
      notification_type: NotificationType;
      audit_action: AuditAction;
      platform_config_category: PlatformConfigCategory;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Utility types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience types
export type Profile = Tables<'profiles'>;
export type Plan = Tables<'plans'>;
export type Project = Tables<'tm_projects'>;
export type ProjectMember = Tables<'project_members'>;
export type Task = Tables<'tm_tasks'>;
export type TaskAssignee = Tables<'task_assignees'>;
export type TaskComment = Tables<'task_comments'>;
export type TaskAttachment = Tables<'task_attachments'>;
export type TaskLabel = Tables<'task_labels'>;
export type TaskLabelAssignment = Tables<'task_label_assignments'>;
export type TimeEntry = Tables<'time_entries'>;
export type Subscription = Tables<'subscriptions'>;
export type Payment = Tables<'payments'>;
export type Notification = Tables<'tm_notifications'>;
export type AuditLog = Tables<'audit_logs'>;
export type PlatformConfig = Tables<'platform_config'>;

// Extended types with relations
export type TaskWithRelations = Task & {
  assignees?: (TaskAssignee & { profiles: Profile })[];
  comments?: (TaskComment & { profiles: Profile })[];
  attachments?: TaskAttachment[];
  labels?: TaskLabel[];
  project?: Project;
  subtasks?: Task[];
  parent_task?: Task;
};

export type ProjectWithRelations = Project & {
  members?: (ProjectMember & { profiles: Profile })[];
  tasks?: Task[];
  labels?: TaskLabel[];
  owner?: Profile;
};

export type ProfileWithRelations = Profile & {
  plans?: Plan;
  subscriptions?: Subscription[];
};

export type SubscriptionWithRelations = Subscription & {
  plans?: Plan;
  profiles?: Profile;
};

// Platform settings interface (parsed from platform_config)
export interface PlatformSettings {
  site_name: string;
  site_description: string;
  site_url: string;
  support_email: string;
  trial_days: number;
  trial_enabled: boolean;
  signup_enabled: boolean;
  maintenance_mode: boolean;
  email_notifications_enabled: boolean;
  welcome_email_enabled: boolean;
  task_reminder_enabled: boolean;
  max_login_attempts: number;
  session_timeout_hours: number;
}

// Plan features interface (parsed from plans.features JSON)
export interface PlanFeatures {
  time_tracking?: boolean;
  file_attachments?: boolean;
  team_collaboration?: boolean;
  custom_labels?: boolean;
  recurring_tasks?: boolean;
  api_access?: boolean;
  advanced_analytics?: boolean;
  priority_support?: boolean;
  [key: string]: boolean | undefined;
}
