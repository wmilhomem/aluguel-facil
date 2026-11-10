import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Building2,
  Receipt,
  FileCheck2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { navigate, resetToDemoData } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedDemo, setCopiedDemo] = useState(false);

  const demoMessage = `Olá, Carlos! Tudo bem? Passando para lembrar que o aluguel da Kitnet 01 vence hoje (10/11), no valor de R$ 850,00. Chave Pix: maria.locadora@gmail.com. Link da fatura com QR Code: https://aluguelfacil.app/#fatura-22222222-2222-4222-8222-222222222222. Qualquer dúvida, estou à disposição!`;

  const handleCopyDemo = () => {
    navigator.clipboard.writeText(demoMessage);
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 2000);
  };

  const faqs = [
    {
      q: 'Preciso ter CNPJ ou ser imobiliária para usar?',
      a: 'Não! O Aluguel Fácil foi feito exclusivamente para pessoas físicas, donos de kitnets, quartos, salas ou casas que alugam direto para o inquilino sem depender de imobiliárias caras.',
    },
    {
      q: 'O dinheiro do aluguel passa pelo Aluguel Fácil?',
      a: 'Nunca! O inquilino paga diretamente na sua chave Pix pessoal ou da sua conta bancária. Não cobramos taxa percentual sobre o valor do seu aluguel.',
    },
    {
      q: 'Como o inquilino recebe a cobrança?',
      a: 'Todos os meses, o sistema calcula os vencimentos e organiza a mensagem de cobrança educada com sua chave Pix e o link da fatura/recibo. Você pode disparar com 1 clique no WhatsApp.',
    },
    {
      q: 'O sistema calcula multa e juros se o inquilino atrasar?',
      a: 'Sim, automaticamente! Se o inquilino atrasar 1 ou mais dias, o sistema já recalcula o valor exato com a multa (ex: 2%) e os juros diários (ex: 0,033%), evitando discussões e constrangimentos.',
    },
    {
      q: 'Posso cancelar a assinatura quando eu quiser?',
      a: 'Sim, sem qualquer carência, fidelidade ou taxa de cancelamento. Você pode cancelar a qualquer momento com apenas 1 clique.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill de Destaque */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Feito para quem aluga de 1 a 10 kitnets sem imobiliária
            </div>

            {/* Headline Oficial Obrigatória */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Pare de cobrar aluguel no WhatsApp.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                O Aluguel Fácil cobra por você.
              </span>
            </h1>

            {/* Subheadline Oficial Obrigatória */}
            <p className="text-base sm:text-xl text-slate-600 font-normal leading-relaxed mb-8 max-w-2xl mx-auto">
              Cadastre seu inquilino e nós enviamos a cobrança com Pix automaticamente todo mês. Chega de calote e dor de cabeça.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
              <button
                onClick={() => navigate('/cadastro')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-300 hover:shadow-xl hover:shadow-indigo-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
              >
                <span>Começar Agora</span>
                <ArrowRight className="w-5 h-5" />
              </button>
<button
  onClick={() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        alert('Não é possível ativar o modo demonstração neste ambiente.');
        return;
      }

      localStorage.setItem('ALUGUEL_FACIL_FORCE_DEMO', 'true');
      resetToDemoData();
    } catch (error) {
      console.error('Erro ao carregar demonstração:', error);
      alert('Erro ao carregar demonstração: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }}
  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2"
>
  <Zap className="w-5 h-5 text-amber-500" />
  <span>Ver Demonstração ao Vivo</span>
</button>
            </div>

            {/* Micro garantias */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem cartão para testar
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dinheiro 100% no seu Pix
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Configuração em 2 minutos
              </span>
            </div>
          </div>

          {/* Prévia Visual do Card do WhatsApp Interativo */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="bg-slate-900 rounded-3xl p-3 sm:p-5 shadow-2xl border border-slate-800">
              <div className="flex items-center justify-between pb-3 px-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    Robô das 08:00 • Notificação WhatsApp com Pix
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Cobrança Automática
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Lado Esquerdo: Mensagem no WhatsApp */}
                <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 text-slate-200 border border-slate-700/80">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">WhatsApp do Inquilino</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Hoje, 08:00</span>
                  </div>

                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-100 leading-relaxed font-sans mb-3">
                    {demoMessage}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyDemo}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedDemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedDemo ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(demoMessage)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Abrir no Zap
                    </a>
                  </div>
                </div>

                {/* Lado Direito: Fatura e Recibo Instantâneo */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Fatura Digital</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        A Vencer Hoje
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">Kitnet 01 - Setor Bueno</h4>
                    <p className="text-xs text-slate-500">Inquilino: Carlos Eduardo Santos</p>

                    <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Valor do Aluguel</span>
                        <span className="text-lg font-black text-slate-900">R$ 850,00</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">Chave Pix</span>
                        <span className="text-xs font-bold text-indigo-600 font-mono">maria.locadora@...</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/fatura', { id: '22222222-2222-4222-8222-222222222222' })}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>Simular Fatura do Inquilino com Pix QR Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-center text-slate-400 block">
                      Ao pagar, o recibo com quitação é gerado em 1 clique em PDF.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona em 3 Passos */}
      <section id="como-funciona" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
              Simplicidade Total
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Como funciona em 3 passos simples
            </h3>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Você não precisa ser expert em tecnologia. Foi desenhado para quem tem 60+ anos usar sem dificuldade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Passo 1 */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 hover:shadow-lg transition-all relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Cadastre seu Imóvel e Inquilino</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Informe o nome, o WhatsApp do inquilino, o valor do aluguel e o dia de vencimento. O sistema gera automaticamente as 12 mensalidades do ano.
              </p>
              <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Leva menos de 1 minuto
              </div>
            </div>

            {/* Passo 2 */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 hover:shadow-lg transition-all relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Cobrança Automática às 08:00</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Nosso robô verifica os vencimentos todos os dias. Envia lembrete 3 dias antes, no dia do vencimento e com multa calculada caso atrase.
              </p>
              <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tudo com sua chave Pix direta
              </div>
            </div>

            {/* Passo 3 */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 hover:shadow-lg transition-all relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Inquilino Paga e Você Dá Baixa</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Ao receber o Pix na sua conta, clique em "Marcar como Pago". O sistema gera o Recibo formal em PDF na hora para você enviar ao locatário.
              </p>
              <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Recibos e contratos em PDF
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prova Social */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">
              Quem usa recomenda
            </h2>
            <h3 className="text-3xl font-extrabold tracking-tight">
              Mais de 1.400 locadores sem imobiliária já economizam tempo e estresse
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  MH
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Maria Helena Guimarães</h4>
                  <p className="text-xs text-slate-400">Dona de 3 kitnets em Goiânia</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "Eu tinha muita vergonha de cobrar meus inquilinos todo dia 10. Sempre dava desculpa ou enrolavam. Agora com a mensagem automática e a chave Pix certinha, todos pagam em dia sem atrito!"
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                  AS
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Antônio Severino</h4>
                  <p className="text-xs text-slate-400">6 quartos de aluguel em Campinas</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "O cálculo automático de multa e juros é sensacional. Quando atrasam 2 dias, o sistema já manda o valor certinho sem eu precisar fazer conta no caderno. Valeu cada centavo!"
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                  RC
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Roberto Carvalho</h4>
                  <p className="text-xs text-slate-400">2 kitnets e 1 ponto comercial</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "Os recibos em PDF me salvaram daquele bloquinho de papel de papelaria. Meu inquilino adora receber o PDF no WhatsApp logo após pagar o Pix. Muito profissional."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos Oficiais Solicitados */}
      <section id="planos" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
              Planos Transparentes
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Preço justo que cabe no bolso de qualquer locador
            </h3>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Cancele quando quiser. Sem comissões sobre seu aluguel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano 1: R$27/mês 1 imóvel */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Individual
                </span>
                <h4 className="text-xl font-bold text-slate-900 mt-4 mb-2">1 Imóvel</h4>
                <p className="text-xs text-slate-500 mb-6">
                  Ideal para quem aluga uma kitnet, quarto ou casa de fundos.
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">R$ 27</span>
                  <span className="text-xs font-semibold text-slate-500">/mês</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700 font-medium mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> 1 imóvel cadastrado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Cobrança WhatsApp automática
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Recibos e contratos em PDF
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Cálculo automático de multa e juros
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/cadastro')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Escolher Plano 1 Imóvel
              </button>
            </div>

            {/* Plano 2: R$47/mês até 3 imóveis (Destaque Mais Popular) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-600 shadow-xl relative flex flex-col justify-between scale-105">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                Mais Escolhido por Donos de Kitnets
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                  Até 3 Imóveis
                </span>
                <h4 className="text-xl font-bold text-slate-900 mt-4 mb-2">Até 3 Imóveis</h4>
                <p className="text-xs text-slate-500 mb-6">
                  Perfeito para quem tem 2 ou 3 kitnets e quer receber pontualmente.
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-slate-900">R$ 47</span>
                  <span className="text-xs font-semibold text-slate-500">/mês</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700 font-medium mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Até 3 imóveis/inquilinos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Cobrança WhatsApp automática
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Fila das 08:00 com link wa.me
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Recibos ilimitados em PDF
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Suporte prioritário via WhatsApp
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/cadastro')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Assinar Agora
              </button>
            </div>

            {/* Plano 3: R$97/mês até 10 imóveis */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Profissional
                </span>
                <h4 className="text-xl font-bold text-slate-900 mt-4 mb-2">Até 10 Imóveis</h4>
                <p className="text-xs text-slate-500 mb-6">
                  Para proprietários de vilas, quitinetes ou pequenas galerias.
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">R$ 97</span>
                  <span className="text-xs font-semibold text-slate-500">/mês</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700 font-medium mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Até 10 imóveis/inquilinos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Todas as funções liberadas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Edição completa dos templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Exportação de dados e relatórios
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/cadastro')}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Escolher Plano 10 Imóveis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
              Tire suas dúvidas
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Perguntas Frequentes
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-900 text-base"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100 animate-in fade-in">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Banner de CTA Final */}
      <section className="py-16 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Pronto para nunca mais ter que cobrar aluguel manualmente?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-xl mx-auto">
            Comece agora mesmo. Crie sua conta em 1 minuto e automatize as cobranças dos seus inquilinos hoje.
          </p>
          <button
            onClick={() => navigate('/cadastro')}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl transition-all active:scale-[0.98] inline-flex items-center gap-2"
          >
            Começar Agora <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Vantagens */}
      <section id="vantagens" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
              Vantagens
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Benefícios de usar o Aluguel Fácil
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:bg-slate-700/90 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-3 h-3 text-indigo-300" />
                </div>
                <span className="font-medium text-slate-200">Sem imobiliárias</span>
                <span className="text-xs text-slate-400">Não depende de corretoras caras</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">O sistema gerencia tudo diretamente entre locador e inquilino.</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:bg-slate-700/90 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                </div>
                <span className="font-medium text-slate-200">Cobrança automática</span>
                <span className="text-xs text-slate-400">Robô das 08:00</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Lembretes de vencimento, cálculo de multa e juros automáticos.</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:bg-slate-700/90 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-3 h-3 text-indigo-300" />
                </div>
                <span className="font-medium text-slate-200">PDFs e Recibos</span>
                <span className="text-xs text-slate-400">Geração em segundos</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Contratos e recibos em PDF profissionais para imprimir ou enviar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer simples */}
      <footer className="bg-white border-t border-slate-200 py-10 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-800 text-sm">
            <Building2 className="w-4 h-4 text-indigo-600" /> Aluguel Fácil
          </div>
          <p>© {new Date().getFullYear()} Aluguel Fácil. Cobrança Automática de Aluguéis para Locadores Informais.</p>
          <div className="flex justify-center gap-4 pt-2 text-slate-400">
            <a href="#" className="hover:underline">Termos de Uso</a>
            <a href="#" className="hover:underline">Privacidade</a>
            <a href="#" className="hover:underline">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
