import React from 'react';
import { useApp } from '../context/AppContext';
import { createStripePortalSession } from '../lib/stripe';
import { Lock, Sparkles, ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react';

interface SubscriptionBlockedModalProps {
  isOpen: boolean;
}

export const SubscriptionBlockedModal: React.FC<SubscriptionBlockedModalProps> = ({ isOpen }) => {
  const { navigate, profile, user } = useApp();

  if (!isOpen) return null;

  const handleOpenPortal = async () => {
    const userId = user?.id || profile.id || 'usr_local';
    const res = await createStripePortalSession({
      customerId: profile.stripe_customer_id,
      userId,
    });
    if (res.url) {
      window.location.href = res.url;
    } else {
      navigate('/planos');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
          Acesso Temporariamente Suspenso
        </span>

        <h2 className="text-2xl font-black text-slate-900 mt-4 mb-2 tracking-tight">
          Ative seu plano para continuar cobrando.
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Seus imóveis, inquilinos cadastrados e histórico de cobranças continuam salvos e seguros. Ative sua assinatura Stripe para continuar emitindo faturas com Pix e disparando lembretes automáticos no WhatsApp.
        </p>

        {/* Benefícios rápidos */}
        <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 mb-6 border border-slate-200/80 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cobranças automáticas às 08:00 com link Pix</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Recálculo diário automático de multa (2%) e juros</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Recibos em PDF e comprovantes instantâneos</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/planos')}
            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Escolher Plano e Ativar (com Pix ou Cartão)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenPortal}
            className="w-full py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Já sou assinante? Acessar Portal Stripe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
