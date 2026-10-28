import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import MealModal from '../components/MealModal';
import TutorChatModal from '../components/TutorChatModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useDietSync from '../hooks/useDietSync';
import { showMessage } from '../utils/dialogs';

export default function HomeScreen({ navigation, route }) {
  const { user, refreshUser } = useAuth();
  const onDietLoaded = useDietSync();
  const [dietData, setDietData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const scrollViewRef = useRef(null);

  const isReloadingRef = useRef(false);

  // Keep streak + reminders in sync with the latest data
  useEffect(() => {
    onDietLoaded(dietData);
  }, [dietData, onDietLoaded]);

  const fetchDiet = useCallback(async () => {
    try {
      const data = await api.getTodayDiet();
      setDietData(data);
    } catch (e) {
      console.log('HomeScreen fetch error:', e.message);
    }
  }, []);

  const handleReload = useCallback(async () => {
    if (isReloadingRef.current) return;
    try {
      isReloadingRef.current = true;
      setRefreshing(true);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const [data] = await Promise.all([
        api.getTodayDiet(),
        refreshUser ? refreshUser() : Promise.resolve(),
      ]);
      if (data) {
        setDietData(data);
      }
    } catch (e) {
      console.log('HomeScreen reload error:', e.message);
    } finally {
      setRefreshing(false);
      isReloadingRef.current = false;
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchDiet();
    const unsubscribeFocus = navigation.addListener('focus', fetchDiet);
    return unsubscribeFocus;
  }, [navigation, fetchDiet]);

  // Reload when user clicks Home while already on Home
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

  const handleQuickWater = async () => {
    try {
      const newCount = await api.updateWater(1);
      setDietData((prev) => (prev ? { ...prev, waterGlassesToday: newCount } : prev));
      const goal = dietData?.waterGoalGlasses || 8;
      showMessage(
        '💧 Water Tracked',
        newCount >= goal
          ? `${newCount} / ${goal} glasses. You reached today's goal!`
          : `Logged 1 glass. Total today: ${newCount} / ${goal} glasses.`
      );
    } catch (e) {
      console.log('Error updating water:', e.message);
    }
  };

  const handleAddMeal = async (mealPayload) => {
    await api.addMeal(mealPayload);
    await fetchDiet();
  };

  const totals = dietData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = dietData?.goals || {
    calorieGoal: user?.dailyCalorieGoal || 2200,
    remainingCalories: (user?.dailyCalorieGoal || 2200) - totals.calories,
    macroGoals: user?.macroGoals || { protein: 140, carbs: 250, fat: 65 },
  };

  const caloriePercent = Math.min(100, Math.round((totals.calories / goals.calorieGoal) * 100));

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <Header
        title={`Hi${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋`}
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
        {/* Sync Status Badge */}
        <View style={tw`flex-row items-center justify-between mb-3 px-1`}>
          <View style={tw`flex-row items-center`}>
            <View
              style={tw`w-2 h-2 rounded-full ${
                dietData?.source === 'mongodb' ? 'bg-emerald-400' : 'bg-amber-400'
              } mr-2`}
            />
            <Text style={tw`text-slate-400 text-xs font-medium`}>
              {dietData?.source === 'mongodb'
                ? 'Synced with MongoDB Atlas'
                : 'Using Local Storage Mode'}
            </Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={tw`flex-row items-center`}>
            <Ionicons name="refresh" size={13} color="#94a3b8" />
            <Text style={tw`text-slate-400 text-xs ml-1`}>Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie Budget Main Card */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-xl`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View>
              <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider`}>
                Calories Remaining
              </Text>
              <Text style={tw`text-white text-3xl font-extrabold mt-0.5`}>
                {Math.max(0, goals.remainingCalories)}{' '}
                <Text style={tw`text-emerald-400 text-lg font-bold`}>kcal</Text>
              </Text>
            </View>

            <View style={tw`w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center`}>
              <Ionicons name="flame" size={28} color="#10b981" />
            </View>
          </View>

          {/* Calorie Bar */}
          <View style={tw`h-3 w-full bg-slate-800 rounded-full overflow-hidden mb-2`}>
            <View
              style={[
                tw`h-full bg-emerald-500 rounded-full`,
                { width: `${caloriePercent}%` },
              ]}
            />
          </View>

          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-slate-400 text-xs`}>
              Consumed: <Text style={tw`text-white font-semibold`}>{totals.calories}</Text> kcal
            </Text>
            <Text style={tw`text-slate-400 text-xs`}>
              Goal: <Text style={tw`text-white font-semibold`}>{goals.calorieGoal}</Text> kcal
            </Text>
          </View>
        </View>

        {/* Macro Nutrients Grid */}
        <Text style={tw`text-white text-base font-bold mb-3`}>Macronutrients Breakdown</Text>
        <View style={tw`flex-row gap-3 mb-6`}>
          <StatCard
            label="Protein"
            value={totals.protein}
            goal={goals.macroGoals?.protein || 140}
            unit="g"
            color="blue"
          />
          <StatCard
            label="Carbs"
            value={totals.carbs}
            goal={goals.macroGoals?.carbs || 250}
            unit="g"
            color="amber"
          />
          <StatCard
            label="Fat"
            value={totals.fat}
            goal={goals.macroGoals?.fat || 65}
            unit="g"
            color="rose"
          />
        </View>

        {/* Quick Action Grid */}
        <Text style={tw`text-white text-base font-bold mb-3`}>Quick Actions</Text>
        <View style={tw`flex-row flex-wrap gap-3 mb-6`}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={tw`flex-1 min-w-[45%] bg-slate-900 border border-slate-800 p-4 rounded-2xl flex-row items-center`}
          >
            <View style={tw`w-10 h-10 rounded-xl bg-emerald-500/20 items-center justify-center mr-3`}>
              <Ionicons name="add-circle" size={22} color="#10b981" />
            </View>
            <View>
              <Text style={tw`text-white font-bold text-sm`}>Log Meal</Text>
              <Text style={tw`text-slate-400 text-[11px]`}>Add today's food</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleQuickWater}
            style={tw`flex-1 min-w-[45%] bg-slate-900 border border-slate-800 p-4 rounded-2xl flex-row items-center`}
          >
            <View style={tw`w-10 h-10 rounded-xl bg-sky-500/20 items-center justify-center mr-3`}>
              <Ionicons name="water" size={22} color="#38bdf8" />
            </View>
            <View>
              <Text style={tw`text-white font-bold text-sm`}>+1 Water</Text>
              <Text style={tw`text-slate-400 text-[11px]`}>
                {dietData?.waterGlassesToday ?? 0}/{dietData?.waterGoalGlasses || 8} glasses
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                '📸 Nutri-Scan AI Scanner',
                'AI Powered Food Ingredients Analysis and Personalized Nutrition Assistant coming soon! Snap any meal to detect ingredients, macros, and get instant personalized advice.'
              )
            }
            style={tw`flex-1 min-w-[45%] bg-slate-900 border border-slate-800 p-4 rounded-2xl flex-row items-center`}
          >
            <View style={tw`w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-3`}>
              <Ionicons name="camera" size={22} color="#c084fc" />
            </View>
            <View>
              <Text style={tw`text-white font-bold text-sm`}>Nutri-Scan</Text>
              <Text style={tw`text-purple-400 text-[11px] font-medium`}>AI Preview</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('GenerateMeal')}
            style={tw`flex-1 min-w-[45%] bg-slate-900 border border-slate-800 p-4 rounded-2xl flex-row items-center`}
          >
            <View style={tw`w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center mr-3`}>
              <Ionicons name="sparkles" size={20} color="#fbbf24" />
            </View>
            <View>
              <Text style={tw`text-white font-bold text-sm`}>Generate Meal</Text>
              <Text style={tw`text-amber-400 text-[11px] font-medium`}>AI Recipes</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Meals Recent Preview */}
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-white text-base font-bold`}>Today's Logged Meals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Diet')}>
            <Text style={tw`text-emerald-400 text-xs font-semibold`}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        {dietData?.meals?.length > 0 ? (
          dietData.meals.slice(0, 3).map((item) => (
            <View
              key={item._id}
              style={tw`bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-2.5 flex-row items-center justify-between`}
            >
              <View style={tw`flex-row items-center flex-1 pr-3`}>
                <View style={tw`w-10 h-10 rounded-xl bg-slate-800 items-center justify-center mr-3 border border-slate-700`}>
                  <Ionicons
                    name={
                      item.mealType === 'breakfast'
                        ? 'sunny'
                        : item.mealType === 'lunch'
                        ? 'restaurant'
                        : item.mealType === 'dinner'
                        ? 'moon'
                        : 'cafe'
                    }
                    size={20}
                    color="#10b981"
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white font-semibold text-sm`} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={tw`text-slate-400 text-xs`}>
                    {item.portion || '1 serving'} • {item.time}
                  </Text>
                </View>
              </View>

              <View style={tw`items-end`}>
                <Text style={tw`text-emerald-400 font-bold text-sm`}>{item.calories} kcal</Text>
                <Text style={tw`text-slate-500 text-[10px]`}>
                  P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={tw`bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 items-center`}>
            <Ionicons name="fast-food-outline" size={32} color="#64748b" />
            <Text style={tw`text-slate-400 text-xs mt-2 text-center`}>
              No meals logged today yet. Tap "+ Log Meal" above to start!
            </Text>
          </View>
        )}

        {/* Future Features Announcement Card */}
        <View style={tw`mt-5 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-4`}>
          <View style={tw`flex-row items-center mb-1.5`}>
            <Ionicons name="sparkles" size={16} color="#10b981" />
            <Text style={tw`text-emerald-400 font-bold text-xs ml-1.5 uppercase tracking-wide`}>
              Future Features In Architecture
            </Text>
          </View>
          <Text style={tw`text-slate-300 text-xs leading-4`}>
            AI Smart Snap camera & Chatbot coach endpoints are mapped in the backend ready for API connection. Authentication context is also pre-configured.
          </Text>
        </View>
      </ScrollView>

      {/* Add Meal Modal */}
      <MealModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddMeal={handleAddMeal}
      />

      {/* Floating AI Healthcare Chatbot FAB at bottom-right corner */}
      <TouchableOpacity
        onPress={() => setChatModalVisible(true)}
        activeOpacity={0.85}
        style={[
          tw`absolute bottom-24 right-5 w-14 h-14 rounded-full bg-emerald-500 items-center justify-center border-2 border-emerald-300 shadow-2xl`,
          {
            elevation: 12,
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
          },
        ]}
      >
        <MaterialCommunityIcons name="robot" size={26} color="#ffffff" />
        <View style={tw`absolute -top-1.5 -right-1.5 bg-rose-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950 shadow`}>
          <Ionicons name="pulse" size={11} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* Tutor Chatbot Modal */}
      <TutorChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        dietData={dietData}
        userProfile={user}
      />
    </View>
  );
}
