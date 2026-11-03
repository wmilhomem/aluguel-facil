import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Profile, TipoMensagem } from '../types/database';
import {
  Settings,
  User,
  CreditCard,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Database,
  Save,
  RotateCcw,
  Check,
  Building,
  Key,
  ExternalLink,
  Loader2,
  QrCode,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { createStripeCheckoutSession, createStripePortalSession, STRIPE_PLANS } from '../lib/stripe';

export const ConfiguracoesView: React.FC = () => {
  const {
    user,
    profile,
    templates,
    updateProfile,
    updateTemplate,
    resetToDemoData,
    saveSupabaseSettings,
    supabaseConnected,
    showToast,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'perfil' | 'templates' | 'plano' | 'supabase'>('perfil');
  const [portalLoading, setPortalLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Form Perfil & Pix
  const [nome, setNome] = useState(profile.nome || '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp_dono || '');
  const [chavePix, setChavePix] = useState(profile.chave_pix_dono || '');
  const [tipoChave, setTipoChave] = useState<Profile['tipo_chave_pix']>(profile.tipo_chave_pix || 'CPF');
  const [cidadePix, setCidadePix] = useState(profile.cidade_pix || 'GOIANIA');
  const [perfilSaved, setPerfilSaved] = useState(false);

  // Templates
  const [tplLembrete, setTplLembrete] = useState(
    templates.find((t) => t.tipo === 'lembrete_3_dias')?.texto || ''
  );
  const [tplHoje, setTplHoje] = useState(
    templates.find((t) => t.tipo === 'vencimento_hoje')?.texto || ''
  );
  const [tplAtraso1, setTplAtraso1] = useState(
    templates.find((t) => t.tipo === 'atraso_1_dia')?.texto || ''
  );
  const [tplAtraso5, setTplAtraso5] = useState(
    templates.find((t) => t.tipo === 'atraso_5_dias')?.texto || ''
  );
  const [templatesSaved, setTemplatesSaved] = useState(false);

  // Supabase
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('aluguel_facil_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('aluguel_facil_supabase_key') || ''
  );

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      nome,
      whatsapp_dono: whatsapp,
      chave_pix_dono: chavePix,
      tipo_chave_pix: tipoChave,
      cidade_pix: cidadePix.trim().toUpperCase(),
    });
    setPerfilSaved(true);
    setTimeout(() => setPerfilSaved(false), 2500);
  };

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTemplate('lembrete_3_dias', tplLembrete);
    await updateTemplate('vencimento_hoje', tplHoje);
    await updateTemplate('atraso_1_dia', tplAtraso1);
    await updateTemplate('atraso_5_dias', tplAtraso5);
    setTemplatesSaved(true);
    setTimeout(() => setTemplatesSaved(false), 2500);
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      await saveSupabaseSettings(supabaseUrl, supabaseKey);
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
          'Configure a Edge Function create-portal-session e sua STRIPE_SECRET_KEY para abrir o autoatendimento oficial.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Erro ao abrir portal', err.message || 'Falha na conexão', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

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
        window.location.href = res.url;
        return;
      }

      if (res.error === 'STRIPE_FUNCTION_NOT_DEPLOYED') {
        const proceedSim = window.confirm(
          `Simulação Stripe Checkout:\n\n` +
          `A Edge Function 'create-stripe-checkout' será acionada assim que você configurar a variável STRIPE_SECRET_KEY no Supabase.\n\n` +
          `Deseja simular a ativação imediata do ${plan.name} para testes no navegador?`
        );
        if (proceedSim) {
          await updateProfile({
            plano: plan.id === 'individual' ? '1_imovel' : plan.id === 'profissional' ? 'ate_10_imoveis' : 'ate_3_imoveis',
            plano_nome: plan.id,
            plano_status: 'ativo',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          showToast('Plano ativado em modo teste!', `Você agora está no ${plan.name}.`, 'success');
        }
      } else {
        showToast('Erro no Checkout', res.error || 'Verifique as chaves do Stripe.', 'error');
      }
    } catch (err: any) {
      showToast('Falha na conexão', err.message || 'Erro ao conectar com Stripe.', 'error');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-black tracking-tight text-white">Configurações do Sistema</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personalize sua chave Pix, templates de WhatsApp das cobranças e conexão do banco de dados.
          </p>

          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'perfil'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Meus Dados & Pix
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Templates de WhatsApp
            </button>
            <button
              onClick={() => setActiveTab('plano')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'plano'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Meu Plano & Assinatura
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'supabase'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Conexão Supabase
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        {/* ABA 1: MEUS DADOS E PIX */}
        {activeTab === 'perfil' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Dados do Locador e Chave Pix de Recebimento
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Essa chave Pix será inserida automaticamente nas faturas e mensagens enviadas no WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSavePerfil} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Seu Nome / Nome de Exibição
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Seu WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Chave Pix
                  </label>
                  <select
                    value={tipoChave}
                    onChange={(e) => setTipoChave(e.target.value as Profile['tipo_chave_pix'])}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  >
                    <option value="CPF">CPF</option>
                    <option value="Telefone">Celular</option>
                    <option value="Email">Email</option>
                    <option value="Aleatória">Chave Aleatória</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chave Pix para Recebimento
                  </label>
                  <input
                    type="text"
                    required
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Sua chave Pix cadastrada no banco"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cidade do Recebedor (Para Pix EMV BR Code)
                </label>
                <input
                  type="text"
                  required
                  value={cidadePix}
                  onChange={(e) => setCidadePix(e.target.value)}
                  placeholder="Ex: GOIANIA, SAO PAULO, BRASILIA..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Exigido pelo Banco Central no padrão BR Code para validação em aplicativos bancários.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {perfilSaved ? 'Dados Salvos com Sucesso!' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ABA 2: TEMPLATES DE WHATSAPP */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Templates das 4 Mensagens de Cobrança
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Variáveis disponíveis para uso:{' '}
                <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono text-[11px]">
                  {'{{nome}}'}, {'{{valor}}'}, {'{{pix}}'}, {'{{endereco}}'}, {'{{vencimento}}'}, {'{{link}}'}
                </code>
              </p>
            </div>

            <form onSubmit={handleSaveTemplates} className="space-y-6">
              {/* Template 1 */}
              <div>
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                  1. Lembrete 3 Dias Antes (lembrete_3_dias)
                </label>
                <textarea
                  rows={3}
                  value={tplLembrete}
                  onChange={(e) => setTplLembrete(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none leading-relaxed"
                />
              </div>

              {/* Template 2 */}
              <div>
                <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                  2. Vencimento no Dia de Hoje (vencimento_hoje)
                </label>
                <textarea
                  rows={3}
                  value={tplHoje}
                  onChange={(e) => setTplHoje(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none leading-relaxed"
                />
              </div>

              {/* Template 3 */}
              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                  3. Atraso de 1 Dia - Com Multa e Juros (atraso_1_dia)
                </label>
                <textarea
                  rows={3}
                  value={tplAtraso1}
                  onChange={(e) => setTplAtraso1(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none leading-relaxed"
                />
              </div>

              {/* Template 4 */}
              <div>
                <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1">
                  4. Atraso Crítico de 5 Dias (atraso_5_dias)
                </label>
                <textarea
                  rows={3}
                  value={tplAtraso5}
                  onChange={(e) => setTplAtraso5(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {templatesSaved ? 'Templates Atualizados!' : 'Salvar Novos Templates'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ABA 3: MEU PLANO E ASSINATURA */}
        {activeTab === 'plano' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-8">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Seu Plano e Assinatura Stripe
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gerencie cobrança recorrente via Cartão, Pix ou Boleto no Stripe.
                </p>
              </div>

              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>Gerenciar Assinatura e Pagamentos</span>
              </button>
            </div>

            {/* Status Atual do Plano */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      profile.plano_status === 'ativo'
                        ? 'bg-emerald-500 text-white'
                        : profile.plano_status === 'cancelado' || profile.plano_status === 'inativo'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {profile.plano_status === 'ativo'
                      ? 'Assinatura Ativa'
                      : profile.plano_status === 'cancelado'
                      ? 'Assinatura Cancelada'
                      : profile.plano_status === 'inativo'
                      ? 'Pagamento Pendente'
                      : 'Aguardando Ativação'}
                  </span>
                  <span className="text-xs text-slate-300">
                    ID Stripe: <code className="text-indigo-300 font-mono">{profile.stripe_customer_id || 'Não vinculado'}</code>
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mt-2">
                  {profile.plano_nome === 'individual'
                    ? 'Plano Individual (1 Imóvel)'
                    : profile.plano_nome === 'profissional'
                    ? 'Plano Profissional (Até 10 Imóveis)'
                    : 'Plano Intermediário (Até 3 Imóveis)'}
                </h3>
                <p className="text-xs text-slate-300">
                  Assinatura recorrente mensal com Pix, Cartão ou Boleto sem fidelidade
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => navigate('/planos')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ver Todos os Planos</span>
                </button>
              </div>
            </div>

            {/* Os 3 Planos Disponíveis */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Alterar ou Escolher Plano Stripe
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STRIPE_PLANS.map((plan) => {
                  const isCurrent = (profile.plano_nome || 'intermediario') === plan.id;
                  const isLoading = loadingPlan === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        plan.popular
                          ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{plan.name}</span>
                          {plan.popular && (
                            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                              Mais Popular
                            </span>
                          )}
                        </div>

                        <div className="mt-2 mb-3">
                          <span className="text-2xl font-black text-slate-900">R$ {plan.priceMonthly}</span>
                          <span className="text-xs text-slate-500">/mês</span>
                        </div>

                        <p className="text-xs text-slate-500 mb-4">{plan.description}</p>
                      </div>

                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isLoading}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : plan.popular
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>{isCurrent ? 'Plano Atual' : 'Assinar com Stripe'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Restaurar Dados de Demonstração
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recarrega os imóveis, inquilinos e faturas padrão da Dona Maria Helena.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Restaurar os dados de exemplo padrão?')) {
                    resetToDemoData();
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Demonstração
              </button>
            </div>
          </div>
        )}

        {/* ABA 4: CONEXÃO SUPABASE */}
        {activeTab === 'supabase' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Conectar ao seu Próprio Supabase
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                O app já funciona 100% no navegador. Se desejar salvar os dados no seu próprio banco de dados Supabase na nuvem, cole suas credenciais abaixo:
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
                supabaseConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>
                Status atual:{' '}
                <strong>
                  {supabaseConnected
                    ? 'Conectado a projeto Supabase Real'
                    : 'Modo Demonstração (Armazenamento Local Ativo e 100% Funcional)'}
                </strong>
              </span>
            </div>

            <form onSubmit={handleSaveSupabase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  Salvar Credenciais e Conectar
                </button>
              </div>
            </form>

            {/* Guia RLS & Cron das 08:00 (11:00 UTC) */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Segurança RLS e Automação pg_cron (08:00 BRT)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Para ativar a rotina diária 100% no servidor (sem depender de ninguém abrir o navegador) e travar os dados com RLS absoluto entre locadores, execute no SQL Editor do Supabase:
              </p>

              <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px] leading-relaxed relative">
                <div className="text-emerald-400 font-bold mb-2">
                  -- 1. Agendamento do Cron das 08:00 BRT (11:00 UTC):
                </div>
                <pre className="text-slate-300 overflow-x-auto whitespace-pre">
{`SELECT cron.schedule('rotina-0800', '0 11 * * *', $$
  SELECT net.http_post(
    url := 'https://SEU_PROJETO.supabase.co/functions/v1/rotina-cobranca-diaria',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
$$);`}
                </pre>
                <div className="text-indigo-400 font-bold mt-3 mb-1">
                  -- 2. RLS Travado em Todas as Tabelas:
                </div>
                <pre className="text-slate-300 overflow-x-auto whitespace-pre">
{`ALTER TABLE inquilinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donos so veem seus dados" ON inquilinos 
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donos so veem suas cobrancas" ON cobrancas 
  FOR ALL USING (auth.uid() = user_id);`}
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Arquivo completo disponível em: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">/supabase_schema.sql</code></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
