import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables for Supabase');
}

console.log('[Supabase] Using project URL:', supabaseUrl);

/**
 * Custom fetch wrapper that enforces a timeout on every request.
 * This prevents the app from hanging indefinitely when Supabase
 * is unreachable (e.g. blocked by network).
 */
const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  return fetch(input, { ...init, signal: controller.signal })
    .then((response) => {
      clearTimeout(timeout);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeout);
      throw error;
    });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    fetch: customFetch,
  },
});
