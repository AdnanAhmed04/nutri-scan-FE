import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../theme/tailwind';
import api from '../services/api';

const DUMMY_MEALS = [
  {
    id: 'gm_1',
    name: 'Mediterranean Herb Grilled Salmon Bowl',
    mealType: 'lunch',
    calories: 540,
    protein: 44,
    carbs: 38,
    fat: 18,
    portion: '1 bowl (380g)',
    prepTime: '20 mins',
    dietCategory: 'High Protein',
    description: 'Fresh grilled Atlantic salmon over fluffy quinoa, crisp cucumber, kalamata olives, and lemon oregano dressing.',
    ingredients: [
      '180g Atlantic Salmon fillet',
      '80g Cooked Quinoa',
      '1/2 cup Cucumber & cherry tomatoes',
      '1 tbsp Extra virgin olive oil & lemon juice',
      'Fresh parsley and oregano',
    ],
    instructions: [
      'Season salmon with salt, pepper, dried oregano, and lemon juice.',
      'Sear salmon in an oiled skillet over medium-high heat for 4 minutes per side.',
      'Fluff pre-cooked quinoa and assemble in a bowl with sliced cucumbers and cherry tomatoes.',
      'Top with grilled salmon and drizzle with olive oil dressing.',
    ],
  },
  {
    id: 'gm_2',
    name: 'Avocado & Baby Spinach Power Omelette',
    mealType: 'breakfast',
    calories: 410,
    protein: 26,
    carbs: 12,
    fat: 28,
    portion: '2 egg omelette + 1/2 avocado',
    prepTime: '12 mins',
    dietCategory: 'Keto',
    description: 'Fluffy whole-egg omelette stuffed with sautéed garlic spinach, creamy avocado slices, and goat cheese crumbles.',
    ingredients: [
      '3 large free-range eggs',
      '1 cup Baby spinach',
      '1/2 ripe Haas Avocado, sliced',
      '20g Crumbled goat cheese or feta',
      '1 tsp Olive oil',
    ],
    instructions: [
      'Whisk eggs in a bowl with a pinch of sea salt and black pepper.',
      'Sauté spinach in olive oil until wilted (about 1 minute), then pour in beaten eggs.',
      'Cook over low-medium heat until the edges set, then fold in sliced avocado and goat cheese.',
      'Serve warm immediately.',
    ],
  },
  {
    id: 'gm_3',
    name: 'Spiced Chickpea & Roasted Sweet Potato Bowl',
    mealType: 'dinner',
    calories: 490,
    protein: 19,
    carbs: 68,
    fat: 14,
    portion: '1 large bowl (400g)',
    prepTime: '25 mins',
    dietCategory: 'Vegan',
    description: 'Oven-roasted spiced chickpeas and tender sweet potato cubes paired with steamed kale and creamy tahini drizzle.',
    ingredients: [
      '1 cup Cooked organic chickpeas',
      '1 medium Sweet potato, cubed',
      '2 cups Chopped curly kale',
      '1.5 tbsp Creamy sesame tahini',
      '1/2 tsp Cumin, smoked paprika & garlic powder',
    ],
    instructions: [
      'Toss cubed sweet potatoes and chickpeas in spices and roast at 200°C for 20 minutes.',
      'Massage kale with a drop of lemon juice and olive oil.',
      'Layer warm roasted ingredients over the kale bed.',
      'Drizzle with whisked tahini sauce and toasted pumpkin seeds.',
    ],
  },
  {
    id: 'gm_4',
    name: 'Golden Chia & Greek Yogurt Berry Pudding',
    mealType: 'snack',
    calories: 280,
    protein: 22,
    carbs: 26,
    fat: 9,
    portion: '1 jar (250g)',
    prepTime: '5 mins',
    dietCategory: 'Balanced',
    description: 'Creamy high-protein Greek yogurt blended with chia seeds, pure honey, and antioxidant-rich blueberries.',
    ingredients: [
      '170g Non-fat Greek Yogurt',
      '1.5 tbsp Black chia seeds',
      '1/2 cup Fresh blueberries & raspberries',
      '1 tsp Raw honey or pure maple syrup',
      'Dash of ground cinnamon',
    ],
    instructions: [
      'Stir chia seeds into Greek yogurt and honey until thoroughly combined.',
      'Let sit for 5 minutes (or chill overnight) to allow chia seeds to gel.',
      'Top generously with fresh mixed berries and a dust of cinnamon.',
    ],
  },
];

