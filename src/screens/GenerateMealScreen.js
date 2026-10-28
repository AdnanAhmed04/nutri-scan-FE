import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../theme/tailwind';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snack', label: 'Snack', icon: 'cafe-outline' },
];

const DIET_TYPES = ['Balanced', 'High Protein', 'Keto', 'Vegan', 'Vegetarian', 'Low Carb'];

// Pick a sensible default meal for the current local time
const mealTypeForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
};

const MAX_REMEMBERED = 20;

function Pill({ label, icon, selected, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={tw`flex-row items-center px-3.5 py-2 rounded-xl mr-2 border ${
        selected ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-900 border-slate-800'
      }`}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? '#34d399' : '#94a3b8'} style={tw`mr-1`} />
      ) : null}
      <Text style={tw`text-xs font-semibold ${selected ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }) {
  return (
    <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2.5`}>{children}</Text>
  );
}

export default function GenerateMealScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [mealType, setMealType] = useState(mealTypeForNow);
  const [dietType, setDietType] = useState(
    DIET_TYPES.includes(user?.dietType) ? user.dietType : 'Balanced'
  );
  const [result, setResult] = useState(null); // { meal, source, context }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, code }
  const [adding, setAdding] = useState(false);
  const [addedId, setAddedId] = useState(null);

  // Recipes already shown for the current filters, so "Generate Another" gives something new
  const seenIdsRef = useRef([]);
  const seenNamesRef = useRef([]);
  // Ignore responses from older requests when filters change quickly
  const requestIdRef = useRef(0);

  const generate = useCallback(async (type, diet) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateMeal({
        mealType: type,
        dietType: diet,
        excludeIds: seenIdsRef.current,
        excludeNames: seenNamesRef.current.slice(-10),
      });
      if (requestId !== requestIdRef.current) return;
      seenIdsRef.current = [...seenIdsRef.current, data.meal.id].slice(-MAX_REMEMBERED);
      seenNamesRef.current = [...seenNamesRef.current, data.meal.name].slice(-MAX_REMEMBERED);
      setResult(data);
      setAddedId(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError({ message: e.message, code: e.code });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // Generate on open and whenever the filters change
  useEffect(() => {
    seenIdsRef.current = [];
    seenNamesRef.current = [];
    generate(mealType, dietType);
  }, [mealType, dietType, generate]);

  const meal = result?.meal;
  const context = result?.context;
  const isAdded = meal && addedId === meal.id;

  const handleAdd = async () => {
    if (!meal || adding || isAdded) return;
    setAdding(true);
    try {
      await api.addMeal({
        name: meal.name,
        mealType: meal.mealType,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        portion: meal.portion,
        notes: `${result.source === 'ai' ? 'AI generated' : 'Recipe library'} • ${dietType}`,
      });
      setAddedId(meal.id);
    } catch (e) {
      setError({ message: e.message || 'Could not add meal. Please try again.' });
    } finally {
      setAdding(false);
    }
  };

  // Diet is a tab inside MainTabs, so navigate through the parent navigator
  const goToDiet = () => navigation.navigate('MainTabs', { screen: 'Diet' });

  const allergies = context?.allergiesAvoided || user?.allergies || [];

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center px-5 pb-4 bg-slate-900 border-b border-slate-800`,
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={tw`w-10 h-10 rounded-xl bg-slate-800 items-center justify-center mr-3 border border-slate-700`}
        >
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <Text style={tw`text-emerald-400 text-xs font-bold uppercase tracking-wider`}>Recipe Studio</Text>
          <Text style={tw`text-white text-xl font-bold`} accessibilityRole="header">
            Generate Meal
          </Text>
        </View>
        <View style={tw`w-9 h-9 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20`}>
          <Ionicons name="sparkles" size={18} color="#10b981" />
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-5 pb-24`} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <SectionLabel>Meal</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
          {MEAL_TYPES.map((m) => (
            <Pill
              key={m.key}
              label={m.label}
              icon={m.icon}
              selected={mealType === m.key}
              onPress={() => setMealType(m.key)}
            />
          ))}
        </ScrollView>

        <SectionLabel>Diet Style</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
          {DIET_TYPES.map((d) => (
            <Pill key={d} label={d} selected={dietType === d} onPress={() => setDietType(d)} />
          ))}
        </ScrollView>

        {/* Personalization summary */}
        <View style={tw`bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 mb-4`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="flame-outline" size={15} color="#10b981" />
            <Text style={tw`text-slate-300 text-xs ml-2 flex-1`}>
              {context
                ? `Target ~${context.targetCalories} kcal • ${context.remainingCalories} kcal left today`
                : 'Matching your calorie budget...'}
            </Text>
          </View>
          <View style={tw`flex-row items-start mt-2`}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#38bdf8" style={tw`mt-0.5`} />
            <Text style={tw`text-slate-400 text-xs ml-2 flex-1`}>
              {allergies.length > 0
                ? `Avoiding: ${allergies.join(', ')}`
                : 'No allergies set. Add them in Profile to filter recipes.'}
            </Text>
          </View>
          {context?.note ? (
            <View style={tw`flex-row items-start mt-2`}>
              <Ionicons name="information-circle-outline" size={15} color="#f59e0b" style={tw`mt-0.5`} />
              <Text style={tw`text-amber-300/90 text-xs ml-2 flex-1`}>{context.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Error */}
        {error && !loading ? (
          <View
            accessibilityRole="alert"
            style={tw`bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-4`}
          >
            <View style={tw`flex-row items-start`}>
              <Ionicons name="alert-circle" size={18} color="#fb7185" />
              <Text style={tw`text-rose-200 text-xs ml-2 flex-1 leading-5`}>{error.message}</Text>
            </View>
            {error.code !== 'NO_MATCH' ? (
              <TouchableOpacity
                onPress={() => generate(mealType, dietType)}
                accessibilityRole="button"
                style={tw`mt-3 self-start bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl`}
              >
                <Text style={tw`text-slate-200 text-xs font-semibold`}>Try Again</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Loading */}
        {loading ? (
          <View
            style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-10 mb-5 items-center`}
            accessibilityLabel="Generating meal"
          >
            <ActivityIndicator color="#10b981" size="large" />
            <Text style={tw`text-slate-400 text-xs mt-3`}>Creating a meal for you...</Text>
          </View>
        ) : null}

        {/* Meal Card */}
        {meal && !loading && error?.code !== 'NO_MATCH' ? (
          <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <View
                style={tw`flex-row items-center px-3 py-1 rounded-full border ${
                  result.source === 'ai'
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <Ionicons
                  name={result.source === 'ai' ? 'sparkles' : 'book-outline'}
                  size={12}
                  color={result.source === 'ai' ? '#c084fc' : '#10b981'}
                />
                <Text
                  style={tw`text-[11px] font-bold ml-1 ${
                    result.source === 'ai' ? 'text-purple-300' : 'text-emerald-400'
                  }`}
                >
                  {result.source === 'ai' ? 'AI GENERATED' : 'RECIPE LIBRARY'}
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="time-outline" size={14} color="#94a3b8" />
                <Text style={tw`text-slate-400 text-xs font-medium ml-1`}>{meal.prepTimeMinutes} mins</Text>
              </View>
            </View>

            <Text style={tw`text-white text-xl font-extrabold mb-2`}>{meal.name}</Text>
            {meal.description ? (
              <Text style={tw`text-slate-400 text-xs leading-5 mb-4`}>{meal.description}</Text>
            ) : null}

            {/* Macros */}
            <View style={tw`bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-5`}>
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Text style={tw`text-slate-400 text-xs font-medium`}>Energy</Text>
                <Text style={tw`text-emerald-400 text-lg font-black`}>
                  {meal.calories} <Text style={tw`text-xs font-normal text-slate-400`}>kcal</Text>
                </Text>
              </View>
              <View style={tw`flex-row justify-between pt-3 border-t border-slate-800/80`}>
                {[
                  { label: 'Protein', value: `${meal.protein}g`, color: 'text-sky-400' },
                  { label: 'Carbs', value: `${meal.carbs}g`, color: 'text-amber-400' },
                  { label: 'Fat', value: `${meal.fat}g`, color: 'text-rose-400' },
                ].map((m) => (
                  <View key={m.label} style={tw`items-center`}>
                    <Text style={tw`${m.color} font-bold text-sm`}>{m.value}</Text>
                    <Text style={tw`text-slate-400 text-[10px]`}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={tw`text-slate-500 text-[11px] mt-3 text-center`}>Serving: {meal.portion}</Text>
            </View>

            {/* Ingredients */}
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center mb-2`}>
                <Ionicons name="basket-outline" size={16} color="#10b981" />
                <Text style={tw`text-white font-bold text-sm ml-1.5`}>Ingredients</Text>
              </View>
              {meal.servings && meal.servings !== 1 ? (
                <Text style={tw`text-slate-500 text-[11px] mb-1`}>
                  Quantities are for 1 serving; use {meal.servings}× to match your budget.
                </Text>
              ) : null}
              {meal.ingredients.map((item, index) => (
                <View key={index} style={tw`flex-row items-center py-1`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2.5`} />
                  <Text style={tw`text-slate-300 text-xs flex-1`}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Instructions */}
            <View>
              <View style={tw`flex-row items-center mb-2`}>
                <Ionicons name="flame-outline" size={16} color="#f59e0b" />
                <Text style={tw`text-white font-bold text-sm ml-1.5`}>Instructions</Text>
              </View>
              {meal.instructions.map((step, index) => (
                <View key={index} style={tw`flex-row items-start py-1.5`}>
                  <Text style={tw`text-amber-400 font-bold text-xs mr-2`}>{index + 1}.</Text>
                  <Text style={tw`text-slate-300 text-xs leading-4 flex-1`}>{step}</Text>
                </View>
              ))}
            </View>

            {result.source === 'ai' ? (
              <Text style={tw`text-slate-500 text-[10px] mt-4 leading-4`}>
                AI-generated nutrition values are estimates. Always check labels if you have a severe allergy.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        {meal && !loading && error?.code !== 'NO_MATCH' ? (
          <View style={tw`gap-3 mb-6`}>
            {isAdded ? (
              <View style={tw`bg-emerald-500/10 border border-emerald-500/40 py-4 rounded-2xl items-center`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={tw`text-emerald-300 font-bold text-sm ml-2`}>Added to today's {meal.mealType}</Text>
                </View>
                <TouchableOpacity onPress={goToDiet} accessibilityRole="link" style={tw`mt-2`}>
                  <Text style={tw`text-emerald-400 text-xs font-semibold underline`}>View in Diet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAdd}
                disabled={adding}
                accessibilityRole="button"
                accessibilityState={{ disabled: adding, busy: adding }}
                style={tw`bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center ${adding ? 'opacity-70' : ''}`}
              >
                {adding ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#ffffff" />
                    <Text style={tw`text-white font-bold text-base ml-2`}>Add to Today's Diet</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => generate(mealType, dietType)}
              accessibilityRole="button"
              style={tw`bg-slate-900 border border-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center`}
            >
              <Ionicons name="shuffle" size={18} color="#10b981" />
              <Text style={tw`text-emerald-400 font-bold text-sm ml-2`}>Generate Another</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
