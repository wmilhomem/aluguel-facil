import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getMonthName, createWhatsAppUrl, renderTemplate, getDefaultTemplateText, getDaysDifference } from '../lib/billingEngine';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { PaymentModal } from '../components/PaymentModal';
import { Cobranca, Inquilino, Imovel, StatusCobranca } from '../types/database';
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  MessageCircle,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building,
  Check,
  Copy,
  X,
  FileCheck2,
} from 'lucide-react';

export const CobrancasView: React.FC = () => {
  const {
    cobrancas,
    inquilinos,
    imoveis,
    profile,
    templates,
    markCobrancaPaid,
    deleteCobranca,
    navigate,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'todos' | StatusCobranca>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCobForPayment, setSelectedCobForPayment] = useState<Cobranca | null>(null);
  const [manualReminderCob, setManualReminderCob] = useState<Cobranca | null>(null);
  const [copiedManual, setCopiedManual] = useState(false);

  const inquilinosMap = new Map<string, Inquilino>(inquilinos.map((i) => [i.id, i]));
  const imoveisMap = new Map<string, Imovel>(imoveis.map((i) => [i.id, i]));

  // Ordena cobranças: atrasadas primeiro, depois pendentes por vencimento, depois pagas
  const sortedCobrancas = [...cobrancas].sort((a, b) => {
    if (a.status === 'atrasado' && b.status !== 'atrasado') return -1;
    if (b.status === 'atrasado' && a.status !== 'atrasado') return 1;
    if (a.status === 'pendente' && b.status === 'pago') return -1;
    if (b.status === 'pendente' && a.status === 'pago') return 1;
    return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  });

  const filteredCobrancas = sortedCobrancas.filter((cob) => {
    const inq = inquilinosMap.get(cob.inquilino_id);
    const imo = inq ? imoveisMap.get(inq.imovel_id) : undefined;
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (inq?.nome_inquilino.toLowerCase() || '').includes(search) ||
      (imo?.apelido_imovel.toLowerCase() || '').includes(search) ||
      cob.data_vencimento.includes(search);

    const matchesStatus = statusFilter === 'todos' || cob.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Prepara lembrete manual
  const getManualReminderText = (cob: Cobranca) => {
    const inq = inquilinosMap.get(cob.inquilino_id);
    const imo = inq ? imoveisMap.get(inq.imovel_id) : undefined;
    if (!inq) return '';

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aluguelfacil.app';
    const faturaUrl = `${appOrigin}/#fatura-${cob.id}`;
    const valor = cob.valor_com_multa || cob.valor_original;

    let tipo = 'vencimento_hoje';
    if (cob.status === 'atrasado') tipo = 'atraso_1_dia';

    const tpl = templates.find((t) => t.tipo === tipo)?.texto || getDefaultTemplateText('vencimento_hoje');

    return renderTemplate(tpl, {
      nome: inq.nome_inquilino,
      valor: formatCurrency(valor),
      pix: profile.chave_pix_dono || 'Chave Pix a combinar',
      endereco: imo?.apelido_imovel || 'Imóvel residencial',
      vencimento: formatDate(cob.data_vencimento),
      mes: getMonthName(cob.mes_referencia),
      link: faturaUrl,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Todas as Cobranças e Recibos
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Acompanhe os pagamentos, dê baixa via Pix e gere recibos em PDF em 1 clique.
              </p>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                Total: <strong className="text-white">{cobrancas.length}</strong>
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                Pagas: <strong>{cobrancas.filter((c) => c.status === 'pago').length}</strong>
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                Atrasadas: <strong>{cobrancas.filter((c) => c.status === 'atrasado').length}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Cobranças */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({cobrancas.length})
              </button>
              <button
                onClick={() => setStatusFilter('pendente')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'pendente'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                A Vencer ({cobrancas.filter((c) => c.status === 'pendente').length})
              </button>
              <button
                onClick={() => setStatusFilter('atrasado')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'atrasado'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Atrasadas ({cobrancas.filter((c) => c.status === 'atrasado').length})
              </button>
              <button
                onClick={() => setStatusFilter('pago')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'pago'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Pagas ({cobrancas.filter((c) => c.status === 'pago').length})
              </button>
            </div>

            {/* Input de Busca */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por inquilino ou imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tabela de Cobranças */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Status</th>
                  <th className="py-3.5 px-4">Inquilino & Imóvel</th>
                  <th className="py-3.5 px-4">Mês Referência</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCobrancas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhuma cobrança encontrada para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredCobrancas.map((cob) => {
                    const inq = inquilinosMap.get(cob.inquilino_id);
                    const imo = inq ? imoveisMap.get(inq.imovel_id) : undefined;
                    const valorCobrado = cob.valor_com_multa || cob.valor_original;

                    return (
                      <tr key={cob.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Status */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          {cob.status === 'pago' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Pago
                            </span>
                          ) : cob.status === 'atrasado' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                              Atrasado ({cob.dias_atraso}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              A Vencer
                            </span>
                          )}
                        </td>

                        {/* Inquilino & Imóvel */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {inq?.nome_inquilino || 'Inquilino'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {imo?.apelido_imovel || 'Imóvel'}
                          </div>
                        </td>

                        {/* Mês Referência */}
                        <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700 capitalize">
                          {getMonthName(cob.mes_referencia)}
                        </td>

                        {/* Vencimento */}
                        <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700">
                          {formatDate(cob.data_vencimento)}
                          {cob.status === 'pago' && cob.data_pagamento && (
                            <span className="block text-[10px] text-emerald-600 font-semibold">
                              Pago em: {formatDate(cob.data_pagamento)}
                            </span>
                          )}
                        </td>

                        {/* Valor */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {(() => {
                            const diasAtraso =
                              cob.dias_atraso > 0
                                ? cob.dias_atraso
                                : Math.max(1, getDaysDifference(cob.data_vencimento));
                            const multaAtraso = inq?.multa_atraso ?? 2.0;
                            const jurosDia = inq?.juros_dia ?? 0.033;
                            // valor_com_multa = valor_original * (1 + multa_atraso/100 + (juros_dia/100 * dias_atrasado))
                            const valorComMultaCalculado = Number(
                              (cob.valor_original * (1 + multaAtraso / 100 + (jurosDia / 100) * diasAtraso)).toFixed(2)
                            );

                            if (cob.status === 'atrasado') {
                              return (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="line-through text-slate-400 text-xs font-semibold">
                                      {formatCurrency(cob.valor_original)}
                                    </span>
                                    <span className="font-black text-rose-600 text-sm">
                                      {formatCurrency(valorComMultaCalculado)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-rose-500 font-semibold block">
                                    +{multaAtraso}% multa + {jurosDia}%/dia ({diasAtraso}d atraso)
                                  </span>
                                </div>
                              );
                            }

                            if (cob.status === 'pago') {
                              return (
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-emerald-600 text-sm">
                                    {formatCurrency(cob.valor_com_multa || cob.valor_original)}
                                  </span>
                                  {cob.data_pagamento && (
                                    <span className="text-[10px] text-emerald-700 font-semibold">
                                      Pago em {formatDate(cob.data_pagamento)}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div className="font-extrabold text-slate-900 text-sm">
                                {formatCurrency(cob.valor_original)}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Ações (Requisitos 1, 4 e 7) */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {cob.status !== 'pago' ? (
                              <>
                                {/* Integração Real wa.me: Enviar no WhatsApp */}
                                {inq && (
                                  <a
                                    href={createWhatsAppUrl(
                                      inq.whatsapp_inquilino,
                                      getManualReminderText(cob)
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                                    title="Abrir WhatsApp com cobrança e Pix"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Enviar no WhatsApp
                                  </a>
                                )}

                                {/* Marcar como Pago */}
                                <button
                                  onClick={() => setSelectedCobForPayment(cob)}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Marcar Pago
                                </button>
                              </>
                            ) : (
                              /* Gerar Recibo em PDF */
                              <button
                                onClick={() => {
                                  if (inq && imo) {
                                    generateReceiptPDF(cob, inq, imo, profile);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                Recibo PDF
                              </button>
                            )}

                            {/* Ver Fatura Online */}
                            <button
                              onClick={() => navigate('/fatura', { id: cob.id })}
                              title="Ver Fatura / Link do Inquilino"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {selectedCobForPayment && (
        <PaymentModal
          cobranca={selectedCobForPayment}
          inquilino={inquilinosMap.get(selectedCobForPayment.inquilino_id)}
          imovel={imoveisMap.get(
            inquilinosMap.get(selectedCobForPayment.inquilino_id)?.imovel_id || ''
          )}
          profile={profile}
          onClose={() => setSelectedCobForPayment(null)}
          onConfirm={markCobrancaPaid}
        />
      )}

      {/* Modal de Lembrete Manual de Cobrança */}
      {manualReminderCob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setManualReminderCob(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Enviar Lembrete Manual</h3>
              <p className="text-xs text-slate-300">
                Dispare a mensagem educada com a chave Pix diretamente no WhatsApp do inquilino.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed font-sans">
                {getManualReminderText(manualReminderCob)}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getManualReminderText(manualReminderCob));
                    setCopiedManual(true);
                    setTimeout(() => setCopiedManual(false), 2000);
                  }}
                  className="flex-1 py-3 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
                >
                  {copiedManual ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedManual ? 'Copiado!' : 'Copiar Texto'}
                </button>

                {(() => {
                  const inq = inquilinosMap.get(manualReminderCob.inquilino_id);
                  const msg = getManualReminderText(manualReminderCob);
                  const waUrl = inq ? createWhatsAppUrl(inq.whatsapp_inquilino, msg) : '#';

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Abrir no WhatsApp
                    </a>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
