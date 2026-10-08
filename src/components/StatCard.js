import React from 'react';
import { View, Text } from 'react-native';
import tw from '../theme/tailwind';

export default function StatCard({ label, value, goal, unit = 'g', color = 'emerald' }) {
  const percentage = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
    },
    blue: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      text: 'text-sky-400',
      bar: 'bg-sky-500',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <View style={tw`flex-1 p-3.5 rounded-2xl bg-slate-800/80 border ${scheme.border}`}>
      <Text style={tw`text-slate-400 text-xs font-medium`}>{label}</Text>
      <View style={tw`flex-row items-baseline mt-1 mb-2`}>
        <Text style={tw`text-white text-lg font-bold`}>{value}</Text>
        <Text style={tw`text-slate-400 text-xs ml-0.5`}>/{goal}{unit}</Text>
      </View>

      {/* Progress Bar */}
      <View style={tw`h-1.5 w-full bg-slate-700 rounded-full overflow-hidden`}>
        <View style={[tw`h-full rounded-full ${scheme.bar}`, { width: `${percentage}%` }]} />
      </View>
      <Text style={tw`${scheme.text} text-[10px] font-semibold text-right mt-1`}>{percentage}%</Text>
    </View>
  );
}
