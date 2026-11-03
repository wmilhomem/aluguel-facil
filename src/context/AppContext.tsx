import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Profile,
  Imovel,
  Inquilino,
  Cobranca,
  MensagemTemplate,
  FilaEnvioItem,
  TipoMensagem,
} from '../types/database';
import {
  generate12Charges,
  runCronBillingCheck,
  getDefaultTemplateText,
  calculateUpdatedAmount,
} from '../lib/billingEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import confetti from 'canvas-confetti';

import { ToastData } from '../components/Toast';

interface AppContextType {
  // Auth & Profile
  user: { id: string; email: string } | null;
  profile: Profile;
  isLoading: boolean;
  supabaseConnected: boolean;

  // Data
  imoveis: Imovel[];
  inquilinos: Inquilino[];
  cobrancas: Cobranca[];
  templates: MensagemTemplate[];
  filaEnvio: FilaEnvioItem[];
  cronLastRun: string;

  // Toast
  toast: ToastData | null;
  showToast: (title: string, message: string, type?: ToastData['type']) => void;
  hideToast: () => void;

  // Financial Stats
  stats: {
    totalMes: number;
    totalReceber: number;
    totalRecebido: number;
    totalAtrasado: number;
    taxaRecebimento: number;
    qtdInquilinos: number;
    qtdImoveis: number;
    qtdPendentes: number;
    qtdAtrasados: number;
    qtdPagos: number;
  };

  // Navigation
  currentRoute: string;
  routeParams: Record<string, string>;
  navigate: (route: string, params?: Record<string, string>) => void;

  // Actions
  addImovel: (imovel: Omit<Imovel, 'id' | 'user_id' | 'created_at'>) => Promise<Imovel>;
  updateImovel: (id: string, data: Partial<Imovel>) => Promise<void>;
  deleteImovel: (id: string) => Promise<void>;

  addInquilino: (
    inquilino: Omit<Inquilino, 'id' | 'user_id' | 'created_at'>
  ) => Promise<Inquilino>;
  updateInquilino: (id: string, data: Partial<Inquilino>) => Promise<void>;
  deleteInquilino: (id: string) => Promise<void>;

  markCobrancaPaid: (
    cobrancaId: string,
    dataPagamento?: string,
    linkComprovante?: string
  ) => Promise<void>;
  deleteCobranca: (id: string) => Promise<void>;

  updateProfile: (data: Partial<Profile>) => Promise<void>;
  updateTemplate: (tipo: TipoMensagem, texto: string) => Promise<void>;
  runCronManual: () => { count: number; items: FilaEnvioItem[] };
  resetToDemoData: () => void;
  saveSupabaseSettings: (url: string, key: string) => Promise<void>;

