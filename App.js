import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { addReminderTapListener } from './src/services/reminders';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Prevent intrusive dev warning popups from interrupting the UI
LogBox.ignoreAllLogs(true);

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DietScreen from './src/screens/DietScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GenerateMealScreen from './src/screens/GenerateMealScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const TAB_SCREENS = ['Home', 'Diet', 'Profile'];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 22 : 14,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: 28,
          backgroundColor: 'rgba(15, 23, 42, 0.88)', // Frosted glass dark slate
          borderWidth: 1.2,
          borderColor: 'rgba(255, 255, 255, 0.12)', // Subtle glass highlight
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 12,
        },
        tabBarActiveTintColor: '#10b981',   // emerald-500
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Diet') {
            iconName = focused ? 'nutrition' : 'nutrition-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Diet"
        component={DietScreen}
        options={{ tabBarLabel: 'Diet' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  // Tapping a reminder opens the related tab (e.g. water reminder -> Diet)
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return addReminderTapListener((screen) => {
      if (TAB_SCREENS.includes(screen) && navigationRef.isReady()) {
        navigationRef.navigate('MainTabs', { screen });
      }
    });
  }, [isAuthenticated]);

  // Restoring the saved session from secure storage
  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel="Loading your account"
      >
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // If user is logged out, show LoginScreen
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  // If user is authenticated, show full app with Tab Navigator & GenerateMealScreen
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="GenerateMeal" component={GenerateMealScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#fafafa" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
