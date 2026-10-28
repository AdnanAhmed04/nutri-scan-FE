import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  getRefreshToken,
  setRefreshToken,
  setCachedUser,
  getCachedUser,
  clearSession,
} from './tokenStorage';

const getDefaultBaseUrl = () => {
  // Explicit override, e.g. EXPO_PUBLIC_API_URL=https://api.example.com/api
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // Use the IP of the machine running Metro (works with Expo Go on the same Wi-Fi)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000/api`;
    }
  }

  // Fallback: local machine Wi-Fi IP address
  return 'http://192.168.100.30:5000/api';
};

export const API_BASE_URL = getDefaultBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// Device timezone (e.g. "Asia/Karachi") so the server knows when the user's day starts
const getDeviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

/**
 * Turns the stored avatar value into an <Image> URI.
 * Server avatars are relative paths ("/api/user/avatar/..."); anything else that
 * isn't http(s) (e.g. an old local file path from another device) is ignored.
 */
export const resolveAvatarUrl = (avatar) => {
  if (typeof avatar !== 'string' || !avatar) return null;
  if (avatar.startsWith('/api/')) return `${API_ORIGIN}${avatar}`;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return null;
};

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your internet connection and make sure the server is running.";

// ---------------------------------------------------------------------------
// Low-level request. Never throws; returns { ok, status, data, networkError }.
// ---------------------------------------------------------------------------
const rawRequest = async (endpoint, { method = 'GET', body, token, timeoutMs = 8000 } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(getDeviceTimezone() ? { 'X-Timezone': getDeviceTimezone() } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, networkError: false };
  } catch {
    return { ok: false, status: 0, data: null, networkError: true };
  } finally {
    clearTimeout(timeoutId);
  }
};

const errorMessage = (res, fallback = 'Something went wrong, please try again.') => {
  if (res.networkError) return NETWORK_ERROR_MESSAGE;
  return res.data?.message || fallback;
};

// ---------------------------------------------------------------------------
// Session handling: access token in memory, refresh token in secure storage
// ---------------------------------------------------------------------------
let accessToken = null;
let accessTokenExpiresAt = 0;
let refreshInFlight = null;
let sessionExpiredHandler = null;

// AuthContext registers this so the UI returns to the login screen when the session dies
export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

const notifySessionExpired = () => {
  if (sessionExpiredHandler) sessionExpiredHandler();
};

const applySession = async (data) => {
  accessToken = data.accessToken;
  // Refresh 30s early to avoid using a token that expires mid-request
  accessTokenExpiresAt = Date.now() + ((data.expiresIn || 900) - 30) * 1000;
  rememberGoals(data.user);
  await Promise.all([setRefreshToken(data.refreshToken), setCachedUser(data.user)]);
};

const endSession = async () => {
  accessToken = null;
  accessTokenExpiresAt = 0;
  resetLocalData();
  await clearSession();
};

/**
 * Exchanges the stored refresh token for a new token pair.
 * Only one refresh runs at a time; concurrent callers share the same promise
 * (the server treats re-use of a rotated refresh token as theft).
 * Resolves { ok: true, user } or { ok: false, reason: 'invalid' | 'network' }.
 */
const refreshSession = () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const storedToken = await getRefreshToken();
      if (!storedToken) return { ok: false, reason: 'invalid' };

      const res = await rawRequest('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: storedToken },
      });

      if (res.ok && res.data?.accessToken) {
        await applySession(res.data);
        return { ok: true, user: res.data.user };
      }

      // Server unreachable / overloaded: keep the stored session and try again later
      if (res.networkError || res.status >= 500 || res.status === 429) {
        return { ok: false, reason: 'network' };
      }

      await endSession();
      return { ok: false, reason: 'invalid' };
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/**
 * Authenticated request: attaches the access token, refreshes it when expired,
 * and retries once on 401. Signs the user out if the session can't be renewed.
 */
const authedRequest = async (endpoint, options = {}) => {
  if (!accessToken || Date.now() >= accessTokenExpiresAt) {
    const refreshed = await refreshSession();
    if (!refreshed.ok) {
      if (refreshed.reason === 'invalid') notifySessionExpired();
      return {
        ok: false,
        status: refreshed.reason === 'invalid' ? 401 : 0,
        data: null,
        networkError: refreshed.reason === 'network',
      };
    }
  }

  let res = await rawRequest(endpoint, { ...options, token: accessToken });

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed.ok) {
      res = await rawRequest(endpoint, { ...options, token: accessToken });
    } else if (refreshed.reason === 'network') {
      return { ok: false, status: 0, data: null, networkError: true };
    }

    if (res.status === 401) {
      await endSession();
      notifySessionExpired();
    }
  }

  return res;
};

