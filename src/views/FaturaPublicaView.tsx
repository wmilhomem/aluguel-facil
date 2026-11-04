import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { isConnectedMode } from '../lib/runtime';
import { fetchPublicInvoice, type PublicInvoice } from '../lib/publicInvoice';
import { formatCurrency, formatDate, getMonthName, createWhatsAppUrl } from '../lib/billingEngine';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { generatePixEMV } from '../lib/pixEmv';
import QRCode from 'qrcode';
import type { Cobranca, Imovel, Inquilino, Profile } from '../types/database';
import {
  Building2,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Download,
  MessageCircle,
  QrCode,
  Calendar,
  DollarSign,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Loader2,
} from 'lucide-react';

export const FaturaPublicaView: React.FC = () => {
  const {
    cobrancas,
    inquilinos,
    imoveis,
    profile: demoProfile,
    routeParams,
    navigate,
    user,
  } = useApp();
  const connected = isConnectedMode();
  const token = routeParams.id;
  const [copiedEmv, setCopiedEmv] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [publicInvoice, setPublicInvoice] = useState<PublicInvoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(connected);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) {
      setIsLoadingInvoice(false);
      return;
    }

    let cancelled = false;
    setPublicInvoice(null);
    setIsLoadingInvoice(true);
    setLoadError(null);

    fetchPublicInvoice(token)
      .then((data) => {
        if (!cancelled) setPublicInvoice(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPublicInvoice(null);
          setLoadError(err instanceof Error ? err.message : 'Erro ao carregar fatura');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInvoice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, token]);

  const demoCobranca = cobrancas.find((c) => c.public_token === token || c.id === token);
  const demoInquilino = demoCobranca
    ? inquilinos.find((i) => i.id === demoCobranca.inquilino_id)
    : undefined;
  const demoImovel = demoInquilino
    ? imoveis.find((im) => im.id === demoInquilino.imovel_id)
    : undefined;

  const cobranca: Cobranca | undefined = connected
    ? publicInvoice
      ? {
          ...publicInvoice.cobranca,
          inquilino_id: '',
          user_id: '',
          valor_com_multa: publicInvoice.cobranca.valor_com_multa ?? undefined,
          data_pagamento: publicInvoice.cobranca.data_pagamento ?? null,
          link_comprovante: null,
        }
      : undefined
    : demoCobranca;

  const inquilino: Inquilino | undefined = connected
    ? publicInvoice
      ? {
          id: '',
          user_id: '',
          imovel_id: '',
          nome_inquilino: publicInvoice.inquilino.nome_inquilino,
          whatsapp_inquilino: '',
          valor_aluguel: publicInvoice.cobranca.valor_original,
          dia_vencimento: 1,
          data_inicio_contrato: '',
          multa_atraso: publicInvoice.inquilino.multa_atraso ?? 2,
          juros_dia: publicInvoice.inquilino.juros_dia ?? 0.033,
          ativo: true,
        }
      : undefined
    : demoInquilino;

  const imovel: Imovel | undefined = connected
    ? publicInvoice
      ? {
          id: '',
          user_id: '',
          apelido_imovel: publicInvoice.imovel.apelido_imovel,
          endereco: publicInvoice.imovel.endereco,
        }
      : undefined
    : demoImovel;

  const profile: Profile = connected
    ? {
        id: '',
        email: '',
        nome: publicInvoice?.locador.nome || 'Locador',
        whatsapp_dono: publicInvoice?.locador.whatsapp_dono || '',
        chave_pix_dono: publicInvoice?.locador.chave_pix_dono || '',
        tipo_chave_pix: 'CPF',
        cidade_pix: publicInvoice?.locador.cidade_pix || 'GOIANIA',
        plano: 'ate_3_imoveis',
        onboarding_concluido: true,
      }
    : demoProfile;

  const isPago = cobranca?.status === 'pago';
  const isAtrasado = cobranca?.status === 'atrasado';
  const valorFinal = cobranca ? (cobranca.valor_com_multa || cobranca.valor_original) : 0;

  // Geração do Payload Pix EMV Oficial (BR Code Banco Central)
  const pixEmvPayload = useMemo(() => {
    if (!profile.chave_pix_dono || !cobranca) return '';
    return generatePixEMV({
      chave: profile.chave_pix_dono,
      nomeRecebedor: profile.nome || 'LOCADOR',
      cidade: profile.cidade_pix || 'GOIANIA',
      valor: valorFinal,
      txId: `FAT${cobranca.id.slice(-6).toUpperCase()}`,
      mensagem: `Aluguel ${imovel?.apelido_imovel || 'Imovel'}`.slice(0, 35),
    });
  }, [profile.chave_pix_dono, profile.nome, profile.cidade_pix, valorFinal, cobranca?.id, imovel?.apelido_imovel]);

  // Geração do QR Code real a partir do payload EMV
  useEffect(() => {
    if (pixEmvPayload) {
      QRCode.toDataURL(pixEmvPayload, {
        width: 280,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro ao gerar QR Code Pix:', err));
    }
  }, [pixEmvPayload]);

  if (isLoadingInvoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-lg border border-slate-200">
          <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-3 animate-spin" />
          <h2 className="text-lg font-bold text-slate-800">Carregando fatura</h2>
          <p className="text-xs text-slate-500 mt-1">Validando o link seguro da sua cobrança...</p>
        </div>
      </div>
    );
  }

  if (!cobranca || !inquilino) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-lg border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Fatura não encontrada</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            {loadError
              ? 'Não foi possível validar este link agora. Tente novamente.'
              : 'O link da fatura pode ter expirado ou o token é inválido.'}
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Copia o código Pix EMV Oficial (Copia e Cola que bancos aceitam)
  const handleCopyPixEmv = async () => {
    if (!pixEmvPayload) return;
    try {
      await navigator.clipboard.writeText(pixEmvPayload);
      setCopiedEmv(true);
      setTimeout(() => setCopiedEmv(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = pixEmvPayload;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedEmv(true);
      setTimeout(() => setCopiedEmv(false), 2500);
    }
  };

  // Copia a Chave Pix Simples
  const handleCopyChaveSimples = () => {
    navigator.clipboard.writeText(profile.chave_pix_dono || '');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendProof = () => {
    const text = `Olá! Realizei o pagamento do aluguel referente a ${getMonthName(cobranca.mes_referencia)} (${imovel?.apelido_imovel}). Segue o comprovante do Pix em anexo.`;
    const waUrl = createWhatsAppUrl(profile.whatsapp_dono, text);
    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        {/* Botão Voltar para Locador */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </button>
          <span className="text-[11px] font-semibold text-slate-400">
            Fatura #{cobranca.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Card Principal da Fatura */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Status */}
          <div
            className={`p-6 text-white text-center relative ${
              isPago ? 'bg-emerald-600' : isAtrasado ? 'bg-rose-700' : 'bg-slate-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
              {isPago ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : isAtrasado ? (
                <AlertTriangle className="w-6 h-6 text-amber-200" />
              ) : (
                <Building2 className="w-6 h-6 text-indigo-200" />
              )}
            </div>

            <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-black/20">
              {isPago ? 'Fatura Quitada' : isAtrasado ? 'Pagamento em Atraso' : 'Aguardando Pagamento'}
            </span>

            {/* Valor com original riscado se atrasado */}
            <div className="mt-3 flex items-center justify-center gap-2.5">
              {isAtrasado && (
                <span className="line-through text-white/60 text-lg font-bold">
                  {formatCurrency(cobranca.valor_original)}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {formatCurrency(valorFinal)}
              </h1>
            </div>

            <p className="text-xs text-white/80 mt-1 capitalize">
              Aluguel de {getMonthName(cobranca.mes_referencia)}
            </p>
          </div>

          {/* Dados do Locador e Imóvel */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Imóvel Locado:</span>
                <span className="font-bold text-slate-900">{imovel?.apelido_imovel}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Endereço:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                  {imovel?.endereco}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Locatário:</span>
                <span className="font-semibold text-slate-800">{inquilino.nome_inquilino}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Vencimento:</span>
                <span className="font-bold text-slate-900">
                  {formatDate(cobranca.data_vencimento)}
                </span>
              </div>
            </div>

            {/* Discriminação de Valores se houver atraso */}
            {isAtrasado && cobranca.valor_com_multa && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5 text-xs">
                <span className="font-bold text-rose-900 block mb-1">
                  Detalhamento do Atraso ({cobranca.dias_atraso} dias):
                </span>
                <div className="flex justify-between text-rose-800">
                  <span>Valor Original do Aluguel:</span>
                  <span>{formatCurrency(cobranca.valor_original)}</span>
                </div>
                <div className="flex justify-between text-rose-800">
                  <span>Multa Contratual ({inquilino.multa_atraso}%):</span>
                  <span>
                    +{formatCurrency(cobranca.valor_original * (inquilino.multa_atraso / 100))}
                  </span>
                </div>
                <div className="flex justify-between text-rose-800">
                  <span>Juros de Mora ({inquilino.juros_dia}%/dia):</span>
                  <span>
                    +
                    {formatCurrency(
                      cobranca.valor_original * (inquilino.juros_dia / 100) * cobranca.dias_atraso
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-rose-200 flex justify-between font-bold text-rose-950 text-sm">
                  <span>Total Atualizado a Pagar:</span>
                  <span>{formatCurrency(valorFinal)}</span>
                </div>
              </div>
            )}

            {/* Bloco de Pagamento Pix Oficial (EMV BR Code) */}
            {!isPago ? (
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full mb-3">
                    <QrCode className="w-3.5 h-3.5" />
                    Pix Copia e Cola Oficial (BR Code EMV)
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Beneficiário: {profile.nome || 'Locador'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Valor exato cadastrado: <strong className="text-slate-800">{formatCurrency(valorFinal)}</strong>
                  </p>
                </div>

                {/* QR Code Real Escaneável */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 text-center">
                  <div className="w-48 h-48 bg-white mx-auto rounded-2xl p-3 flex items-center justify-center shadow-lg mb-3">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code Pix Oficial"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-slate-400 text-xs flex items-center justify-center">
                        Gerando QR Code...
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Abra o app do seu banco e aponte a câmera para pagar
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Compatível com Nubank, Itaú, Bradesco, Inter, BB, Caixa e todos os bancos
                  </span>
                </div>

                {/* Botão Principal: Copiar Pix Copia e Cola EMV */}
                <div className="space-y-2">
                  <button
                    onClick={handleCopyPixEmv}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                      copiedEmv
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.99]'
                    }`}
                  >
                    {copiedEmv ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedEmv ? 'Código Pix Copiado com Sucesso!' : 'Copiar Código Pix Copia e Cola'}</span>
                  </button>

                  {/* Prévia do Código EMV */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Código EMV BR Code:
                    </span>
                    <p className="font-mono text-[11px] text-slate-600 break-all line-clamp-2 select-all">
                      {pixEmvPayload || 'Gerando código EMV...'}
                    </p>
                  </div>
                </div>

                {/* Chave Pix Simples (Alternativa) */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Prefere pagar pela chave?</span>
                    <span className="font-mono font-bold text-slate-800">
                      {profile.chave_pix_dono || 'Chave a definir'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyChaveSimples}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? 'Chave copiada' : 'Copiar chave'}
                  </button>
                </div>

                {/* Botão Enviar Comprovante no WhatsApp */}
                <button
                  onClick={handleSendProof}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  Já Paguei! Enviar Comprovante no WhatsApp
                </button>
              </div>
            ) : (
              /* Se já estiver pago: Card de Quitação e Botão de Recibo em PDF */
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-emerald-950">
                  Aluguel Quitado com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  O locador confirmou o recebimento do valor de {formatCurrency(valorFinal)}. Seu recibo oficial de locação está disponível para download.
                </p>
                <button
                  onClick={() => {
                    if (imovel) {
                      generateReceiptPDF(cobranca, inquilino, imovel, profile);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Baixar Recibo em PDF
                </button>
              </div>
            )}
          </div>

          {/* Footer da Fatura */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fatura digital protegida com padrão EMV Pix pelo sistema Aluguel Fácil</span>
          </div>
        </div>
      </div>
    </div>
  );
};
