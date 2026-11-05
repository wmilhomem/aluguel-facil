import { isSupabaseConfigured } from './supabase';

const forcedDemo = String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase();

export function isDemoMode(): boolean {
  // Verificar forced demo via localStorage (modo sob demanda)
  if (typeof window !== 'undefined') {
    const forcedDemoLocal = localStorage.getItem('ALUGUEL_FACIL_FORCE_DEMO');
    if (forcedDemoLocal === 'true') return true;
  }
  // Verificar via env var ou Supabase não configurado
  return forcedDemo === 'true' || forcedDemo === '1' || !isSupabaseConfigured();
}

export function isConnectedMode(): boolean {
  return !isDemoMode();
}
