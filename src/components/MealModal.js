import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/tailwind';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
];

export default function MealModal({ visible, onClose, onAddMeal, initialMealType = 'breakfast' }) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState(initialMealType);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [portion, setPortion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !calories) {
      alert('Please enter food name and calories.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddMeal({
        name: name.trim(),
        mealType,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        portion: portion.trim() || '1 serving',
      });

      // Reset fields
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setPortion('');
      onClose();
    } catch (e) {
      console.log('Error saving meal:', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-end bg-black/60`}
      >
        <View style={tw`bg-slate-900 rounded-t-3xl border-t border-slate-700 max-h-[90%] p-5`}>
          {/* Modal Header */}
          <View style={tw`flex-row items-center justify-between pb-4 border-b border-slate-800`}>
            <View>
              <Text style={tw`text-white text-xl font-bold`}>Log New Meal</Text>
              <Text style={tw`text-slate-400 text-xs`}>Track your nutrition intake</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw`w-8 h-8 rounded-full bg-slate-800 items-center justify-center`}
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={tw`py-4`}>
            {/* Meal Type Selector */}
            <Text style={tw`text-slate-300 text-sm font-semibold mb-2`}>Meal Category</Text>
            <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
              {MEAL_TYPES.map((type) => {
                const isSelected = mealType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setMealType(type.id)}
                    style={tw`flex-row items-center px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Ionicons
                      name={type.icon}
                      size={16}
                      color={isSelected ? '#10b981' : '#94a3b8'}
                    />
                    <Text
                      style={tw`ml-1.5 text-xs font-semibold ${
                        isSelected ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Food Name */}
            <Text style={tw`text-slate-300 text-sm font-semibold mb-1`}>Food Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grilled Chicken Breast with Rice"
              placeholderTextColor="#64748b"
              style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 mb-4 text-sm`}
            />

            {/* Calories & Portion */}
            <View style={tw`flex-row gap-3 mb-4`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-slate-300 text-sm font-semibold mb-1`}>Calories (kcal) *</Text>
                <TextInput
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="e.g. 450"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm`}
                />
              </View>

              <View style={tw`flex-1`}>
                <Text style={tw`text-slate-300 text-sm font-semibold mb-1`}>Portion Size</Text>
                <TextInput
                  value={portion}
                  onChangeText={setPortion}
                  placeholder="e.g. 1 bowl / 200g"
                  placeholderTextColor="#64748b"
                  style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm`}
                />
              </View>
            </View>

            {/* Macronutrients */}
            <Text style={tw`text-slate-300 text-sm font-semibold mb-2`}>Macros (optional)</Text>
            <View style={tw`flex-row gap-2 mb-6`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-sky-400 text-xs font-medium mb-1`}>Protein (g)</Text>
                <TextInput
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm text-center`}
                />
              </View>

              <View style={tw`flex-1`}>
                <Text style={tw`text-amber-400 text-xs font-medium mb-1`}>Carbs (g)</Text>
                <TextInput
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm text-center`}
                />
              </View>

              <View style={tw`flex-1`}>
                <Text style={tw`text-rose-400 text-xs font-medium mb-1`}>Fat (g)</Text>
                <TextInput
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm text-center`}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={tw`flex-row gap-3 mt-2 mb-6`}>
              <TouchableOpacity
                onPress={onClose}
                style={tw`flex-1 py-3.5 rounded-xl bg-slate-800 border border-slate-700 items-center`}
              >
                <Text style={tw`text-slate-300 font-semibold`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={tw`flex-1 py-3.5 rounded-xl bg-emerald-500 items-center justify-center shadow-lg`}
              >
                <Text style={tw`text-white font-bold text-base`}>
                  {isSubmitting ? 'Saving...' : 'Add Meal'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
