/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingView } from './views/LandingView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { OnboardingView } from './views/OnboardingView';
import { DashboardView } from './views/DashboardView';
import { InquilinosView } from './views/InquilinosView';
import { CobrancasView } from './views/CobrancasView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { PlanosView } from './views/PlanosView';
import { FaturaPublicaView } from './views/FaturaPublicaView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { ConfirmEmailView } from './views/ConfirmEmailView';
import { Toast } from './components/Toast';
import { isDemoMode } from './lib/runtime';

const MainRouter: React.FC = () => {
  const { currentRoute, user, profile, toast, hideToast } = useApp();

  // Se o usuário estiver autenticado e ainda não tiver concluído o onboarding, redireciona para onboarding.
  // A fatura pública é acessível sem sessão e não pode ser bloqueada por esse guard.
  if (
    user &&
    !profile.onboarding_concluido &&
    currentRoute !== '/onboarding' &&
    currentRoute !== '/fatura'
  ) {
    // Pular onboarding se estiver em modo demo
    if (!isDemoMode()) {
      return <OnboardingView />;
    }
  }

  // Roteador de telas
  const renderView = () => {
    switch (currentRoute) {
      case '/':
        // Se estiver autenticado, abre direto no Painel com seus 7 dias de trial e cobranças.
        // Se não estiver logado, exibe a página inicial de apresentação.
        return user ? <DashboardView /> : <LandingView />;
      case '/landing':
        return <LandingView />;
      case '/login':
        return <LoginView />;
      case '/cadastro':
        return <SignupView />;
      case '/onboarding':
        return <OnboardingView />;
      case '/dashboard':
        return <DashboardView />;
      case '/inquilinos':
        return <InquilinosView />;
      case '/cobrancas':
        return <CobrancasView />;
      case '/configuracoes':
        return <ConfiguracoesView />;
      case '/planos':
        return <PlanosView />;
      case '/fatura':
        return <FaturaPublicaView />;
      case '/recuperar-senha':
        return <ForgotPasswordView />;
      case '/redefinir-senha':
        return <ResetPasswordView />;
      case '/confirmar-email':
        return <ConfirmEmailView />;
      default:
        return user ? <DashboardView /> : <LandingView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        {renderView()}
      </main>
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
