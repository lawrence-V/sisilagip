import { useSyncExternalStore } from 'react';

import { storage } from '@/utils/storage';

export function useStorage<T>(key: string, defaultValue: T) {
  const value = useSyncExternalStore(
    (listener) => storage.subscribe(key, listener),
    () => storage.get(key, defaultValue),
    () => defaultValue,
  );

  const setValue = (newValue: T) => {
    storage.set(key, newValue);
  };

  return [value, setValue] as const;
}
