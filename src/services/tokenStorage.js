/**
 * Persistent session storage.
 * - Native (Android/iOS): expo-secure-store (Keychain / Android Keystore).
 * - Web: localStorage (SecureStore isn't available in browsers; fine for development).
 * The short-lived access token is never persisted; it lives in memory in api.js.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  refreshToken: 'snaptutor.refreshToken',
  user: 'snaptutor.user',
};

const isWeb = Platform.OS === 'web';

const setItem = async (key, value) => {
  if (isWeb) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage disabled (private mode); session just won't survive a reload
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
};

const getItem = async (key) => {
  if (isWeb) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const deleteItem = async (key) => {
  if (isWeb) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
};

export const getRefreshToken = () => getItem(KEYS.refreshToken);
export const setRefreshToken = (token) => setItem(KEYS.refreshToken, token);

// Only a small subset is cached so the app can open offline (SecureStore values should stay small)
export const setCachedUser = (user) => {
  if (!user) return Promise.resolve();
  const compact = {
    _id: user._id,
    name: user.name,
    email: user.email,
    dailyCalorieGoal: user.dailyCalorieGoal,
    macroGoals: user.macroGoals,
    waterGoalGlasses: user.waterGoalGlasses,
    dietType: user.dietType,
    notifications: user.notifications,
    avatar: user.avatar,
    streakDays: user.streakDays,
  };
  return setItem(KEYS.user, JSON.stringify(compact));
};

export const getCachedUser = async () => {
  const raw = await getItem(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  await Promise.all([deleteItem(KEYS.refreshToken), deleteItem(KEYS.user)]);
};
