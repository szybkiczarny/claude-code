import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';

import { supabase } from './src/lib/supabase';
import { C } from './src/theme';
import { registerForPushNotifications, scheduleDailyDigest, setupNotificationHandlers } from './src/lib/notifications';

import AuthScreen from './src/screens/AuthScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectDetailScreen from './src/screens/ProjectDetailScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ReportDetailScreen from './src/screens/ReportDetailScreen';
import AddProjectScreen from './src/screens/AddProjectScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DefectCameraScreen from './src/screens/DefectCameraScreen';
import ContractorsScreen from './src/screens/ContractorsScreen';
import StatsScreen from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <Stack.Screen name="AddProject" component={AddProjectScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="DefectCamera" component={DefectCameraScreen} />
      <Stack.Screen name="Contractors" component={ContractorsScreen} />
    </Stack.Navigator>
  );
}

function RecordStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="Recording" component={RecordingScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="DefectCamera" component={DefectCameraScreen} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="ReportsList" component={ReportsScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="DefectCamera" component={DefectCameraScreen} />
    </Stack.Navigator>
  );
}

function StatsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="StatsDashboard" component={StatsScreen} />
      <Stack.Screen name="StatsProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMid,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            Projects: { active: 'folder', inactive: 'folder-outline' },
            Record:   { active: 'mic-circle', inactive: 'mic-circle-outline' },
            Reports:  { active: 'document-text', inactive: 'document-text-outline' },
            Stats:    { active: 'bar-chart', inactive: 'bar-chart-outline' },
          };
          const icon = icons[route.name];
          if (!icon) return null;
          return <Ionicons name={(focused ? icon.active : icon.inactive) as any} size={route.name === 'Record' ? 32 : 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Projects" component={ProjectsStack} options={{ tabBarLabel: 'Projekty' }} />
      <Tab.Screen name="Record" component={RecordStack} options={{ tabBarLabel: 'Nagraj' }} />
      <Tab.Screen name="Reports" component={ReportsStack} options={{ tabBarLabel: 'Raporty' }} />
      <Tab.Screen name="Stats" component={StatsStack} options={{ tabBarLabel: 'Statystyki' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        registerForPushNotifications();
        scheduleDailyDigest();
      }
    });
    const cleanupHandlers = setupNotificationHandlers();
    return () => { subscription.unsubscribe(); cleanupHandlers(); };
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user
            ? <Stack.Screen name="Main" component={MainTabs} />
            : <Stack.Screen name="Auth" component={AuthScreen} />
          }
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
