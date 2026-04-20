import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Explicitly pass the global WebSocket to supabase's realtime client.
// supabase-js 2.103+ calls WebSocketFactory.getWebSocketConstructor() eagerly
// during createClient(). In React Native (New Architecture / JSI), the global
// WebSocket is installed as a lazy getter which can confuse environment-detection
// heuristics. Providing it directly bypasses that detection path entirely.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: global.WebSocket,
  },
});
