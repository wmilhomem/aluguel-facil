import { supabase } from './supabase';
import { dataError } from './repositories/errors';
import type { StatusCobranca } from '../types/database';

export interface PublicInvoiceCobranca {
  id: string;
  mes_referencia: string;
  data_vencimento: string;
  valor_original: number;
  valor_com_multa: number | null;
  status: StatusCobranca;
  data_pagamento: string | null;
  dias_atraso: number;
  public_token: string;
}

export interface PublicInvoiceInquilino {
  nome_inquilino: string;
  multa_atraso: number | null;
  juros_dia: number | null;
}

export interface PublicInvoiceImovel {
  apelido_imovel: string;
  endereco: string;
}

export interface PublicInvoiceLocador {
  nome: string | null;
  whatsapp_dono: string | null;
  chave_pix_dono: string | null;
  cidade_pix: string | null;
}

export interface PublicInvoice {
  cobranca: PublicInvoiceCobranca;
  inquilino: PublicInvoiceInquilino;
  imovel: PublicInvoiceImovel;
  locador: PublicInvoiceLocador;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidPublicToken(token: string | undefined): token is string {
  return Boolean(token && UUID_PATTERN.test(token));
}

/**
 * Consulta a fatura pública pela RPC SECURITY DEFINER.
 * A RPC retorna apenas os campos necessários e não expõe dados pessoais
 * além do que o próprio inquilino precisa para pagar.
 */
export async function fetchPublicInvoice(token: string | undefined): Promise<PublicInvoice | null> {
  if (!isValidPublicToken(token)) return null;

  const { data, error } = await supabase.rpc('get_public_invoice', {
    p_token: token,
  });

  if (error) throw dataError('Falha ao carregar fatura pública', error);
  return (data as PublicInvoice | null) ?? null;
}
