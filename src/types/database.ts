export type TipoMensagem = 'lembrete_3_dias' | 'vencimento_hoje' | 'atraso_1_dia' | 'atraso_5_dias';

export type StatusCobranca = 'pendente' | 'pago' | 'atrasado';

export type PlanoStatus = 'trial' | 'ativo' | 'inativo' | 'cancelado';
export type PlanoNome = 'individual' | 'intermediario' | 'profissional' | '1_imovel' | 'ate_3_imoveis' | 'ate_10_imoveis';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  whatsapp_dono: string;
  chave_pix_dono: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Telefone' | 'Email' | 'Aleatória';
  cidade_pix?: string;
  plano: '1_imovel' | 'ate_3_imoveis' | 'ate_10_imoveis';
  onboarding_concluido: boolean;
  created_at?: string;
  // Stripe & Assinatura
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plano_status?: PlanoStatus;
  plano_nome?: PlanoNome;
  trial_ends_at?: string;
}

export interface Imovel {
  id: string;
  user_id: string;
  apelido_imovel: string; // ex: "Kitnet 01 - Setor Bueno"
  endereco: string;
  created_at?: string;
}

export interface Inquilino {
  id: string;
  user_id: string;
  imovel_id: string;
  nome_inquilino: string;
  whatsapp_inquilino: string;
  cpf?: string;
  valor_aluguel: number;
  dia_vencimento: number; // 1-28
  data_inicio_contrato: string; // YYYY-MM-DD
  multa_atraso: number; // % ex: 2
  juros_dia: number; // % ao dia ex: 0.033
  ativo: boolean;
  created_at?: string;
}

export interface Cobranca {
  id: string;
  inquilino_id: string;
  user_id: string;
  mes_referencia: string; // YYYY-MM ou YYYY-MM-DD (primeiro dia ou dia vencimento)
  data_vencimento: string; // YYYY-MM-DD
  valor_original: number;
  valor_com_multa?: number;
  status: StatusCobranca;
  data_pagamento?: string | null;
  link_comprovante?: string | null;
  dias_atraso: number;
  created_at?: string;
}

export interface MensagemTemplate {
  id: string;
  user_id: string;
  tipo: TipoMensagem;
  texto: string;
}

export interface FilaEnvioItem {
  id: string;
  cobranca_id: string;
  inquilino_id: string;
  tipo: TipoMensagem;
  titulo: string;
  nome_inquilino: string;
  whatsapp_inquilino: string;
  apelido_imovel: string;
  valor: number;
  data_vencimento: string;
  dias_diferenca: number; // negativo = dias para vencer, positivo = dias de atraso
  texto_mensagem: string;
  link_wa: string;
  fatura_url: string;
  horario_agendado: string;
  enviado?: boolean;
}
