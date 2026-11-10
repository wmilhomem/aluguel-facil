import { supabase } from '../supabase';

export interface FilaEnvio {
  id: string;
  user_id: string;
  inquilino_id: string | null;
  cobranca_id: string | null;
  template_tipo: 'lembrete_3_dias' | 'vencimento_hoje' | 'atraso_1_dia' | 'atraso_5_dias';
  mensagem_texto: string;
  status: 'pendente' | 'enviado' | 'erro';
  data_criacao: string;
  data_enviado?: string;
  chave_idempotencia: string;
}

export interface FilaEnvioFilters {
  user_id?: string;
  status?: string;
  template_tipo?: string;
  data_inicio?: string;
  data_fim?: string;
}

export async function listFilaEnvio(filters: FilaEnvioFilters = {}): Promise<FilaEnvio[]> {
  let query = supabase.from('fila_envio').select('*');

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.template_tipo) {
    query = query.eq('template_tipo', filters.template_tipo);
  }
  if (filters.data_inicio) {
    query = query.gte('data_criacao', filters.data_inicio);
  }
  if (filters.data_fim) {
    query = query.lte('data_criacao', filters.data_fim);
  }

  const { data, error } = await query.order('data_criacao', { ascending: false });

  if (error) throw error;
  return data as FilaEnvio[];
}

export async function getFilaEnvio(id: string): Promise<FilaEnvio | null> {
  const { data, error } = await supabase.from('fila_envio').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as FilaEnvio;
}

export async function updateFilaEnvioStatus(id: string, status: 'pendente' | 'enviado' | 'erro', dataEnviado?: string): Promise<FilaEnvio> {
  const { data, error } = await supabase
    .from('fila_envio')
    .update({ status, data_enviado: dataEnviado || new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FilaEnvio;
}

export async function createFilaEnvio(fila: Omit<FilaEnvio, 'id' | 'data_criacao' | 'data_enviado'>): Promise<FilaEnvio> {
  const { data, error } = await supabase.from('fila_envio').insert({
    ...fila,
    data_criacao: new Date().toISOString(),
    chave_idempotencia:
      fila.chave_idempotencia ||
      `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).substring(2, 8)}`,
  }).select().single();

  if (error) throw error;
  return data as FilaEnvio;
}

export async function checkIdempotencia(chaveIdempotencia: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('fila_envio')
    .select('id, status')
    .eq('chave_idempotencia', chaveIdempotencia);

  if (error) throw error;
  return (data as any[]).length > 0;
}