export default function GenerateMealScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const categories = ['All', 'High Protein', 'Keto', 'Vegan', 'Balanced'];

  const filteredMeals =
    selectedCategory === 'All'
      ? DUMMY_MEALS
      : DUMMY_MEALS.filter((m) => m.dietCategory === selectedCategory);

  const currentMeal = filteredMeals[currentIndex % filteredMeals.length] || DUMMY_MEALS[0];

  const handleGenerateNext = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsGenerating(false);
    }, 600);
  };

  const handleAddMealToToday = async () => {
    try {
      setIsAdding(true);
      await api.addMeal({
        name: currentMeal.name,
        mealType: currentMeal.mealType,
        calories: currentMeal.calories,
        protein: currentMeal.protein,
        carbs: currentMeal.carbs,
        fat: currentMeal.fat,
        portion: currentMeal.portion,
        notes: `AI Generated meal • ${currentMeal.dietCategory}`,
      });

      Alert.alert(
        '🎉 Added to Today’s Diet!',
        `"${currentMeal.name}" (${currentMeal.calories} kcal) has been logged into your ${currentMeal.mealType}.`,
        [
          { text: 'Log Another', style: 'cancel' },
          {
            text: 'View in Diet',
            onPress: () => {
              navigation.navigate('Diet');
            },
          },
        ]
      );
    } catch (e) {
      console.log('Error adding generated meal:', e);
      Alert.alert('Error', 'Could not add meal. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      {/* Header with Back Button */}
      <View
        style={[
          tw`flex-row items-center px-5 pb-4 bg-slate-900 border-b border-slate-800`,
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 rounded-xl bg-slate-800 items-center justify-center mr-3 border border-slate-700`}
        >
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={tw`flex-1`}>
          <Text style={tw`text-emerald-400 text-xs font-bold uppercase tracking-wider`}>
            AI Recipe Studio
          </Text>
          <Text style={tw`text-white text-xl font-bold`}>Generate Meal</Text>
        </View>

        <View style={tw`w-9 h-9 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20`}>
          <Ionicons name="sparkles" size={18} color="#10b981" />
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-5 pb-24`} showsVerticalScrollIndicator={false}>
        {/* Diet Style Filter Pills */}
        <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2.5`}>
          Dietary Target
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mb-5`}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setCurrentIndex(0);
                }}
                style={tw`px-4 py-2 rounded-xl mr-2 border ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <Text
                  style={tw`text-xs font-semibold ${
                    isSelected ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Meal Preview Card */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-2xl`}>
          {/* Tag & Time */}
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View style={tw`flex-row items-center bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30`}>
              <Ionicons name="restaurant-outline" size={13} color="#10b981" />
              <Text style={tw`text-emerald-400 text-xs font-bold ml-1 uppercase`}>
                {currentMeal.mealType} • {currentMeal.dietCategory}
              </Text>
            </View>

            <View style={tw`flex-row items-center text-slate-400`}>
              <Ionicons name="time-outline" size={14} color="#94a3b8" />
              <Text style={tw`text-slate-400 text-xs font-medium ml-1`}>
                {currentMeal.prepTime}
              </Text>
            </View>
          </View>

          {/* Meal Title */}
          <Text style={tw`text-white text-xl font-extrabold mb-2`}>
            {currentMeal.name}
          </Text>
          <Text style={tw`text-slate-400 text-xs leading-5 mb-4`}>
            {currentMeal.description}
          </Text>

          {/* Macro Breakdown Grid */}
          <View style={tw`bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-5`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-slate-400 text-xs font-medium`}>Energy Value</Text>
              <Text style={tw`text-emerald-400 text-lg font-black`}>
                {currentMeal.calories}{' '}
                <Text style={tw`text-xs font-normal text-slate-400`}>kcal</Text>
              </Text>
            </View>

            <View style={tw`flex-row justify-between pt-3 border-t border-slate-800/80`}>
              <View style={tw`items-center`}>
                <Text style={tw`text-sky-400 font-bold text-sm`}>{currentMeal.protein}g</Text>
                <Text style={tw`text-slate-400 text-[10px]`}>Protein</Text>
              </View>
              <View style={tw`items-center`}>
                <Text style={tw`text-amber-400 font-bold text-sm`}>{currentMeal.carbs}g</Text>
                <Text style={tw`text-slate-400 text-[10px]`}>Carbs</Text>
              </View>
              <View style={tw`items-center`}>
                <Text style={tw`text-rose-400 font-bold text-sm`}>{currentMeal.fat}g</Text>
                <Text style={tw`text-slate-400 text-[10px]`}>Fat</Text>
              </View>
              <View style={tw`items-center`}>
                <Text style={tw`text-slate-300 font-bold text-sm`}>{currentMeal.portion}</Text>
                <Text style={tw`text-slate-400 text-[10px]`}>Serving</Text>
              </View>
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="basket-outline" size={16} color="#10b981" />
              <Text style={tw`text-white font-bold text-sm ml-1.5`}>Key Ingredients</Text>
            </View>
            {currentMeal.ingredients.map((item, index) => (
              <View key={index} style={tw`flex-row items-center py-1`}>
                <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2.5`} />
                <Text style={tw`text-slate-300 text-xs`}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Instructions Section */}
          <View style={tw`mb-2`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="flame-outline" size={16} color="#f59e0b" />
              <Text style={tw`text-white font-bold text-sm ml-1.5`}>Instructions</Text>
            </View>
            {currentMeal.instructions.map((step, index) => (
              <View key={index} style={tw`flex-row items-start py-1.5`}>
                <Text style={tw`text-amber-400 font-bold text-xs mr-2`}>
                  {index + 1}.
                </Text>
                <Text style={tw`text-slate-300 text-xs leading-4 flex-1`}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons: Add to Today's Diet & Generate Another */}
        <View style={tw`gap-3 mb-6`}>
          <TouchableOpacity
            onPress={handleAddMealToToday}
            disabled={isAdding}
            style={tw`bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center shadow-xl`}
          >
            {isAdding ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={tw`text-white font-bold text-base ml-2`}>
                  Add to Today’s Diet
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGenerateNext}
            disabled={isGenerating}
            style={tw`bg-slate-900 border border-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center`}
          >
            {isGenerating ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <>
                <Ionicons name="shuffle" size={18} color="#10b981" />
                <Text style={tw`text-emerald-400 font-bold text-sm ml-2`}>
                  Generate Another Recipe
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
