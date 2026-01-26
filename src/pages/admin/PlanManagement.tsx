import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Loader2,
  Check,
  Package,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  project_limit: number | null;
  task_limit: number | null;
  features: {
    team?: boolean;
    labels?: boolean;
    attachments?: boolean;
    api_access?: boolean;
    priority_support?: boolean;
  };
  price_monthly: number;
  price_yearly: number;
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
  is_active: boolean;
  created_at: string;
  _count?: { subscriptions: number };
}

const defaultPlan: Omit<Plan, 'id' | 'created_at' | '_count'> = {
  name: '',
  display_name: '',
  project_limit: 5,
  task_limit: 100,
  features: {},
  price_monthly: 0,
  price_yearly: 0,
  stripe_price_monthly: null,
  stripe_price_yearly: null,
  is_active: true,
};

export default function PlanManagement() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(defaultPlan);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch plans with subscription counts
  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;

      // Get user counts per plan from profiles (source of truth)
      // Users without a plan_id are counted as "free" plan users
      const { data: profileCounts } = await supabase
        .from('profiles')
        .select('plan_id');

      const counts: Record<string, number> = {};

      // First, get the free plan ID
      const freePlan = plansData.find((p) => p.name === 'free');

      profileCounts?.forEach((p) => {
        // If no plan_id, count as free plan user
        const planId = p.plan_id || freePlan?.id || 'free';
        counts[planId] = (counts[planId] || 0) + 1;
      });

      return plansData.map((plan) => ({
        ...plan,
        _count: { subscriptions: counts[plan.id] || 0 },
      })) as Plan[];
    },
  });

  // Create plan
  const createPlan = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('plans').insert({
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: data.display_name,
        project_limit: data.project_limit,
        task_limit: data.task_limit,
        features: data.features,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly,
        stripe_price_monthly: data.stripe_price_monthly,
        stripe_price_yearly: data.stripe_price_yearly,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setIsCreating(false);
      setFormData(defaultPlan);
    },
  });

  // Update plan
  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('plans')
        .update({
          display_name: data.display_name,
          project_limit: data.project_limit,
          task_limit: data.task_limit,
          features: data.features,
          price_monthly: data.price_monthly,
          price_yearly: data.price_yearly,
          stripe_price_monthly: data.stripe_price_monthly,
          stripe_price_yearly: data.stripe_price_yearly,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditingPlan(null);
    },
  });

  // Delete plan
  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setDeleteConfirm(null);
    },
  });

  const openEditPanel = (plan: Plan) => {
    setEditingPlan(plan);
    setIsCreating(false);
    setFormData({
      name: plan.name,
      display_name: plan.display_name,
      project_limit: plan.project_limit,
      task_limit: plan.task_limit,
      features: plan.features || {},
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      stripe_price_monthly: plan.stripe_price_monthly,
      stripe_price_yearly: plan.stripe_price_yearly,
      is_active: plan.is_active,
    });
  };

  const openCreatePanel = () => {
    setIsCreating(true);
    setEditingPlan(null);
    setFormData(defaultPlan);
  };

  const closePanel = () => {
    setEditingPlan(null);
    setIsCreating(false);
    setFormData(defaultPlan);
  };

  const handleSave = () => {
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlan.mutate(formData);
    }
  };

  const toggleFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [feature]: !formData.features[feature as keyof typeof formData.features],
      },
    });
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-white">Plan Management</h1>
          <p className="text-zinc-400 mt-1">
            Configure subscription plans, pricing and features
          </p>
        </div>
        <button
          onClick={openCreatePanel}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                    Plan
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                    Price
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                    Users
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {plans?.map((plan) => (
                  <tr
                    key={plan.id}
                    className={cn(
                      'hover:bg-zinc-800/50 transition-colors',
                      editingPlan?.id === plan.id && 'bg-primary/10 border-l-2 border-l-primary'
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            plan.price_monthly === 0
                              ? 'bg-zinc-700'
                              : plan.price_monthly < 50
                              ? 'bg-blue-500/20'
                              : 'bg-purple-500/20'
                          )}
                        >
                          <Package
                            className={cn(
                              'h-5 w-5',
                              plan.price_monthly === 0
                                ? 'text-zinc-400'
                                : plan.price_monthly < 50
                                ? 'text-blue-400'
                                : 'text-purple-400'
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-white">{plan.display_name}</p>
                          <p className="text-xs text-zinc-500">
                            {plan.project_limit ? `${plan.project_limit} projects` : 'Unlimited'} /{' '}
                            {plan.task_limit ? `${plan.task_limit} tasks` : 'Unlimited'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">
                        {plan.price_monthly === 0 ? 'Free' : `€${plan.price_monthly}/mo`}
                      </p>
                      {plan.price_yearly > 0 && (
                        <p className="text-xs text-zinc-500">€{plan.price_yearly}/yr</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-500" />
                        <span className="text-white">{plan._count?.subscriptions || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          plan.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-zinc-700 text-zinc-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            plan.is_active ? 'bg-green-400' : 'bg-zinc-500'
                          )}
                        />
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditPanel(plan)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {plan._count?.subscriptions === 0 && (
                          <button
                            onClick={() => setDeleteConfirm(plan.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit/Create Panel */}
        {(editingPlan || isCreating) && (
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sticky top-6">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {isCreating ? 'Create Plan' : `Edit: ${editingPlan?.display_name}`}
                  </h2>
                  <button
                    onClick={closePanel}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase">Basic Info</h3>
                  {isCreating && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Plan Name (internal)
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. pro_plus"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="e.g. Pro Plus"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Active</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase">Pricing</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Monthly (€)
                      </label>
                      <input
                        type="number"
                        value={formData.price_monthly}
                        onChange={(e) =>
                          setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Yearly (€)
                      </label>
                      <input
                        type="number"
                        value={formData.price_yearly}
                        onChange={(e) =>
                          setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase">Limits</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Projects
                      </label>
                      <input
                        type="number"
                        value={formData.project_limit || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            project_limit: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="Unlimited"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Tasks
                      </label>
                      <input
                        type="number"
                        value={formData.task_limit || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            task_limit: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="Unlimited"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase">Features</h3>
                  {[
                    { key: 'team', label: 'Team Collaboration', desc: 'Invite team members to projects' },
                    { key: 'labels', label: 'Custom Labels', desc: 'Create custom task labels' },
                    { key: 'attachments', label: 'File Attachments', desc: 'Attach files to tasks' },
                    { key: 'api_access', label: 'API Access', desc: 'Access REST API' },
                    { key: 'priority_support', label: 'Priority Support', desc: '24/7 priority support' },
                  ].map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{feature.label}</p>
                        <p className="text-xs text-zinc-500">{feature.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData.features[feature.key as keyof typeof formData.features]}
                          onChange={() => toggleFeature(feature.key)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Stripe IDs */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase">Stripe Integration</h3>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Monthly Price ID
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_price_monthly || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, stripe_price_monthly: e.target.value || null })
                      }
                      placeholder="price_xxx"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Yearly Price ID
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_price_yearly || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, stripe_price_yearly: e.target.value || null })
                      }
                      placeholder="price_xxx"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={createPlan.isPending || updatePlan.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {(createPlan.isPending || updatePlan.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isCreating ? 'Create Plan' : 'Save Changes'}
                </button>
                <button
                  onClick={closePanel}
                  className="px-4 py-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Delete Plan?</h2>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to delete this plan? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePlan.mutate(deleteConfirm)}
                disabled={deletePlan.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deletePlan.isPending ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
