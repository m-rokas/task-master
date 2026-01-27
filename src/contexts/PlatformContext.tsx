import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface PlatformSettings {
  site_name: string;
  site_description: string;
  site_url: string;
  support_email: string;
  trial_days: number;
  trial_enabled: boolean;
  signup_enabled: boolean;
  maintenance_mode: boolean;
}

const defaultSettings: PlatformSettings = {
  site_name: 'TaskMaster',
  site_description: 'Professional Task Management Platform',
  site_url: '',
  support_email: 'support@taskmaster.com',
  trial_days: 14,
  trial_enabled: true,
  signup_enabled: true,
  maintenance_mode: false,
};

interface PlatformContextType {
  settings: PlatformSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('key, value');

      if (error) {
        console.log('Could not fetch platform config:', error.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const configMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          configMap[item.key] = item.value;
        });

        setSettings({
          site_name: configMap.site_name || defaultSettings.site_name,
          site_description: configMap.site_description || defaultSettings.site_description,
          site_url: configMap.site_url || defaultSettings.site_url,
          support_email: configMap.support_email || defaultSettings.support_email,
          trial_days: parseInt(configMap.trial_days) || defaultSettings.trial_days,
          trial_enabled: configMap.trial_enabled === 'true',
          signup_enabled: configMap.signup_enabled !== 'false',
          maintenance_mode: configMap.maintenance_mode === 'true',
        });
      }
    } catch (err) {
      console.error('Error fetching platform settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update document title when site_name changes
  useEffect(() => {
    if (settings.site_name) {
      document.title = settings.site_name;
    }
  }, [settings.site_name]);

  // Update meta description when site_description changes
  useEffect(() => {
    if (settings.site_description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', settings.site_description);
      }
    }
  }, [settings.site_description]);

  return (
    <PlatformContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
