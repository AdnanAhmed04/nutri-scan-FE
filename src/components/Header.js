import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../theme/tailwind';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function Header({ title, subtitle, showStreak = true, onAvatarPress }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const streak = user?.streakDays ?? 0;

  return (
    <View
      style={[
        tw`flex-row items-center justify-between px-5 pb-3 bg-slate-900 border-b border-slate-800`,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <View style={tw`flex-1`}>
        {subtitle && (
          <Text style={tw`text-emerald-400 text-xs font-semibold uppercase tracking-wider`}>{subtitle}</Text>
        )}
        <Text style={tw`text-white text-xl font-bold`} accessibilityRole="header">
          {title}
        </Text>
      </View>

      <View style={tw`flex-row items-center gap-2`}>
        {showStreak && (
          <View
            accessibilityLabel={`${streak} day streak`}
            style={tw`flex-row items-center bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 mr-2`}
          >
            <Ionicons name="flame" size={16} color={streak > 0 ? '#f59e0b' : '#64748b'} />
            <Text style={tw`${streak > 0 ? 'text-amber-400' : 'text-slate-400'} font-bold text-xs ml-1`}>
              {streak}d streak
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onAvatarPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Avatar user={user} size={40} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
