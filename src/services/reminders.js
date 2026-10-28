/**
 * Local reminder notifications (no push server needed; works in Expo Go).
 *
 * Reminders are scheduled as one-off notifications for the next few days and
 * rebuilt whenever the app syncs (on open, after logging food or water, or when
 * settings change). That lets today's reminders adapt to what you already did:
 *   - Upcoming meal: skipped if that meal is already logged today
 *   - Drink water:   skipped once today's water goal is reached
 *   - Log meals:     evening nudge, skipped if 3+ meals are logged today
 *   - Streak:        skipped if anything is logged today
 * Reminders stop a few days after the app was last opened instead of nagging forever.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';
const CHANNEL_ID = 'reminders';
const DAYS_AHEAD = 4; // iOS allows max 64 pending notifications; this schedules at most ~44

export const REMINDER_SCHEDULE = {
  meals: [
    { mealType: 'breakfast', hour: 8, minute: 30, title: 'Breakfast time 🍳', body: 'Start your day well. Log your breakfast or get a meal idea.' },
    { mealType: 'lunch', hour: 13, minute: 0, title: 'Lunch time 🥗', body: "Don't skip lunch. Log it to stay on track with your goals." },
    { mealType: 'dinner', hour: 19, minute: 30, title: 'Dinner time 🍲', body: 'Plan a balanced dinner that fits your remaining calories.' },
  ],
  waterHours: [10, 12, 14, 16, 18, 20],
  logMeals: { hour: 21, minute: 0 },
  streak: { hour: 20, minute: 0 },
};

let initialized = false;
let syncQueue = Promise.resolve();
let lastSignature = null;

// Show reminders as banners even when the app is open
const init = async () => {
  if (!SUPPORTED || initialized) return;
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Meal & water reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
};

/**
 * Returns 'granted' | 'denied' | 'unsupported'.
 * Only shows the system prompt when `ask` is true and the OS still allows asking.
 */
export const ensurePermission = async ({ ask = true } = {}) => {
  if (!SUPPORTED) return 'unsupported';
  await init();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  if (!ask || !current.canAskAgain) return 'denied';
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
};

const atTime = (base, dayOffset, hour, minute) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const localDateKey = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/**
 * Builds the list of reminders to schedule (pure function, exported for testing).
 * @param prefs  { nextMeal, hydration, dailySummary, streakReminder }
 * @param today  { mealTypes: string[], mealsCount, waterGlasses, waterGoal } or null if unknown
 */
export const planReminders = (prefs = {}, today = null, now = new Date()) => {
  const plan = [];
  const minTime = now.getTime() + 60 * 1000;
  const loggedTypes = new Set(today?.mealTypes || []);
  const waterGoal = today?.waterGoal || 8;

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const isToday = day === 0 && today !== null;
    const add = (kind, date, content) => {
      if (date.getTime() < minTime) return;
      plan.push({
        identifier: `snaptutor-${kind}-${localDateKey(date)}-${date.getHours()}${date.getMinutes()}`,
        date,
        content,
      });
    };

    if (prefs.nextMeal) {
      REMINDER_SCHEDULE.meals.forEach((m) => {
        if (isToday && loggedTypes.has(m.mealType)) return;
        add(`meal-${m.mealType}`, atTime(now, day, m.hour, m.minute), {
          title: m.title,
          body: m.body,
          data: { screen: 'Diet', mealType: m.mealType },
        });
      });
    }

    if (prefs.hydration && !(isToday && today.waterGlasses >= waterGoal)) {
      REMINDER_SCHEDULE.waterHours.forEach((hour) => {
        const remaining = isToday ? Math.max(0, waterGoal - today.waterGlasses) : waterGoal;
        add('water', atTime(now, day, hour, 0), {
          title: 'Time to drink water 💧',
          body: isToday
            ? `Have a glass now. ${remaining} more to reach today's goal.`
            : `Have a glass of water. Your goal is ${waterGoal} glasses a day.`,
          data: { screen: 'Diet' },
        });
      });
    }

    if (prefs.dailySummary && !(isToday && today.mealsCount >= 3)) {
      const { hour, minute } = REMINDER_SCHEDULE.logMeals;
      add('log', atTime(now, day, hour, minute), {
        title: "Log today's meals 📝",
        body: 'Take a minute to log everything you ate today so your totals stay accurate.',
        data: { screen: 'Diet' },
      });
    }

    if (prefs.streakReminder && !(isToday && today.mealsCount > 0)) {
      const { hour, minute } = REMINDER_SCHEDULE.streak;
      add('streak', atTime(now, day, hour, minute), {
        title: 'Keep your streak going 🔥',
        body: "You haven't logged anything today. Log a meal to keep your streak alive.",
        data: { screen: 'Home' },
      });
    }
  }
  return plan;
};

const doSync = async (prefs, today, { askPermission }) => {
  if (!SUPPORTED) return { status: 'unsupported', scheduled: 0 };

  const anyEnabled = prefs && Object.values(prefs).some(Boolean);
  const plan = anyEnabled ? planReminders(prefs, today) : [];

  // Skip work if nothing changed since the last sync this hour
  const signature = JSON.stringify([plan.map((p) => p.identifier), new Date().getHours()]);
  if (signature === lastSignature) return { status: 'unchanged', scheduled: plan.length };

  await init();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (plan.length === 0) {
    lastSignature = signature;
    return { status: 'off', scheduled: 0 };
  }

  const permission = await ensurePermission({ ask: askPermission });
  if (permission !== 'granted') {
    lastSignature = null;
    return { status: permission, scheduled: 0 };
  }

  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content: { ...item.content, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.date,
        channelId: CHANNEL_ID,
      },
    });
  }
  lastSignature = signature;
  return { status: 'granted', scheduled: plan.length };
};

/**
 * Rebuilds all reminders. Calls are queued so they never overlap.
 * Never throws; resolves { status, scheduled }.
 */
export const syncReminders = (prefs, today = null, { askPermission = true } = {}) => {
  syncQueue = syncQueue
    .catch(() => {})
    .then(() => doSync(prefs, today, { askPermission }))
    .catch((e) => {
      console.log('Reminder sync failed:', e.message);
      lastSignature = null;
      return { status: 'error', scheduled: 0 };
    });
  return syncQueue;
};

// Builds the `today` argument for syncReminders from a /diet/today response
export const todayFromDiet = (dietData) =>
  dietData
    ? {
        mealTypes: (dietData.meals || []).map((m) => m.mealType),
        mealsCount: (dietData.meals || []).length,
        waterGlasses: dietData.waterGlassesToday || 0,
        waterGoal: dietData.waterGoalGlasses || 8,
      }
    : null;

export const cancelAllReminders = async () => {
  if (!SUPPORTED) return;
  lastSignature = null;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
};

// Calls `onOpen(screen)` when the user taps a reminder. Returns an unsubscribe function.
export const addReminderTapListener = (onOpen) => {
  if (!SUPPORTED) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const screen = response?.notification?.request?.content?.data?.screen;
    if (typeof screen === 'string') onOpen(screen);
  });
  return () => sub.remove();
};
