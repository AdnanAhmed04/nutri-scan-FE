import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import { useAuth } from '../context/AuthContext';

// Must match the server-side password policy
const validatePassword = (password) => {
  if (password.length < 8) return 'New password must be at least 8 characters.';
  if (password.length > 72) return 'New password is too long (max 72 characters).';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'New password must contain at least one letter and one number.';
  }
  return null;
};

export default function ChangePasswordModal({ visible, onClose }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!current) return setError('Please enter your current password.');
    const pwError = validatePassword(next);
    if (pwError) return setError(pwError);
    if (next !== confirm) return setError('New passwords do not match.');
    if (next === current) return setError('New password must be different from the current one.');

    setError('');
    setSaving(true);
    try {
      await changePassword(current, next);
      setSaving(false);
      reset();
      onClose();
      Alert.alert('Password Updated', 'Your password was changed. Other devices have been signed out.');
    } catch (e) {
      setSaving(false);
      setError(e.message || 'Could not change password.');
    }
  };

  const renderInput = (label, value, onChange, autoComplete) => (
    <View style={tw`mb-3`}>
      <Text style={tw`text-slate-300 text-xs font-semibold mb-1.5`}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        maxLength={72}
        accessibilityLabel={label}
        placeholderTextColor="#64748b"
        style={tw`bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-3 text-sm`}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1 justify-end bg-black/70`}
      >
        <View style={tw`bg-slate-900 rounded-t-3xl border-t border-slate-700 p-5 pb-8`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-white text-lg font-bold`} accessibilityRole="header">
              Change Password
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={tw`w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-slate-700`}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {renderInput('Current Password', current, setCurrent, 'current-password')}
          {renderInput('New Password', next, setNext, 'new-password')}
          {renderInput('Confirm New Password', confirm, setConfirm, 'new-password')}

          <Text style={tw`text-slate-500 text-[11px] mb-3`}>
            At least 8 characters with letters and numbers. You'll stay signed in on this device.
          </Text>

          {error ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={tw`bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5 mb-3`}
            >
              <Text style={tw`text-rose-300 text-xs`}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
            style={tw`bg-emerald-500 py-3.5 rounded-xl items-center ${saving ? 'opacity-70' : ''}`}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={tw`text-white font-bold text-sm`}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