// ---------------------------------------------------------------------------
// Offline fallback (used only when the server can't be reached)
// ---------------------------------------------------------------------------
const DEFAULT_GOALS = { calorieGoal: 2200, macroGoals: { protein: 140, carbs: 250, fat: 65 }, waterGoal: 8 };
let localGoals = { ...DEFAULT_GOALS };
let localMeals = [];
let localWater = 0;

function rememberGoals(user) {
  if (!user) return;
  localGoals = {
    calorieGoal: user.dailyCalorieGoal || DEFAULT_GOALS.calorieGoal,
    macroGoals: user.macroGoals || DEFAULT_GOALS.macroGoals,
    waterGoal: user.waterGoalGlasses || DEFAULT_GOALS.waterGoal,
  };
}

function resetLocalData() {
  localGoals = { ...DEFAULT_GOALS };
  localMeals = [];
  localWater = 0;
}

const buildLocalDietResponse = () => {
  const totals = localMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const groupedMeals = { breakfast: [], lunch: [], dinner: [], snack: [] };
  localMeals.forEach((m) => {
    const key = (m.mealType || 'snack').toLowerCase();
    (groupedMeals[key] || groupedMeals.snack).push(m);
  });

  return {
    success: true,
    source: 'local',
    date: new Date().toISOString().split('T')[0],
    meals: [...localMeals],
    groupedMeals,
    totals,
    goals: {
      calorieGoal: localGoals.calorieGoal,
      remainingCalories: Math.max(0, localGoals.calorieGoal - totals.calories),
      macroGoals: localGoals.macroGoals,
    },
    waterGlassesToday: localWater,
    waterGoalGlasses: localGoals.waterGoal,
    streak: null, // unknown while offline
  };
};

// ---------------------------------------------------------------------------
// Auth API (throws Error with a user-friendly message on failure)
// ---------------------------------------------------------------------------
export const authApi = {
  login: async (email, password) => {
    const res = await rawRequest('/auth/login', { method: 'POST', body: { email, password } });
    if (!res.ok || !res.data?.accessToken) {
      throw new Error(errorMessage(res, 'Could not sign in.'));
    }
    resetLocalData();
    await applySession(res.data);
    return res.data.user;
  },

  register: async (name, email, password) => {
    const res = await rawRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    if (!res.ok || !res.data?.accessToken) {
      throw new Error(errorMessage(res, 'Could not create account.'));
    }
    resetLocalData();
    await applySession(res.data);
    return res.data.user;
  },

  /**
   * Called on app start. Resolves { user, offline } or { user: null } if not signed in.
   * When the server is unreachable the cached user is returned so the app still opens.
   */
  restoreSession: async () => {
    const storedToken = await getRefreshToken();
    if (!storedToken) return { user: null };

    const refreshed = await refreshSession();
    if (refreshed.ok) return { user: refreshed.user, offline: false };

    if (refreshed.reason === 'network') {
      const cached = await getCachedUser();
      if (cached) {
        rememberGoals(cached);
        return { user: cached, offline: true };
      }
    }
    return { user: null };
  },

  // Revokes the refresh token on the server (best effort) and wipes local session data
  logout: async () => {
    const storedToken = await getRefreshToken();
    if (storedToken) {
      await rawRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: storedToken },
        timeoutMs: 4000,
      });
    }
    await endSession();
  },

  logoutAllDevices: async () => {
    const res = await authedRequest('/auth/logout-all', { method: 'POST' });
    if (!res.ok) throw new Error(errorMessage(res, 'Could not sign out other devices.'));
    await endSession();
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await authedRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    if (!res.ok || !res.data?.accessToken) {
      throw new Error(errorMessage(res, 'Could not change password.'));
    }
    await applySession(res.data);
    return res.data.user;
  },
};

