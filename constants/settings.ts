import { APP_BRAND_NAME } from '@/constants/app';
import { type AppSettings } from '@/types/AppSettings';

export const APP_SETTINGS_STORAGE_KEY = 'sisilagip.app-settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  eventName: APP_BRAND_NAME,
  receiptFooter: 'Keep this memory forever',
  autoPrint: false,
  printCopies: 1,
};
