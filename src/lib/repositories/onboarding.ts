import { supabase } from '../supabase';
import type { Cobranca, Imovel, Inquilino, Profile } from '../../types/database';
import { dataError, DataLayerError } from './errors';

export interface CompleteOnboardingInput {
  nome: string;
  whatsapp: string;
  chavePix: string;
  tipoChavePix: string;
  imovelApelido: string;
  imovelEndereco: string;
  inquilinoNome: string;
  inquilinoWhatsapp: string;
  inquilinoCpf: string;
  valorAluguel: number;
  diaVencimento: number;
}

export interface CompleteOnboardingResult {
  profile: Profile;
  imovel: Imovel;
  inquilino: Inquilino;
  cobrancas: Cobranca[];
}

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_nome: input.nome,
    p_whatsapp: input.whatsapp,
    p_chave_pix: input.chavePix,
    p_tipo_chave_pix: input.tipoChavePix,
    p_imovel_apelido: input.imovelApelido,
    p_imovel_endereco: input.imovelEndereco,
    p_inquilino_nome: input.inquilinoNome,
    p_inquilino_whatsapp: input.inquilinoWhatsapp,
    p_inquilino_cpf: input.inquilinoCpf,
    p_valor_aluguel: input.valorAluguel,
    p_dia_vencimento: input.diaVencimento,
  });

  if (error) throw dataError('Falha ao concluir onboarding', error);

  const result = data as CompleteOnboardingResult | null;
  if (!result?.profile || !result.imovel || !result.inquilino) {
    throw new DataLayerError('Onboarding não retornou os dados esperados');
  }

  return { ...result, cobrancas: result.cobrancas ?? [] };
}
