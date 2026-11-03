import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Profile } from '../types/database';
import {
  Building2,
  User,
  MessageCircle,
  CreditCard,
  Home,
  Users,
  DollarSign,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const { profile, completeOnboarding } = useApp();
  const [step, setStep] = useState<1 | 2>(1);

  // Passo 1: Dados do Locador e Pix
  const [nome, setNome] = useState(profile.nome || '');
  const [whatsappDono, setWhatsappDono] = useState(profile.whatsapp_dono || '');
  const [tipoChavePix, setTipoChavePix] = useState<Profile['tipo_chave_pix']>(profile.tipo_chave_pix || 'CPF');
  const [chavePix, setChavePix] = useState(profile.chave_pix_dono || '');

  // Passo 2: Primeiro Imóvel e Inquilino
  const [apelidoImovel, setApelidoImovel] = useState('Kitnet 01 - Centro');
  const [enderecoImovel, setEnderecoImovel] = useState('Rua Principal, nº 100 - Centro');
  const [nomeInquilino, setNomeInquilino] = useState('Lucas Ferreira');
  const [whatsappInquilino, setWhatsappInquilino] = useState('(62) 99876-1234');
  const [cpfInquilino, setCpfInquilino] = useState('');
  const [valorAluguel, setValorAluguel] = useState('850');
  const [diaVencimento, setDiaVencimento] = useState('10');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Máscaras de telefone
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length > 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    return formatted;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !whatsappDono.trim() || !chavePix.trim()) {
      setErrorMsg('Por favor, preencha todos os campos do Passo 1.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apelidoImovel.trim() || !nomeInquilino.trim() || !whatsappInquilino.trim()) {
      setErrorMsg('Por favor, preencha os dados do imóvel e inquilino.');
      return;
    }

    const valorNum = parseFloat(valorAluguel.replace(',', '.'));
    const diaNum = parseInt(diaVencimento, 10);

    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('Informe um valor de aluguel válido.');
      return;
    }

    if (isNaN(diaNum) || diaNum < 1 || diaNum > 28) {
      setErrorMsg('O dia de vencimento deve estar entre 1 e 28.');
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding(
        {
          nome: nome.trim(),
          whatsapp_dono: whatsappDono.trim(),
          chave_pix_dono: chavePix.trim(),
          tipo_chave_pix: tipoChavePix,
        },
        {
          apelido_imovel: apelidoImovel.trim(),
          endereco: enderecoImovel.trim(),
        },
        {
          nome_inquilino: nomeInquilino.trim(),
          whatsapp_inquilino: whatsappInquilino.trim(),
          cpf: cpfInquilino.trim() || undefined,
          valor_aluguel: valorNum,
          dia_vencimento: diaNum,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao finalizar onboarding';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Top Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Configuração Rápida em 2 Passos
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bem-vindo ao Aluguel Fácil
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Vamos preparar sua conta para você nunca mais ter que cobrar no WhatsApp manualmente.
          </p>

          {/* Stepper bar */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
                step === 1
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                1
              </span>
              Seus Dados e Pix
            </div>

            <div className="w-8 h-0.5 bg-slate-700" />

            <div
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
                step === 2
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                2
              </span>
              1º Imóvel e Inquilino
            </div>
          </div>
        </div>

        {/* Card Box */}
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            /* Passo 1 */
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Passo 1: Qual seu nome, WhatsApp e Chave Pix?
                </h3>
                <p className="text-xs text-slate-500">
                  É para essa chave Pix que os inquilinos farão as transferências mensais.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seu Nome ou Como o Inquilino Te Conhece *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dona Maria, Seu Carlos..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seu WhatsApp (para contato e alertas) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(62) 98123-4567"
                  value={whatsappDono}
                  onChange={(e) => setWhatsappDono(formatPhone(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Chave *
                  </label>
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value as Profile['tipo_chave_pix'])}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
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
                    Sua Chave Pix *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: maria.locadora@gmail.com ou CPF"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  Continuar para Passo 2 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* Passo 2 */
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Home className="w-4 h-4 text-indigo-600" />
                  Passo 2: Cadastre seu primeiro imóvel e inquilino
                </h3>
                <p className="text-xs text-slate-500">
                  Criaremos as 12 cobranças com lembretes automáticos na hora.
                </p>
              </div>

              {/* Imóvel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Apelido do Imóvel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kitnet 01 - Setor Bueno"
                    value={apelidoImovel}
                    onChange={(e) => setApelidoImovel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Endereço / Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rua T-36, nº 420"
                    value={enderecoImovel}
                    onChange={(e) => setEnderecoImovel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Inquilino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Inquilino *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lucas Ferreira"
                    value={nomeInquilino}
                    onChange={(e) => setNomeInquilino(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp do Inquilino *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(62) 99999-9999"
                    value={whatsappInquilino}
                    onChange={(e) => setWhatsappInquilino(formatPhone(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor do Aluguel (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="850.00"
                    value={valorAluguel}
                    onChange={(e) => setValorAluguel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dia de Vencimento (1 a 28) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    required
                    placeholder="Ex: 10"
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Criando Imóvel e Cobranças...' : 'Concluir e Acessar Painel'}
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
