import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  formatDate,
  getMonthName,
  getDaysDifference,
  createWhatsAppUrl,
  renderTemplate,
  getDefaultTemplateText,
  buildPublicInvoiceUrl,
} from '../lib/billingEngine';
import { generateContractPDF } from '../lib/pdfGenerator';
import { WhatsAppQueueCard } from '../components/WhatsAppQueueCard';
import { TenantModal } from '../components/TenantModal';
import { ImovelModal } from '../components/ImovelModal';
import { PaymentModal } from '../components/PaymentModal';
import { SubscriptionBlockedModal } from '../components/SubscriptionBlockedModal';
import { PlanLimitModal } from '../components/PlanLimitModal';
import { isAccessBlocked, canAddProperty, getTrialDaysRemaining } from '../lib/stripe';
import { Inquilino, Cobranca, Imovel } from '../types/database';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building,
  Plus,
  Play,
  Clock,
  Sparkles,
  FileText,
  MessageCircle,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Zap,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    profile,
    imoveis,
    inquilinos,
    cobrancas,
    templates,
    filaEnvio,
    cronLastRun,
    stats,
    navigate,
    addInquilino,
    addImovel,
    markCobrancaPaid,
    runCronManual,
  } = useApp();

  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [imovelModalOpen, setImovelModalOpen] = useState(false);
  const [paymentModalCob, setPaymentModalCob] = useState<Cobranca | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');
  const [cronRunning, setCronRunning] = useState(false);

  // Controle de Bloqueio Stripe e Limite de Imóveis
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState('');
  const [limitModalPrice, setLimitModalPrice] = useState(47);

  const accessBlocked = isAccessBlocked(profile);
  const isTrial = profile.plano_status === 'trial' || (!profile.plano_status && !profile.stripe_subscription_id);
  const trialDaysRemaining = getTrialDaysRemaining(profile);

  const handleOpenAddImovel = () => {
    const check = canAddProperty(profile, imoveis.length);
    if (!check.allowed) {
      setLimitModalMessage(check.message);
      setLimitModalPrice(check.nextPlanPrice || 47);
      setLimitModalOpen(true);
      return;
    }
    setImovelModalOpen(true);
  };

  // Mapeamento rápido de imóveis por ID
  const imoveisMap = new Map(imoveis.map((i) => [i.id, i]));

  // Gerador de mensagem do WhatsApp para cobrança individual
  const getWhatsAppMessageForInquilino = (cob: Cobranca, inq: Inquilino, imo?: Imovel) => {
    const faturaUrl = buildPublicInvoiceUrl(cob);
    const diffDays = getDaysDifference(cob.data_vencimento);

    let tipo: 'lembrete_3_dias' | 'vencimento_hoje' | 'atraso_1_dia' | 'atraso_5_dias' = 'vencimento_hoje';
    if (diffDays <= -3) tipo = 'lembrete_3_dias';
    else if (diffDays === 0) tipo = 'vencimento_hoje';
    else if (diffDays >= 5) tipo = 'atraso_5_dias';
    else if (diffDays >= 1) tipo = 'atraso_1_dia';

    const tpl = templates.find((t) => t.tipo === tipo)?.texto || getDefaultTemplateText(tipo);
    const diasAtraso = Math.max(0, diffDays);

    // valor_com_multa = valor_original * (1 + multa_atraso/100 + (juros_dia/100 * dias_atrasado))
    const valorAtualizado =
      diasAtraso > 0
        ? Number((cob.valor_original * (1 + inq.multa_atraso / 100 + (inq.juros_dia / 100) * diasAtraso)).toFixed(2))
        : cob.valor_original;

    return renderTemplate(tpl, {
      nome: inq.nome_inquilino,
      valor: formatCurrency(valorAtualizado),
      pix: profile.chave_pix_dono || 'Chave Pix a definir',
      endereco: imo?.apelido_imovel || 'Imóvel',
      vencimento: formatDate(cob.data_vencimento),
      mes: getMonthName(cob.mes_referencia),
      link: faturaUrl,
    });
  };

  // Determina o status consolidado de cada inquilino no mês atual
  const inquilinosWithStatus = inquilinos.map((inq) => {
    // Procura cobrança ativa do inquilino (prioriza atrasado, depois pendente, depois pago)
    const cobAtiva =
      cobrancas.find((c) => c.inquilino_id === inq.id && c.status === 'atrasado') ||
      cobrancas.find((c) => c.inquilino_id === inq.id && c.status === 'pendente') ||
      cobrancas.find((c) => c.inquilino_id === inq.id);

    let statusVisual: 'pago' | 'pendente' | 'atrasado' = 'pendente';
    if (cobAtiva) {
      statusVisual = cobAtiva.status;
    }

    return {
      inquilino: inq,
      imovel: imoveisMap.get(inq.imovel_id),
      cobrancaAtual: cobAtiva,
      statusVisual,
    };
  });

  const filteredInquilinos = inquilinosWithStatus.filter((item) => {
    const matchesSearch =
      item.inquilino.nome_inquilino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.imovel?.apelido_imovel.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || item.statusVisual === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Executa o botão oficial "Simular Envio do Dia"
  const handleSimularEnvioDoDia = () => {
    setCronRunning(true);
    runCronManual();
    setTimeout(() => setCronRunning(false), 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Banner Modo Demostração */}
      {isDemoMode() && (
        <div className="bg-amber-600 text-slate-950 border-b border-amber-500 rounded-t-lg p-4 mb-6 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-lg font-medium">
              MODO DEMONSTRAÇÃO - Dados fictícios da Dona Maria Helena
            </p>
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={() => {
                  localStorage.removeItem('ALUGUEL_FACIL_FORCE_DEMO');
                  const { setUser, setProfile, setImoveis, setInquilinos, setCobrancas, setTemplates } = useApp();
                  setUser(null);
                  setProfile(createEmptyProfile());
                  setImoveis([]);
                  setInquilinos([]);
                  setCobrancas([]);
                  setTemplates([]);
                  localStorage.removeItem(STORAGE_KEYS.USER);
                  localStorage.removeItem(STORAGE_KEYS.PROFILE);
                  localStorage.removeItem(STORAGE_KEYS.IMOVEIS);
                  localStorage.removeItem(STORAGE_KEYS.INQUILINOS);
                  localStorage.removeItem(STORAGE_KEYS.COBRANCAS);
                  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
                  navigate('/');
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-slate-200 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Sair da Demo
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Banner de Boas-vindas e Status do Cron */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Olá, {profile.nome || 'Locador'}! 👋
                </h1>
                {isTrial ? (
                  <span className="text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    7 Dias Grátis ({trialDaysRemaining}d restantes)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Plano Ativo
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Suas cobranças com Pix automático estão ativas. Chave configurada:{' '}
                <strong className="text-slate-200 font-mono">{profile.chave_pix_dono || 'Cadastrar Pix'}</strong>
              </p>
            </div>

            {/* Ações do Topo: Botão Oficial "Simular Envio do Dia" e "Novo Inquilino" */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSimularEnvioDoDia}
                disabled={cronRunning}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-amber-900/40 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Zap className={`w-4 h-4 text-white ${cronRunning ? 'animate-spin' : ''}`} />
                <span>Simular Envio do Dia</span>
              </button>

              <button
                onClick={() => setTenantModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-900/50 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Inquilino</span>
              </button>
            </div>
          </div>

          {/* Mini info do Cron Diário */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Última checagem do robô das 08:00: <strong className="text-slate-200">{cronLastRun}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Fila de envio ativa ({filaEnvio.length} prontas para disparo)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6 sm:space-y-8">
        {/* Banner de Teste Grátis de 7 Dias */}
        {isTrial && (
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white border border-indigo-700/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md shadow-amber-500/20">
                <Sparkles className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Você tem 7 Dias Grátis de Acesso Total ({trialDaysRemaining} dias restantes)
                  </h2>
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Trial Ativo
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                  Cadastre seus imóveis, inquilinos e teste os envios no WhatsApp às 08:00, recibos em PDF e Faturas digitais com Pix EMV real sem pagar nada durante o teste.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => navigate('/planos')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Ver Planos & Ativar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CARDS NO TOPO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Total a Receber no Mês */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total a Receber
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(stats.totalReceber)}
              </h3>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2 flex items-center gap-1">
              <span>{stats.qtdPendentes + stats.qtdAtrasados} aluguéis em aberto</span>
            </p>
          </div>

          {/* Card 2: Recebido */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recebido no Mês
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                {formatCurrency(stats.totalRecebido)}
              </h3>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-700 font-bold">{stats.qtdPagos} quitados</span> via Pix
            </p>
          </div>

          {/* Card 3: Atrasado */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Atrasado
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                {formatCurrency(stats.totalAtrasado)}
              </h3>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2 flex items-center gap-1">
              <span className="text-rose-700 font-bold">{stats.qtdAtrasados} inquilinos</span> com multa e juros
            </p>
          </div>

          {/* Card 4: Taxa de Recebimento */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Taxa de Recebimento
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {stats.taxaRecebimento}%
              </h3>
            </div>

            {/* Barra de progresso visual estilo Nubank */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.taxaRecebimento))}%` }}
              />
            </div>
          </div>
        </div>

        {/* FILA DE ENVIO DO WHATSAPP (CRON 08:00) */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Fila de Envio do WhatsApp (Rotina Automática das 08:00)
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Cobranças verificadas hoje. Clique em "Enviar no WhatsApp" para abrir direto no app com o link wa.me e Pix!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimularEnvioDoDia}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Simular Envio do Dia
              </button>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {filaEnvio.length} pronta(s)
              </span>
            </div>
          </div>

          {filaEnvio.length === 0 ? (
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Nenhuma cobrança pendente para hoje!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Todos os inquilinos estão em dia ou não há vencimentos previstos para hoje ou nos próximos 3 dias.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filaEnvio.map((item) => (
                <WhatsAppQueueCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* LISTA DE INQUILINOS COM STATUS VISUAL E CÁLCULO AUTOMÁTICO DE ATRASO */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header da Tabela */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Lista de Inquilinos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Status: <span className="text-emerald-600 font-bold">● Verde = Pago</span>,{' '}
                <span className="text-amber-500 font-bold">● Amarela = A vencer</span>,{' '}
                <span className="text-rose-600 font-bold">● Vermelha = Atrasado (valor recalculado)</span>
              </p>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar inquilino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Seletor de status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="todos">Todos os status</option>
                <option value="pago">Somente Pagos</option>
                <option value="pendente">Somente A Vencer</option>
                <option value="atrasado">Somente Atrasados</option>
              </select>

              <button
                onClick={() => navigate('/inquilinos')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Gerenciar Todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabela Responsiva com Cálculo Automático */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Status</th>
                  <th className="py-3.5 px-4">Inquilino</th>
                  <th className="py-3.5 px-4">Imóvel</th>
                  <th className="py-3.5 px-4">Valor Aluguel</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInquilinos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum inquilino encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredInquilinos.map(({ inquilino, imovel, cobrancaAtual, statusVisual }) => {
                    // Cálculo de atraso com a fórmula solicitada:
                    // valor_com_multa = valor_original * (1 + multa_atraso/100 + (juros_dia/100 * dias_atrasado))
                    const diasAtraso = cobrancaAtual?.dias_atraso && cobrancaAtual.dias_atraso > 0
                      ? cobrancaAtual.dias_atraso
                      : cobrancaAtual
                      ? Math.max(1, getDaysDifference(cobrancaAtual.data_vencimento))
                      : 1;

                    const multaAtraso = inquilino.multa_atraso ?? 2.0;
                    const jurosDia = inquilino.juros_dia ?? 0.033;
                    const valorOriginal = cobrancaAtual?.valor_original || inquilino.valor_aluguel;

                    const valorComMultaCalculado = Number(
                      (valorOriginal * (1 + multaAtraso / 100 + (jurosDia / 100) * diasAtraso)).toFixed(2)
                    );

                    // Mensagem para Envio Real no WhatsApp wa.me
                    const msgWhatsApp = cobrancaAtual
                      ? getWhatsAppMessageForInquilino(cobrancaAtual, inquilino, imovel)
                      : `Olá, ${inquilino.nome_inquilino}! Seu aluguel de ${formatCurrency(valorOriginal)} vence em breve. Pix: ${profile.chave_pix_dono}`;
                    const waLink = createWhatsAppUrl(inquilino.whatsapp_inquilino, msgWhatsApp);

                    return (
                      <tr key={inquilino.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Status Visual */}
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          {statusVisual === 'pago' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Pago
                            </span>
                          ) : statusVisual === 'atrasado' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                              Atrasado ({diasAtraso}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              A Vencer
                            </span>
                          )}
                        </td>

                        {/* Inquilino */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{inquilino.nome_inquilino}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            {inquilino.whatsapp_inquilino}
                          </div>
                        </td>

                        {/* Imóvel */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {imovel?.apelido_imovel || 'Imóvel'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {imovel?.endereco || 'Endereço não informado'}
                          </div>
                        </td>

                        {/* Valor: Mostra original riscado e novo valor em vermelho quando atrasado */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {statusVisual === 'atrasado' ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="line-through text-slate-400 text-xs font-semibold">
                                  {formatCurrency(valorOriginal)}
                                </span>
                                <span className="text-sm font-black text-rose-600">
                                  {formatCurrency(valorComMultaCalculado)}
                                </span>
                              </div>
                              <span className="text-[10px] text-rose-500 font-semibold block">
                                +{multaAtraso}% multa + {jurosDia}%/dia ({diasAtraso}d atraso)
                              </span>
                            </div>
                          ) : statusVisual === 'pago' ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-emerald-600 text-sm">
                                {formatCurrency(cobrancaAtual?.valor_com_multa || valorOriginal)}
                              </span>
                              {cobrancaAtual?.data_pagamento && (
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  Pago em {formatDate(cobrancaAtual.data_pagamento)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatCurrency(valorOriginal)}
                            </span>
                          )}
                        </td>

                        {/* Vencimento */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-medium">
                          Dia {inquilino.dia_vencimento}
                          {cobrancaAtual && (
                            <span className="block text-[11px] text-slate-400">
                              Ref: {formatDate(cobrancaAtual.data_vencimento)}
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Integração Real wa.me: Enviar no WhatsApp */}
                            {cobrancaAtual && cobrancaAtual.status !== 'pago' && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-xs"
                                title="Abrir conversa no WhatsApp com cobrança e Pix preenchidos"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Enviar no WhatsApp
                              </a>
                            )}

                            {/* Marcar como Pago: Atualiza status e salva data_pagamento */}
                            {cobrancaAtual && cobrancaAtual.status !== 'pago' ? (
                              <button
                                onClick={async () => {
                                  const today = new Date().toISOString().split('T')[0];
                                  await markCobrancaPaid(cobrancaAtual.id, today);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
                                title="Marcar como Pago hoje e salvar data_pagamento"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Baixa Hoje
                              </button>
                            ) : null}

                            {/* Gerar Contrato Simples PDF */}
                            <button
                              onClick={() => {
                                if (imovel) {
                                  generateContractPDF(inquilino, imovel, profile);
                                }
                              }}
                              title="Baixar Contrato Simples de Locação Residencial em PDF"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              Contrato
                            </button>

                            {/* Ver Fatura */}
                            {cobrancaAtual && (
                              <button
                                onClick={() => navigate('/fatura', { id: cobrancaAtual.public_token })}
                                title="Ver Fatura Online"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Modais */}
      {tenantModalOpen && (
        <TenantModal
          imoveis={imoveis}
          onClose={() => setTenantModalOpen(false)}
          onSave={addInquilino}
          onOpenNewImovelModal={() => {
            setTenantModalOpen(false);
            handleOpenAddImovel();
          }}
        />
      )}

      {/* Modal de Bloqueio por Trial Expirado / Assinatura Inativa */}
      <SubscriptionBlockedModal isOpen={accessBlocked} />

      {/* Modal de Upsell por Limite de Imóveis */}
      <PlanLimitModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        message={limitModalMessage}
        nextPlanPrice={limitModalPrice}
      />

      {imovelModalOpen && (
        <ImovelModal
          onClose={() => setImovelModalOpen(false)}
          onSave={async (data) => {
            await addImovel(data);
            setImovelModalOpen(false);
            setTenantModalOpen(true);
          }}
        />
      )}

      {paymentModalCob && (
        <PaymentModal
          cobranca={paymentModalCob}
          inquilino={inquilinos.find((i) => i.id === paymentModalCob.inquilino_id)}
          imovel={imoveisMap.get(
            inquilinos.find((i) => i.id === paymentModalCob.inquilino_id)?.imovel_id || ''
          )}
          profile={profile}
          onClose={() => setPaymentModalCob(null)}
          onConfirm={markCobrancaPaid}
        />
      )}
    </div>
  );
};
