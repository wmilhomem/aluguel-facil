import { supabase } from '../supabase';
import type { MensagemTemplate, TipoMensagem } from '../../types/database';
import { getDefaultTemplateText } from '../billingEngine';
import { dataError } from './errors';

const TIPOS: TipoMensagem[] = [
  'lembrete_3_dias',
  'vencimento_hoje',
  'atraso_1_dia',
  'atraso_5_dias',
];

export async function listTemplates(userId: string): Promise<MensagemTemplate[]> {
  const { data, error } = await supabase
    .from('mensagens_template')
    .select('*')
    .eq('user_id', userId)
    .order('tipo', { ascending: true });

  if (error) throw dataError('Falha ao carregar templates', error);
  return (data as MensagemTemplate[] | null) ?? [];
}

export async function ensureDefaultTemplates(userId: string): Promise<void> {
  const rows = TIPOS.map((tipo) => ({
    user_id: userId,
    tipo,
    texto: getDefaultTemplateText(tipo),
  }));

  const { error } = await supabase
    .from('mensagens_template')
    .upsert(rows, { onConflict: 'user_id,tipo', ignoreDuplicates: true });

  if (error) throw dataError('Falha ao preparar templates', error);
}

export async function upsertTemplate(
  userId: string,
  tipo: TipoMensagem,
  texto: string,
): Promise<MensagemTemplate> {
  const { data, error } = await supabase
    .from('mensagens_template')
    .upsert({ user_id: userId, tipo, texto }, { onConflict: 'user_id,tipo' })
    .select('*')
    .single();

  if (error) throw dataError('Falha ao salvar template', error);
  return data as MensagemTemplate;
}