  // Auth Actions
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signup: (email: string, pass: string, nome: string) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  completeOnboarding: (
    profileData: { nome: string; whatsapp_dono: string; chave_pix_dono: string; tipo_chave_pix: Profile['tipo_chave_pix'] },
    imovelData: { apelido_imovel: string; endereco: string },
    inquilinoData: {
      nome_inquilino: string;
      whatsapp_inquilino: string;
      cpf?: string;
      valor_aluguel: number;
      dia_vencimento: number;
    }
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  USER: 'aluguel_facil_user',
  PROFILE: 'aluguel_facil_profile',
  IMOVEIS: 'aluguel_facil_imoveis',
  INQUILINOS: 'aluguel_facil_inquilinos',
  COBRANCAS: 'aluguel_facil_cobrancas',
  TEMPLATES: 'aluguel_facil_templates',
  CRON_LAST_RUN: 'aluguel_facil_cron_last_run',
};

// Dados padrão iniciais (Locador informal modelo)
function getInitialSeedData() {
  const userId = 'usr_demo_dona_maria';
  const today = new Date();

  // Dias de referência relativos para garantir que os 4 gatilhos apareçam ativos hoje
  const dToday = today.getDate();
  const dayIn3 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).getDate();
  const dayPast2 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).getDate();
  const dayPast6 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).getDate();

  const profile: Profile = {
    id: userId,
    email: 'maria.locadora@gmail.com',
    nome: 'Dona Maria Helena',
    whatsapp_dono: '(62) 98123-4567',
    chave_pix_dono: 'maria.locadora@gmail.com',
    tipo_chave_pix: 'Email',
    plano: 'ate_3_imoveis',
    plano_nome: 'intermediario',
    plano_status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    onboarding_concluido: true,
    created_at: new Date().toISOString(),
  };

  const imoveis: Imovel[] = [
    {
      id: 'imo_1',
      user_id: userId,
      apelido_imovel: 'Kitnet 01 - Setor Bueno',
      endereco: 'Rua T-36, nº 420, Apt 1 - Setor Bueno, Goiânia/GO',
      created_at: new Date().toISOString(),
    },
    {
      id: 'imo_2',
      user_id: userId,
      apelido_imovel: 'Kitnet 02 - Setor Bueno',
      endereco: 'Rua T-36, nº 420, Apt 2 - Setor Bueno, Goiânia/GO',
      created_at: new Date().toISOString(),
    },
    {
      id: 'imo_3',
      user_id: userId,
      apelido_imovel: 'Quarto 01 - Vila Nova',
      endereco: 'Rua 208, nº 115 - Setor Leste Vila Nova, Goiânia/GO',
      created_at: new Date().toISOString(),
    },
  ];

  const inq1Id = 'inq_carlos';
  const inq2Id = 'inq_juliana';
  const inq3Id = 'inq_rodrigo';
  const inq4Id = 'inq_patricia';

  const inquilinos: Inquilino[] = [
    {
      id: inq1Id,
      user_id: userId,
      imovel_id: 'imo_1',
      nome_inquilino: 'Carlos Eduardo Santos',
      whatsapp_inquilino: '(62) 99123-4455',
      cpf: '345.892.101-44',
      valor_aluguel: 850.0,
      dia_vencimento: dayIn3, // Vence em 3 dias -> Lembrete 3 dias
      data_inicio_contrato: `${today.getFullYear()}-01-10`,
      multa_atraso: 2.0,
      juros_dia: 0.033,
      ativo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: inq2Id,
      user_id: userId,
      imovel_id: 'imo_2',
      nome_inquilino: 'Juliana Mendes Rocha',
      whatsapp_inquilino: '(62) 98456-7890',
      cpf: '456.123.789-22',
      valor_aluguel: 1100.0,
      dia_vencimento: dToday, // Vence hoje -> Vencimento hoje
      data_inicio_contrato: `${today.getFullYear()}-02-05`,
      multa_atraso: 2.0,
      juros_dia: 0.033,
      ativo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: inq3Id,
      user_id: userId,
      imovel_id: 'imo_3',
      nome_inquilino: 'Rodrigo Antunes Peixoto',
      whatsapp_inquilino: '(62) 99876-5432',
      cpf: '234.567.890-11',
      valor_aluguel: 650.0,
      dia_vencimento: dayPast2, // 2 dias atrasado -> Atraso 1 dia
      data_inicio_contrato: `${today.getFullYear()}-01-01`,
      multa_atraso: 2.0,
      juros_dia: 0.033,
      ativo: true,
      created_at: new Date().toISOString(),
    },
    {
      id: inq4Id,
      user_id: userId,
      imovel_id: 'imo_1',
      nome_inquilino: 'Patrícia Oliveira Lima',
      whatsapp_inquilino: '(62) 98765-4321',
      cpf: '567.890.123-99',
      valor_aluguel: 850.0,
      dia_vencimento: dayPast6, // Já pagou adiantado!
      data_inicio_contrato: `${today.getFullYear()}-01-15`,
      multa_atraso: 2.0,
      juros_dia: 0.033,
      ativo: true,
      created_at: new Date().toISOString(),
    },
  ];

  // Gera cobranças para o mês atual
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const mesRef = `${y}-${m}-01`;

  const dateDue1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  const dateDue2 = today;
  const dateDue3 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
  const dateDue4 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  const strDue1 = `${dateDue1.getFullYear()}-${String(dateDue1.getMonth() + 1).padStart(2, '0')}-${String(dateDue1.getDate()).padStart(2, '0')}`;
  const strDue2 = `${dateDue2.getFullYear()}-${String(dateDue2.getMonth() + 1).padStart(2, '0')}-${String(dateDue2.getDate()).padStart(2, '0')}`;
  const strDue3 = `${dateDue3.getFullYear()}-${String(dateDue3.getMonth() + 1).padStart(2, '0')}-${String(dateDue3.getDate()).padStart(2, '0')}`;
  const strDue4 = `${dateDue4.getFullYear()}-${String(dateDue4.getMonth() + 1).padStart(2, '0')}-${String(dateDue4.getDate()).padStart(2, '0')}`;

  const calcAtraso = calculateUpdatedAmount(650.0, 2.0, 0.033, 2);

  const cobrancas: Cobranca[] = [
    {
      id: 'cob_demo_1',
      inquilino_id: inq1Id,
      user_id: userId,
      mes_referencia: mesRef,
      data_vencimento: strDue1,
      valor_original: 850.0,
      status: 'pendente',
      dias_atraso: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cob_demo_2',
      inquilino_id: inq2Id,
      user_id: userId,
      mes_referencia: mesRef,
      data_vencimento: strDue2,
      valor_original: 1100.0,
      status: 'pendente',
      dias_atraso: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cob_demo_3',
      inquilino_id: inq3Id,
      user_id: userId,
      mes_referencia: mesRef,
      data_vencimento: strDue3,
      valor_original: 650.0,
      valor_com_multa: calcAtraso.valorFinal,
      status: 'atrasado',
      dias_atraso: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cob_demo_4',
      inquilino_id: inq4Id,
      user_id: userId,
      mes_referencia: mesRef,
      data_vencimento: strDue4,
      valor_original: 850.0,
      status: 'pago',
      data_pagamento: strDue4,
      link_comprovante: 'https://exemplo.com/comprovante_pix.png',
      dias_atraso: 0,
      created_at: new Date().toISOString(),
    },
  ];

  const templates: MensagemTemplate[] = [
    {
      id: 'tpl_1',
      user_id: userId,
      tipo: 'lembrete_3_dias',
      texto: getDefaultTemplateText('lembrete_3_dias'),
    },
    {
      id: 'tpl_2',
      user_id: userId,
      tipo: 'vencimento_hoje',
      texto: getDefaultTemplateText('vencimento_hoje'),
    },
    {
      id: 'tpl_3',
      user_id: userId,
      tipo: 'atraso_1_dia',
      texto: getDefaultTemplateText('atraso_1_dia'),
    },
    {
      id: 'tpl_4',
      user_id: userId,
      tipo: 'atraso_5_dias',
      texto: getDefaultTemplateText('atraso_5_dias'),
    },
  ];

  return {
    user: { id: userId, email: profile.email },
    profile,
    imoveis,
    inquilinos,
    cobrancas,
    templates,
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('fatura-')) return '/fatura';
      if (hash) return `/${hash}`;
    }
    return '/';
  });

  const [routeParams, setRouteParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('fatura-')) {
        initial.id = hash.replace('fatura-', '');
      }
    }
    return initial;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // States
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile>({
    id: '',
    email: '',
    nome: '',
    whatsapp_dono: '',
    chave_pix_dono: '',
    tipo_chave_pix: 'CPF',
    plano: 'ate_3_imoveis',
    onboarding_concluido: false,
  });
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [templates, setTemplates] = useState<MensagemTemplate[]>([]);
  const [cronLastRun, setCronLastRun] = useState<string>('Hoje, às 08:00 (Brasília)');
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (title: string, message: string, type: ToastData['type'] = 'info') => {
    const newToast = { id: `toast_${Date.now()}`, title, message, type };
    setToast(newToast);
    setTimeout(() => {
      setToast((current) => (current?.id === newToast.id ? null : current));
    }, 4500);
  };

  const hideToast = () => setToast(null);

  // Listen to hash changes for deep linking (e.g. #fatura-123, #planos, #cobrancas)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      // Se for retorno do OAuth do Supabase, mantém no dashboard
      if (hash.startsWith('access_token=') || hash.includes('&access_token=') || hash.startsWith('error_description=')) {
        setCurrentRoute('/dashboard');
        return;
      }
      if (hash.startsWith('fatura-')) {
        setCurrentRoute('/fatura');
        setRouteParams({ id: hash.replace('fatura-', '') });
      } else if (hash) {
        const cleanRoute = hash.split('?')[0];
        setCurrentRoute(`/${cleanRoute}`);
      }
    };

    // Executa no carregamento inicial
    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Initial Load & Hydration
  useEffect(() => {
    const initApp = async () => {
      try {
        const isConfigured = isSupabaseConfigured();
        setSupabaseConnected(isConfigured);

        const savedUserStr = localStorage.getItem(STORAGE_KEYS.USER);
        const savedProfileStr = localStorage.getItem(STORAGE_KEYS.PROFILE);

        if (savedProfileStr && savedUserStr) {
          const parsedProfile = JSON.parse(savedProfileStr);
          if (!parsedProfile.trial_ends_at) {
            parsedProfile.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          }
          if (parsedProfile.plano_status !== 'inativo' && parsedProfile.plano_status !== 'cancelado' && !parsedProfile.stripe_subscription_id) {
            parsedProfile.plano_status = 'trial';
          }
          setUser(JSON.parse(savedUserStr));
          setProfile(parsedProfile);
          setImoveis(JSON.parse(localStorage.getItem(STORAGE_KEYS.IMOVEIS) || '[]'));
          setInquilinos(JSON.parse(localStorage.getItem(STORAGE_KEYS.INQUILINOS) || '[]'));
          setCobrancas(JSON.parse(localStorage.getItem(STORAGE_KEYS.COBRANCAS) || '[]'));
          setTemplates(JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES) || '[]'));
        } else {
          // Carrega dados iniciais ricos de demonstração
          const seed = getInitialSeedData();
          setUser(seed.user);
          setProfile(seed.profile);
          setImoveis(seed.imoveis);
          setInquilinos(seed.inquilinos);
          setCobrancas(seed.cobrancas);
          setTemplates(seed.templates);

          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(seed.user));
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(seed.profile));
          localStorage.setItem(STORAGE_KEYS.IMOVEIS, JSON.stringify(seed.imoveis));
          localStorage.setItem(STORAGE_KEYS.INQUILINOS, JSON.stringify(seed.inquilinos));
          localStorage.setItem(STORAGE_KEYS.COBRANCAS, JSON.stringify(seed.cobrancas));
          localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(seed.templates));
        }

        const lastRun = localStorage.getItem(STORAGE_KEYS.CRON_LAST_RUN);
        if (lastRun) {
          setCronLastRun(lastRun);
        }

        // Se conectado ao Supabase, verifica se há sessão ativa (inclusive após OAuth do Google)
        if (isConfigured) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              const sbUser = sessionData.session.user;
              setUser({ id: sbUser.id, email: sbUser.email || '' });
            }
          } catch (e) {
            console.warn('Supabase session fetch:', e);
          }
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    // Listener para eventos de autenticação Supabase (incluindo retorno de OAuth Google)
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const sbUser = session.user;
        const userObj = { id: sbUser.id, email: sbUser.email || '' };
        setUser(userObj);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userObj));

        // Se for login recém efetuado via Google, atualiza nome do perfil se vazio
        const meta = sbUser.user_metadata || {};
        const googleName = meta.full_name || meta.name || sbUser.email?.split('@')[0] || 'Locador';
        setProfile((prev) => {
          const updated = {
            ...prev,
            id: sbUser.id,
            email: sbUser.email || prev.email,
            nome: prev.nome && prev.nome !== 'Dona Maria' ? prev.nome : googleName,
          };
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
          return updated;
        });

        if (window.location.hash.startsWith('#access_token') || event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // Sync state changes with localStorage
  useEffect(() => {
    if (!isLoading && profile.id) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEYS.IMOVEIS, JSON.stringify(imoveis));
      localStorage.setItem(STORAGE_KEYS.INQUILINOS, JSON.stringify(inquilinos));
      localStorage.setItem(STORAGE_KEYS.COBRANCAS, JSON.stringify(cobrancas));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    }
  }, [profile, imoveis, inquilinos, cobrancas, templates, isLoading]);

  // Navegação
  const navigate = (route: string, params: Record<string, string> = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);
    if (route === '/fatura' && params.id) {
      window.location.hash = `fatura-${params.id}`;
    } else if (route === '/') {
      window.location.hash = '';
    } else {
      window.location.hash = route.replace('/', '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Executa o motor de cobrança e calcula a fila de envio do WhatsApp
  const { fila: filaEnvio, cobrancasAtualizadas } = useMemo(() => {
    if (!profile.id || cobrancas.length === 0) {
      return { fila: [], cobrancasAtualizadas: cobrancas };
    }
    return runCronBillingCheck(cobrancas, inquilinos, imoveis, profile, templates);
  }, [cobrancas, inquilinos, imoveis, profile, templates]);

  // Se o cron recalculou valores com atraso, sincroniza sem loop
  useEffect(() => {
    let hasDiff = false;
    if (cobrancasAtualizadas.length === cobrancas.length) {
      for (let i = 0; i < cobrancas.length; i++) {
        if (
          cobrancas[i].status !== cobrancasAtualizadas[i].status ||
          cobrancas[i].dias_atraso !== cobrancasAtualizadas[i].dias_atraso ||
          cobrancas[i].valor_com_multa !== cobrancasAtualizadas[i].valor_com_multa
        ) {
          hasDiff = true;
          break;
        }
      }
    }
    if (hasDiff) {
      setCobrancas(cobrancasAtualizadas);
    }
  }, [cobrancasAtualizadas, cobrancas]);

  // Estatísticas Financeiras do Dashboard
  const stats = useMemo(() => {
    let totalReceber = 0;
    let totalRecebido = 0;
    let totalAtrasado = 0;
    let qtdPendentes = 0;
    let qtdAtrasados = 0;
    let qtdPagos = 0;

    // Filtra pelo mês atual
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    cobrancas.forEach((c) => {
      const isCurrentMonth = c.mes_referencia.startsWith(currentMonthKey) || c.data_vencimento.startsWith(currentMonthKey);
      
      // Consideramos as cobranças do mês corrente ou atrasadas acumuladas
      if (isCurrentMonth || c.status === 'atrasado') {
        const val = c.valor_com_multa || c.valor_original;

        if (c.status === 'pago') {
          totalRecebido += val;
          qtdPagos++;
        } else if (c.status === 'atrasado') {
          totalAtrasado += val;
          totalReceber += val;
          qtdAtrasados++;
        } else {
          totalReceber += val;
          qtdPendentes++;
        }
      }
    });

    const totalMes = totalRecebido + totalReceber;
    const taxaRecebimento = totalMes > 0 ? Math.round((totalRecebido / totalMes) * 100) : 100;

    return {
      totalMes,
      totalReceber,
      totalRecebido,
      totalAtrasado,
      taxaRecebimento,
      qtdInquilinos: inquilinos.filter((i) => i.ativo).length,
      qtdImoveis: imoveis.length,
      qtdPendentes,
      qtdAtrasados,
      qtdPagos,
    };
  }, [cobrancas, inquilinos, imoveis]);

  // CRUD Imóveis
  const addImovel = async (data: Omit<Imovel, 'id' | 'user_id' | 'created_at'>): Promise<Imovel> => {
    const newImovel: Imovel = {
      id: `imo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: profile.id || user?.id || 'usr_local',
      apelido_imovel: data.apelido_imovel,
      endereco: data.endereco,
      created_at: new Date().toISOString(),
    };

    setImoveis((prev) => [...prev, newImovel]);

    if (supabaseConnected) {
      try {
        await supabase.from('imoveis').insert([newImovel]);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    return newImovel;
  };

  const updateImovel = async (id: string, data: Partial<Imovel>): Promise<void> => {
    setImoveis((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
    if (supabaseConnected) {
      try {
        await supabase.from('imoveis').update(data).eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  const deleteImovel = async (id: string): Promise<void> => {
    setImoveis((prev) => prev.filter((item) => item.id !== id));
    // Remove também inquilinos associados
    const removedInqIds = inquilinos.filter((inq) => inq.imovel_id === id).map((i) => i.id);
    setInquilinos((prev) => prev.filter((inq) => inq.imovel_id !== id));
    setCobrancas((prev) => prev.filter((cob) => !removedInqIds.includes(cob.inquilino_id)));

    if (supabaseConnected) {
      try {
        await supabase.from('imoveis').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  // CRUD Inquilinos & Geração Automática de 12 Cobranças
  const addInquilino = async (
    data: Omit<Inquilino, 'id' | 'user_id' | 'created_at'>
  ): Promise<Inquilino> => {
    const userId = profile.id || user?.id || 'usr_local';
    const newInquilino: Inquilino = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      ...data,
      created_at: new Date().toISOString(),
    };

    // Gera AUTOMATICAMENTE as próximas 12 cobranças com status pendente
    const newCharges = generate12Charges(newInquilino, userId);

    setInquilinos((prev) => [...prev, newInquilino]);
    setCobrancas((prev) => [...prev, ...newCharges]);

    // Confetti de comemoração
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignora erro se canvas não estiver pronto
    }

    if (supabaseConnected) {
      try {
        await supabase.from('inquilinos').insert([newInquilino]);
        await supabase.from('cobrancas').insert(newCharges);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }

    return newInquilino;
  };

  const updateInquilino = async (id: string, data: Partial<Inquilino>): Promise<void> => {
    setInquilinos((prev) => prev.map((inq) => (inq.id === id ? { ...inq, ...data } : inq)));
    if (supabaseConnected) {
      try {
        await supabase.from('inquilinos').update(data).eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  const deleteInquilino = async (id: string): Promise<void> => {
    setInquilinos((prev) => prev.filter((inq) => inq.id !== id));
    setCobrancas((prev) => prev.filter((cob) => cob.inquilino_id !== id));

    if (supabaseConnected) {
      try {
        await supabase.from('inquilinos').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  // Cobranças: Marcar como pago
  const markCobrancaPaid = async (
    cobrancaId: string,
    dataPagamento?: string,
    linkComprovante?: string
  ): Promise<void> => {
    const dataEfetiva = dataPagamento || new Date().toISOString().split('T')[0];

    setCobrancas((prev) =>
      prev.map((c) =>
        c.id === cobrancaId
          ? {
              ...c,
              status: 'pago',
              data_pagamento: dataEfetiva,
              link_comprovante: linkComprovante || c.link_comprovante || null,
              dias_atraso: 0,
            }
          : c
      )
    );

    // Efeito de sucesso visual
    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.6 },
      });
    } catch {}

    const [ano, mes, dia] = dataEfetiva.split('-');
    showToast(
      'Cobrança Quitada com Sucesso!',
      `Aluguel marcado como PAGO na data ${dia}/${mes}/${ano}. Recibo disponível em PDF.`,
      'success'
    );

    if (supabaseConnected) {
      try {
        await supabase
          .from('cobrancas')
          .update({
            status: 'pago',
            data_pagamento: dataEfetiva,
            link_comprovante: linkComprovante || null,
          })
          .eq('id', cobrancaId);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  const deleteCobranca = async (id: string): Promise<void> => {
    setCobrancas((prev) => prev.filter((c) => c.id !== id));
    if (supabaseConnected) {
      try {
        await supabase.from('cobrancas').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  // Perfil e Configurações
  const updateProfile = async (data: Partial<Profile>): Promise<void> => {
    setProfile((prev) => ({ ...prev, ...data }));
    if (supabaseConnected && profile.id) {
      try {
        await supabase.from('profiles').update(data).eq('id', profile.id);
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  const updateTemplate = async (tipo: TipoMensagem, texto: string): Promise<void> => {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.tipo === tipo);
      if (exists) {
        return prev.map((t) => (t.tipo === tipo ? { ...t, texto } : t));
      }
      return [
        ...prev,
        {
          id: `tpl_${Date.now()}`,
          user_id: profile.id,
          tipo,
          texto,
        },
      ];
    });

    if (supabaseConnected && profile.id) {
      try {
        await supabase
          .from('mensagens_template')
          .upsert([{ user_id: profile.id, tipo, texto }], { onConflict: 'user_id,tipo' });
      } catch (e) {
        console.warn('Supabase sync notice:', e);
      }
    }
  };

  // Disparo manual do Cron diário das 08:00
  const runCronManual = (): { count: number; items: FilaEnvioItem[] } => {
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newCronText = `Hoje (${dateFormatted}) às ${timeFormatted} (Simulado)`;
    setCronLastRun(newCronText);
    localStorage.setItem(STORAGE_KEYS.CRON_LAST_RUN, newCronText);

    // Re-executa verificação
    const res = runCronBillingCheck(cobrancas, inquilinos, imoveis, profile, templates, now);
    setCobrancas(res.cobrancasAtualizadas);

    try {
      confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.8 },
      });
    } catch {}

    showToast(
      'Simulação do Envio do Dia Concluída!',
      `O robô das 08:00 verificou todos os vencimentos e gerou ${res.fila.length} mensagem(ns) de cobrança para envio hoje.`,
      'success'
    );

    return { count: res.fila.length, items: res.fila };
  };

  // Reset para demonstração
  const resetToDemoData = () => {
    const seed = getInitialSeedData();
    setUser(seed.user);
    setProfile(seed.profile);
    setImoveis(seed.imoveis);
    setInquilinos(seed.inquilinos);
    setCobrancas(seed.cobrancas);
    setTemplates(seed.templates);

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(seed.user));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(seed.profile));
    localStorage.setItem(STORAGE_KEYS.IMOVEIS, JSON.stringify(seed.imoveis));
    localStorage.setItem(STORAGE_KEYS.INQUILINOS, JSON.stringify(seed.inquilinos));
    localStorage.setItem(STORAGE_KEYS.COBRANCAS, JSON.stringify(seed.cobrancas));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(seed.templates));
    navigate('/dashboard');
  };

  // Salvar credenciais reais do Supabase
  const saveSupabaseSettings = async (url: string, key: string) => {
    localStorage.setItem('aluguel_facil_supabase_url', url);
    localStorage.setItem('aluguel_facil_supabase_key', key);
    window.location.reload();
  };

  // Auth: Login
  const login = async (email: string, _pass: string) => {
    try {
      if (supabaseConnected) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: _pass });
        if (error) return { error: error.message };
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || email });
        }
      } else {
        // Mock Login
        const mockUser = { id: 'usr_' + Date.now(), email };
        setUser(mockUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      }
      navigate('/dashboard');
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar login';
      return { error: message };
    }
  };

  // Auth: Cadastro
  const signup = async (email: string, _pass: string, nome: string) => {
    try {
      const newUserId = 'usr_' + Date.now();
      const newUser = { id: newUserId, email };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

      const newProfile: Profile = {
        id: newUserId,
        email,
        nome,
        whatsapp_dono: '',
        chave_pix_dono: '',
        tipo_chave_pix: 'CPF',
        plano: 'ate_3_imoveis',
        onboarding_concluido: false,
      };
      setProfile(newProfile);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));

      // Templates padrão
      const standardTemplates: MensagemTemplate[] = [
        { id: 't1', user_id: newUserId, tipo: 'lembrete_3_dias', texto: getDefaultTemplateText('lembrete_3_dias') },
        { id: 't2', user_id: newUserId, tipo: 'vencimento_hoje', texto: getDefaultTemplateText('vencimento_hoje') },
        { id: 't3', user_id: newUserId, tipo: 'atraso_1_dia', texto: getDefaultTemplateText('atraso_1_dia') },
        { id: 't4', user_id: newUserId, tipo: 'atraso_5_dias', texto: getDefaultTemplateText('atraso_5_dias') },
      ];
      setTemplates(standardTemplates);

      if (supabaseConnected) {
        await supabase.auth.signUp({
          email,
          password: _pass,
          options: { data: { nome } },
        });
      }

      // Direciona para o onboarding obrigatório
      navigate('/onboarding');
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      return { error: message };
    }
  };

  // Auth: Login com Google
  const loginWithGoogle = async () => {
    try {
      if (supabaseConnected) {
        const redirectTo = `${window.location.origin}/#dashboard`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) return { error: error.message };
        return {};
      } else {
        // Fallback para modo local / demonstração
        const demoGoogleUser = {
          id: 'usr_google_' + Date.now(),
          email: 'usuario.google@gmail.com',
        };
        setUser(demoGoogleUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoGoogleUser));

        const updatedProfile: Profile = {
          ...profile,
          id: demoGoogleUser.id,
          email: demoGoogleUser.email,
          nome: profile.nome && profile.nome !== 'Dona Maria' ? profile.nome : 'Carlos Alberto (Google)',
          onboarding_concluido: true,
        };
        setProfile(updatedProfile);
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));

        showToast(
          'Login com Google efetuado!',
          'Acesso concedido via conta Google com sucesso (Modo Demonstração).',
          'success'
        );
        navigate('/dashboard');
        return {};
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar com o Google';
      return { error: message };
    }
  };

  // Logout
  const logout = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    if (supabaseConnected) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  // Onboarding Obrigatório após cadastro
  const completeOnboarding = async (
    profileData: { nome: string; whatsapp_dono: string; chave_pix_dono: string; tipo_chave_pix: Profile['tipo_chave_pix'] },
    imovelData: { apelido_imovel: string; endereco: string },
    inquilinoData: {
      nome_inquilino: string;
      whatsapp_inquilino: string;
      cpf?: string;
      valor_aluguel: number;
      dia_vencimento: number;
    }
  ) => {
    const updatedProf: Profile = {
      ...profile,
      ...profileData,
      onboarding_concluido: true,
    };
    setProfile(updatedProf);

    // Cria o 1º imóvel
    const newImo = await addImovel(imovelData);

    // Cria o 1º inquilino e gera as 12 cobranças
    await addInquilino({
      imovel_id: newImo.id,
      nome_inquilino: inquilinoData.nome_inquilino,
      whatsapp_inquilino: inquilinoData.whatsapp_inquilino,
      cpf: inquilinoData.cpf,
      valor_aluguel: inquilinoData.valor_aluguel,
      dia_vencimento: inquilinoData.dia_vencimento,
      data_inicio_contrato: new Date().toISOString().split('T')[0],
      multa_atraso: 2.0,
      juros_dia: 0.033,
      ativo: true,
    });

    navigate('/dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        isLoading,
        supabaseConnected,
        imoveis,
        inquilinos,
        cobrancas,
        templates,
        filaEnvio,
        cronLastRun,
        toast,
        showToast,
        hideToast,
        stats,
        currentRoute,
        routeParams,
        navigate,
        addImovel,
        updateImovel,
        deleteImovel,
        addInquilino,
        updateInquilino,
        deleteInquilino,
        markCobrancaPaid,
        deleteCobranca,
        updateProfile,
        updateTemplate,
        runCronManual,
        resetToDemoData,
        saveSupabaseSettings,
        login,
        signup,
        loginWithGoogle,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
