import React, { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import tw from '../theme/tailwind';
import { resolveAvatarUrl } from '../services/api';

const initialsOf = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

/**
 * Profile photo with an initials fallback (no photo, or the photo failed to load).
 * `uri` overrides the user's saved avatar (e.g. a local preview while uploading).
 */
export default function Avatar({ user, uri, size = 40, borderWidth = 2 }) {
  const source = uri || resolveAvatarUrl(user?.avatar);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  const frame = [
    tw`rounded-full border-emerald-500 items-center justify-center overflow-hidden bg-emerald-500/20`,
    { width: size, height: size, borderWidth },
  ];

  if (!source || failed) {
    return (
      <View style={frame} accessibilityRole="image" accessibilityLabel={`${user?.name || 'User'} avatar`}>
        <Text style={[tw`text-emerald-300 font-bold`, { fontSize: size * 0.38 }]}>{initialsOf(user?.name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      onError={() => setFailed(true)}
      style={frame}
      accessibilityLabel={`${user?.name || 'User'} profile photo`}
    />
  );
}
