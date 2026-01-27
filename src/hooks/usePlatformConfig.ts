import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface PlatformConfig {
  key: string;
  value: string;
}

const defaultConfig: Record<string, string> = {
  site_name: 'TaskMaster',
  site_description: 'Professional Task Management Platform',
  support_email: 'support@taskmaster.com',
  trial_days: '14',
  trial_enabled: 'true',
};

export function usePlatformConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_config')
        .select('key, value');

      if (error || !data) {
        console.log('Platform config not available, using defaults');
        return defaultConfig;
      }

      const configMap: Record<string, string> = { ...defaultConfig };
      if (Array.isArray(data)) {
        (data as PlatformConfig[]).forEach((item) => {
          configMap[item.key] = item.value;
        });
      }
      return configMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    config: data || defaultConfig,
    isLoading,
    getSiteName: () => data?.site_name || defaultConfig.site_name,
    // Return empty string if explicitly set to empty, otherwise use value or default
    getSiteDescription: () => {
      if (data?.site_description !== undefined) {
        return data.site_description; // Return as-is (including empty string)
      }
      return defaultConfig.site_description;
    },
    getTrialDays: () => parseInt(data?.trial_days || defaultConfig.trial_days),
    isTrialEnabled: () => data?.trial_enabled === 'true',
  };
}
