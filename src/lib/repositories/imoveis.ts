import { supabase } from '../supabase';
import type { Imovel } from '../../types/database';
import { dataError } from './errors';

export type NewImovel = Pick<Imovel, 'apelido_imovel' | 'endereco'>;
export type ImovelUpdates = Partial<NewImovel>;

export async function listImoveis(userId: string): Promise<Imovel[]> {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw dataError('Falha ao carregar imóveis', error);
  return (data as Imovel[] | null) ?? [];
}

export async function createImovel(userId: string, input: NewImovel): Promise<Imovel> {
  const { data, error } = await supabase
    .from('imoveis')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single();

  if (error) throw dataError('Falha ao criar imóvel', error);
  return data as Imovel;
}

export async function updateImovel(id: string, updates: ImovelUpdates): Promise<Imovel> {
  const { data, error } = await supabase
    .from('imoveis')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw dataError('Falha ao atualizar imóvel', error);
  return data as Imovel;
}

export async function deleteImovel(id: string): Promise<void> {
  const { error } = await supabase.from('imoveis').delete().eq('id', id);
  if (error) throw dataError('Falha ao excluir imóvel', error);
}
