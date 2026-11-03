import React, { useState } from 'react';
import { Cobranca, Inquilino, Imovel, Profile } from '../types/database';
import { formatCurrency, formatDate } from '../lib/billingEngine';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { X, CheckCircle, Calendar, Link as LinkIcon, Download } from 'lucide-react';

interface Props {
  cobranca: Cobranca;
  inquilino?: Inquilino;
  imovel?: Imovel;
  profile: Profile;
  onClose: () => void;
  onConfirm: (cobrancaId: string, dataPagamento: string, linkComprovante?: string) => Promise<void>;
}

export const PaymentModal: React.FC<Props> = ({
  cobranca,
  inquilino,
  imovel,
  profile,
  onClose,
  onConfirm,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [dataPagamento, setDataPagamento] = useState<string>(cobranca.data_pagamento || todayStr);
  const [linkComprovante, setLinkComprovante] = useState<string>(cobranca.link_comprovante || '');
  const [baixarPdfJunto, setBaixarPdfJunto] = useState(true);
  const [loading, setLoading] = useState(false);

  const valorFinal = cobranca.valor_com_multa || cobranca.valor_original;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(cobranca.id, dataPagamento, linkComprovante);

      if (baixarPdfJunto && inquilino && imovel) {
        generateReceiptPDF(
          { ...cobranca, status: 'pago', data_pagamento: dataPagamento },
          inquilino,
          imovel,
          profile
        );
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Confirmar Pagamento</h3>
          <p className="text-xs text-slate-300 mt-1">
            Dê baixa no aluguel e emita o recibo em PDF para o inquilino.
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span>Inquilino:</span>
              <span className="font-semibold text-slate-800">{inquilino?.nome_inquilino || 'Inquilino'}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span>Imóvel:</span>
              <span className="font-semibold text-slate-800">{imovel?.apelido_imovel || 'Imóvel'}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span>Vencimento Original:</span>
              <span className="font-semibold text-slate-800">{formatDate(cobranca.data_vencimento)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900">Valor Quitado:</span>
              <span className="text-lg font-black text-emerald-600">{formatCurrency(valorFinal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Data do Pagamento
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Link do Comprovante (Opcional)
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Ex: link da imagem ou comprovante bancário"
                value={linkComprovante}
                onChange={(e) => setLinkComprovante(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Opção Baixar Recibo Automaticamente */}
          <label className="flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={baixarPdfJunto}
              onChange={(e) => setBaixarPdfJunto(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              Baixar Recibo em PDF automaticamente ao confirmar
            </span>
          </label>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Salvando...' : 'Confirmar Baixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
