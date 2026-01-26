import { Plus, X, Info } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    description: 'Essential tasking',
    monthlyPrice: 0,
    annualPrice: 0,
    users: 1240,
    status: 'Active',
  },
  {
    name: 'Pro',
    description: 'Professional power',
    monthlyPrice: 29,
    annualPrice: 290,
    users: 850,
    status: 'Active',
    isEditing: true,
  },
  {
    name: 'Business',
    description: 'Enterprise control',
    monthlyPrice: 99,
    annualPrice: 990,
    users: 420,
    status: 'Active',
  },
];

const permissions = [
  {
    name: 'Custom Fields',
    description: 'Allow users to add metadata to tasks',
    enabled: true,
  },
  {
    name: 'Team Analytics',
    description: 'Basic performance reporting',
    enabled: true,
  },
  {
    name: 'API Access',
    description: 'Enable personal access tokens',
    enabled: false,
  },
  {
    name: 'White Labeling',
    description: 'Custom workspace branding',
    enabled: false,
  },
];

export function PlanManagement() {
  const [editingPlan] = useState<string | null>('Pro');
  const [permissionStates, setPermissionStates] = useState(
    permissions.map((p) => p.enabled)
  );

  const togglePermission = (index: number) => {
    const newStates = [...permissionStates];
    newStates[index] = !newStates[index];
    setPermissionStates(newStates);
  };

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar variant="admin" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="Plan Management"
          breadcrumbs={[{ label: 'Admin', href: '#' }, { label: 'Settings' }]}
        />

        <div className="flex-1 overflow-y-auto p-8">
          {/* Page Heading */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                Plan & Permission Management
              </h1>
              <p className="text-slate-500 dark:text-[#9da6b9]">
                Configure global subscription tiers, pricing, and feature access
                levels.
              </p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
              <Plus className="size-5" />
              Create New Plan
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Table Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Plan Name
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Price (Mo/Yr)
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Active Users
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {plans.map((plan) => (
                      <tr
                        key={plan.name}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                          plan.isEditing
                            ? 'bg-primary/5 border-l-4 border-l-primary'
                            : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {plan.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {plan.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            ${plan.monthlyPrice} / ${plan.annualPrice}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {plan.users.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {plan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-primary font-bold text-sm hover:underline">
                            {plan.isEditing ? 'Editing' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Configuration Panel */}
            {editingPlan && (
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg sticky top-8 flex flex-col max-h-[calc(100vh-160px)]">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Edit Plan: {editingPlan}
                      </h2>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="size-5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-[#9da6b9] leading-relaxed">
                      Update pricing and feature permissions for the{' '}
                      {editingPlan} tier. Changes apply instantly to new
                      subscribers.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Pricing Section */}
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                        Pricing Configuration
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Monthly ($)
                          </label>
                          <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                            type="number"
                            defaultValue={29}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Annual ($)
                          </label>
                          <input
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                            type="number"
                            defaultValue={290}
                          />
                        </div>
                      </div>
                    </section>

                    {/* Permissions Section */}
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                        Feature Permissions
                      </h3>
                      <div className="space-y-4">
                        {permissions.map((permission, index) => (
                          <div
                            key={permission.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {permission.name}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-[#9da6b9]">
                                {permission.description}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={permissionStates[index]}
                                onChange={() => togglePermission(index)}
                              />
                              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                            </label>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Admin Meta Info */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Info className="size-4" />
                        Last updated by Alex Rivera • 2 days ago
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
                    <button className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded-lg text-sm transition-all shadow-md shadow-primary/20">
                      Save Changes
                    </button>
                    <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 font-bold rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-white">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
