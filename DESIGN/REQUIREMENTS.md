# TaskMaster Backend - Requirements Specification

> Generated via `/sc:brainstorm` requirements discovery session
> Date: 2025-01-26
> Status: Ready for `/sc:design` phase

---

## 1. Project Overview

**TaskMaster** is a SaaS task management application with:
- Personal and team project management
- Kanban-style task boards
- Subscription-based monetization (Free/Pro/Business)
- Admin panel for user and plan management

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite 7 + Tailwind v4
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- Emails: Resend
- Payments: Stripe (future phase)
- Project ID: `aseeuadyafuntohgisig`

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

#### FR-AUTH-01: Email/Password Authentication
- Users can sign up with email and password
- Email confirmation required before account activation
- Password requirements: minimum 8 characters

#### FR-AUTH-02: Google OAuth
- Users can sign up/sign in with Google
- **Auto-linking**: If Google email matches existing account, automatically link accounts
- OAuth configured via Supabase Auth

#### FR-AUTH-03: Password Reset Flow
- "Forgot password" link on login page
- Reset email sent via Resend
- Secure token-based reset with expiration

#### FR-AUTH-04: Session Management
- JWT-based sessions via Supabase Auth
- Session context available throughout React app
- Automatic token refresh
- Logout clears all session data

#### FR-AUTH-05: Protected Routes
- Unauthenticated users redirected to login
- Role-based route protection (user vs admin)
- Plan-based feature gating

---

### 2.2 User Management

#### FR-USER-01: User Profiles
- Auto-created on signup via database trigger
- Fields: `id`, `full_name`, `avatar_url`, `role`, `plan`, `created_at`, `updated_at`

#### FR-USER-02: User Roles
| Role | Permissions |
|------|-------------|
| `user` | Standard app access, own projects |
| `admin` | Full admin panel access, all user management |

#### FR-USER-03: Subscription Plans
| Plan | Project Limit | Task Limit | Team Features | Labels | Time Tracking |
|------|---------------|------------|---------------|--------|---------------|
| `free` | 1 project | 25 tasks | No | No | Basic |
| `pro` | 10 projects | Unlimited | Yes | Yes | Full + Reports |
| `business` | Unlimited | Unlimited | Yes + Advanced | Yes | Full + Reports |

#### FR-USER-04: Plan Enforcement
- **Hard limits enforced at database level (RLS policies)**
- Users cannot exceed plan limits via any method
- Upgrade prompts shown when approaching limits

---

### 2.3 Project Management

#### FR-PROJ-01: Project Types
- **Personal projects**: Single owner, no sharing
- **Team projects**: Multiple members with roles

#### FR-PROJ-02: Project Member Roles
| Role | Permissions |
|------|-------------|
| `owner` | Full control, delete project, manage members |
| `admin` | Edit project, manage tasks, invite members |
| `member` | Create/edit tasks, comment |
| `viewer` | Read-only access |

#### FR-PROJ-03: Project Fields
- `id`, `name`, `description`, `color`, `owner_id`
- `is_personal` (boolean)
- `created_at`, `updated_at`

---

### 2.4 Task Management

#### FR-TASK-01: Task Fields
- `id`, `project_id`, `title`, `description`
- `status`: `todo` | `in_progress` | `review` | `done`
- `priority`: `urgent` | `high` | `medium` | `low`
- `due_date`, `created_by`, `created_at`, `updated_at`

#### FR-TASK-02: Task Assignments
- **Multiple assignees per task** (many-to-many via `task_assignees`)
- Assignees receive email notification on assignment

#### FR-TASK-03: Task Comments
- Threaded comments on tasks
- **@mentions supported** with email + in-app notifications
- Fields: `id`, `task_id`, `user_id`, `content`, `created_at`

#### FR-TASK-04: Kanban Board
- Four columns: Todo, In Progress, Review, Done
- Drag-and-drop status changes
- Real-time updates via Supabase Realtime

#### FR-TASK-05: Task Attachments
- Users can attach files to tasks
- Stored in Supabase Storage bucket
- File types: images, PDFs, documents
- Max file size: 10MB per file
- Available on all plans

#### FR-TASK-06: Task Labels/Tags (Pro/Business Feature)
- Custom color-coded labels per project
- Multiple labels per task
- Filter tasks by label
- **Plan restriction**: Free users cannot create/use labels
- Default labels provided: Bug, Feature, Improvement, Documentation

#### FR-TASK-07: Recurring Tasks
- Tasks can have recurrence rules
- Patterns: daily, weekly, monthly, custom
- Auto-create new task when recurring task completed
- Fields: `recurrence_pattern`, `recurrence_interval`, `recurrence_end_date`

#### FR-TASK-08: Time Tracking
- Users can log time entries on tasks
- Start/stop timer or manual entry
- Fields per entry: `task_id`, `user_id`, `duration_minutes`, `description`, `started_at`
- Task shows total tracked time
- Reports: time per task, per project, per user

---

### 2.5 Email Notifications (Resend)

#### FR-EMAIL-01: Transactional Emails
| Trigger | Email Type | Timing |
|---------|------------|--------|
| User signup | Welcome email | Immediate |
| Signup | Email confirmation | Immediate |
| Password reset request | Reset link email | Immediate |
| Task assigned | Assignment notification | Immediate |
| @mention in comment | Mention notification | Immediate |
| Task due soon | Reminder email | 24h before due_date |
| Task overdue | Overdue notification | On due_date pass |

#### FR-EMAIL-02: Email Configuration
- All emails automated (no manual triggers)
- Sent via Resend API
- Templates support English and Lithuanian

---

### 2.6 Admin Panel

