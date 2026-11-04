import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Users,
  Receipt,
  Settings,
  LogOut,
  Sparkles,
  Play,
  Menu,
  X,
  CreditCard,
  Building2,
  Database,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    profile,
    currentRoute,
    navigate,
    logout,
    runCronManual,
    supabaseConnected,
    resetToDemoData,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);

  const isAuth = !!user;
  const isPublicPage = (!isAuth && currentRoute === '/') || currentRoute === '/landing' || currentRoute === '/login' || currentRoute === '/cadastro' || currentRoute === '/fatura' || currentRoute === '/confirmar-email' || currentRoute === '/recuperar-senha' || currentRoute === '/redefinir-senha';

  const handleCronClick = async () => {
    setCronRunning(true);
    await runCronManual();
    setTimeout(() => setCronRunning(false), 800);
  };

  // Se estiver na tela de fatura pública, exibe um header minimalista
  if (currentRoute === '/fatura') {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200">
              AF
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">Aluguel Fácil</span>
              <span className="text-xs text-emerald-600 font-medium ml-2 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Fatura Oficial
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            Painel do Locador <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
    );
  }

  // Header público para a Landing Page e Auth
  if (!isAuth || isPublicPage) {
    return (
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Aluguel<span className="text-indigo-600">Fácil</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-slate-200 px-2 py-0.5 rounded-md">
                  Pix & Zap
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
                Cobrança Automática de Aluguéis
              </p>
            </div>
          </div>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#como-funciona" className="hover:text-indigo-600 transition-colors">
              Como Funciona
            </a>
            <a href="#vantagens" className="hover:text-indigo-600 transition-colors">
              Vantagens
            </a>
            <a href="#planos" className="hover:text-indigo-600 transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuth ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
              >
                <span>Acessar Meu Painel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => navigate('/cadastro')}
                  className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300 transition-all active:scale-[0.98]"
                >
                  Começar Grátis por 7 dias
                </button>
              </>
            )}
          </div>

          {/* Botão Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Como Funciona
            </a>
            <a
              href="#planos"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Planos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700"
            >
              Perguntas Frequentes
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Já tenho conta
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/cadastro');
                }}
                className="w-full text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow"
              >
                Testar Grátis 7 dias
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Header do Painel do Locador (Estilo Linear + Nubank limpo, sem barra lateral pesada)
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
      {/* Barra superior de status e ações rápidas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-900/50">
              <Building2 className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">Aluguel Fácil</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  Locador Ativo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal truncate max-w-[180px] sm:max-w-none">
                {profile.nome || 'Meu Painel'} • Pix: {profile.chave_pix_dono || 'Cadastrar Pix'}
              </p>
            </div>
          </div>

          {/* Navegação Principal em Abas (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute === '/dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Home className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => navigate('/inquilinos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute === '/inquilinos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Inquilinos
            </button>
            <button
              onClick={() => navigate('/cobrancas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute === '/cobrancas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Cobranças
            </button>
            <button
              onClick={() => navigate('/configuracoes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute === '/configuracoes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
            <button
              onClick={() => navigate('/planos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRoute === '/planos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Planos (7d Grátis)
            </button>
            <button
              onClick={() => navigate('/landing')}
              title="Ver página inicial de apresentação do Aluguel Fácil"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
            >
              Ver Site
            </button>
          </nav>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão de Testar Cron 08:00 */}
            <button
              onClick={handleCronClick}
              title="Simular disparo automático das 08:00 de Brasília"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
            >
              <Play className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
              Simular Cron 08:00
            </button>

            {/* Status do Supabase */}
            <div
              title={supabaseConnected ? 'Conectado ao Supabase com Sucesso' : 'Modo Demonstração (Armazenamento Local Ativo)'}
              className={`hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
                supabaseConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>{supabaseConnected ? 'Supabase Conectado' : 'Modo Demo'}</span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sair da Conta"
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Menu Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile no Painel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/dashboard');
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              currentRoute === '/dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Home className="w-4 h-4" /> Visão Geral
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/inquilinos');
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              currentRoute === '/inquilinos' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> Inquilinos
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/cobrancas');
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              currentRoute === '/cobrancas' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" /> Cobranças
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/configuracoes');
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              currentRoute === '/configuracoes' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" /> Configurações
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/planos');
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
              currentRoute === '/planos' ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> Planos & Assinatura
          </button>
          <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={handleCronClick}
              className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 py-1"
            >
              <Play className="w-3.5 h-3.5" /> Executar Cron 08:00
            </button>
            <button
              onClick={resetToDemoData}
              className="text-xs text-amber-400 font-medium hover:underline"
            >
              Restaurar Demonstração
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
