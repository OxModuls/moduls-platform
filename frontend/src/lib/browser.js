
const PREFIX = "Moduls_";

const addPrefix = (key) => `${PREFIX}${key}`;

const safeParse = (value) => {
    try {
        return JSON.parse(value);
    } catch (error) {
        console.error('Error parsing value:', error);
        return null;
    }
};

const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error('Error stringifying value:', error);
        return "";
    }
};

const getLocalStorage = () => {
    if (typeof window !== 'undefined') {
        return window.localStorage;
    }
    return null;
};

export const getStorage = (key, defaultValue = null) => {
    const storage = getLocalStorage();
    if (!storage) return defaultValue;

    try {
        const prefixedKey = addPrefix(key);
        const value = storage.getItem(prefixedKey);
        return value ? safeParse(value) : defaultValue;
    } catch (error) {
        console.error(`Error getting storage key "${key}":`, error);
        return defaultValue;
    }
};

export const setStorage = (key, value) => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        const prefixedKey = addPrefix(key);
        const stringifiedValue = safeStringify(value);
        if (stringifiedValue === "") {
            return false;
        }
        storage.setItem(prefixedKey, stringifiedValue);
        return true;
    } catch (error) {
        console.error(`Error setting storage key "${key}":`, error);
        return false;
    }
};

export const removeStorage = (key) => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        const prefixedKey = addPrefix(key);
        storage.removeItem(prefixedKey);
        return true;
    } catch (error) {
        console.error(`Error removing storage key "${key}":`, error);
        return false;
    }
};

export const clearStorage = () => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        const keys = Object.keys(storage);
        keys.forEach((key) => {
            if (key.startsWith(PREFIX)) {
                storage.removeItem(key);
            }
        });
        return true;
    } catch (error) {
        console.error("Error clearing storage:", error);
        return false;
    }
};

export const hasStorage = (key) => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        const prefixedKey = addPrefix(key);
        return storage.getItem(prefixedKey) !== null;
    } catch (error) {
        console.error(`Error checking storage key "${key}":`, error);
        return false;
    }
};

export const getStorageKeys = () => {
    const storage = getLocalStorage();
    if (!storage) return [];

    try {
        const keys = Object.keys(storage);
        return keys
            .filter((key) => key.startsWith(PREFIX))
            .map((key) => key.slice(PREFIX.length));
    } catch (error) {
        console.error("Error getting storage keys:", error);
        return [];
    }
};

export const getStorageSize = (key) => {
    const storage = getLocalStorage();
    if (!storage) return 0;

    try {
        const prefixedKey = addPrefix(key);
        const value = storage.getItem(prefixedKey);
        return value ? new Blob([value]).size : 0;
    } catch (error) {
        console.error(`Error getting storage size for key "${key}":`, error);
        return 0;
    }
};

export const isStorageAvailable = () => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        const testKey = addPrefix('test');
        storage.setItem(testKey, "test");
        storage.removeItem(testKey);
        return true;
    } catch (error) {
        console.error("localStorage is not available:", error);
        return false;
    }
};

// Keep the new functions as aliases for backward compatibility
export const getItem = getStorage;
export const setItem = setStorage;
export const removeItem = removeStorage;
export const clear = clearStorage;
export const hasItem = hasStorage;
export const getKeys = getStorageKeys;
export const getAll = (defaultValue = {}) => {
    const storage = getLocalStorage();
    if (!storage) return defaultValue;

    try {
        const result = {};
        const keys = getStorageKeys();
        keys.forEach((key) => {
            result[key] = getStorage(key);
        });
        return result;
    } catch (error) {
        console.error('Error getting all items:', error);
        return defaultValue;
    }
};
export const isAvailable = isStorageAvailable;