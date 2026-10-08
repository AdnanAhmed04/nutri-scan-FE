import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../theme/tailwind';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.johnson@snaptutor.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password.trim(), isSignUp ? name.trim() : null);
    } catch (e) {
      console.log('Login error:', e);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    try {
      setLoading(true);
      await login('alex.johnson@snaptutor.com', 'demo1234');
    } catch (e) {
      console.log('Demo login error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-slate-950`}
    >
      <ScrollView
        contentContainerStyle={tw`flex-grow justify-center px-6 py-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={tw`items-center mb-8`}>
          <View style={tw`w-24 h-24 rounded-3xl overflow-hidden bg-white p-1 mb-4 shadow-xl border-2 border-emerald-500/40`}>
            <Image
              source={require('../../assets/splash-logo.jpg')}
              style={tw`w-full h-full`}
              resizeMode="contain"
            />
          </View>
          <Text style={tw`text-white text-2xl font-black tracking-tight`}>
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </Text>
          <Text style={tw`text-slate-400 text-xs mt-1 text-center`}>
            {isSignUp
              ? 'Start your personalized nutrition and diet journey'
              : 'Sign in to access your diet logs and goals'}
          </Text>
        </View>

        {/* Form Container */}
        <View style={tw`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl`}>
          {/* Sign In / Sign Up Toggle */}
          <View style={tw`flex-row bg-slate-950 rounded-2xl p-1 mb-5 border border-slate-800`}>
            <TouchableOpacity
              onPress={() => setIsSignUp(false)}
              style={tw`flex-1 py-2.5 rounded-xl items-center ${
                !isSignUp ? 'bg-emerald-500' : 'bg-transparent'
              }`}
            >
              <Text
                style={tw`text-xs font-bold ${
                  !isSignUp ? 'text-white' : 'text-slate-400'
                }`}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSignUp(true)}
              style={tw`flex-1 py-2.5 rounded-xl items-center ${
                isSignUp ? 'bg-emerald-500' : 'bg-transparent'
              }`}
            >
              <Text
                style={tw`text-xs font-bold ${
                  isSignUp ? 'text-white' : 'text-slate-400'
                }`}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Field (Sign Up only) */}
          {isSignUp && (
            <View style={tw`mb-4`}>
              <Text style={tw`text-slate-300 text-xs font-semibold mb-1.5`}>Full Name</Text>
              <View style={tw`flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5`}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#64748b"
                  style={tw`flex-1 text-white text-sm ml-2.5`}
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-300 text-xs font-semibold mb-1.5`}>Email Address</Text>
            <View style={tw`flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5`}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                style={tw`flex-1 text-white text-sm ml-2.5`}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-slate-300 text-xs font-semibold mb-1.5`}>Password</Text>
            <View style={tw`flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5`}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={tw`flex-1 text-white text-sm ml-2.5`}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Action Button */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading}
            style={tw`bg-emerald-500 py-3.5 rounded-xl items-center justify-center shadow-lg mb-3`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={tw`text-white font-bold text-sm`}>
                {isSignUp ? 'Create Free Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Button */}
          <TouchableOpacity
            onPress={handleQuickDemo}
            disabled={loading}
            style={tw`bg-slate-800 border border-slate-700 py-3 rounded-xl items-center flex-row justify-center`}
          >
            <Ionicons name="flash" size={15} color="#10b981" />
            <Text style={tw`text-slate-300 font-semibold text-xs ml-1.5`}>
              Quick Demo Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={tw`mt-8 items-center`}>
          <Text style={tw`text-slate-500 text-[11px]`}>
            Nutri-Scan • AI Nutrition Assistant
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
