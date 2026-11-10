import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/billingEngine';
import { generateContractPDF } from '../lib/pdfGenerator';
import { TenantModal } from '../components/TenantModal';
import { ImovelModal } from '../components/ImovelModal';
import { PlanLimitModal } from '../components/PlanLimitModal';
import { SubscriptionBlockedModal } from '../components/SubscriptionBlockedModal';
import { canAddProperty, isAccessBlocked } from '../lib/stripe';
import { Inquilino, Imovel } from '../types/database';
import {
  Users,
  Plus,
  FileText,
  Trash2,
  Edit,
  Building,
  Calendar,
  DollarSign,
  Percent,
  Search,
  MessageCircle,
  Sparkles,
  Home,
  CheckCircle2,
} from 'lucide-react';

export const InquilinosView: React.FC = () => {
  const {
    inquilinos,
    imoveis,
    cobrancas,
    profile,
    addInquilino,
    updateInquilino,
    deleteInquilino,
    addImovel,
    deleteImovel,
    navigate,
  } = useApp();

  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [editingInquilino, setEditingInquilino] = useState<Inquilino | null>(null);
  const [imovelModalOpen, setImovelModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inquilinos' | 'imoveis'>('inquilinos');

  // Limites de Plano e Bloqueio Stripe
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState('');
  const [limitModalPrice, setLimitModalPrice] = useState(47);

  const accessBlocked = isAccessBlocked(profile);

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

  const imoveisMap = new Map<string, Imovel>(imoveis.map((i) => [i.id, i]));

  const filteredInquilinos = inquilinos.filter((inq) => {
    const imovel = imoveisMap.get(inq.imovel_id);
    const search = searchTerm.toLowerCase();
    return (
      inq.nome_inquilino.toLowerCase().includes(search) ||
      inq.whatsapp_inquilino.includes(search) ||
      (imovel?.apelido_imovel.toLowerCase() || '').includes(search)
    );
  });

  const handleEdit = (inq: Inquilino) => {
    setEditingInquilino(inq);
    setTenantModalOpen(true);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Deseja realmente remover o inquilino "${nome}" e suas 12 cobranças?`)) {
      await deleteInquilino(id);
    }
  };

  const handleDeleteImovel = async (id: string, apelido: string) => {
    if (confirm(`Remover o imóvel "${apelido}"? Isso também removerá os inquilinos vinculados.`)) {
      await deleteImovel(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Inquilinos e Imóveis
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Ao cadastrar um inquilino, o sistema gera automaticamente 12 meses de cobrança no banco de dados.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleOpenAddImovel}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Building className="w-4 h-4 text-indigo-300" />
                <span>+ Imóvel</span>
              </button>
              <button
                onClick={() => {
                  setEditingInquilino(null);
                  setTenantModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-950 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Inquilino</span>
              </button>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab('inquilinos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inquilinos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Inquilinos ({inquilinos.length})
            </button>
            <button
              onClick={() => setActiveTab('imoveis')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'imoveis'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Imóveis e Kitnets ({imoveis.length})
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        {activeTab === 'inquilinos' ? (
          <div>
            {/* Barra de Pesquisa */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, WhatsApp ou kitnet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <span className="text-xs font-semibold text-slate-500">
                Mostrando {filteredInquilinos.length} de {inquilinos.length} inquilinos
              </span>
            </div>

            {/* Grid de Cards de Inquilinos */}
            {filteredInquilinos.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Nenhum inquilino cadastrado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Clique no botão abaixo para cadastrar seu primeiro inquilino e iniciar a automação.
                </p>
                <button
                  onClick={() => {
                    setEditingInquilino(null);
                    setTenantModalOpen(true);
                  }}
                  className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow transition-all"
                >
                  Cadastrar Inquilino Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredInquilinos.map((inq) => {
                  const imovel = imoveisMap.get(inq.imovel_id);
                  const totalCob = cobrancas.filter((c) => c.inquilino_id === inq.id).length;
                  const cobPagas = cobrancas.filter(
                    (c) => c.inquilino_id === inq.id && c.status === 'pago'
                  ).length;

                  return (
                    <div
                      key={inq.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                              {inq.nome_inquilino}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <Building className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="font-semibold text-slate-700">
                                {imovel?.apelido_imovel || 'Imóvel'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              inq.ativo
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {inq.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        {/* Dados Detalhados */}
                        <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 text-slate-500">
                              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Valor Aluguel:
                            </span>
                            <span className="font-black text-slate-900 text-sm">
                              {formatCurrency(inq.valor_aluguel)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Dia Vencimento:
                            </span>
                            <span className="font-bold text-slate-800">Dia {inq.dia_vencimento}</span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 text-slate-500">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp:
                            </span>
                            <span className="font-medium text-slate-700 font-mono">
                              {inq.whatsapp_inquilino}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Percent className="w-3.5 h-3.5 text-slate-400" /> Multa & Juros:
                            </span>
                            <span className="font-medium text-slate-700">
                              {inq.multa_atraso}% + {inq.juros_dia}%/dia
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-600 pt-1">
                            <span className="text-slate-500">Cobranças Geradas:</span>
                            <span className="font-bold text-indigo-600">
                              {cobPagas}/{totalCob} pagas
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="pt-4 space-y-2">
                        {/* Botão Gerar Contrato Simples PDF (Requisito 8) */}
                        <button
                          onClick={() => {
                            if (imovel) {
                              generateContractPDF(inq, imovel, profile);
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Gerar Contrato Simples (PDF)</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(inq)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(inq.id, inq.nome_inquilino)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Excluir inquilino"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Aba de Imóveis */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {imoveis.map((imo) => {
                const qtdInq = inquilinos.filter((i) => i.imovel_id === imo.id).length;
                return (
                  <div
                    key={imo.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <Building className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">{imo.apelido_imovel}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{imo.endereco}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        {qtdInq} inquilino(s) vinculado(s)
                      </span>
                      <button
                        onClick={() => handleDeleteImovel(imo.id, imo.apelido_imovel)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remover imóvel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {tenantModalOpen && (
        <TenantModal
          inquilinoParaEditar={editingInquilino}
          imoveis={imoveis}
          onClose={() => {
            setTenantModalOpen(false);
            setEditingInquilino(null);
          }}
          onSave={async (data) => {
            if (editingInquilino) {
              await updateInquilino(editingInquilino.id, data);
            } else {
              await addInquilino(data);
            }
          }}
          onOpenNewImovelModal={() => {
            setTenantModalOpen(false);
            handleOpenAddImovel();
          }}
        />
      )}

      {/* Modal de Bloqueio por Inadimplência ou Fim do Trial */}
      <SubscriptionBlockedModal isOpen={accessBlocked} />

      {/* Modal de Limite de Imóveis do Plano */}
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
          }}
        />
      )}
    </div>
  );
};
