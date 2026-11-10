import { supabase } from '../supabase';
import type { Cobranca, StatusCobranca } from '../../types/database';
import { dataError } from './errors';

export type NewCobranca = Omit<Cobranca, 'id' | 'created_at'>;
export type BillingStateUpdate = Pick<
  Cobranca,
  'id' | 'status' | 'dias_atraso' | 'valor_com_multa'
>;

export async function listCobrancas(userId: string): Promise<Cobranca[]> {
  const { data, error } = await supabase
    .from('cobrancas')
    .select('*')
    .eq('user_id', userId)
    .order('data_vencimento', { ascending: true });

  if (error) throw dataError('Falha ao carregar cobranças', error);
  return (data as Cobranca[] | null) ?? [];
}

export async function createManyCobrancas(rows: NewCobranca[]): Promise<Cobranca[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('cobrancas')
    .insert(rows)
    .select('*');

  if (error) throw dataError('Falha ao criar cobranças', error);
  return (data as Cobranca[] | null) ?? [];
}

export async function markCobrancaPaid(
  id: string,
  dataPagamento: string,
  linkComprovante?: string | null,
): Promise<Cobranca> {
  const { data, error } = await supabase
    .from('cobrancas')
    .update({
      status: 'pago' satisfies StatusCobranca,
      data_pagamento: dataPagamento,
      link_comprovante: linkComprovante ?? null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw dataError('Falha ao registrar pagamento', error);
  return data as Cobranca;
}

export async function updateBillingState(rows: BillingStateUpdate[]): Promise<void> {
  if (rows.length === 0) return;

  const results = await Promise.all(
    rows.map((row) =>
      supabase
        .from('cobrancas')
        .update({
          status: row.status,
          dias_atraso: row.dias_atraso,
          valor_com_multa: row.valor_com_multa ?? null,
        })
        .eq('id', row.id),
    ),
  );

  const failure = results.find((result) => result.error);
  if (failure?.error) throw dataError('Falha ao sincronizar cobranças', failure.error);
}

export async function deleteCobranca(id: string): Promise<void> {
  const { error } = await supabase.from('cobrancas').delete().eq('id', id);
  if (error) throw dataError('Falha ao excluir cobrança', error);
}