// ---------------------------------------------------------------------------
// Data API
// ---------------------------------------------------------------------------
export const api = {
  checkHealth: async () => {
    const res = await rawRequest('/health');
    return res.ok ? res.data : { status: 'offline', database: { status: 'unreachable' } };
  },

  // Returns the profile, or null if it couldn't be loaded
  getUserProfile: async () => {
    const res = await authedRequest('/user/profile');
    if (res.ok && res.data?.user) {
      rememberGoals(res.data.user);
      setCachedUser(res.data.user);
      return res.data.user;
    }
    return null;
  },

  // Returns the saved profile, or null if the server couldn't be reached
  updateUserProfile: async (updates) => {
    const res = await authedRequest('/user/profile', { method: 'PUT', body: updates });
    if (res.ok && res.data?.user) {
      rememberGoals(res.data.user);
      setCachedUser(res.data.user);
      return res.data.user;
    }
    if (!res.networkError && res.status === 400) {
      throw new Error(errorMessage(res));
    }
    return null;
  },

  getTodayDiet: async () => {
    const res = await authedRequest('/diet/today');
    if (res.ok && res.data?.success) return res.data;
    return buildLocalDietResponse();
  },

  addMeal: async (mealData) => {
    const res = await authedRequest('/diet/meals', { method: 'POST', body: mealData });
    if (res.ok && res.data?.meal) return res.data.meal;

    if (!res.networkError) {
      throw new Error(errorMessage(res, 'Could not save meal.'));
    }

    // Offline: keep it locally for this session
    const localMeal = {
      _id: 'local_' + Date.now(),
      ...mealData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    localMeals.unshift(localMeal);
    return localMeal;
  },

  deleteMeal: async (id) => {
    await authedRequest(`/diet/meals/${encodeURIComponent(id)}`, { method: 'DELETE' });
    localMeals = localMeals.filter((m) => String(m._id) !== String(id));
    return true;
  },

  updateWater: async (delta) => {
    const res = await authedRequest('/diet/water', { method: 'POST', body: { delta } });
    if (res.ok && res.data?.waterGlassesToday !== undefined) {
      localWater = res.data.waterGlassesToday;
      return localWater;
    }
    if (res.networkError) {
      localWater = Math.max(0, localWater + (Number(delta) || 1));
    }
    return localWater;
  },

  // Last `days` days (oldest first): [{ date, calories, meals, waterGlasses }], or null if offline
  getHistory: async (days = 7) => {
    const res = await authedRequest(`/diet/history?days=${days}`);
    return res.ok && res.data?.days ? res.data : null;
  },

  /**
   * Uploads a profile photo (base64 JPEG/PNG/WebP, max 300 KB). Resolves the updated user.
   * Throws Error with a readable message.
   */
  uploadAvatar: async (base64) => {
    const res = await authedRequest('/user/avatar', {
      method: 'PUT',
      body: { image: base64 },
      timeoutMs: 30000,
    });
    if (res.ok && res.data?.user) {
      setCachedUser(res.data.user);
      return res.data.user;
    }
    throw new Error(errorMessage(res, 'Could not upload photo.'));
  },

  deleteAvatar: async () => {
    const res = await authedRequest('/user/avatar', { method: 'DELETE' });
    if (res.ok && res.data?.user) return res.data.user;
    throw new Error(errorMessage(res, 'Could not remove photo.'));
  },

  /**
   * Generates a personalized meal on the server (AI or recipe library).
   * Resolves { meal, source, context }; throws Error with a readable message.
   * Error has `.code` (e.g. 'NO_MATCH', 'RATE_LIMITED') when the server sent one.
   */
  generateMeal: async ({ mealType, dietType, excludeIds = [], excludeNames = [] }) => {
    const res = await authedRequest('/diet/generate', {
      method: 'POST',
      body: { mealType, dietType, excludeIds, excludeNames },
      timeoutMs: 30000, // AI generation can take a while
    });
    if (res.ok && res.data?.meal) return res.data;
    const error = new Error(errorMessage(res, 'Could not generate a meal right now.'));
    error.code = res.networkError ? 'NETWORK' : res.data?.code;
    throw error;
  },

  sendChatMessage: async (message) => {
    const res = await authedRequest('/chat/message', { method: 'POST', body: { message } });
    if (res.ok && res.data?.reply) return res.data;
    return {
      reply: `I received your question: "${message}". Snap Tutor AI will assist you soon!`,
    };
  },
};

export default api;
