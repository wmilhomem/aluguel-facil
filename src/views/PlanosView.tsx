import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { STRIPE_PLANS, createStripeCheckoutSession, createStripePortalSession, getPlanLimit } from '../lib/stripe';
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Lock,
  ExternalLink,
  Building,
  HelpCircle,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PlanosView: React.FC = () => {
  const { profile, user, navigate, showToast, updateProfile } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    // Verifica parâmetros de URL ou Hash para feedback do Checkout
    const hash = window.location.hash;
    const search = window.location.search;
    const isSuccess = hash.includes('checkout=success') || search.includes('checkout=success');
    const isCancel = hash.includes('checkout=cancel') || search.includes('checkout=cancel');

    if (isSuccess) {
      showToast('Assinatura Confirmada!', 'Seu plano Stripe foi ativado com sucesso. Aproveite o Aluguel Fácil!', 'success');
      setCheckoutNotice('success');
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      // Ativa perfil local se em demo
      updateProfile({
        plano_status: 'ativo',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (isCancel) {
      showToast('Checkout cancelado', 'Nenhuma cobrança foi efetuada. Você pode escolher seu plano a qualquer momento.', 'warning');
      setCheckoutNotice('cancel');
    }
  }, []);

  const handleSelectPlan = async (plan: typeof STRIPE_PLANS[0]) => {
    setLoadingPlan(plan.id);

    const userId = user?.id || profile.id || 'usr_local';
    const userEmail = user?.email || profile.email || 'locador@exemplo.com';

    try {
      const res = await createStripeCheckoutSession({
        priceId: plan.priceId,
        userId,
        userEmail,
      });

      if (res.url) {
        // Redireciona diretamente para o Stripe Checkout oficial
        window.location.href = res.url;
        return;
      }

      if (res.error === 'STRIPE_FUNCTION_NOT_DEPLOYED') {
        // Modo demonstração guiado: explica claramente o Stripe
        const proceedSim = window.confirm(
          `Modo de Simulação do Stripe Checkout:\n\n` +
          `A Edge Function 'create-stripe-checkout' será ativada assim que você preencher sua STRIPE_SECRET_KEY no Supabase.\n\n` +
          `Deseja simular a ativação imediata do ${plan.name} (R$ ${plan.priceMonthly}/mês) neste navegador para testar agora?`
        );

        if (proceedSim) {
          await updateProfile({
            plano: plan.id === 'individual' ? '1_imovel' : plan.id === 'profissional' ? 'ate_10_imoveis' : 'ate_3_imoveis',
            plano_nome: plan.id,
            plano_status: 'ativo',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          showToast('Plano ativado em modo teste!', `Você agora está no ${plan.name}.`, 'success');
          try {
            confetti({ particleCount: 80, spread: 60 });
          } catch {
            // ignore
          }
          navigate('/dashboard');
        }
      } else {
        showToast('Erro ao abrir checkout', res.error || 'Verifique as chaves do Stripe.', 'error');
      }
    } catch (err: any) {
      showToast('Falha na conexão', err.message || 'Não foi possível conectar ao Stripe.', 'error');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    const userId = user?.id || profile.id || 'usr_local';

    try {
      const res = await createStripePortalSession({
        customerId: profile.stripe_customer_id,
        userId,
      });

      if (res.url) {
        window.location.href = res.url;
      } else {
        showToast(
          'Portal do Cliente Stripe',
          'Configure a Edge Function create-portal-session e STRIPE_SECRET_KEY para abrir o painel oficial de autoatendimento.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Erro', err.message || 'Falha ao abrir portal', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlanName = profile.plano_nome || (profile.plano === '1_imovel' ? 'individual' : profile.plano === 'ate_10_imoveis' ? 'profissional' : 'intermediario');
  const currentPlanLimit = getPlanLimit(profile);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Banner / Hero */}
      <section className="bg-slate-900 text-white pt-14 pb-20 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Planos Mensais Sem Fidelidade ou Carência
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Escolha o plano ideal para o seu número de kitnets
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-normal mt-4 max-w-2xl mx-auto leading-relaxed">
            Automatize as cobranças no WhatsApp com link Pix e recibos automáticos. Cancele quando quiser no portal do cliente.
          </p>

          {/* Payment badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <QrCode className="w-4 h-4 text-emerald-400" /> Pix Instantâneo
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <CreditCard className="w-4 h-4 text-indigo-400" /> Cartão de Crédito
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <FileText className="w-4 h-4 text-amber-400" /> Boleto Bancário
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Lock className="w-4 h-4 text-emerald-400" /> Checkout Seguro Stripe
            </span>
          </div>
        </div>
      </section>

      {/* Alerta de Checkout se houver */}
      {checkoutNotice === 'success' && (
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Assinatura Ativada com Sucesso!</p>
                <p className="text-xs text-emerald-700">Obrigado pela confiança. Seu limite de imóveis foi liberado.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Ir ao Painel
            </button>
          </div>
        </div>
      )}

      {/* Grid de Planos */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {STRIPE_PLANS.map((plan) => {
            const isCurrent = currentPlanName === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative bg-white ${
                  plan.popular
                    ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 md:-translate-y-2'
                    : 'border border-slate-200/90 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-indigo-200">
                    Mais Popular
                  </div>
                )}

                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                        plan.popular ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Seu Plano Atual
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 min-h-[32px]">{plan.description}</p>

                  {/* Preço */}
                  <div className="flex items-baseline gap-1 my-6 pb-6 border-b border-slate-100">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">
                      R$ {plan.priceMonthly}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/mês</span>
                  </div>

                  {/* Tag de Limite de Imóveis */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-6 flex items-center gap-2 border border-slate-100">
                    <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      {plan.maxImoveis === 1 ? '1 Imóvel incluso' : `Até ${plan.maxImoveis} Imóveis inclusos`}
                    </span>
                  </div>

                  {/* Lista de Recursos */}
                  <ul className="space-y-3 text-xs text-slate-600 font-medium mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão de Ação Stripe */}
                <div>
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isLoading}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300'
                        : isCurrent
                        ? 'bg-slate-800 hover:bg-slate-900 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    } disabled:opacity-50`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Conectando ao Stripe...</span>
                      </>
                    ) : (
                      <>
                        <span>{isCurrent ? 'Plano Atual / Renovar' : 'Assinar com Stripe'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Cobrado no Cartão, Pix ou Boleto via Stripe
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner do Portal de Gerenciamento Stripe */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Gerenciamento de Assinatura e Faturas</span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Você tem total autonomia. No Portal do Cliente da Stripe, você pode atualizar cartão de crédito, baixar recibos fiscais, trocar de plano ou cancelar a qualquer momento sem burocracia.
            </p>
          </div>

          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 border border-slate-200"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <ExternalLink className="w-4 h-4 text-slate-600" />
            )}
            <span>Gerenciar Assinatura e Pagamentos</span>
          </button>
        </div>

        {/* Garantias e FAQ Rápido */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-slate-900">Sem Fidelidade ou Carência</h4>
            <p className="text-xs text-slate-500 mt-1">
              Você tem total liberdade. Cancele quando quiser com apenas 1 clique direto no portal. Sem multas nem taxas ocultas.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <QrCode className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-slate-900">Pix 100% no seu Bolso</h4>
            <p className="text-xs text-slate-500 mt-1">
              O inquilino paga o aluguel direto na sua chave Pix pessoal. O Aluguel Fácil cobra apenas a mensalidade fixa do software.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <Zap className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-slate-900">Configuração Instantânea</h4>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre suas kitnets em menos de 3 minutos e deixe a régua de cobrança das 08:00 trabalhar por você.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
