import React, { useState, useRef } from 'react';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Must match the server-side password policy
const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password is too long (max 72 characters).';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
};

// Demo credentials are seeded by the server in development only
const DEMO_EMAIL = 'demo@snaptutor.com';
const DEMO_PASSWORD = 'demo1234';

function Field({ label, icon, children }) {
  return (
    <View style={tw`mb-4`}>
      <Text style={tw`text-slate-300 text-xs font-semibold mb-1.5`}>{label}</Text>
      <View style={tw`flex-row items-center bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5`}>
        <Ionicons name={icon} size={18} color="#94a3b8" />
        {children}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const switchMode = (signUp) => {
    setIsSignUp(signUp);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const validate = () => {
    const trimmedEmail = email.trim();
    if (isSignUp && !name.trim()) return 'Please enter your full name.';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (isSignUp) {
      const pwError = validatePassword(password);
      if (pwError) return pwError;
      if (password !== confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleAuth = async () => {
    if (loading) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // On success AuthContext sets the user and App switches to the main screens
    } catch (e) {
      setError(e.message || 'Something went wrong, please try again.');
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (e) {
      setError(e.message || 'Demo login failed.');
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={tw`items-center mb-8`}>
          <View style={tw`w-24 h-24 rounded-3xl overflow-hidden bg-white p-1 mb-4 shadow-xl border-2 border-emerald-500/40`}>
            <Image
              source={require('../../assets/splash-logo.jpg')}
              style={tw`w-full h-full`}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible={false}
            />
          </View>
          <Text style={tw`text-white text-2xl font-black tracking-tight`} accessibilityRole="header">
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
            {[
              { label: 'Sign In', signUp: false },
              { label: 'Sign Up', signUp: true },
            ].map((tab) => {
              const active = isSignUp === tab.signUp;
              return (
                <TouchableOpacity
                  key={tab.label}
                  onPress={() => switchMode(tab.signUp)}
                  disabled={loading}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={tw`flex-1 py-2.5 rounded-xl items-center ${active ? 'bg-emerald-500' : 'bg-transparent'}`}
                >
                  <Text style={tw`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Name Field (Sign Up only) */}
          {isSignUp && (
            <Field label="Full Name" icon="person-outline">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor="#64748b"
                autoComplete="name"
                textContentType="name"
                maxLength={60}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Full name"
                style={tw`flex-1 text-white text-sm ml-2.5`}
              />
            </Field>
          )}

          {/* Email Field */}
          <Field label="Email Address" icon="mail-outline">
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={254}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Email address"
              style={tw`flex-1 text-white text-sm ml-2.5`}
            />
          </Field>

          {/* Password Field */}
          <Field label="Password" icon="lock-closed-outline">
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder={isSignUp ? 'Min 8 chars, letters & numbers' : 'Enter password'}
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              maxLength={72}
              returnKeyType={isSignUp ? 'next' : 'go'}
              onSubmitEditing={() => (isSignUp ? confirmRef.current?.focus() : handleAuth())}
              accessibilityLabel="Password"
              style={tw`flex-1 text-white text-sm ml-2.5`}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
            </TouchableOpacity>
          </Field>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <Field label="Confirm Password" icon="lock-closed-outline">
              <TextInput
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                maxLength={72}
                returnKeyType="go"
                onSubmitEditing={handleAuth}
                accessibilityLabel="Confirm password"
                style={tw`flex-1 text-white text-sm ml-2.5`}
              />
            </Field>
          )}

          {/* Error message */}
          {error ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={tw`flex-row items-start bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5 mb-4`}
            >
              <Ionicons name="alert-circle" size={16} color="#fb7185" style={tw`mt-0.5`} />
              <Text style={tw`text-rose-300 text-xs ml-2 flex-1 leading-4`}>{error}</Text>
            </View>
          ) : null}

          {/* Main Action Button */}
          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
            accessibilityState={{ disabled: loading, busy: loading }}
            style={tw`bg-emerald-500 py-3.5 rounded-xl items-center justify-center shadow-lg ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={tw`text-white font-bold text-sm`}>
                {isSignUp ? 'Create Free Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Button (development builds only) */}
          {__DEV__ && !isSignUp && (
            <TouchableOpacity
              onPress={handleQuickDemo}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Quick demo login"
              style={tw`mt-3 bg-slate-800 border border-slate-700 py-3 rounded-xl items-center flex-row justify-center`}
            >
              <Ionicons name="flash" size={15} color="#10b981" />
              <Text style={tw`text-slate-300 font-semibold text-xs ml-1.5`}>Quick Demo Login</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer info */}
        <View style={tw`mt-8 items-center`}>
          <Text style={tw`text-slate-500 text-[11px]`}>Nutri-Scan • AI Nutrition Assistant</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
