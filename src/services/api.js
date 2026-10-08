import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDefaultBaseUrl = () => {
  // If running on web
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // 1. Try to get IP from Expo's Metro bundler connection host
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

  // 2. Direct local machine Wi-Fi IP address
  return 'http://192.168.100.30:5000/api';
};

export const API_BASE_URL = getDefaultBaseUrl();

// Safe native fetch wrapper with timeout
const safeFetch = async (endpoint, options = {}, timeoutMs = 4000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    // Return null silently on network error/timeout so the app falls back smoothly
    return null;
  }
};

// In-memory initial fallback state
const mockProfile = {
  _id: 'local_1',
  name: 'Alex Johnson',
  email: 'alex.johnson@snaptutor.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  age: 24,
  gender: 'Male',
  weightKg: 72,
  heightCm: 178,
  dailyCalorieGoal: 2200,
  macroGoals: { protein: 140, carbs: 250, fat: 65 },
  waterGoalGlasses: 8,
  waterGlassesToday: 5,
  dietType: 'Balanced',
  activityLevel: 'Moderate',
  streakDays: 7,
  allergies: ['Peanuts', 'Lactose'],
  likedFoods: ['Grilled Salmon', 'Avocado', 'Greek Yogurt', 'Berries'],
  notifications: {
    nextMeal: true,
    hydration: true,
    dailySummary: true,
    streakReminder: true,
  },
};

let localMeals = [
  {
    _id: 'm1',
    name: 'Avocado Toast & Boiled Eggs',
    mealType: 'breakfast',
    calories: 420,
    protein: 18,
    carbs: 35,
    fat: 22,
    portion: '2 slices & 2 eggs',
    time: '08:15 AM',
  },
  {
    _id: 'm2',
    name: 'Grilled Chicken & Quinoa Salad',
    mealType: 'lunch',
    calories: 580,
    protein: 48,
    carbs: 45,
    fat: 16,
    portion: '1 bowl (350g)',
    time: '01:00 PM',
  },
  {
    _id: 'm3',
    name: 'Greek Yogurt with Blueberries',
    mealType: 'snack',
    calories: 190,
    protein: 15,
    carbs: 22,
    fat: 4,
    portion: '200g',
    time: '04:30 PM',
  },
];

let localWater = 5;

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
    if (groupedMeals[key]) {
      groupedMeals[key].push(m);
    } else {
      groupedMeals.snack.push(m);
    }
  });

  return {
    success: true,
    source: 'local',
    date: new Date().toISOString().split('T')[0],
    meals: [...localMeals],
    groupedMeals,
    totals,
    goals: {
      calorieGoal: 2200,
      remainingCalories: Math.max(0, 2200 - totals.calories),
      macroGoals: { protein: 140, carbs: 250, fat: 65 },
    },
    waterGlassesToday: localWater,
  };
};

export const api = {
  checkHealth: async () => {
    const data = await safeFetch('/health');
    return data || { status: 'offline', database: { status: 'local fallback' } };
  },

  getUserProfile: async () => {
    const data = await safeFetch('/user/profile');
    if (data && data.user) {
      return data.user;
    }
    return mockProfile;
  },

  updateUserProfile: async (updates) => {
    const data = await safeFetch('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (data && data.user) {
      return data.user;
    }
    return { ...mockProfile, ...updates };
  },

  getTodayDiet: async () => {
    const data = await safeFetch('/diet/today');
    if (data && data.success) {
      return data;
    }
    return buildLocalDietResponse();
  },

  addMeal: async (mealData) => {
    const data = await safeFetch('/diet/meals', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });

    if (data && data.meal) {
      return data.meal;
    }

    const localMeal = {
      _id: 'local_' + Date.now(),
      ...mealData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    localMeals.unshift(localMeal);
    return localMeal;
  },

  deleteMeal: async (id) => {
    await safeFetch(`/diet/meals/${id}`, { method: 'DELETE' });
    localMeals = localMeals.filter((m) => String(m._id) !== String(id));
    return true;
  },

  updateWater: async (delta) => {
    const data = await safeFetch('/diet/water', {
      method: 'POST',
      body: JSON.stringify({ delta }),
    });

    if (data && data.waterGlassesToday !== undefined) {
      return data.waterGlassesToday;
    }

    localWater = Math.max(0, localWater + (Number(delta) || 1));
    return localWater;
  },

  sendChatMessage: async (message) => {
    const data = await safeFetch('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });

    if (data && data.reply) {
      return data;
    }

    return {
      reply: `I received your question: "${message}". Snap Tutor AI will assist you soon!`,
    };
  },
};

export default api;
