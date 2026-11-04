import { supabase } from '../supabase';
import type { Profile } from '../../types/database';
import { dataError } from './errors';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw dataError('Falha ao carregar perfil', error);
  return (data as Profile | null) ?? null;
}

export async function ensureProfile(
  userId: string,
  email: string,
  nome: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      nome,
      onboarding_concluido: false,
    })
    .select('*')
    .single();

  if (error) throw dataError('Falha ao preparar perfil', error);
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw dataError('Falha ao atualizar perfil', error);
  return data as Profile;
}