#### FR-ADMIN-01: Access Control
- Located at `/admin` route within main app
- Only accessible to users with `role = 'admin'`

#### FR-ADMIN-02: Dashboard
- Total users count
- Users by plan breakdown
- Total tasks / completed / overdue
- Average task completion time
- MRR (Monthly Recurring Revenue) - when Stripe integrated

#### FR-ADMIN-03: User Management
- List all users with search/filter
- View user details and activity
- Change user role
- Change user plan
- Disable/enable accounts

#### FR-ADMIN-04: Audit Logs
- **Compliance-ready logging**
- Tracked data:
  - User ID
  - Action type (create/update/delete)
  - Entity type and ID
  - Before/after values (JSON diff)
  - IP address
  - User agent
  - Timestamp

---

### 2.7 Internationalization

#### FR-I18N-01: Supported Languages
- English (default)
- Lithuanian
- Language toggle in user settings

---

## 3. Non-Functional Requirements

### NFR-01: Security
- All API calls authenticated via Supabase Auth
- Row Level Security (RLS) on all tables
- Plan limits enforced at database level
- HTTPS only
- Secure password hashing (handled by Supabase)
- CSRF protection

### NFR-02: Performance
- Page load < 3 seconds
- API responses < 500ms
- Real-time updates via WebSocket

### NFR-03: Reliability
- 99.9% uptime target
- Automated backups (Supabase managed)
- Error tracking and monitoring

### NFR-04: Scalability
- Supabase handles database scaling
- Edge Functions for serverless compute
- CDN for static assets

---

## 4. User Stories

### Authentication
- **US-01**: As a user, I want to sign up with my email and password so I can create an account
- **US-02**: As a user, I want to sign in with Google so I can access my account quickly
- **US-03**: As a user, I want to reset my password via email so I can regain access if I forget it
- **US-04**: As a user, I want to confirm my email so my account is verified

### Projects
- **US-05**: As a user, I want to create personal projects so I can organize my tasks
- **US-06**: As a Pro user, I want to create team projects so I can collaborate with others
- **US-07**: As a project owner, I want to invite members with specific roles so I can control access

### Tasks
- **US-08**: As a user, I want to create tasks with title, description, and due date
- **US-09**: As a user, I want to drag tasks between columns to update their status
- **US-10**: As a user, I want to assign tasks to multiple team members
- **US-11**: As a user, I want to comment on tasks and @mention teammates
- **US-12**: As a user, I want to receive email reminders before task deadlines

### Subscriptions
- **US-13**: As a free user, I want to see upgrade prompts when I reach limits
- **US-14**: As a user, I want to see my current plan and usage in settings

### Admin
- **US-15**: As an admin, I want to view all users and their subscription status
- **US-16**: As an admin, I want to view audit logs for compliance
- **US-17**: As an admin, I want to see platform analytics on the dashboard

---

## 5. Acceptance Criteria

### AC-01: Authentication Flow
- [ ] User can complete signup with email/password
- [ ] Confirmation email received within 30 seconds
- [ ] User can sign in after email confirmation
- [ ] Google OAuth creates/links account correctly
- [ ] Password reset email works end-to-end

### AC-02: Plan Enforcement
- [ ] Free user cannot create more than 1 project
- [ ] Free user cannot create more than 25 tasks
- [ ] RLS blocks requests that exceed limits
- [ ] Clear error message shown on limit reached

### AC-03: Team Collaboration
- [ ] Project owner can invite members
- [ ] Member roles correctly restrict permissions
- [ ] Real-time updates visible to all team members
- [ ] @mentions trigger notifications

### AC-04: Admin Panel
- [ ] Non-admin users see 403 on /admin
- [ ] Dashboard shows accurate metrics
- [ ] Audit logs capture all mutations

---

## 6. Resolved Questions

| Question | Decision |
|----------|----------|
| Task Attachments | Yes - included in v1 |
| Task Labels/Tags | Yes - **Pro/Business plan feature** |
| Recurring Tasks | Yes - task schedules supported |
| Time Tracking | Yes - time tracking on tasks |

### Remaining Open Questions
1. **Notification Preferences**: Should users be able to mute notifications for specific projects?
2. **Mobile App**: Is a mobile app planned for v2?

---

## 7. Database Tables Overview

> Note: Full schema design in `/sc:design` phase

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `projects` | Projects container |
| `project_members` | Team membership junction |
| `tasks` | Task items |
| `task_assignees` | Multi-assignee junction |
| `task_comments` | Task comments |
| `task_attachments` | File attachments on tasks |
| `task_labels` | Label definitions per project |
| `task_label_assignments` | Labels assigned to tasks (junction) |
| `task_recurrence` | Recurring task rules |
| `time_entries` | Time tracking entries |
| `plans` | Subscription plan definitions |
| `subscriptions` | User subscription records |
| `payments` | Payment history |
| `audit_logs` | Compliance audit trail |
| `notifications` | In-app notifications |

### Supabase Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `task-attachments` | Task file attachments |
| `avatars` | User profile pictures |

---

## 8. Next Steps

1. **Run `/sc:design`** - Create detailed architecture and database schema
2. **Run `/sc:workflow`** - Generate implementation task breakdown
3. **Implement database migrations** - Using Supabase MCP
4. **Build authentication flow** - Supabase Auth + React context
5. **Build core features** - Projects, tasks, kanban board

---

## Appendix A: Environment Configuration

Environment templates created:
- `.env.template` - Full template with all variables
- `.env.local.template` - Local development overrides
- `.gitignore` - Updated to exclude env files

Required services:
- Supabase Project: `aseeuadyafuntohgisig`
- Resend account for transactional emails
- Google Cloud Console for OAuth credentials
- Stripe account (for future monetization phase)
