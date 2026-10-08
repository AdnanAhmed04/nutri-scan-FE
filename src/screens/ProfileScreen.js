import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

const DIET_TYPES = ['Balanced', 'High Protein', 'Keto', 'Vegan', 'Vegetarian', 'Low Carb'];

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || 'Alex Johnson');
  const [weight, setWeight] = useState(String(user?.weightKg || 72));
  const [height, setHeight] = useState(String(user?.heightCm || 178));
  const [calorieGoal, setCalorieGoal] = useState(String(user?.dailyCalorieGoal || 2200));
  const [selectedDiet, setSelectedDiet] = useState(user?.dietType || 'Balanced');
  const [saving, setSaving] = useState(false);

  // Calculate BMI
  const weightNum = parseFloat(weight) || 72;
  const heightM = (parseFloat(height) || 178) / 100;
  const bmi = (weightNum / (heightM * heightM)).toFixed(1);

  const getBmiCategory = (score) => {
    if (score < 18.5) return { text: 'Underweight', color: 'text-amber-400' };
    if (score < 25) return { text: 'Healthy Weight', color: 'text-emerald-400' };
    if (score < 30) return { text: 'Overweight', color: 'text-amber-400' };
    return { text: 'Obese', color: 'text-rose-400' };
  };

  const bmiInfo = getBmiCategory(bmi);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateUser({
        name,
        weightKg: Number(weight),
        heightCm: Number(height),
        dailyCalorieGoal: Number(calorieGoal),
        dietType: selectedDiet,
      });
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile and diet targets have been saved successfully!');
    } catch (e) {
      console.log('Profile update error:', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <Header
        title="My Profile"
        subtitle="Account & Goals"
        showStreak={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`p-5 pb-28`}>
        {/* User Card */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 items-center shadow-xl`}>
          <View style={tw`relative mb-3`}>
            <Image
              source={{
                uri:
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
              }}
              style={tw`w-24 h-24 rounded-full border-4 border-emerald-500`}
            />
            <View style={tw`absolute bottom-0 right-0 bg-emerald-500 w-7 h-7 rounded-full items-center justify-center border-2 border-slate-900`}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          </View>

          {isEditing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              style={tw`bg-slate-800 text-white font-bold text-lg rounded-xl px-4 py-2 border border-slate-700 text-center w-full max-w-[240px] mb-1`}
            />
          ) : (
            <Text style={tw`text-white text-xl font-bold`}>{user?.name || 'Alex Johnson'}</Text>
          )}

          <Text style={tw`text-slate-400 text-xs mt-0.5`}>
            {user?.email || 'alex.johnson@snaptutor.com'}
          </Text>

          <View style={tw`flex-row items-center gap-2 mt-3`}>
            <View style={tw`bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 flex-row items-center`}>
              <Ionicons name="shield-checkmark" size={13} color="#10b981" />
              <Text style={tw`text-emerald-400 text-xs font-semibold ml-1`}>Pro Member</Text>
            </View>

            <View style={tw`bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 flex-row items-center`}>
              <Ionicons name="flame" size={13} color="#f59e0b" />
              <Text style={tw`text-amber-400 text-xs font-semibold ml-1`}>
                {user?.streakDays || 7} Days Streak
              </Text>
            </View>
          </View>
        </View>

        {/* Body Metrics & BMI */}
        <Text style={tw`text-white text-base font-bold mb-3`}>Physical Metrics</Text>
        <View style={tw`flex-row gap-3 mb-5`}>
          <View style={tw`flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl items-center`}>
            <Text style={tw`text-slate-400 text-xs font-medium`}>Weight</Text>
            {isEditing ? (
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={tw`text-white text-lg font-bold border-b border-emerald-500 text-center w-16 py-1`}
              />
            ) : (
              <Text style={tw`text-white text-xl font-bold mt-1`}>{weight} kg</Text>
            )}
            <Text style={tw`text-slate-500 text-[10px] mt-0.5`}>Goal: 70 kg</Text>
          </View>

          <View style={tw`flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl items-center`}>
            <Text style={tw`text-slate-400 text-xs font-medium`}>Height</Text>
            {isEditing ? (
              <TextInput
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                style={tw`text-white text-lg font-bold border-b border-emerald-500 text-center w-16 py-1`}
              />
            ) : (
              <Text style={tw`text-white text-xl font-bold mt-1`}>{height} cm</Text>
            )}
            <Text style={tw`text-slate-500 text-[10px] mt-0.5`}>Current</Text>
          </View>

          <View style={tw`flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl items-center`}>
            <Text style={tw`text-slate-400 text-xs font-medium`}>BMI Score</Text>
            <Text style={tw`text-white text-xl font-bold mt-1`}>{bmi}</Text>
            <Text style={tw`${bmiInfo.color} text-[10px] font-semibold mt-0.5`}>
              {bmiInfo.text}
            </Text>
          </View>
        </View>

        {/* Nutrition Target Preferences */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg`}>
          <Text style={tw`text-white text-base font-bold mb-3`}>Daily Calorie Target</Text>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View>
              <Text style={tw`text-slate-400 text-xs`}>Daily energy allowance</Text>
              {isEditing ? (
                <TextInput
                  value={calorieGoal}
                  onChangeText={setCalorieGoal}
                  keyboardType="numeric"
                  style={tw`text-emerald-400 text-2xl font-black border-b border-emerald-500 w-28 py-1`}
                />
              ) : (
                <Text style={tw`text-emerald-400 text-2xl font-black mt-0.5`}>
                  {calorieGoal} <Text style={tw`text-slate-400 text-sm font-semibold`}>kcal</Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
              style={tw`bg-emerald-500 px-4 py-2 rounded-xl flex-row items-center`}
            >
              <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={15} color="#ffffff" />
              <Text style={tw`text-white font-bold text-xs ml-1`}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Goals'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Diet Type Selector */}
          <Text style={tw`text-slate-300 text-xs font-semibold mb-2.5`}>Diet Preference Style</Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {DIET_TYPES.map((diet) => {
              const active = selectedDiet === diet;
              return (
                <TouchableOpacity
                  key={diet}
                  onPress={() => {
                    setSelectedDiet(diet);
                    if (!isEditing) {
                      updateUser({ dietType: diet });
                    }
                  }}
                  style={tw`px-3.5 py-1.5 rounded-xl border ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text
                    style={tw`text-xs font-semibold ${
                      active ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {diet}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* AI Tutor & Chatbot Future Settings */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg`}>
          <View style={tw`flex-row items-center mb-2`}>
            <View style={tw`w-8 h-8 rounded-lg bg-amber-500/20 items-center justify-center mr-2.5`}>
              <Ionicons name="sparkles" size={16} color="#fbbf24" />
            </View>
            <View>
              <Text style={tw`text-white font-bold text-sm`}>AI Tutor & Chatbot Settings</Text>
              <Text style={tw`text-slate-400 text-xs`}>Future module configuration</Text>
            </View>
          </View>

          <View style={tw`mt-3 pt-3 border-t border-slate-800 flex-row justify-between items-center`}>
            <View>
              <Text style={tw`text-slate-200 text-xs font-semibold`}>Tutor Persona Mode</Text>
              <Text style={tw`text-slate-400 text-[11px]`}>Friendly Nutrition Coach & Academic Tutor</Text>
            </View>
            <View style={tw`bg-slate-800 px-3 py-1 rounded-lg border border-slate-700`}>
              <Text style={tw`text-amber-400 text-xs font-semibold`}>Active</Text>
            </View>
          </View>

          <View style={tw`mt-2 pt-2 border-t border-slate-800 flex-row justify-between items-center`}>
            <View>
              <Text style={tw`text-slate-200 text-xs font-semibold`}>AI Camera Snap Food</Text>
              <Text style={tw`text-slate-400 text-[11px]`}>Automatic food calorie recognition</Text>
            </View>
            <View style={tw`bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30`}>
              <Text style={tw`text-emerald-400 text-xs font-semibold`}>Ready</Text>
            </View>
          </View>
        </View>

        {/* Account & Security (Auth Ready) */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg`}>
          <Text style={tw`text-white font-bold text-sm mb-3`}>Account & Security</Text>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                '🔐 Authentication Module',
                'Your AuthContext is ready! In the next step, you can connect full JWT sign-up, email verification, and social login.'
              )
            }
            style={tw`flex-row items-center justify-between py-2.5 border-b border-slate-800`}
          >
            <View style={tw`flex-row items-center`}>
              <Ionicons name="key-outline" size={18} color="#94a3b8" />
              <Text style={tw`text-slate-300 text-xs font-medium ml-2.5`}>
                Security & Passwords
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert('Log Out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out',
                  style: 'destructive',
                  onPress: () => logout(),
                },
              ]);
            }}
            style={tw`flex-row items-center justify-between py-2.5 mt-1`}
          >
            <View style={tw`flex-row items-center`}>
              <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
              <Text style={tw`text-rose-400 text-xs font-medium ml-2.5`}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
