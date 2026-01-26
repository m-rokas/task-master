import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlatformProvider } from '@/contexts/PlatformContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Auth pages
import {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  AuthCallback,
} from '@/pages/auth';

// App pages
import Dashboard from '@/pages/dashboard/Dashboard';
import { LandingPage } from '@/pages';
import { ProjectsList, NewProject, ProjectDetail, ProjectSettings } from '@/pages/projects';
import { MyTasks, TaskDetail } from '@/pages/tasks';
import { TimeTracking } from '@/pages/time';
import { Settings } from '@/pages/settings';
import { Notifications } from '@/pages/notifications';
import { Billing } from '@/pages/billing';
import { Team } from '@/pages/team';
import { Calendar } from '@/pages/calendar';

// Admin pages
import {
  AdminDashboard,
  UserManagement,
  AuditLogs,
  PlanManagement,
  PlatformSettings,
  SubscriptionManagement,
} from '@/pages/admin';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PlatformProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectsList />} />
              <Route path="/projects/new" element={<NewProject />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/settings" element={<ProjectSettings />} />
              <Route path="/tasks" element={<MyTasks />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/time" element={<TimeTracking />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/profile" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/team" element={<Team />} />
              <Route path="/calendar" element={<Calendar />} />
            </Route>

            {/* Admin Routes - Separate Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/audit" element={<AuditLogs />} />
              <Route path="/admin/plans" element={<PlanManagement />} />
              <Route path="/admin/settings" element={<PlatformSettings />} />
              <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
            </Route>

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
        </PlatformProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
