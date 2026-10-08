import React, { useState, useEffect, useCallback } from 'react';
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

const MEAL_SECTIONS = [
  { key: 'breakfast', title: 'Breakfast', icon: 'sunny', color: '#f59e0b', sub: 'Recommended ~500 kcal' },
  { key: 'lunch', title: 'Lunch', icon: 'restaurant', color: '#10b981', sub: 'Recommended ~700 kcal' },
  { key: 'dinner', title: 'Dinner', icon: 'moon', color: '#6366f1', sub: 'Recommended ~600 kcal' },
  { key: 'snack', title: 'Snacks & Extras', icon: 'cafe', color: '#ec4899', sub: 'Recommended ~300 kcal' },
];

export default function DietScreen({ navigation }) {
  const { user } = useAuth();
  const [dietData, setDietData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');

  const fetchDiet = useCallback(async () => {
    try {
      const data = await api.getTodayDiet();
      setDietData(data);
    } catch (e) {
      console.log('DietScreen fetch error:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchDiet();
    const unsubscribe = navigation.addListener('focus', fetchDiet);
    return unsubscribe;
  }, [navigation, fetchDiet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDiet();
    setRefreshing(false);
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

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <Header
        title="Diet & Nutrition"
        subtitle="Meal Logging"
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5 pb-28`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
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
                <Text style={tw`text-slate-400 text-xs`}>{waterCount} of 8 glasses (2.0L)</Text>
              </View>
            </View>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                onPress={() => handleWaterChange(-1)}
                disabled={waterCount <= 0}
                style={tw`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center ${
                  waterCount <= 0 ? 'opacity-40' : ''
                }`}
              >
                <Ionicons name="remove" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleWaterChange(1)}
                style={tw`w-8 h-8 rounded-full bg-sky-500 items-center justify-center`}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Water Cups Visual */}
          <View style={tw`flex-row justify-between pt-1`}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
              const isFilled = index <= waterCount;
              return (
                <View
                  key={index}
                  style={tw`w-7 h-9 rounded-lg items-center justify-center border ${
                    isFilled
                      ? 'bg-sky-500/20 border-sky-500'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <Ionicons
                    name="water"
                    size={14}
                    color={isFilled ? '#38bdf8' : '#475569'}
                  />
                </View>
              );
            })}
          </View>
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
        style={tw`absolute bottom-6 right-6 flex-row items-center bg-emerald-500 px-5 py-3.5 rounded-full shadow-2xl elevation-8`}
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
