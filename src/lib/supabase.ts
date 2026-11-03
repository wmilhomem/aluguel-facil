import { createClient } from '@supabase/supabase-js';

// Check if credentials exist in localStorage or Vite env
const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('aluguel_facil_supabase_url') : null;
const savedKey = typeof window !== 'undefined' ? localStorage.getItem('aluguel_facil_supabase_key') : null;

export const SUPABASE_URL = savedUrl || import.meta.env.VITE_SUPABASE_URL || 'https://demo-project.supabase.co';
export const SUPABASE_ANON_KEY = savedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const isSupabaseConfigured = () => {
  const url = SUPABASE_URL;
  return url && !url.includes('demo-project.supabase.co') && SUPABASE_ANON_KEY.length > 20;
};

// Real Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
