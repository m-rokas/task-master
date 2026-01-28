import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
  Shield,
  User,
  Package,
  X,
  Mail,
  Key,
  Edit3,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  display_name: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  email?: string;
  plan_id?: string | null;
  plans?: { id: string; name: string; display_name: string } | null;
  subscriptions?: Subscription[] | null;
}

interface UserEmail {
  user_id: string;
  email: string;
}

const planColors: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  pro: 'bg-primary/20 text-primary',
  business: 'bg-purple-500/20 text-purple-400',
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [changePlanUser, setChangePlanUser] = useState<UserProfile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPlans();
    fetchUserEmails();
  }, []);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }

  async function fetchUserEmails() {
    try {
      const { data, error } = await supabase.rpc('get_user_emails');
      if (error) throw error;
      const emailMap: Record<string, string> = {};
      (data as UserEmail[] || []).forEach((item) => {
        emailMap[item.user_id] = item.email;
      });
      setUserEmails(emailMap);
    } catch (error) {
      console.error('Error fetching user emails:', error);
    }
  }

  async function openEditUser(user: UserProfile) {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: userEmails[user.id] || '',
      new_password: '',
    });
    setMessage(null);
    setActionMenuOpen(null);
  }

  async function saveUserChanges() {
    if (!editUser) return;
    setSaving(true);
    setMessage(null);

    try {
      // Update profile (full_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name })
        .eq('id', editUser.id);

      if (profileError) throw profileError;

      // If password is provided, update via admin function
      if (editForm.new_password) {
        const { error: passwordError } = await supabase.rpc('admin_update_user_password', {
          target_user_id: editUser.id,
          new_password: editForm.new_password,
        });
        if (passwordError) throw passwordError;
      }

      // If email changed, update via admin function
      if (editForm.email && editForm.email !== userEmails[editUser.id]) {
        const { error: emailError } = await supabase.rpc('admin_update_user_email', {
          target_user_id: editUser.id,
          new_email: editForm.email,
        });
        if (emailError) throw emailError;
      }

      setMessage({ type: 'success', text: 'User updated successfully!' });
      fetchUsers();
      fetchUserEmails();
      setTimeout(() => setEditUser(null), 1500);
    } catch (error: any) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update user' });
    } finally {
      setSaving(false);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          plans (id, name, display_name),
          subscriptions (id, status, current_period_end)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
    setActionMenuOpen(null);
  }

  async function changeUserRole(userId: string, newRole: 'user' | 'admin') {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
    setActionMenuOpen(null);
  }

  async function changeUserPlan(userId: string, planId: string, status: string) {
    try {
      // Update profile's plan
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan_id: planId })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Also update or create subscription
      const selectedPlanData = plans.find(p => p.id === planId);
      const isFree = selectedPlanData?.name === 'free';

      // Check if user has existing subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const periodEnd = new Date();
      // For trial, set 14 days; otherwise 1 month
      if (status === 'trialing') {
        periodEnd.setDate(periodEnd.getDate() + 14);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      if (existingSub) {
        // Update existing subscription
        await supabase
          .from('subscriptions')
          .update({
            plan_id: planId,
            status: isFree ? 'canceled' : status,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('id', existingSub.id);
      } else if (!isFree) {
        // Create new subscription for paid plan
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            status: status,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
      }

      const statusLabels: Record<string, string> = {
        active: 'Active',
        trialing: 'Trial',
        canceled: 'Canceled',
        past_due: 'Past Due',
      };
      setMessage({ type: 'success', text: `Plan changed to ${selectedPlanData?.display_name || 'Unknown'} (${statusLabels[status] || status})` });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user plan:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change plan' });
    }
    setChangePlanUser(null);
    setSelectedPlanId(null);
    setSelectedStatus('active');
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to permanently delete "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: `User "${userName}" deleted successfully` });
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete user' });
    }
    setActionMenuOpen(null);
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-zinc-400 mt-1">
          Manage platform users, roles, and account status
        </p>
      </div>

      {/* Global Message */}
      {message && !editUser && (
        <div className={cn(
          'px-4 py-3 rounded-lg text-sm flex items-center justify-between',
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        )}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={cn(
                'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={cn(
                        'hover:bg-zinc-800/50 transition-colors',
                        !user.is_active && 'opacity-60'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {user.full_name || 'Unnamed User'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {userEmails[user.id] || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            planColors[user.plans?.name || 'free']
                          )}
                        >
                          {user.plans?.display_name || 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const sub = user.subscriptions?.[0];
                          if (!sub) {
                            return <span className="text-xs text-zinc-500">No subscription</span>;
                          }
                          const statusColors: Record<string, string> = {
                            active: 'bg-green-500/20 text-green-400',
                            trialing: 'bg-blue-500/20 text-blue-400',
                            canceled: 'bg-red-500/20 text-red-400',
                            past_due: 'bg-yellow-500/20 text-yellow-400',
                          };
                          const statusLabels: Record<string, string> = {
                            active: 'Active',
                            trialing: 'Trial',
                            canceled: 'Canceled',
                            past_due: 'Past Due',
                          };
                          return (
                            <div className="flex flex-col gap-1">
                              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusColors[sub.status] || 'bg-zinc-700 text-zinc-300')}>
                                {statusLabels[sub.status] || sub.status}
                              </span>
                              {sub.current_period_end && (
                                <span className="text-xs text-zinc-500">
                                  {sub.status === 'trialing' ? 'Ends' : 'Renews'}: {new Date(sub.current_period_end).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-sm',
                            user.role === 'admin'
                              ? 'text-yellow-500'
                              : 'text-zinc-400'
                          )}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-sm',
                            user.is_active ? 'text-green-500' : 'text-red-500'
                          )}
                        >
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              user.is_active ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === user.id ? null : user.id
                            )
                          }
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 text-zinc-400" />
                        </button>
                        {actionMenuOpen === user.id && (
                          <div className="absolute right-6 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 py-1">
                            <button
                              onClick={() =>
                                toggleUserStatus(user.id, user.is_active)
                              }
                              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 text-red-500" />
                                  <span className="text-white">Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 text-green-500" />
                                  <span className="text-white">Activate</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                changeUserRole(
                                  user.id,
                                  user.role === 'admin' ? 'user' : 'admin'
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Shield className="h-4 w-4 text-yellow-500" />
                              <span className="text-white">
                                {user.role === 'admin'
                                  ? 'Remove Admin'
                                  : 'Make Admin'}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setChangePlanUser(user);
                                setSelectedPlanId(user.plans?.id || null);
                                setSelectedStatus(user.subscriptions?.[0]?.status || 'active');
                                setActionMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Package className="h-4 w-4 text-blue-500" />
                              <span className="text-white">Change Plan</span>
                            </button>
                            <button
                              onClick={() => openEditUser(user)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Edit3 className="h-4 w-4 text-green-500" />
                              <span className="text-white">Edit User</span>
                            </button>
                            <div className="border-t border-zinc-700 my-1" />
                            <button
                              onClick={() => deleteUser(user.id, user.full_name || 'Unnamed User')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="text-red-400">Delete User</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-zinc-500 text-center sm:text-left">
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, totalCount)} of {totalCount} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Change Plan Modal */}
      {changePlanUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Change User Plan & Status</h2>
              <button
                onClick={() => {
                  setChangePlanUser(null);
                  setSelectedPlanId(null);
                  setSelectedStatus('active');
                }}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-zinc-400 mb-4">
              Change plan for <span className="text-white font-medium">{changePlanUser.full_name || 'Unnamed User'}</span>
            </p>

            {/* Plan Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Select Plan</label>
              <div className="space-y-2">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId ? selectedPlanId === plan.id : changePlanUser.plans?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        'w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors',
                        isSelected
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className={cn(
                          'h-5 w-5',
                          plan.name === 'free' ? 'text-zinc-400' : plan.name === 'pro' ? 'text-blue-400' : 'text-purple-400'
                        )} />
                        <span className="text-white font-medium">{plan.display_name}</span>
                      </div>
                      {changePlanUser.plans?.id === plan.id && (
                        <span className="text-xs text-zinc-500">Current</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Subscription Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500' },
                  { value: 'trialing', label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500' },
                  { value: 'past_due', label: 'Past Due', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500' },
                  { value: 'canceled', label: 'Canceled', color: 'bg-red-500/20 text-red-400 border-red-500' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2',
                      selectedStatus === status.value
                        ? status.color
                        : 'bg-zinc-800 text-zinc-400 border-transparent hover:border-zinc-600'
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
              {selectedStatus === 'trialing' && (
                <p className="text-xs text-blue-400 mt-2">Trial period: 14 days</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setChangePlanUser(null);
                  setSelectedPlanId(null);
                  setSelectedStatus('active');
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const planId = selectedPlanId || changePlanUser.plans?.id;
                  if (planId) {
                    changeUserPlan(changePlanUser.id, planId, selectedStatus);
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setEditUser(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {message && (
              <div className={cn(
                'mb-4 px-4 py-3 rounded-lg text-sm',
                message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  <User className="h-4 w-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  <Key className="h-4 w-4 inline mr-1" />
                  New Password
                </label>
                <input
                  type="password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  placeholder="Leave empty to keep current"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Minimum 6 characters. Leave empty to keep current password.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveUserChanges}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
