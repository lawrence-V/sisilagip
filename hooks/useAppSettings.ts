import { APP_SETTINGS_STORAGE_KEY, DEFAULT_APP_SETTINGS } from '@/constants/settings';
import { useStorage } from '@/hooks/useStorage';
import { appSettingsSchema } from '@/types/AppSettings';

export function useAppSettings() {
  const [storedSettings, setStoredSettings] = useStorage(
    APP_SETTINGS_STORAGE_KEY,
    DEFAULT_APP_SETTINGS,
  );
  const parsedSettings = appSettingsSchema.safeParse(storedSettings);

  return [
    parsedSettings.success ? parsedSettings.data : DEFAULT_APP_SETTINGS,
    setStoredSettings,
  ] as const;
}
