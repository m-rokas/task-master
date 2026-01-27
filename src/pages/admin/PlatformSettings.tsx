import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Loader2,
  Check,
  Save,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/contexts/PlatformContext';

interface PlatformConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

const defaultSettings = {
  // General
  site_name: 'TaskMaster',
  site_description: 'Professional Task Management Platform',
  site_url: '',
  support_email: 'support@taskmaster.com',

  // Trial
  trial_days: '14',
  trial_enabled: 'true',

  // Features
  signup_enabled: 'true',
  maintenance_mode: 'false',

  // Notifications
  email_notifications_enabled: 'true',
  welcome_email_enabled: 'true',
  task_reminder_enabled: 'true',

  // Security
  max_login_attempts: '5',
  session_timeout_hours: '24',
};

export default function PlatformSettings() {
  const queryClient = useQueryClient();
  const { refreshSettings: refreshPlatformContext } = usePlatform();
  const [settings, setSettings] = useState<Record<string, string>>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  // Fetch platform settings
  const { data: configData, isLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_config')
        .select('*');

      if (error) {
        // Table might not exist - return defaults
        console.log('Platform config table not found, using defaults');
        return null;
      }
      return data as PlatformConfig[];
    },
  });

  useEffect(() => {
    if (configData && Array.isArray(configData)) {
      const configMap: Record<string, string> = { ...defaultSettings };
      configData.forEach((config) => {
        configMap[config.key] = config.value;
      });
      setSettings(configMap);
    }
  }, [configData]);

  // Save settings
  const saveSettings = useMutation({
    mutationFn: async () => {
      // Upsert each setting
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        category: getCategory(key),
        description: getDescription(key),
      }));

      const { error } = await supabase
        .from('platform_config')
        .upsert(upserts, { onConflict: 'key' });

      if (error) {
        console.error('Could not save to DB:', error.message);
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['platform-config'] });
      await refreshPlatformContext(); // Refresh the global platform context
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please check console for details.');
    },
  });

  const getCategory = (key: string): string => {
    if (key.startsWith('site_') || key.startsWith('support_')) return 'general';
    if (key.startsWith('trial_')) return 'billing';
    if (key.includes('email') || key.includes('notification') || key.includes('reminder')) return 'notifications';
    if (key.includes('login') || key.includes('session') || key.includes('security')) return 'security';
    return 'features';
  };

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      site_name: 'The name of your platform',
      site_description: 'Platform description for SEO',
      site_url: 'The main URL of your platform',
      support_email: 'Email for support inquiries',
      trial_days: 'Number of days for free trial',
      trial_enabled: 'Enable/disable free trial for new users',
      signup_enabled: 'Allow new user registrations',
      maintenance_mode: 'Put site in maintenance mode',
      email_notifications_enabled: 'Enable email notifications globally',
      welcome_email_enabled: 'Send welcome email to new users',
      task_reminder_enabled: 'Send task due date reminders',
      max_login_attempts: 'Max failed login attempts before lockout',
      session_timeout_hours: 'Hours before session expires',
    };
    return descriptions[key] || '';
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'billing', label: 'Billing & Trial', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'features', label: 'Features', icon: Settings },
  ];

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
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-zinc-400 mt-1">
            Configure global platform settings and preferences
          </p>
        </div>
        <button
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saveSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'bg-primary text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            {activeSection === 'general' && (
              <>
                <h2 className="text-lg font-semibold text-white">General Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={settings.site_name}
                      onChange={(e) => updateSetting('site_name', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Displayed in the header and browser tab
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Site Description
                    </label>
                    <textarea
                      value={settings.site_description}
                      onChange={(e) => updateSetting('site_description', e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Site URL
                    </label>
                    <input
                      type="url"
                      value={settings.site_url}
                      onChange={(e) => updateSetting('site_url', e.target.value)}
                      placeholder="https://yourdomain.com"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      The main URL of your platform (used for links in emails, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.support_email}
                      onChange={(e) => updateSetting('support_email', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {activeSection === 'billing' && (
              <>
                <h2 className="text-lg font-semibold text-white">Billing & Trial Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Enable Free Trial</p>
                      <p className="text-sm text-zinc-500">New users get a trial period</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.trial_enabled === 'true'}
                        onChange={(e) =>
                          updateSetting('trial_enabled', e.target.checked ? 'true' : 'false')
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Trial Duration (days)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.trial_days}
                        onChange={(e) => updateSetting('trial_days', e.target.value)}
                        min="1"
                        max="90"
                        className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-zinc-400">days</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      How many days new users can use Pro features for free
                    </p>
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Trial Info</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Users with active trials will have access to all Pro plan features.
                      After the trial ends, they'll be downgraded to the Free plan unless they subscribe.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'notifications' && (
              <>
                <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
                <div className="space-y-4">
                  {[
                    {
                      key: 'email_notifications_enabled',
                      title: 'Email Notifications',
                      desc: 'Send email notifications to users',
                    },
                    {
                      key: 'welcome_email_enabled',
                      title: 'Welcome Email',
                      desc: 'Send welcome email when users sign up',
                    },
                    {
                      key: 'task_reminder_enabled',
                      title: 'Task Reminders',
                      desc: 'Send reminders for upcoming task due dates',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-zinc-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[item.key] === 'true'}
                          onChange={(e) =>
                            updateSetting(item.key, e.target.checked ? 'true' : 'false')
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSection === 'security' && (
              <>
                <h2 className="text-lg font-semibold text-white">Security Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      value={settings.max_login_attempts}
                      onChange={(e) => updateSetting('max_login_attempts', e.target.value)}
                      min="3"
                      max="10"
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Account locked after this many failed attempts
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Session Timeout (hours)
                    </label>
                    <input
                      type="number"
                      value={settings.session_timeout_hours}
                      onChange={(e) => updateSetting('session_timeout_hours', e.target.value)}
                      min="1"
                      max="720"
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      How long until inactive sessions expire
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'features' && (
              <>
                <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">User Registration</p>
                      <p className="text-sm text-zinc-500">Allow new users to sign up</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.signup_enabled === 'true'}
                        onChange={(e) =>
                          updateSetting('signup_enabled', e.target.checked ? 'true' : 'false')
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div>
                      <p className="font-medium text-red-400">Maintenance Mode</p>
                      <p className="text-sm text-zinc-500">
                        Only admins can access when enabled
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.maintenance_mode === 'true'}
                        onChange={(e) =>
                          updateSetting('maintenance_mode', e.target.checked ? 'true' : 'false')
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
