import 'expo-sqlite/localStorage/install';

type StorageListener = () => void;

const listeners = new Map<string, Set<StorageListener>>();
const cachedValues = new Map<string, unknown>();

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    if (cachedValues.has(key)) {
      return cachedValues.get(key) as T;
    }

    try {
      const storedValue = localStorage.getItem(key);
      const parsedValue = storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
      cachedValues.set(key, parsedValue);
      return parsedValue;
    } catch {
      cachedValues.set(key, defaultValue);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    cachedValues.set(key, value);
    localStorage.setItem(key, JSON.stringify(value));
    listeners.get(key)?.forEach((listener) => listener());
  },

  subscribe(key: string, listener: StorageListener): () => void {
    const keyListeners = listeners.get(key) ?? new Set<StorageListener>();
    keyListeners.add(listener);
    listeners.set(key, keyListeners);

    return () => {
      keyListeners.delete(listener);
    };
  },
};
