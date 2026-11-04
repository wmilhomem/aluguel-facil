import React, { useState } from 'react';
import { FilaEnvioItem } from '../types/database';
import { formatCurrency } from '../lib/billingEngine';
import {
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Clock,
  AlertTriangle,
  Calendar,
  Building,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  item: FilaEnvioItem;
}

export const WhatsAppQueueCard: React.FC<Props> = ({ item }) => {
  const { navigate } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.texto_mensagem);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback simples
      const textArea = document.createElement('textarea');
      textArea.value = item.texto_mensagem;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getBadgeStyle = () => {
    switch (item.tipo) {
      case 'vencimento_hoje':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'lembrete_3_dias':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      case 'atraso_1_dia':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'atraso_5_dias':
        return 'bg-red-200 text-red-950 border-red-400 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
          >
            {item.tipo.includes('atraso') ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : item.tipo === 'vencimento_hoje' ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            {item.titulo}
          </span>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Agendado 08:00
          </span>
        </div>

        {/* Tenant & Property info */}
        <div className="mb-3">
          <h4 className="text-base font-bold text-slate-900 leading-snug">{item.nome_inquilino}</h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              {item.apelido_imovel}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              {item.whatsapp_inquilino}
            </span>
          </div>
        </div>

        {/* Valor da Cobrança */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-3 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">Valor a cobrar:</span>
          <div className="text-right">
            {item.tipo.includes('atraso') ? (
              <div className="flex items-center gap-1.5">
                <span className="line-through text-slate-400 text-xs font-semibold">
                  {/* Calcula valor original se houver diferença */}
                  {formatCurrency(
                    Number(
                      (
                        item.valor /
                        (1 + 0.02 + 0.00033 * (item.dias_diferenca > 0 ? item.dias_diferenca : 1))
                      ).toFixed(2)
                    )
                  )}
                </span>
                <span className="text-base font-black text-rose-600">
                  {formatCurrency(item.valor)}
                </span>
              </div>
            ) : (
              <span className="text-base font-extrabold text-slate-900">
                {formatCurrency(item.valor)}
              </span>
            )}
          </div>
        </div>

        {/* Prévia da Mensagem (Balão WhatsApp) */}
        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-slate-800 leading-relaxed font-sans mb-4 relative">
          <p className="line-clamp-3">{item.texto_mensagem}</p>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          {/* Botão Copiar */}
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Texto
              </>
            )}
          </button>

          {/* Botão Enviar no WhatsApp Oficial wa.me */}
          <a
            href={item.link_wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 hover:shadow transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar no WhatsApp
          </a>
        </div>

        {/* Link para Fatura Pública */}
        <button
          onClick={() => navigate('/fatura', { id: item.fatura_token })}
          className="w-full text-center py-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"
        >
          <FileText className="w-3 h-3" />
          Ver link da fatura enviada ao inquilino
        </button>
      </div>
    </div>
  );
};
