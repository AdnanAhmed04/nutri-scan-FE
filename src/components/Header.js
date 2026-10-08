import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../theme/tailwind';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, showStreak = true, onAvatarPress }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View
      style={[
        tw`flex-row items-center justify-between px-5 pb-3 bg-slate-900 border-b border-slate-800`,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <View style={tw`flex-1`}>
        {subtitle && (
          <Text style={tw`text-emerald-400 text-xs font-semibold uppercase tracking-wider`}>
            {subtitle}
          </Text>
        )}
        <Text style={tw`text-white text-xl font-bold`}>{title}</Text>
      </View>

      <View style={tw`flex-row items-center gap-2`}>
        {showStreak && (
          <View style={tw`flex-row items-center bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 mr-2`}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={tw`text-amber-400 font-bold text-xs ml-1`}>
              {user?.streakDays || 7}d streak
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
          <Image
            source={{
              uri:
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            }}
            style={tw`w-10 h-10 rounded-full border-2 border-emerald-500`}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
