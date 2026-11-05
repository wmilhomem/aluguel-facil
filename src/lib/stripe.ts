import { supabase, isSupabaseConfigured } from './supabase';
import { Profile } from '../types/database';

export interface PlanConfig {
  id: 'individual' | 'intermediario' | 'profissional';
  name: string;
  priceId: string;
  priceMonthly: number;
  maxImoveis: number;
  popular?: boolean;
  description: string;
  features: string[];
}

export const STRIPE_PLANS: PlanConfig[] = [
  {
    id: 'individual',
    name: 'Plano Individual',
    priceId: import.meta.env.VITE_STRIPE_PRICE_INDIVIDUAL || 'price_individual_27',
    priceMonthly: 27,
    maxImoveis: 1,
    description: 'Para quem aluga 1 kitnet, quarto ou casa de fundos.',
    features: [
      '1 imóvel cadastrado',
      'Cobrança WhatsApp automática às 08:00',
      'Fatura pública com Pix Copia e Cola EMV',
      'Cálculo automático de multa (2%) e juros (0,033%/dia)',
      'Geração de recibos e contrato em PDF',
      '7 dias de teste grátis',
    ],
  },
  {
    id: 'intermediario',
    name: 'Plano Intermediário',
    priceId: import.meta.env.VITE_STRIPE_PRICE_INTERMEDIARIO || 'price_intermediario_47',
    priceMonthly: 47,
    maxImoveis: 3,
    popular: true,
    description: 'O mais escolhido por donos de 2 a 3 kitnets.',
    features: [
      'Até 3 imóveis e inquilinos',
      'Cobrança WhatsApp automática às 08:00',
      'Fila diária inteligente com link wa.me direto',
      'Fatura pública com QR Code Pix em tempo real',
      'Cálculo automático de multa e juros diários',
      'Recibos e contratos ilimitados em PDF',
      'Suporte prioritário via WhatsApp',
      '7 dias de teste grátis',
    ],
  },
  {
    id: 'profissional',
    name: 'Plano Profissional',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFISSIONAL || 'price_profissional_97',
    priceMonthly: 97,
    maxImoveis: 10,
    description: 'Para quem vive de renda e gerencia de 4 a 10 kitnets.',
    features: [
      'Até 10 imóveis e inquilinos',
      'Cobrança WhatsApp automática às 08:00',
      'Fila diária das 08:00 em lote',
      'Faturas com Pix EMV dinâmico e estático',
      'Relatório financeiro mensal completo em PDF',
      'Contratos personalizados e recibos com assinatura',
      'Suporte VIP via WhatsApp com especialista',
      '7 dias de teste grátis',
    ],
  },
];

/**
 * Retorna a quantidade de dias restantes do período de teste gratuito (7 dias)
 */
export function getTrialDaysRemaining(profile: Profile): number {
  if (profile.trial_ends_at) {
    const end = new Date(profile.trial_ends_at).getTime();
    const diffMs = end - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  if (profile.created_at) {
    const created = new Date(profile.created_at).getTime();
    const end = created + 7 * 24 * 60 * 60 * 1000;
    const diffMs = end - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  return 7;
}

/**
 * Retorna o limite de imóveis de acordo com o plano do perfil
 */
export function getPlanLimit(profile: Profile): number {
  const plan = (profile.plano_nome || profile.plano || '').toLowerCase();
  if (plan === 'individual' || plan === '1_imovel') return 1;
  if (plan === 'intermediario' || plan === 'ate_3_imoveis') return 3;
  if (plan === 'profissional' || plan === 'ate_10_imoveis') return 10;
  return 3; // padrão default
}

/**
 * Verifica se o usuário tem permissão para cadastrar mais um imóvel
 */
export function canAddProperty(profile: Profile, currentCount: number): {
  allowed: boolean;
  max: number;
  message: string;
  nextPlanName?: string;
  nextPlanPrice?: number;
} {
  const limit = getPlanLimit(profile);
  if (currentCount >= limit) {
    if (limit === 1) {
      return {
        allowed: false,
        max: 1,
        message: 'Seu plano permite só 1 imóvel. Faça upgrade para o de R$47.',
        nextPlanName: 'Plano Intermediário (até 3 imóveis)',
        nextPlanPrice: 47,
      };
    }
    if (limit === 3) {
      return {
        allowed: false,
        max: 3,
        message: 'Seu plano permite até 3 imóveis. Faça upgrade para o Plano Profissional (R$97/mês) para gerenciar até 10 imóveis.',
        nextPlanName: 'Plano Profissional (até 10 imóveis)',
        nextPlanPrice: 97,
      };
    }
    return {
      allowed: false,
      max: limit,
      message: `Você atingiu o limite de ${limit} imóveis do seu plano.`,
    };
  }
  return {
    allowed: true,
    max: limit,
    message: '',
  };
}

/**
 * Verifica se o período de teste de 7 dias acabou
 */
export function isTrialExpired(profile: Profile): boolean {
  if (profile.plano_status === 'ativo') return false;
  if (profile.plano_status === 'inativo' || profile.plano_status === 'cancelado') return true;

  // Se estiver em 'trial' ou sem status definido, checa a data
  if (profile.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at).getTime();
    return Date.now() > trialEnd;
  }

  // Se tiver created_at, calcula 7 dias
  if (profile.created_at) {
    const created = new Date(profile.created_at).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() > created + sevenDaysMs;
  }

  return false;
}

/**
 * Verifica se o acesso ao sistema está bloqueado por falta de pagamento/trial expirado
 */
export function isAccessBlocked(profile: Profile): boolean {
  if (profile.plano_status === 'inativo' || profile.plano_status === 'cancelado') {
    return true;
  }
  if (profile.plano_status === 'trial' || !profile.plano_status) {
    return isTrialExpired(profile);
  }
  return false;
}

/**
 * Inicia o Checkout do Stripe via Edge Function `create-stripe-checkout`
 */
export async function createStripeCheckoutSession({
  priceId,
  userId,
  userEmail,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
}): Promise<{ url?: string; error?: string }> {
  try {
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aluguelfacil.app';
    const successUrl = `${appOrigin}/#dashboard?checkout=success`;
    const cancelUrl = `${appOrigin}/#planos?checkout=cancel`;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          priceId,
          userId,
          userEmail,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) {
        console.warn('Erro ao chamar Edge Function create-stripe-checkout:', error);
        return { error: error.message };
      }

      if (data?.url) {
        return { url: data.url };
      }
    }

    // Se a Edge Function ainda não estiver online ou chaves não configuradas no Supabase:
    return {
      error: 'STRIPE_FUNCTION_NOT_DEPLOYED',
    };
  } catch (err: any) {
    console.error('Falha na criação do checkout:', err);
    return { error: err.message || 'Erro inesperado ao conectar com Stripe' };
  }
}

/**
 * Abre o Portal do Cliente do Stripe via Edge Function `create-portal-session`
 */
export async function createStripePortalSession({
  customerId,
  userId,
}: {
  customerId?: string | null;
  userId: string;
}): Promise<{ url?: string; error?: string }> {
  try {
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aluguelfacil.app';
    const returnUrl = `${appOrigin}/#configuracoes`;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId,
          userId,
          return_url: returnUrl,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.url) {
        return { url: data.url };
      }
    }

    return { error: 'PORTAL_FUNCTION_NOT_DEPLOYED' };
  } catch (err: any) {
return { error: err.message || 'Erro ao conectar ao portal Stripe' };
}

/**
 * Função auxiliar para modo demonstração.
 * Exportada para uso em DashboardView.tsx.
 */
export { isDemoMode } from '../lib/runtime';
}
