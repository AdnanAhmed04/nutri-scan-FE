import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import api from '../services/api';

const QUICK_PROMPTS = [
  '📊 How is my progress today?',
  '📋 How should I follow my diet?',
  '🥑 Suggest a healthy snack',
  '💪 How to hit my protein goal?',
  '💧 Am I drinking enough water?',
];

export default function TutorChatModal({ visible, onClose, dietData, userProfile }) {
  const [messages, setMessages] = useState([
    {
      id: 'init_1',
      sender: 'tutor',
      text: "👋 Hi! I'm your Nutri-Scan AI Healthcare Bot. Ask me anything about your health, daily diet progress, food nutrition, or directions on how to follow your diet!",
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages]);

  const generateSmartReply = (query) => {
    const q = query.toLowerCase();

    // 1. Progress queries
    if (q.includes('progress') || q.includes('today') || q.includes('how am i')) {
      const consumed = dietData?.totals?.calories || 0;
      const goal = dietData?.goals?.calorieGoal || userProfile?.dailyCalorieGoal || 2200;
      const remaining = Math.max(0, goal - consumed);
      const protein = dietData?.totals?.protein || 0;
      const water = dietData?.waterGlassesToday || 0;

      return `📊 Here is your daily summary:\n• Calories: ${consumed} kcal consumed (${remaining} kcal left)\n• Protein: ${protein}g towards your target\n• Hydration: ${water}/8 glasses logged.\n\n${
        remaining > 300
          ? "You're in a great deficit window! Focus your next meal on lean protein and colorful vegetables."
          : "You're close to your energy budget today. Stick to lighter snacks like herbal tea or Greek yogurt!"
      }`;
    }

    // 2. Diet Directions & Rules
    if (q.includes('follow') || q.includes('direction') || q.includes('plan') || q.includes('rule') || q.includes('guide')) {
      const dietType = userProfile?.dietType || 'Balanced';
      return `📋 Directions for your ${dietType} Diet:\n1. Meal Timing: Eat within a 10-12 hour daily window (e.g., 8:00 AM - 7:00 PM).\n2. Protein First: Include 25-35g of protein in every main meal to preserve lean muscle.\n3. Hydration: Drink 1 glass of water upon waking and 1 before each meal.\n4. Mindful Portions: Prioritize unprocessed whole foods, green vegetables, and healthy fats (avocado, olive oil, nuts).`;
    }

    // 3. Healthy Snack recommendations
    if (q.includes('snack') || q.includes('hungry') || q.includes('craving')) {
      return `🥑 Quick healthy snack recommendations under 200 kcal:\n• Greek yogurt (150g) with blueberries (approx. 140 kcal, 15g protein)\n• Handful of raw almonds & walnuts (approx. 160 kcal, healthy fats)\n• Apple slices with 1 tbsp peanut butter (approx. 170 kcal)\n• Boiled eggs with a pinch of paprika (approx. 140 kcal, 12g protein).`;
    }

    // 4. Protein questions
    if (q.includes('protein') || q.includes('muscle')) {
      return `💪 Top protein boosters to easily hit your daily goal:\n• Chicken breast, salmon, or white fish (25-30g protein per 100g)\n• Liquid egg whites or whole eggs (6g protein per egg)\n• Greek yogurt or Cottage cheese (15-20g protein per serving)\n• Tofu, tempeh, or edamame for plant-based power.`;
    }

    // 5. Water / Hydration
    if (q.includes('water') || q.includes('drink') || q.includes('hydration')) {
      const currentWater = dietData?.waterGlassesToday || 0;
      return `💧 Hydration Check:\nYou have logged ${currentWater} of 8 glasses today. Proper hydration speeds up metabolic rate, prevents false hunger cravings, and improves cognitive focus! Aim for 2 to 2.5 liters daily.`;
    }

    // Default intelligent diet response
    return `💡 Great question! For optimal results with Nutri-Scan, focus on whole-food nutrient density and consistent macro tracking. Remember: small daily habits compound into life-changing fitness results!`;
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // First try backend chat API if online
      const res = await api.sendChatMessage(text);
      let replyText = res?.reply;

      if (!replyText || replyText.includes('Connect to backend')) {
        replyText = generateSmartReply(text);
      }

      setTimeout(() => {
        const botMsg = {
          id: 'bot_' + Date.now(),
          sender: 'tutor',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 700);
    } catch {
      setTimeout(() => {
        const replyText = generateSmartReply(text);
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot_' + Date.now(),
            sender: 'tutor',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsTyping(false);
      }, 600);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-end bg-black/70`}
      >
        <View style={tw`bg-slate-900 rounded-t-3xl border-t border-slate-700 h-[88%] flex-col overflow-hidden`}>
          {/* Header */}
          <View style={tw`flex-row items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800`}>
            <View style={tw`flex-row items-center flex-1`}>
              <View style={tw`relative mr-3`}>
                <View style={tw`w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 items-center justify-center`}>
                  <MaterialCommunityIcons name="robot" size={20} color="#10b981" />
                </View>
                <View style={tw`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900`} />
              </View>

              <View>
                <Text style={tw`text-white font-bold text-base`}>AI Healthcare Bot</Text>
                <Text style={tw`text-emerald-400 text-xs font-medium`}>
                  Online • AI Healthcare & Nutrition Coach
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={tw`w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-slate-700`}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Quick Prompts Carousel */}
          <View style={tw`py-2.5 px-4 bg-slate-950/60 border-b border-slate-800/80`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row`}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSend(prompt)}
                  style={tw`bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full mr-2`}
                >
                  <Text style={tw`text-slate-300 text-xs font-medium`}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message History */}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={tw`p-4 pb-6`}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item) => {
              const isUser = item.sender === 'user';
              return (
                <View
                  key={item.id}
                  style={tw`mb-3.5 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <View style={tw`w-7 h-7 rounded-full bg-emerald-500/20 items-center justify-center mr-2 self-end mb-1 border border-emerald-500/30`}>
                      <Ionicons name="sparkles" size={12} color="#10b981" />
                    </View>
                  )}

                  <View
                    style={[
                      tw`max-w-[80%] rounded-2xl px-4 py-3`,
                      isUser
                        ? tw`bg-emerald-600 rounded-br-sm`
                        : tw`bg-slate-800/90 border border-slate-700/70 rounded-bl-sm`,
                    ]}
                  >
                    <Text style={tw`text-white text-xs leading-5`}>{item.text}</Text>
                    <Text
                      style={[
                        tw`text-[10px] mt-1 text-right`,
                        isUser ? tw`text-emerald-200` : tw`text-slate-500`,
                      ]}
                    >
                      {item.time}
                    </Text>
                  </View>
                </View>
              );
            })}

            {isTyping && (
              <View style={tw`flex-row items-center ml-2 my-2`}>
                <View style={tw`w-6 h-6 rounded-full bg-slate-800 items-center justify-center mr-2`}>
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
                <Text style={tw`text-slate-400 text-xs italic`}>
                  Nutri-Scan AI Tutor is typing...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={tw`p-3 bg-slate-900 border-t border-slate-800 flex-row items-center gap-2`}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your diet, progress, or foods..."
              placeholderTextColor="#64748b"
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              style={tw`flex-1 bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 text-xs`}
            />

            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim()}
              style={tw`w-11 h-11 rounded-2xl items-center justify-center ${
                input.trim() ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700 opacity-50'
              }`}
            >
              <Ionicons name="send" size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
