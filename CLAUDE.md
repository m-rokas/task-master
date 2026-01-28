# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

### Adding shadcn/ui Components
```bash
npx shadcn@latest add button   # Add specific component
```

## Architecture

**TaskMaster** - A React task management SaaS with Supabase backend.

### Tech Stack
- React 19 + TypeScript + Vite 7
- Supabase (PostgreSQL, Auth, RLS policies)
- TanStack Query for server state
- Tailwind CSS v4 (uses `@theme` directive in `src/index.css`, no tailwind.config.js)
- lucide-react for icons, shadcn/ui compatible (new-york style)

### Path Alias
`@/*` → `./src/*`

### Environment Variables
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Application Layers

**Routing** (`src/App.tsx`):
- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/auth/*`
- Protected routes use `<ProtectedRoute>` wrapper with `<AppLayout>`
- Admin routes (`/admin/*`) use separate `<AdminLayout>`

**Context Providers** (wrap entire app):
- `QueryClientProvider` - TanStack Query with 5-min stale time
- `PlatformProvider` - Platform settings from `platform_config` table (site name, trial settings, etc.)
- `AuthProvider` - User session, profile, plan, subscription, feature flags

**Auth System** (`src/contexts/AuthContext.tsx`):
- Manages Supabase auth state + fetches related profile/plan/subscription
- `hasFeature(feature)` - Check plan features from `plans.features` JSON
- `isTrialing` / `trialEndsAt` - Trial subscription detection
- `signUp` accepts optional `selectedPlan` param (stored in user metadata, processed by DB trigger)

**Data Fetching**:
- React Query hooks in `src/hooks/` (useTasks, useProjects, usePlatformConfig)
- Direct Supabase queries via `src/lib/supabase.ts`

### Database

Full schema documented in `DB.md`. Key tables:
- `profiles` - User profiles linked to auth.users
- `plans` - Subscription plans with `features` JSON field
- `subscriptions` - User subscriptions with status (active/trialing/canceled)
- `tm_projects` / `tm_tasks` - Core task management data
- `platform_config` - Admin-configurable platform settings

Types in `src/types/database.ts` with convenience exports like `Task`, `Project`, `Profile`.

**Database Triggers**:
- `handle_new_user()` - Creates profile on signup, handles plan selection from metadata, creates trial subscription if applicable
- `expire_trials()` - Function to downgrade expired trials (call via cron/edge function)

### Styling
- Design tokens in `src/index.css`: `--color-primary`, `--color-background-light/dark`
- Dark mode via `.dark` class with `@custom-variant dark`
- `cn()` utility from `src/lib/utils.ts` for class merging

### Migrations
SQL migrations in `supabase/migrations/`. When writing trigger functions, use explicit `public.` schema prefix for table references.
