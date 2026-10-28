import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Avatar from '../components/Avatar';
import api, { resolveAvatarUrl } from '../services/api';
import { ensurePermission, syncReminders, todayFromDiet } from '../services/reminders';
import tw from '../theme/tailwind';
import Header from '../components/Header';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { confirmAction, showMessage } from '../utils/dialogs';
import { useAuth } from '../context/AuthContext';

// Profile photos are resized to this width before upload
const AVATAR_SIZE = 256;

const DIET_TYPES = ['Balanced', 'High Protein', 'Keto', 'Vegan', 'Vegetarian', 'Low Carb'];

const DEFAULT_ALLERGIES = [
  'Peanuts',
  'Lactose',
  'Gluten',
  'Shellfish',
  'Eggs',
  'Soy',
  'Tree Nuts',
];

const DEFAULT_LIKED_FOODS = [
  'Grilled Salmon',
  'Avocado',
  'Greek Yogurt',
  'Blueberries',
  'Chicken Breast',
  'Quinoa',
  'Oatmeal',
  'Sweet Potato',
];

export default function ProfileScreen({ navigation, route }) {
  const { user, updateUser, logout, logoutAllDevices, refreshUser, uploadAvatar, removeAvatar } = useAuth();
  const scrollViewRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Revokes this device's session on the server and clears stored tokens.
  // AuthContext then clears the user and App shows the login screen.
  const handleSignOut = async () => {
    if (signingOut) return;
    const confirmed = await confirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      destructive: true,
    });
    if (!confirmed) return;
    setSigningOut(true);
    try {
      await logout();
    } catch (e) {
      // logout always clears the local session, even if the server call fails
      console.log('Sign out error:', e.message);
      setSigningOut(false);
    }
  };

  const handleSignOutAll = async () => {
    if (signingOut) return;
    const confirmed = await confirmAction({
      title: 'Sign Out Everywhere',
      message: 'This signs you out on all devices, including this one.',
      confirmText: 'Sign Out All',
      destructive: true,
    });
    if (!confirmed) return;
    setSigningOut(true);
    try {
      await logoutAllDevices();
    } catch (e) {
      setSigningOut(false);
      showMessage('Error', e.message || 'Could not sign out other devices.');
    }
  };

  // Profile photo: local preview while the upload is running
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  // 'granted' | 'denied' | 'unsupported' | null (unknown yet)
  const [notifPermission, setNotifPermission] = useState(null);

  const [name, setName] = useState(user?.name || '');
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [weight, setWeight] = useState(String(user?.weightKg || 72));
  const [height, setHeight] = useState(String(user?.heightCm || 178));
  const [calorieGoal, setCalorieGoal] = useState(String(user?.dailyCalorieGoal || 2200));
  const [selectedDiet, setSelectedDiet] = useState(user?.dietType || 'Balanced');
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Accordion Card Open/Close States (ALL CLOSED BY DEFAULT)
  const [openMetrics, setOpenMetrics] = useState(false);
  const [openAllergies, setOpenAllergies] = useState(false);
  const [openLikedFoods, setOpenLikedFoods] = useState(false);
  const [openDietStyle, setOpenDietStyle] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  // Allergies & Liked Food State
  const [allergies, setAllergies] = useState(user?.allergies || ['Peanuts', 'Lactose']);
  const [customAllergy, setCustomAllergy] = useState('');
  const [showAddAllergy, setShowAddAllergy] = useState(false);

  const [likedFoods, setLikedFoods] = useState(
    user?.likedFoods || ['Grilled Salmon', 'Avocado', 'Greek Yogurt', 'Blueberries']
  );
  const [customFood, setCustomFood] = useState('');
  const [showAddFood, setShowAddFood] = useState(false);

  // Notification Preferences Toggles State
  const [nextMealNotif, setNextMealNotif] = useState(
    user?.notifications?.nextMeal ?? true
  );
  const [hydrationNotif, setHydrationNotif] = useState(
    user?.notifications?.hydration ?? true
  );
  const [summaryNotif, setSummaryNotif] = useState(
    user?.notifications?.dailySummary ?? true
  );
  const [streakNotif, setStreakNotif] = useState(
    user?.notifications?.streakReminder ?? true
  );

  const isReloadingRef = useRef(false);
  const prevUserIdRef = useRef(user?._id || user?.email || 'init');

  const syncWithUser = useCallback((userData) => {
    if (!userData) return;
    if (userData.name) setName(userData.name);
    if (userData.weightKg !== undefined) setWeight(String(userData.weightKg));
    if (userData.heightCm !== undefined) setHeight(String(userData.heightCm));
    if (userData.dailyCalorieGoal !== undefined) setCalorieGoal(String(userData.dailyCalorieGoal));
    if (userData.dietType) setSelectedDiet(userData.dietType);
    if (userData.allergies) setAllergies(userData.allergies);
    if (userData.likedFoods) setLikedFoods(userData.likedFoods);
    if (userData.notifications) {
      setNextMealNotif(userData.notifications.nextMeal ?? true);
      setHydrationNotif(userData.notifications.hydration ?? true);
      setSummaryNotif(userData.notifications.dailySummary ?? true);
      setStreakNotif(userData.notifications.streakReminder ?? true);
    }
  }, []);

  useEffect(() => {
    const currentId = user?._id || user?.email;
    if (currentId && currentId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentId;
      syncWithUser(user);
    }
  }, [user, syncWithUser]);

  const handleReload = useCallback(async () => {
    if (isReloadingRef.current) return;
    try {
      isReloadingRef.current = true;
      setRefreshing(true);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setIsEditingMetrics(false);
      setShowAddAllergy(false);
      setShowAddFood(false);
      setOpenMetrics(false);
      setOpenAllergies(false);
      setOpenLikedFoods(false);
      setOpenDietStyle(false);
      setOpenNotifications(false);

      if (refreshUser) {
        const freshUser = await refreshUser();
        if (freshUser) {
          syncWithUser(freshUser);
        }
      }
    } catch (e) {
      console.log('ProfileScreen reload error:', e.message);
    } finally {
      setRefreshing(false);
      isReloadingRef.current = false;
    }
  }, [refreshUser, syncWithUser]);

  // Reload when user clicks Profile while already on Profile
  useEffect(() => {
    const unsubscribeTabPress = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        handleReload();
      }
    });
    return unsubscribeTabPress;
  }, [navigation, handleReload]);

  // Biometrics & WHO Clinical BMI Computations
  const weightNum = parseFloat(weight) > 0 ? parseFloat(weight) : 72;
  const heightNum = parseFloat(height) > 0 ? parseFloat(height) : 178;
  const heightM = heightNum / 100;
  const rawBmi = weightNum / (heightM * heightM);
  const bmi = isNaN(rawBmi) ? '22.7' : rawBmi.toFixed(1);

  // WHO Standards: 18.5 - 24.9
  const minHealthyKg = (18.5 * heightM * heightM).toFixed(1);
  const maxHealthyKg = (24.9 * heightM * heightM).toFixed(1);
  const idealKg = (21.7 * heightM * heightM).toFixed(1);
  const weightDiff = (weightNum - parseFloat(idealKg)).toFixed(1);

  // Imperial unit equivalents
  const weightLbs = (weightNum * 2.20462).toFixed(1);
  const totalInches = Math.round(heightNum / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  // Metabolic formulas: Mifflin-St Jeor BMR & TDEE
  const userAge = user?.age || 24;
  const userGender = user?.gender || 'Male';
  const bmr = Math.round(
    10 * weightNum + 6.25 * heightNum - 5 * userAge + (userGender === 'Female' ? -161 : 5)
  );
  const tdee = Math.round(bmr * 1.375); // moderate physical activity
  const calorieGoalNum = parseInt(calorieGoal, 10) || 2200;
  const calorieDiff = calorieGoalNum - tdee;

  // Pointer position on the 15-35 BMI Spectrum Gauge
  const pointerPct = Math.max(3, Math.min(97, ((parseFloat(bmi) - 15) / 20) * 100));

  const getBmiCategory = (score) => {
    const val = parseFloat(score);
    if (val < 18.5) {
      return {
        text: 'Underweight',
        shortText: 'Under',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        dot: '#38bdf8',
        badgeBg: 'bg-sky-500',
        badgeBorder: 'border-sky-500/40',
        statusAdvice: 'Caloric surplus recommended',
        desc: 'Your BMI is below 18.5. Prioritize nutrient-dense whole foods and healthy fats to gradually reach an optimal weight.',
      };
    }
    if (val < 25) {
      return {
        text: 'Healthy Weight',
        shortText: 'Optimal',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        dot: '#10b981',
        badgeBg: 'bg-emerald-500',
        badgeBorder: 'border-emerald-500/40',
        statusAdvice: 'Optimal metabolic range',
        desc: 'Your weight is in the ideal healthy range for your height. Maintain balanced macronutrient intake and hydration.',
      };
    }
    if (val < 30) {
      return {
        text: 'Overweight',
        shortText: 'Overweight',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        dot: '#f59e0b',
        badgeBg: 'bg-amber-500',
        badgeBorder: 'border-amber-500/40',
        statusAdvice: 'Gentle deficit recommended',
        desc: 'Your BMI is slightly elevated. A gentle deficit of 300-500 kcal/day combined with daily exercise can help you return to optimal range.',
      };
    }
    return {
      text: 'Obese',
      shortText: 'Obese',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      dot: '#f43f5e',
      badgeBg: 'bg-rose-500',
      badgeBorder: 'border-rose-500/40',
      statusAdvice: 'Structured guidance recommended',
      desc: 'Your BMI is in the higher range. Consider consulting a registered dietitian to establish a safe, sustainable meal strategy.',
    };
  };

  const bmiInfo = getBmiCategory(bmi);

  // Stepper adjustments for editing
  const handleAdjustWeight = (delta) => {
    setWeight((prev) => {
      const val = Math.max(30, Math.min(250, (parseFloat(prev) || 72) + delta));
      return val.toFixed(1).replace(/\.0$/, '');
    });
  };

  const handleAdjustHeight = (delta) => {
    setHeight((prev) => {
      const val = Math.max(100, Math.min(240, (parseInt(prev, 10) || 178) + delta));
      return String(val);
    });
  };

  const handleAdjustCalories = (delta) => {
    setCalorieGoal((prev) => {
      const val = Math.max(1000, Math.min(5000, (parseInt(prev, 10) || 2200) + delta));
      return String(val);
    });
  };

  const handleCancelEditing = () => {
    setWeight(String(user?.weightKg || 72));
    setHeight(String(user?.heightCm || 178));
    setCalorieGoal(String(user?.dailyCalorieGoal || 2200));
    setIsEditingMetrics(false);
  };

  // Pick a photo, shrink it to 256px JPEG on the device (~20-40 KB), then upload it
  const handleUploadAvatar = async () => {
    if (avatarBusy) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage('Permission Required', 'Please allow photo library access to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;

      setAvatarBusy(true);
      setAvatarPreview(result.assets[0].uri);

      // maxWidth downsamples while decoding so large camera photos don't use lots of memory
      const context = ImageManipulator.manipulate(result.assets[0].uri, { maxWidth: 1024 });
      context.resize({ width: AVATAR_SIZE });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });

      await uploadAvatar(saved.base64);
      showMessage('Profile Photo Updated', 'Your new profile photo has been saved.');
    } catch (e) {
      console.log('Avatar upload error:', e.message);
      showMessage('Upload Failed', e.message || 'Could not update your profile photo.');
    } finally {
      setAvatarPreview(null);
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (avatarBusy) return;
    const confirmed = await confirmAction({
      title: 'Remove Photo',
      message: 'Remove your profile photo?',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    setAvatarBusy(true);
    try {
      await removeAvatar();
    } catch (e) {
      showMessage('Error', e.message || 'Could not remove photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // Toggle or add Allergies
  const toggleAllergy = async (allergyItem) => {
    const updated = allergies.includes(allergyItem)
      ? allergies.filter((item) => item !== allergyItem)
      : [...allergies, allergyItem];
    setAllergies(updated);
    await updateUser({ allergies: updated });
  };

  const handleAddCustomAllergy = async () => {
    if (!customAllergy.trim()) return;
    const item = customAllergy.trim();
    if (!allergies.includes(item)) {
      const updated = [...allergies, item];
      setAllergies(updated);
      await updateUser({ allergies: updated });
    }
    setCustomAllergy('');
    setShowAddAllergy(false);
  };

  // Toggle or add Liked Foods
  const toggleLikedFood = async (foodItem) => {
    const updated = likedFoods.includes(foodItem)
      ? likedFoods.filter((item) => item !== foodItem)
      : [...likedFoods, foodItem];
    setLikedFoods(updated);
    await updateUser({ likedFoods: updated });
  };

  const handleAddCustomFood = async () => {
    if (!customFood.trim()) return;
    const item = customFood.trim();
    if (!likedFoods.includes(item)) {
      const updated = [...likedFoods, item];
      setLikedFoods(updated);
      await updateUser({ likedFoods: updated });
    }
    setCustomFood('');
    setShowAddFood(false);
  };

  // Save Height, Weight, and Calorie Target with validation
  const handleSaveMetrics = async () => {
    try {
      const parsedWeight = parseFloat(weight);
      const parsedHeight = parseFloat(height);
      const parsedCalories = parseInt(calorieGoal, 10);

      if (isNaN(parsedWeight) || parsedWeight < 25 || parsedWeight > 300) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight between 25 kg and 300 kg.');
        return;
      }
      if (isNaN(parsedHeight) || parsedHeight < 80 || parsedHeight > 250) {
        Alert.alert('Invalid Height', 'Please enter a valid height between 80 cm and 250 cm.');
        return;
      }
      if (isNaN(parsedCalories) || parsedCalories < 800 || parsedCalories > 6000) {
        Alert.alert('Invalid Calories', 'Please enter a daily calorie target between 800 and 6,000 kcal.');
        return;
      }

      setSavingMetrics(true);
      await updateUser({
        name,
        weightKg: Number(parsedWeight.toFixed(1)),
        heightCm: Math.round(parsedHeight),
        dailyCalorieGoal: parsedCalories,
        dietType: selectedDiet,
      });
      setIsEditingMetrics(false);
      Alert.alert('Metrics Saved', 'Your body composition measurements and goals have been updated!');
    } catch (e) {
      console.log('Error updating metrics:', e.message);
      Alert.alert('Error', 'Could not save metrics. Please try again.');
    } finally {
      setSavingMetrics(false);
    }
  };

  // Toggle notification preference with instant auto-save
  const handleToggleNotification = async (key, value, setter) => {
    setter(value);
    const updatedNotifs = {
      nextMeal: key === 'nextMeal' ? value : nextMealNotif,
      hydration: key === 'hydration' ? value : hydrationNotif,
      dailySummary: key === 'dailySummary' ? value : summaryNotif,
      streakReminder: key === 'streakReminder' ? value : streakNotif,
    };
    await updateUser({ notifications: updatedNotifs });

    if (value) {
      const permission = await ensurePermission({ ask: true });
      setNotifPermission(permission);
      if (permission === 'denied') {
        showMessage(
          'Notifications Blocked',
          'Reminders are turned on, but notifications are blocked for this app. Enable them in your phone Settings.'
        );
      }
    }

    // Rebuild reminders using today's progress so already-done reminders are skipped
    const diet = await api.getTodayDiet();
    syncReminders(updatedNotifs, todayFromDiet(diet), { askPermission: false });
  };

  // Check notification permission once (without prompting) to show a warning if blocked
  useEffect(() => {
    ensurePermission({ ask: false }).then(setNotifPermission).catch(() => {});
  }, []);

  const activeNotifsCount =
    (nextMealNotif ? 1 : 0) +
    (hydrationNotif ? 1 : 0) +
    (summaryNotif ? 1 : 0) +
    (streakNotif ? 1 : 0);

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <Header title="My Profile" subtitle="Account & Goals" showStreak={false} />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5 pb-36`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleReload}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        {/* User Card with Uploadable Avatar */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 items-center shadow-xl`}>
          <TouchableOpacity
            onPress={handleUploadAvatar}
            disabled={avatarBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={tw`relative mb-3`}
          >
            <Avatar user={user} uri={avatarPreview} size={96} borderWidth={4} />
            {avatarBusy ? (
              <View style={tw`absolute inset-0 rounded-full bg-black/50 items-center justify-center`}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
            {/* Camera Upload Badge */}
            <View style={tw`absolute bottom-0 right-0 bg-emerald-500 w-8 h-8 rounded-full items-center justify-center border-2 border-slate-900 shadow-md`}>
              <Ionicons name="camera" size={15} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={tw`flex-row items-center mb-2`}>
            <TouchableOpacity onPress={handleUploadAvatar} disabled={avatarBusy} accessibilityRole="button">
              <Text style={tw`text-emerald-400 text-xs font-semibold`}>
                {avatarBusy ? 'Saving photo...' : resolveAvatarUrl(user?.avatar) ? 'Change photo' : 'Add a profile photo'}
              </Text>
            </TouchableOpacity>
            {resolveAvatarUrl(user?.avatar) && !avatarBusy ? (
              <>
                <Text style={tw`text-slate-600 text-xs mx-2`}>•</Text>
                <TouchableOpacity onPress={handleRemoveAvatar} accessibilityRole="button">
                  <Text style={tw`text-rose-400 text-xs font-semibold`}>Remove</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <Text style={tw`text-white text-xl font-bold`}>{user?.name || name}</Text>
          <Text style={tw`text-slate-400 text-xs mt-0.5`}>
            {user?.email || ''}
          </Text>

          <View style={tw`flex-row items-center gap-2 mt-3`}>
            <View style={tw`bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 flex-row items-center`}>
              <Ionicons name="shield-checkmark" size={13} color="#10b981" />
              <Text style={tw`text-emerald-400 text-xs font-semibold ml-1`}>Pro Member</Text>
            </View>

            <View style={tw`bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 flex-row items-center`}>
              <Ionicons name="flame" size={13} color="#f59e0b" />
              <Text style={tw`text-amber-400 text-xs font-semibold ml-1`}>
                {user?.streakDays ?? 0} Day{(user?.streakDays ?? 0) === 1 ? '' : 's'} Streak
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Body Metrics & BMI (Collapsible - Closed by default) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-xl overflow-hidden`}>
          <TouchableOpacity
            onPress={() => setOpenMetrics(!openMetrics)}
            activeOpacity={0.7}
            style={tw`flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center flex-1 pr-3`}>
              <View style={tw`w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mr-3 shadow-sm`}>
                <Ionicons name="scale-outline" size={22} color="#10b981" />
              </View>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center flex-wrap gap-1.5`}>
                  <Text style={tw`text-white text-base font-bold`}>Body Metrics & BMI</Text>
                  <View style={tw`${bmiInfo.bg} ${bmiInfo.border} border px-2 py-0.5 rounded-full`}>
                    <Text style={tw`${bmiInfo.color} text-[10px] font-bold`}>{bmiInfo.text}</Text>
                  </View>
                </View>
                <View style={tw`flex-row items-center mt-1 flex-wrap gap-1.5`}>
                  <Text style={tw`text-slate-400 text-xs`}>
                    {weight} kg • {height} cm • BMI <Text style={tw`text-white font-bold`}>{bmi}</Text>
                  </Text>
                  <Text style={tw`text-slate-600 text-xs`}>•</Text>
                  <Text style={tw`text-emerald-400 text-xs font-semibold`}>
                    {calorieGoal} kcal
                  </Text>
                </View>
              </View>
            </View>

            {/* Open / Close Toggle Button */}
            <View style={tw`w-8 h-8 rounded-full ${openMetrics ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-slate-800 border-slate-700'} border items-center justify-center`}>
              <Ionicons
                name={openMetrics ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={openMetrics ? '#10b981' : '#94a3b8'}
              />
            </View>
          </TouchableOpacity>

          {/* Collapsible Content */}
          {openMetrics && (
            <View style={tw`mt-4 pt-4 border-t border-slate-800`}>
              {/* Header Action Bar */}
              <View style={tw`flex-row justify-between items-center mb-4 pb-3 border-b border-slate-800/80`}>
                <View>
                  <Text style={tw`text-slate-200 text-xs font-bold uppercase tracking-wider`}>
                    Biometric Telemetry
                  </Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>
                    Clinical body composition & energy allowance
                  </Text>
                </View>

                {isEditingMetrics ? (
                  <View style={tw`flex-row items-center gap-2`}>
                    <TouchableOpacity
                      onPress={handleCancelEditing}
                      style={tw`bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl`}
                    >
                      <Text style={tw`text-slate-300 font-semibold text-xs`}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveMetrics}
                      disabled={savingMetrics}
                      style={tw`bg-emerald-500 px-3.5 py-1.5 rounded-xl flex-row items-center shadow-sm`}
                    >
                      {savingMetrics ? (
                        <ActivityIndicator size="small" color="#ffffff" style={tw`mr-1`} />
                      ) : (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      )}
                      <Text style={tw`text-white font-bold text-xs ml-1`}>
                        {savingMetrics ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsEditingMetrics(true)}
                    style={tw`bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl flex-row items-center`}
                  >
                    <Ionicons name="pencil-outline" size={13} color="#10b981" />
                    <Text style={tw`text-emerald-400 font-bold text-xs ml-1.5`}>Edit Metrics</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Top 3 Interactive Biometric Tiles */}
              <View style={tw`flex-row gap-2.5 mb-3.5`}>
                {/* Weight Card */}
                <View style={tw`flex-1 bg-slate-950/90 border border-slate-800/80 p-3 rounded-2xl items-center`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-emerald-500/10 items-center justify-center mb-1`}>
                    <Ionicons name="scale-outline" size={15} color="#10b981" />
                  </View>
                  <Text style={tw`text-slate-400 text-[10px] font-semibold uppercase tracking-wider`}>
                    Weight
                  </Text>
                  {isEditingMetrics ? (
                    <View style={tw`items-center my-1 w-full`}>
                      <View style={tw`flex-row items-center justify-center w-full`}>
                        <TouchableOpacity
                          onPress={() => handleAdjustWeight(-0.5)}
                          style={tw`w-6 h-6 rounded-md bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="remove" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TextInput
                          value={weight}
                          onChangeText={setWeight}
                          keyboardType="numeric"
                          style={tw`text-white text-base font-black text-center w-14 py-0 mx-1 border-b border-emerald-500`}
                        />
                        <TouchableOpacity
                          onPress={() => handleAdjustWeight(0.5)}
                          style={tw`w-6 h-6 rounded-md bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="add" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                      </View>
                      <Text style={tw`text-emerald-400 text-[10px] font-bold mt-1`}>kg</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={tw`text-white text-lg font-black mt-0.5`}>
                        {weight} <Text style={tw`text-slate-400 text-xs font-normal`}>kg</Text>
                      </Text>
                      <Text style={tw`text-slate-500 text-[10px] font-medium mt-0.5`}>
                        ≈ {weightLbs} lbs
                      </Text>
                    </>
                  )}
                </View>

                {/* Height Card */}
                <View style={tw`flex-1 bg-slate-950/90 border border-slate-800/80 p-3 rounded-2xl items-center`}>
                  <View style={tw`w-7 h-7 rounded-lg bg-sky-500/10 items-center justify-center mb-1`}>
                    <Ionicons name="resize-outline" size={15} color="#38bdf8" />
                  </View>
                  <Text style={tw`text-slate-400 text-[10px] font-semibold uppercase tracking-wider`}>
                    Height
                  </Text>
                  {isEditingMetrics ? (
                    <View style={tw`items-center my-1 w-full`}>
                      <View style={tw`flex-row items-center justify-center w-full`}>
                        <TouchableOpacity
                          onPress={() => handleAdjustHeight(-1)}
                          style={tw`w-6 h-6 rounded-md bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="remove" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TextInput
                          value={height}
                          onChangeText={setHeight}
                          keyboardType="numeric"
                          style={tw`text-white text-base font-black text-center w-14 py-0 mx-1 border-b border-sky-500`}
                        />
                        <TouchableOpacity
                          onPress={() => handleAdjustHeight(1)}
                          style={tw`w-6 h-6 rounded-md bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="add" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                      </View>
                      <Text style={tw`text-sky-400 text-[10px] font-bold mt-1`}>cm</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={tw`text-white text-lg font-black mt-0.5`}>
                        {height} <Text style={tw`text-slate-400 text-xs font-normal`}>cm</Text>
                      </Text>
                      <Text style={tw`text-slate-500 text-[10px] font-medium mt-0.5`}>
                        ≈ {feet}'{inches}"
                      </Text>
                    </>
                  )}
                </View>

                {/* BMI Score Card */}
                <View style={tw`flex-1 bg-slate-950/90 border border-slate-800/80 p-3 rounded-2xl items-center`}>
                  <View style={tw`w-7 h-7 rounded-lg ${bmiInfo.bg} items-center justify-center mb-1`}>
                    <Ionicons name="speedometer-outline" size={15} color={bmiInfo.dot} />
                  </View>
                  <Text style={tw`text-slate-400 text-[10px] font-semibold uppercase tracking-wider`}>
                    BMI Score
                  </Text>
                  <Text style={tw`text-white text-lg font-black mt-0.5`}>{bmi}</Text>
                  <View style={tw`${bmiInfo.bg} px-1.5 py-0.5 rounded mt-0.5`}>
                    <Text style={tw`${bmiInfo.color} text-[10px] font-bold`}>{bmiInfo.shortText}</Text>
                  </View>
                </View>
              </View>

              {/* WHO BMI Gauge Spectrum */}
              <View style={tw`bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-3.5`}>
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-slate-300 text-xs font-bold uppercase tracking-wider`}>
                    WHO BMI Classification
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-2 h-2 rounded-full mr-1.5`, { backgroundColor: bmiInfo.dot }]} />
                    <Text style={tw`${bmiInfo.color} text-xs font-bold`}>
                      {bmiInfo.text} ({bmi})
                    </Text>
                  </View>
                </View>

                {/* Dynamic Marker Pointer Pin */}
                <View style={tw`relative h-6 justify-center mb-0.5`}>
                  <View
                    style={[
                      tw`absolute items-center -ml-4`,
                      { left: `${pointerPct}%` },
                    ]}
                  >
                    <View style={tw`bg-white px-1.5 py-0.5 rounded shadow-lg border border-slate-600`}>
                      <Text style={tw`text-slate-950 text-[10px] font-black`}>{bmi}</Text>
                    </View>
                    <Ionicons name="caret-down" size={10} color="#ffffff" style={tw`-mt-1`} />
                  </View>
                </View>

                {/* 4 Colored Segments Bar */}
                <View style={tw`h-3 rounded-full flex-row overflow-hidden bg-slate-800 border border-slate-700/60`}>
                  <View style={[tw`bg-sky-400`, { width: '17.5%' }]} />
                  <View style={[tw`bg-emerald-400`, { width: '32.5%' }]} />
                  <View style={[tw`bg-amber-400`, { width: '25%' }]} />
                  <View style={[tw`bg-rose-500`, { width: '25%' }]} />
                </View>

                {/* Scale Threshold Numbers */}
                <View style={tw`flex-row justify-between items-center mt-1 px-0.5`}>
                  <Text style={tw`text-slate-500 text-[10px]`}>15.0</Text>
                  <Text style={tw`text-slate-400 text-[10px]`}>18.5</Text>
                  <Text style={tw`text-slate-400 text-[10px]`}>25.0</Text>
                  <Text style={tw`text-slate-400 text-[10px]`}>30.0</Text>
                  <Text style={tw`text-slate-500 text-[10px]`}>35+</Text>
                </View>

                {/* Category Legends */}
                <View style={tw`flex-row justify-between items-center mt-3 pt-2.5 border-t border-slate-800/80`}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-sky-400 mr-1`} />
                    <Text style={tw`text-slate-400 text-[10px]`}>Under (&lt;18.5)</Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-emerald-400 mr-1`} />
                    <Text style={tw`text-emerald-400 text-[10px] font-bold`}>Normal (18.5-24.9)</Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-amber-400 mr-1`} />
                    <Text style={tw`text-slate-400 text-[10px]`}>Over (25-29.9)</Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-rose-500 mr-1`} />
                    <Text style={tw`text-slate-400 text-[10px]`}>Obese (30+)</Text>
                  </View>
                </View>
              </View>

              {/* Ideal Weight Analysis & Medical Insight */}
              <View style={tw`bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-3.5`}>
                <View style={tw`flex-row items-center justify-between mb-2.5`}>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="medical-outline" size={15} color="#10b981" style={tw`mr-1.5`} />
                    <Text style={tw`text-slate-300 text-xs font-bold uppercase tracking-wider`}>
                      Ideal Weight Analysis
                    </Text>
                  </View>
                  <View style={tw`bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full`}>
                    <Text style={tw`text-emerald-400 text-[10px] font-semibold`}>WHO Standard</Text>
                  </View>
                </View>

                <View style={tw`flex-row gap-2.5 mb-3`}>
                  <View style={tw`flex-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl`}>
                    <Text style={tw`text-slate-400 text-[11px]`}>Healthy Range ({heightNum} cm)</Text>
                    <Text style={tw`text-white font-bold text-sm mt-0.5`}>
                      {minHealthyKg} – {maxHealthyKg} kg
                    </Text>
                  </View>
                  <View style={tw`flex-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl`}>
                    <Text style={tw`text-slate-400 text-[11px]`}>WHO Ideal Midpoint</Text>
                    <Text style={tw`text-emerald-400 font-bold text-sm mt-0.5`}>
                      {idealKg} kg{' '}
                      <Text style={tw`text-slate-500 text-xs font-normal`}>
                        ({parseFloat(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg)
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Clinical description banner */}
                <View style={tw`${bmiInfo.bg} border ${bmiInfo.border} rounded-xl p-2.5 flex-row items-start`}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={bmiInfo.dot}
                    style={tw`mr-2 mt-0.5`}
                  />
                  <Text style={tw`text-slate-300 text-xs flex-1 leading-4`}>
                    {bmiInfo.desc}
                  </Text>
                </View>
              </View>

              {/* Metabolic Energy Allowance (BMR, TDEE, & Calorie Target) */}
              <View style={tw`bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4`}>
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="flame-outline" size={16} color="#f59e0b" style={tw`mr-1.5`} />
                    <Text style={tw`text-slate-300 text-xs font-bold uppercase tracking-wider`}>
                      Energy Metabolism & Goals
                    </Text>
                  </View>
                  <Text style={tw`text-amber-400 text-[10px] font-semibold`}>Mifflin-St Jeor</Text>
                </View>

                <View style={tw`flex-row gap-2 mb-3`}>
                  {/* BMR */}
                  <View style={tw`flex-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl`}>
                    <Text style={tw`text-slate-400 text-[10px] font-medium`}>Basal (BMR)</Text>
                    <Text style={tw`text-white text-base font-black mt-0.5`}>
                      {bmr} <Text style={tw`text-slate-400 text-[10px] font-normal`}>kcal</Text>
                    </Text>
                    <Text style={tw`text-slate-500 text-[10px] mt-0.5`}>Resting burn</Text>
                  </View>

                  {/* Maintenance (TDEE) */}
                  <View style={tw`flex-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl`}>
                    <Text style={tw`text-slate-400 text-[10px] font-medium`}>Active (TDEE)</Text>
                    <Text style={tw`text-sky-400 text-base font-black mt-0.5`}>
                      {tdee} <Text style={tw`text-slate-400 text-[10px] font-normal`}>kcal</Text>
                    </Text>
                    <Text style={tw`text-slate-500 text-[10px] mt-0.5`}>Maintenance</Text>
                  </View>

                  {/* Daily Calorie Goal */}
                  <View style={tw`flex-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl`}>
                    <Text style={tw`text-slate-400 text-[10px] font-medium`}>Daily Target</Text>
                    {isEditingMetrics ? (
                      <View style={tw`flex-row items-center justify-between mt-1`}>
                        <TouchableOpacity
                          onPress={() => handleAdjustCalories(-50)}
                          style={tw`w-5 h-5 rounded bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="remove" size={12} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TextInput
                          value={calorieGoal}
                          onChangeText={setCalorieGoal}
                          keyboardType="numeric"
                          style={tw`text-emerald-400 text-sm font-black text-center w-12 py-0 border-b border-emerald-500`}
                        />
                        <TouchableOpacity
                          onPress={() => handleAdjustCalories(50)}
                          style={tw`w-5 h-5 rounded bg-slate-800 border border-slate-700 items-center justify-center`}
                        >
                          <Ionicons name="add" size={12} color="#cbd5e1" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Text style={tw`text-emerald-400 text-base font-black mt-0.5`}>
                          {calorieGoal} <Text style={tw`text-slate-400 text-[10px] font-normal`}>kcal</Text>
                        </Text>
                        <Text style={tw`text-slate-500 text-[10px] mt-0.5`}>Daily budget</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Quick Target Presets in Edit Mode */}
                {isEditingMetrics && (
                  <View style={tw`mb-3`}>
                    <Text style={tw`text-slate-400 text-[11px] mb-1.5`}>Quick Goal Presets:</Text>
                    <View style={tw`flex-row gap-2`}>
                      <TouchableOpacity
                        onPress={() => setCalorieGoal(String(Math.max(1200, tdee - 400)))}
                        style={tw`flex-1 py-1.5 px-2 rounded-xl bg-slate-800 border border-slate-700 items-center`}
                      >
                        <Text style={tw`text-emerald-400 text-[10px] font-bold`}>Fat Loss</Text>
                        <Text style={tw`text-slate-400 text-[9px]`}>{tdee - 400} kcal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setCalorieGoal(String(tdee))}
                        style={tw`flex-1 py-1.5 px-2 rounded-xl bg-slate-800 border border-slate-700 items-center`}
                      >
                        <Text style={tw`text-sky-400 text-[10px] font-bold`}>Maintain</Text>
                        <Text style={tw`text-slate-400 text-[9px]`}>{tdee} kcal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setCalorieGoal(String(tdee + 250))}
                        style={tw`flex-1 py-1.5 px-2 rounded-xl bg-slate-800 border border-slate-700 items-center`}
                      >
                        <Text style={tw`text-amber-400 text-[10px] font-bold`}>Muscle Gain</Text>
                        <Text style={tw`text-slate-400 text-[9px]`}>{tdee + 250} kcal</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Deficit / Surplus Strategy Pill */}
                <View style={tw`bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 flex-row items-center justify-between`}>
                  <Text style={tw`text-slate-400 text-xs`}>Nutrition Strategy</Text>
                  {calorieDiff < 0 ? (
                    <View style={tw`bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex-row items-center`}>
                      <Ionicons name="trending-down" size={12} color="#10b981" style={tw`mr-1`} />
                      <Text style={tw`text-emerald-400 text-[11px] font-semibold`}>
                        {Math.abs(calorieDiff)} kcal deficit (Fat Loss)
                      </Text>
                    </View>
                  ) : calorieDiff > 0 ? (
                    <View style={tw`bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 flex-row items-center`}>
                      <Ionicons name="trending-up" size={12} color="#f59e0b" style={tw`mr-1`} />
                      <Text style={tw`text-amber-400 text-[11px] font-semibold`}>
                        +{calorieDiff} kcal surplus (Muscle Building)
                      </Text>
                    </View>
                  ) : (
                    <View style={tw`bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/30 flex-row items-center`}>
                      <Ionicons name="remove-outline" size={12} color="#38bdf8" style={tw`mr-1`} />
                      <Text style={tw`text-sky-400 text-[11px] font-semibold`}>Balanced Maintenance</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 2. Allergies Preferences Section (Collapsible - Closed by default) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-lg overflow-hidden`}>
          <TouchableOpacity
            onPress={() => setOpenAllergies(!openAllergies)}
            activeOpacity={0.7}
            style={tw`flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center flex-1 pr-3`}>
              <View style={tw`w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 items-center justify-center mr-3`}>
                <Ionicons name="warning-outline" size={20} color="#f43f5e" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white text-base font-bold`}>Allergies & Intolerances</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                  {allergies.length > 0
                    ? `${allergies.length} allergen${allergies.length > 1 ? 's' : ''} tracked`
                    : 'None specified'}
                </Text>
              </View>
            </View>

            {/* Open / Close Toggle Button */}
            <View style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center`}>
              <Ionicons
                name={openAllergies ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={openAllergies ? '#f43f5e' : '#94a3b8'}
              />
            </View>
          </TouchableOpacity>

          {/* Collapsible Content */}
          {openAllergies && (
            <View style={tw`mt-4 pt-4 border-t border-slate-800`}>
              <View style={tw`flex-row justify-between items-center mb-2.5`}>
                <Text style={tw`text-slate-300 text-xs font-semibold`}>Select or Add Allergens</Text>
                <TouchableOpacity
                  onPress={() => setShowAddAllergy(!showAddAllergy)}
                  style={tw`flex-row items-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700`}
                >
                  <Ionicons
                    name={showAddAllergy ? 'close' : 'add'}
                    size={14}
                    color="#94a3b8"
                  />
                  <Text style={tw`text-slate-300 text-[11px] font-medium ml-1`}>
                    {showAddAllergy ? 'Close' : 'Add Custom'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Allergy Input Box */}
              {showAddAllergy && (
                <View style={tw`flex-row items-center gap-2 mb-3`}>
                  <TextInput
                    value={customAllergy}
                    onChangeText={setCustomAllergy}
                    placeholder="e.g. Sesame, Mustard"
                    placeholderTextColor="#64748b"
                    style={tw`flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs`}
                  />
                  <TouchableOpacity
                    onPress={handleAddCustomAllergy}
                    style={tw`bg-rose-500 px-3.5 py-2 rounded-xl`}
                  >
                    <Text style={tw`text-white text-xs font-bold`}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Allergy Badges Grid */}
              <View style={tw`flex-row flex-wrap gap-2`}>
                {DEFAULT_ALLERGIES.map((item) => {
                  const isSelected = allergies.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => toggleAllergy(item)}
                      style={tw`px-3 py-1.5 rounded-xl border flex-row items-center ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Ionicons
                        name={isSelected ? 'close-circle' : 'add-circle-outline'}
                        size={14}
                        color={isSelected ? '#f43f5e' : '#64748b'}
                      />
                      <Text
                        style={tw`text-xs font-semibold ml-1.5 ${
                          isSelected ? 'text-rose-300' : 'text-slate-400'
                        }`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* 3. Liked & Favorite Foods Section (Collapsible - Closed by default) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-lg overflow-hidden`}>
          <TouchableOpacity
            onPress={() => setOpenLikedFoods(!openLikedFoods)}
            activeOpacity={0.7}
            style={tw`flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center flex-1 pr-3`}>
              <View style={tw`w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mr-3`}>
                <Ionicons name="heart" size={20} color="#10b981" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white text-base font-bold`}>Liked & Favorite Foods</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                  {likedFoods.length > 0
                    ? `${likedFoods.length} favorite food${likedFoods.length > 1 ? 's' : ''}`
                    : 'Personalize recipes'}
                </Text>
              </View>
            </View>

            {/* Open / Close Toggle Button */}
            <View style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center`}>
              <Ionicons
                name={openLikedFoods ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={openLikedFoods ? '#10b981' : '#94a3b8'}
              />
            </View>
          </TouchableOpacity>

          {/* Collapsible Content */}
          {openLikedFoods && (
            <View style={tw`mt-4 pt-4 border-t border-slate-800`}>
              <View style={tw`flex-row justify-between items-center mb-2.5`}>
                <Text style={tw`text-slate-300 text-xs font-semibold`}>Tailor AI Recipe Recommendations</Text>
                <TouchableOpacity
                  onPress={() => setShowAddFood(!showAddFood)}
                  style={tw`flex-row items-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700`}
                >
                  <Ionicons
                    name={showAddFood ? 'close' : 'add'}
                    size={14}
                    color="#94a3b8"
                  />
                  <Text style={tw`text-slate-300 text-[11px] font-medium ml-1`}>
                    {showAddFood ? 'Close' : 'Add Custom'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Food Input Box */}
              {showAddFood && (
                <View style={tw`flex-row items-center gap-2 mb-3`}>
                  <TextInput
                    value={customFood}
                    onChangeText={setCustomFood}
                    placeholder="e.g. Tofu, Chia Seeds"
                    placeholderTextColor="#64748b"
                    style={tw`flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs`}
                  />
                  <TouchableOpacity
                    onPress={handleAddCustomFood}
                    style={tw`bg-emerald-500 px-3.5 py-2 rounded-xl`}
                  >
                    <Text style={tw`text-white text-xs font-bold`}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Liked Foods Badges Grid */}
              <View style={tw`flex-row flex-wrap gap-2`}>
                {DEFAULT_LIKED_FOODS.map((item) => {
                  const isLiked = likedFoods.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => toggleLikedFood(item)}
                      style={tw`px-3 py-1.5 rounded-xl border flex-row items-center ${
                        isLiked
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Ionicons
                        name={isLiked ? 'checkmark-circle' : 'add-outline'}
                        size={14}
                        color={isLiked ? '#10b981' : '#64748b'}
                      />
                      <Text
                        style={tw`text-xs font-semibold ml-1.5 ${
                          isLiked ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* 4. Dietary Style Selector (Collapsible - Closed by default) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-lg overflow-hidden`}>
          <TouchableOpacity
            onPress={() => setOpenDietStyle(!openDietStyle)}
            activeOpacity={0.7}
            style={tw`flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center flex-1 pr-3`}>
              <View style={tw`w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 items-center justify-center mr-3`}>
                <Ionicons name="restaurant" size={19} color="#fbbf24" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white text-base font-bold`}>Dietary Style</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                  Active plan: <Text style={tw`text-amber-400 font-semibold`}>{selectedDiet}</Text>
                </Text>
              </View>
            </View>

            {/* Open / Close Toggle Button */}
            <View style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center`}>
              <Ionicons
                name={openDietStyle ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={openDietStyle ? '#fbbf24' : '#94a3b8'}
              />
            </View>
          </TouchableOpacity>

          {/* Collapsible Content */}
          {openDietStyle && (
            <View style={tw`mt-4 pt-4 border-t border-slate-800`}>
              <Text style={tw`text-slate-400 text-xs mb-3`}>
                Select your nutritional macro target distribution:
              </Text>

              <View style={tw`flex-row flex-wrap gap-2`}>
                {DIET_TYPES.map((diet) => {
                  const active = selectedDiet === diet;
                  return (
                    <TouchableOpacity
                      key={diet}
                      onPress={() => {
                        setSelectedDiet(diet);
                        updateUser({ dietType: diet });
                      }}
                      style={tw`px-3.5 py-2 rounded-xl border ${
                        active
                          ? 'bg-amber-500/20 border-amber-500'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Text
                        style={tw`text-xs font-semibold ${
                          active ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {diet}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* 5. Notifications Management (Collapsible - Closed by default) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg overflow-hidden`}>
          <TouchableOpacity
            onPress={() => setOpenNotifications(!openNotifications)}
            activeOpacity={0.7}
            style={tw`flex-row justify-between items-center`}
          >
            <View style={tw`flex-row items-center flex-1 pr-3`}>
              <View style={tw`w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 items-center justify-center mr-3`}>
                <Ionicons name="notifications" size={19} color="#38bdf8" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-white text-base font-bold`}>Notification Reminders</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                  {activeNotifsCount} of 4 alerts active
                </Text>
              </View>
            </View>

            {/* Open / Close Toggle Button */}
            <View style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center`}>
              <Ionicons
                name={openNotifications ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={openNotifications ? '#38bdf8' : '#94a3b8'}
              />
            </View>
          </TouchableOpacity>

          {/* Collapsible Content */}
          {openNotifications && (
            <View style={tw`mt-4 pt-2 border-t border-slate-800`}>
              {notifPermission === 'unsupported' ? (
                <Text style={tw`text-amber-300 text-[11px] py-2`}>
                  Reminders work in the Android and iOS app. Your choices are saved for when you use the app on a phone.
                </Text>
              ) : notifPermission === 'denied' && activeNotifsCount > 0 ? (
                <Text style={tw`text-amber-300 text-[11px] py-2`}>
                  Notifications are blocked for this app. Enable them in your phone Settings to get reminders.
                </Text>
              ) : null}

              {/* Toggle 1: Upcoming meal reminders */}
              <View style={tw`flex-row justify-between items-center py-3 border-b border-slate-800/80`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-white text-xs font-bold`}>Upcoming Meal Reminders</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>
                    Breakfast 8:30 AM, Lunch 1:00 PM, Dinner 7:30 PM. Skipped if that meal is already logged.
                  </Text>
                </View>
                <Switch
                  value={nextMealNotif}
                  onValueChange={(val) =>
                    handleToggleNotification('nextMeal', val, setNextMealNotif)
                  }
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Toggle 2: Hydration & Water Notification */}
              <View style={tw`flex-row justify-between items-center py-3 border-b border-slate-800/80`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-white text-xs font-bold`}>Drink Water Reminders</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>
                    Every 2 hours from 10 AM to 8 PM, until you reach your {user?.waterGoalGlasses || 8}-glass goal
                  </Text>
                </View>
                <Switch
                  value={hydrationNotif}
                  onValueChange={(val) =>
                    handleToggleNotification('hydration', val, setHydrationNotif)
                  }
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Toggle 3: Daily Summary Notification */}
              <View style={tw`flex-row justify-between items-center py-3 border-b border-slate-800/80`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-white text-xs font-bold`}>Log Meals Reminder</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>
                    9 PM nudge to log today's food if fewer than 3 meals are logged
                  </Text>
                </View>
                <Switch
                  value={summaryNotif}
                  onValueChange={(val) =>
                    handleToggleNotification('dailySummary', val, setSummaryNotif)
                  }
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Toggle 4: Health Streak & Motivation */}
              <View style={tw`flex-row justify-between items-center py-3`}>
                <View style={tw`flex-1 pr-3`}>
                  <Text style={tw`text-white text-xs font-bold`}>Streak Reminder</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>
                    8 PM reminder if you haven't logged anything yet today
                  </Text>
                </View>
                <Switch
                  value={streakNotif}
                  onValueChange={(val) =>
                    handleToggleNotification('streakReminder', val, setStreakNotif)
                  }
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          )}
        </View>

        {/* Account & Security */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg`}>
          <Text style={tw`text-white font-bold text-sm mb-3`}>Account & Security</Text>

          <TouchableOpacity
            onPress={() => setPasswordModalVisible(true)}
            accessibilityRole="button"
            style={tw`flex-row items-center justify-between py-2`}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-emerald-500/20 items-center justify-center mr-2.5`}>
                <Ionicons name="key-outline" size={17} color="#10b981" />
              </View>
              <Text style={tw`text-slate-200 text-sm font-semibold`}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOutAll}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityState={{ disabled: signingOut }}
            style={tw`flex-row items-center justify-between py-2 ${signingOut ? 'opacity-50' : ''}`}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-amber-500/20 items-center justify-center mr-2.5`}>
                <Ionicons name="phone-portrait-outline" size={17} color="#f59e0b" />
              </View>
              <Text style={tw`text-slate-200 text-sm font-semibold`}>Sign Out All Devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: signingOut, busy: signingOut }}
            style={tw`flex-row items-center justify-between py-2`}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-rose-500/20 items-center justify-center mr-2.5`}>
                <Ionicons name="log-out-outline" size={17} color="#f43f5e" />
              </View>
              <Text style={tw`text-rose-400 text-sm font-semibold`}>
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </Text>
            </View>
            {signingOut ? (
              <ActivityIndicator size="small" color="#f43f5e" />
            ) : (
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
    </View>
  );
}
