import { isSupabaseConfigured } from './supabase';

const forcedDemo = String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase();

export function isDemoMode(): boolean {
  return forcedDemo === 'true' || forcedDemo === '1' || !isSupabaseConfigured();
}

export function isConnectedMode(): boolean {
  return !isDemoMode();
}
