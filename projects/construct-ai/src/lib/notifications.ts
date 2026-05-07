import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// SDK 53+ logs a console.error in Expo Go but does NOT throw — the module loads fine.
// All function calls below are guarded by isExpoGo so nothing actually runs.
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Construct AI',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1D6FB8',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_tokens').upsert({ user_id: user.id, token, updated_at: new Date().toISOString() });
    }
    return token;
  } catch {
    return null;
  }
}

export async function scheduleDailyDigest() {
  if (isExpoGo) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'daily_digest') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Construct AI',
        body: 'Sprawdź swoje usterki i zadania na dziś',
        data: { type: 'daily_digest' },
      },
      trigger: { hour: 8, minute: 0, repeats: true } as any,
    });
  } catch {}
}

export async function scheduleDeadlineReminder(description: string, contractor: string, deadline: string) {
  if (isExpoGo) return;
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();

    const dayBefore = new Date(deadlineDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(9, 0, 0, 0);
    if (dayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Usterka — jutro termin', body: `${description}${contractor ? ` · ${contractor}` : ''}`, data: { type: 'deadline_reminder' } },
        trigger: { date: dayBefore } as any,
      });
    }

    const dayOf = new Date(deadlineDate);
    dayOf.setHours(9, 0, 0, 0);
    if (dayOf > now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Usterka — termin dzisiaj', body: `${description}${contractor ? ` · ${contractor}` : ''}`, data: { type: 'deadline_reminder' } },
        trigger: { date: dayOf } as any,
      });
    }
  } catch {}
}

export function setupNotificationHandlers() {
  if (isExpoGo) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(_response => {});
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
