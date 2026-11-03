import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, Building, ArrowRight, ShieldCheck } from 'lucide-react';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  nextPlanPrice?: number;
}

export const PlanLimitModal: React.FC<PlanLimitModalProps> = ({
  isOpen,
  onClose,
  message,
  nextPlanPrice = 47,
}) => {
  const { navigate } = useApp();

  if (!isOpen) return null;

  const defaultMessage = nextPlanPrice === 47
    ? 'Seu plano permite só 1 imóvel. Faça upgrade para o de R$47'
    : 'Seu plano permite até 3 imóveis. Faça upgrade para o Plano Profissional (R$97/mês)';

  const displayMessage = message || defaultMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Building className="w-7 h-7 text-indigo-600" />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          Limite de Imóveis Atingido
        </span>

        {/* Mensagem oficial de upsell solicitada no briefing */}
        <h3 className="text-xl font-black text-slate-900 mt-4 mb-2 tracking-tight">
          {displayMessage}
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Para continuar cadastrando kitnets e automatizar as cobranças de todos os seus inquilinos, altere seu plano em segundos com cobrança via Pix ou Cartão.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              navigate('/planos');
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Fazer Upgrade para Plano de R$ {nextPlanPrice}/mês</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Continuar no plano atual
          </button>
        </div>
      </div>
    </div>
  );
};
