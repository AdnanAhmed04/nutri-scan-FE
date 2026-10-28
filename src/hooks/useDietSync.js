import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncReminders, todayFromDiet } from '../services/reminders';

/**
 * Returns a callback to run whenever fresh /diet/today data arrives:
 *  - copies the server-computed streak into the user (shown in the header)
 *  - rebuilds reminders so today's ones reflect what was already logged
 */
export default function useDietSync() {
  const { user, patchUser } = useAuth();
  const prefs = user?.notifications;

  return useCallback(
    (dietData) => {
      if (!dietData) return;
      if (dietData.streak) {
        patchUser({ streakDays: dietData.streak.current, loggedToday: dietData.streak.loggedToday });
      }
      if (prefs) syncReminders(prefs, todayFromDiet(dietData));
    },
    [patchUser, prefs]
  );
}
