import {
  Search,
  ChevronDown,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';

const users = [
  {
    id: '#82910',
    name: 'Alex Thompson',
    email: 'alex.t@example.com',
    plan: 'Enterprise',
    planColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    status: 'Active',
    lastLogin: '2 hours ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: '#82911',
    name: 'Sarah Jenkins',
    email: 'sarah.j@company.io',
    plan: 'Pro',
    planColor: 'bg-primary/10 text-primary dark:bg-primary/20',
    status: 'Active',
    lastLogin: '45 mins ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    id: '#82912',
    name: 'Marcus Lee',
    email: 'm.lee@freelance.org',
    plan: 'Free',
    planColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    status: 'Inactive',
    lastLogin: '3 days ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    isInactive: true,
  },
  {
    id: '#82915',
    name: 'Elena Rodriguez',
    email: 'elena.rod@studio.com',
    plan: 'Pro',
    planColor: 'bg-primary/10 text-primary dark:bg-primary/20',
    status: 'Active',
    lastLogin: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
];

export function UserManagement() {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar variant="admin" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="User Management"
          breadcrumbs={[
            { label: 'Admin', href: '#' },
            { label: 'User Management' },
          ]}
        />

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-slate-900 dark:text-white text-4xl font-extrabold tracking-tight">
                User Management
              </h2>
              <p className="text-slate-500 dark:text-[#9da6b9] text-base">
                Manage platform users, their subscription plans, and account
                availability.
              </p>
            </div>
            <button className="flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              <Plus className="size-5" />
              <span>Add New User</span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 lg:col-span-7">
              <div className="relative h-12 w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 dark:text-[#9da6b9]">
                  <Search className="size-5" />
                </div>
                <input
                  className="w-full h-full rounded-lg border-none bg-white dark:bg-[#1c222d] text-slate-900 dark:text-white pl-12 pr-4 text-base focus:ring-2 focus:ring-primary shadow-sm"
                  placeholder="Search users by name, email, or ID"
                />
              </div>
            </div>
            <div className="md:col-span-3 lg:col-span-2">
              <button className="w-full flex h-12 items-center justify-between rounded-lg bg-white dark:bg-[#1c222d] px-4 text-slate-700 dark:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <span className="text-sm font-medium">All Plans</span>
                <ChevronDown className="size-5" />
              </button>
            </div>
            <div className="md:col-span-3 lg:col-span-3">
              <div className="flex h-12 items-center bg-white dark:bg-[#1c222d] rounded-lg p-1 shadow-sm">
                <button className="flex-1 h-full rounded-md bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold px-2">
                  Active Only
                </button>
                <button className="flex-1 h-full rounded-md text-slate-500 dark:text-[#9da6b9] text-xs font-bold px-2">
                  All Users
                </button>
                <button className="flex-1 h-full rounded-md text-slate-500 dark:text-[#9da6b9] text-xs font-bold px-2">
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="bg-white dark:bg-[#111318] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 w-10">
                      <input
                        className="rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary"
                        type="checkbox"
                      />
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9]">
                      User Name
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9]">
                      Email
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9]">
                      Plan
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9]">
                      Status
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9]">
                      Last Login
                    </th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9da6b9] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        user.isInactive ? 'opacity-70' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          className="rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary"
                          type="checkbox"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-10 rounded-full bg-cover bg-center ${user.isInactive ? 'grayscale' : ''}`}
                            style={{
                              backgroundImage: `url('${user.avatar}')`,
                            }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-[#9da6b9]">
                        {user.email}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${user.planColor}`}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              user.status === 'Active'
                                ? 'bg-green-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              user.status === 'Active'
                                ? 'text-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-[#9da6b9]'
                            }`}
                          >
                            {user.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-[#9da6b9]">
                        {user.lastLogin}
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">
                          <MoreVertical className="size-5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-[#9da6b9]">
                Showing 1-10 of 1,240 users
              </p>
              <div className="flex gap-2">
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <ChevronLeft className="size-5" />
                </button>
                <button className="size-9 flex items-center justify-center rounded-lg bg-primary text-white font-bold">
                  1
                </button>
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-[#9da6b9] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  2
                </button>
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-[#9da6b9] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  3
                </button>
                <span className="px-2 self-end pb-2 text-slate-400">...</span>
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-[#9da6b9] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
