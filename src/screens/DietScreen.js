import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import Header from '../components/Header';
import MealModal from '../components/MealModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useDietSync from '../hooks/useDietSync';

const GLASS_ML = 250;
const MAX_WATER = 30; // matches the server limit

// "2026-10-10" -> "Sa" (weekday of that calendar date)
const weekdayShort = (dateStr) =>
  new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2);

const MEAL_SECTIONS = [
  { key: 'breakfast', title: 'Breakfast', icon: 'sunny', color: '#f59e0b', sub: 'Recommended ~500 kcal' },
  { key: 'lunch', title: 'Lunch', icon: 'restaurant', color: '#10b981', sub: 'Recommended ~700 kcal' },
  { key: 'dinner', title: 'Dinner', icon: 'moon', color: '#6366f1', sub: 'Recommended ~600 kcal' },
  { key: 'snack', title: 'Snacks & Extras', icon: 'cafe', color: '#ec4899', sub: 'Recommended ~300 kcal' },
];

export default function DietScreen({ navigation, route }) {
  const { user, refreshUser } = useAuth();
  const onDietLoaded = useDietSync();
  const [dietData, setDietData] = useState(null);
  const [history, setHistory] = useState(null); // last 7 days, oldest first
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const scrollViewRef = useRef(null);

  const isReloadingRef = useRef(false);

  useEffect(() => {
    onDietLoaded(dietData);
  }, [dietData, onDietLoaded]);

  const fetchHistory = useCallback(async () => {
    const data = await api.getHistory(7);
    if (data) setHistory(data.days);
  }, []);

  const fetchDiet = useCallback(async () => {
    try {
      const [data] = await Promise.all([api.getTodayDiet(), fetchHistory()]);
      setDietData(data);
    } catch (e) {
      console.log('DietScreen fetch error:', e.message);
    }
  }, [fetchHistory]);

  const handleReload = useCallback(async () => {
    if (isReloadingRef.current) return;
    try {
      isReloadingRef.current = true;
      setRefreshing(true);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const [data] = await Promise.all([
        api.getTodayDiet(),
        refreshUser ? refreshUser() : Promise.resolve(),
        fetchHistory(),
      ]);
      if (data) {
        setDietData(data);
      }
    } catch (e) {
      console.log('DietScreen reload error:', e.message);
    } finally {
      setRefreshing(false);
      isReloadingRef.current = false;
    }
  }, [refreshUser, fetchHistory]);

  useEffect(() => {
    fetchDiet();
    const unsubscribeFocus = navigation.addListener('focus', fetchDiet);
    return unsubscribeFocus;
  }, [navigation, fetchDiet]);

  // Reload when user clicks Diet while already on Diet
  useEffect(() => {
    const unsubscribeTabPress = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        handleReload();
      }
    });
    return unsubscribeTabPress;
  }, [navigation, handleReload]);

  const onRefresh = async () => {
    await handleReload();
  };

  const handleOpenAddMeal = (mealType) => {
    setSelectedMealType(mealType);
    setModalVisible(true);
  };

  const handleAddMeal = async (mealPayload) => {
    await api.addMeal(mealPayload);
    await fetchDiet();
  };

  const handleDeleteMeal = (mealId, mealName) => {
    Alert.alert('Delete Meal', `Are you sure you want to remove "${mealName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.deleteMeal(mealId);
          await fetchDiet();
        },
      },
    ]);
  };

  const handleWaterChange = async (delta) => {
    try {
      const newCount = await api.updateWater(delta);
      setDietData((prev) => (prev ? { ...prev, waterGlassesToday: newCount } : prev));
      // Keep today's bar in the 7-day history in step
      setHistory((prev) =>
        prev ? prev.map((d, i) => (i === prev.length - 1 ? { ...d, waterGlasses: newCount } : d)) : prev
      );
    } catch (e) {
      console.log('Water update error:', e.message);
    }
  };

  const totals = dietData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = dietData?.goals || {
    calorieGoal: user?.dailyCalorieGoal || 2200,
    remainingCalories: (user?.dailyCalorieGoal || 2200) - totals.calories,
  };
  const groupedMeals = dietData?.groupedMeals || {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  const waterCount = dietData?.waterGlassesToday || 0;
  const waterGoal = dietData?.waterGoalGlasses || user?.waterGoalGlasses || 8;
  const waterLitres = ((waterGoal * GLASS_ML) / 1000).toFixed(1);
  const historyMax = Math.max(waterGoal, ...(history || []).map((d) => d.waterGlasses));

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <Header
        title="Diet & Nutrition"
        subtitle="Meal Logging"
        onAvatarPress={() => navigation.navigate('Profile')}
      />

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
        {/* Macro & Calorie Header Card */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-xl`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View>
              <Text style={tw`text-white text-lg font-bold`}>Daily Nutrition</Text>
              <Text style={tw`text-slate-400 text-xs`}>
                {totals.calories} / {goals.calorieGoal} kcal logged
              </Text>
            </View>
            <View style={tw`bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30`}>
              <Text style={tw`text-emerald-400 font-bold text-xs`}>
                {goals.remainingCalories > 0
                  ? `${goals.remainingCalories} kcal left`
                  : 'Goal reached! 🎉'}
              </Text>
            </View>
          </View>

          {/* Calorie Bar */}
          <View style={tw`h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4`}>
            <View
              style={[
                tw`h-full bg-emerald-500 rounded-full`,
                {
                  width: `${Math.min(100, Math.round((totals.calories / goals.calorieGoal) * 100))}%`,
                },
              ]}
            />
          </View>

          {/* Quick Macro Pill Row */}
          <View style={tw`flex-row justify-between pt-2 border-t border-slate-800/80`}>
            <View style={tw`items-center`}>
              <Text style={tw`text-sky-400 font-bold text-sm`}>{totals.protein}g</Text>
              <Text style={tw`text-slate-400 text-[10px]`}>Protein</Text>
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-amber-400 font-bold text-sm`}>{totals.carbs}g</Text>
              <Text style={tw`text-slate-400 text-[10px]`}>Carbs</Text>
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-rose-400 font-bold text-sm`}>{totals.fat}g</Text>
              <Text style={tw`text-slate-400 text-[10px]`}>Fat</Text>
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-emerald-400 font-bold text-sm`}>
                {dietData?.meals?.length || 0}
              </Text>
              <Text style={tw`text-slate-400 text-[10px]`}>Meals</Text>
            </View>
          </View>
        </View>

        {/* Water Tracker Card */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-sky-500/20 items-center justify-center mr-2.5`}>
                <Ionicons name="water" size={18} color="#38bdf8" />
              </View>
              <View>
                <Text style={tw`text-white font-bold text-sm`}>Hydration Tracker</Text>
                <Text style={tw`text-slate-400 text-xs`}>
                  {waterCount} of {waterGoal} glasses ({waterLitres}L)
                  {waterCount >= waterGoal ? ' • Goal reached 🎉' : ''}
                </Text>
              </View>
            </View>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                onPress={() => handleWaterChange(-1)}
                disabled={waterCount <= 0}
                accessibilityRole="button"
                accessibilityLabel="Remove one glass of water"
                style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center ${
                  waterCount <= 0 ? 'opacity-40' : ''
                }`}
              >
                <Ionicons name="remove" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleWaterChange(1)}
                disabled={waterCount >= MAX_WATER}
                accessibilityRole="button"
                accessibilityLabel="Add one glass of water"
                style={tw`w-8 h-8 rounded-full bg-sky-500 items-center justify-center ${
                  waterCount >= MAX_WATER ? 'opacity-40' : ''
                }`}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Water Cups Visual (one cup per glass in the goal; resets every day) */}
          <View style={tw`flex-row flex-wrap gap-1.5 pt-1`}>
            {Array.from({ length: Math.max(waterGoal, Math.min(waterCount, MAX_WATER)) }, (_, i) => i + 1).map(
              (index) => {
                const isFilled = index <= waterCount;
                const isExtra = index > waterGoal;
                return (
                  <View
                    key={index}
                    style={tw`w-7 h-9 rounded-lg items-center justify-center border ${
                      isFilled
                        ? isExtra
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : 'bg-sky-500/20 border-sky-500'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <Ionicons name="water" size={14} color={isFilled ? (isExtra ? '#34d399' : '#38bdf8') : '#475569'} />
                  </View>
                );
              }
            )}
          </View>

          {/* Last 7 days */}
          {history && history.length > 0 ? (
            <View style={tw`mt-4 pt-3 border-t border-slate-800`}>
              <Text style={tw`text-slate-400 text-[11px] font-semibold mb-2`}>Last 7 days</Text>
              <View style={tw`flex-row justify-between items-end h-16`}>
                {history.map((day, i) => {
                  const isToday = i === history.length - 1;
                  const hit = day.waterGlasses >= waterGoal;
                  const heightPct = historyMax > 0 ? Math.max(6, (day.waterGlasses / historyMax) * 100) : 6;
                  return (
                    <View
                      key={day.date}
                      style={tw`items-center flex-1`}
                      accessibilityLabel={`${day.date}: ${day.waterGlasses} glasses`}
                    >
                      <Text style={tw`text-slate-500 text-[9px] mb-0.5`}>{day.waterGlasses}</Text>
                      <View style={tw`w-4 h-10 justify-end`}>
                        <View
                          style={[
                            tw`w-4 rounded-md ${hit ? 'bg-sky-400' : 'bg-sky-500/40'}`,
                            { height: `${heightPct}%` },
                          ]}
                        />
                      </View>
                      <Text style={tw`text-[9px] mt-1 ${isToday ? 'text-sky-300 font-bold' : 'text-slate-500'}`}>
                        {isToday ? 'Today' : weekdayShort(day.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* Meal Categories Sections */}
        {MEAL_SECTIONS.map((section) => {
          const meals = groupedMeals[section.key] || [];
          const sectionCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

          return (
            <View
              key={section.key}
              style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-4`}
            >
              {/* Category Header */}
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-row items-center flex-1`}>
                  <View
                    style={[
                      tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                      { backgroundColor: `${section.color}20` },
                    ]}
                  >
                    <Ionicons name={section.icon} size={18} color={section.color} />
                  </View>
                  <View>
                    <Text style={tw`text-white font-bold text-base`}>{section.title}</Text>
                    <Text style={tw`text-slate-400 text-xs`}>{section.sub}</Text>
                  </View>
                </View>

                <View style={tw`items-end`}>
                  <Text style={tw`text-emerald-400 font-bold text-sm`}>
                    {sectionCalories} kcal
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleOpenAddMeal(section.key)}
                    style={tw`flex-row items-center mt-0.5`}
                  >
                    <Ionicons name="add-circle" size={16} color="#10b981" />
                    <Text style={tw`text-emerald-400 text-xs font-semibold ml-1`}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meal Items */}
              {meals.length > 0 ? (
                meals.map((item) => (
                  <View
                    key={item._id}
                    style={tw`bg-slate-800/80 rounded-2xl p-3.5 mb-2 flex-row items-center justify-between border border-slate-700/60`}
                  >
                    <View style={tw`flex-1 pr-2`}>
                      <Text style={tw`text-white font-semibold text-sm`}>{item.name}</Text>
                      <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                        {item.portion || '1 serving'} • {item.time}
                      </Text>
                      <View style={tw`flex-row gap-2 mt-1`}>
                        <Text style={tw`text-sky-400 text-[10px]`}>P: {item.protein}g</Text>
                        <Text style={tw`text-amber-400 text-[10px]`}>C: {item.carbs}g</Text>
                        <Text style={tw`text-rose-400 text-[10px]`}>F: {item.fat}g</Text>
                      </View>
                    </View>

                    <View style={tw`items-end`}>
                      <Text style={tw`text-emerald-400 font-bold text-sm mb-1.5`}>
                        {item.calories} kcal
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteMeal(item._id, item.name)}
                        style={tw`p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20`}
                      >
                        <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <TouchableOpacity
                  onPress={() => handleOpenAddMeal(section.key)}
                  style={tw`py-3 px-4 border border-dashed border-slate-800 rounded-xl items-center flex-row justify-center`}
                >
                  <Ionicons name="add" size={16} color="#64748b" />
                  <Text style={tw`text-slate-500 text-xs font-medium ml-1`}>
                    No {section.title.toLowerCase()} logged yet. Tap to add.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Add Meal Button */}
      <TouchableOpacity
        onPress={() => handleOpenAddMeal('breakfast')}
        style={tw`absolute bottom-24 right-5 flex-row items-center bg-emerald-500 px-5 py-3.5 rounded-full shadow-2xl elevation-10 border border-emerald-400`}
      >
        <Ionicons name="add" size={22} color="#ffffff" />
        <Text style={tw`text-white font-bold text-sm ml-1.5`}>Log Meal</Text>
      </TouchableOpacity>

      {/* Modal */}
      <MealModal
        visible={modalVisible}
        initialMealType={selectedMealType}
        onClose={() => setModalVisible(false)}
        onAddMeal={handleAddMeal}
      />
    </View>
  );
}
