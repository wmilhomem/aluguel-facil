import { supabase } from '../supabase';
import type { Inquilino } from '../../types/database';
import { dataError } from './errors';

export type NewInquilino = Omit<Inquilino, 'id' | 'user_id' | 'created_at'>;
export type InquilinoUpdates = Partial<NewInquilino>;

export async function listInquilinos(userId: string): Promise<Inquilino[]> {
  const { data, error } = await supabase
    .from('inquilinos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw dataError('Falha ao carregar inquilinos', error);
  return (data as Inquilino[] | null) ?? [];
}

export async function createInquilino(
  userId: string,
  input: NewInquilino,
): Promise<Inquilino> {
  const { data, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single();

  if (error) throw dataError('Falha ao criar inquilino', error);
  return data as Inquilino;
}

export async function updateInquilino(
  id: string,
  updates: InquilinoUpdates,
): Promise<Inquilino> {
  const { data, error } = await supabase
    .from('inquilinos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw dataError('Falha ao atualizar inquilino', error);
  return data as Inquilino;
}

export async function deleteInquilino(id: string): Promise<void> {
  const { error } = await supabase.from('inquilinos').delete().eq('id', id);
  if (error) throw dataError('Falha ao excluir inquilino', error);
}
