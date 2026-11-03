import React, { useState } from 'react';
import { Inquilino, Imovel } from '../types/database';
import { X, UserPlus, Building, DollarSign, Calendar, Percent, ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
  inquilinoParaEditar?: Inquilino | null;
  imoveis: Imovel[];
  onClose: () => void;
  onSave: (data: Omit<Inquilino, 'id' | 'user_id' | 'created_at'>) => Promise<unknown>;
  onOpenNewImovelModal: () => void;
}

export const TenantModal: React.FC<Props> = ({
  inquilinoParaEditar,
  imoveis,
  onClose,
  onSave,
  onOpenNewImovelModal,
}) => {
  const isEditing = !!inquilinoParaEditar;

  const [nome, setNome] = useState(inquilinoParaEditar?.nome_inquilino || '');
  const [whatsapp, setWhatsapp] = useState(inquilinoParaEditar?.whatsapp_inquilino || '');
  const [cpf, setCpf] = useState(inquilinoParaEditar?.cpf || '');
  const [imovelId, setImovelId] = useState(inquilinoParaEditar?.imovel_id || (imoveis[0]?.id || ''));
  const [valorAluguel, setValorAluguel] = useState(
    inquilinoParaEditar ? String(inquilinoParaEditar.valor_aluguel) : '900'
  );
  const [diaVencimento, setDiaVencimento] = useState(
    inquilinoParaEditar ? String(inquilinoParaEditar.dia_vencimento) : '10'
  );
  const [dataInicio, setDataInicio] = useState(
    inquilinoParaEditar?.data_inicio_contrato || new Date().toISOString().split('T')[0]
  );
  const [multaAtraso, setMultaAtraso] = useState(
    inquilinoParaEditar ? String(inquilinoParaEditar.multa_atraso) : '2'
  );
  const [jurosDia, setJurosDia] = useState(
    inquilinoParaEditar ? String(inquilinoParaEditar.juros_dia) : '0.033'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Máscara simples de telefone celular brasileiro (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    }
    setWhatsapp(formatted);
  };

  // Máscara simples de CPF
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 3) formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length > 6) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    if (raw.length > 9) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    setCpf(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!imovelId) {
      setErrorMsg('Por favor, selecione ou cadastre um imóvel antes de salvar o inquilino.');
      return;
    }

    const diaNum = parseInt(diaVencimento, 10);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 28) {
      setErrorMsg('O dia de vencimento deve estar entre 1 e 28.');
      return;
    }

    const valorNum = parseFloat(valorAluguel.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('O valor do aluguel deve ser maior que zero.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nome_inquilino: nome.trim(),
        whatsapp_inquilino: whatsapp.trim(),
        cpf: cpf.trim() || undefined,
        imovel_id: imovelId,
        valor_aluguel: valorNum,
        dia_vencimento: diaNum,
        data_inicio_contrato: dataInicio,
        multa_atraso: parseFloat(multaAtraso.replace(',', '.')) || 2.0,
        juros_dia: parseFloat(jurosDia.replace(',', '.')) || 0.033,
        ativo: true,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar inquilino.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">
            {isEditing ? 'Editar Inquilino' : 'Novo Inquilino'}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {!isEditing
              ? 'Ao salvar, o sistema vai gerar automaticamente as próximas 12 cobranças mensais!'
              : 'Atualize os dados e regras de cobrança do locatário.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Nome e WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp com DDD *
              </label>
              <input
                type="text"
                required
                placeholder="(62) 99999-9999"
                value={whatsapp}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* CPF e Imóvel Vinculado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                CPF do Inquilino
              </label>
              <input
                type="text"
                placeholder="000.000.000-00 (p/ contrato)"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Imóvel Vinculado *
                </label>
                <button
                  type="button"
                  onClick={onOpenNewImovelModal}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  + Criar Imóvel
                </button>
              </div>
              <select
                required
                value={imovelId}
                onChange={(e) => setImovelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              >
                {imoveis.length === 0 ? (
                  <option value="">Nenhum imóvel cadastrado</option>
                ) : (
                  imoveis.map((imo) => (
                    <option key={imo.id} value={imo.id}>
                      {imo.apelido_imovel}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Valor do Aluguel e Dia de Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor do Aluguel (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="850.00"
                  value={valorAluguel}
                  onChange={(e) => setValorAluguel(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dia de Vencimento (1 a 28) *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  placeholder="Ex: 10"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Data de Início do Contrato */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Data de Início do Contrato *
            </label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Multa por Atraso e Juros ao dia */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Percent className="w-3.5 h-3.5 text-indigo-600" />
              Regras em caso de Atraso
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Multa por atraso (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={multaAtraso}
                  onChange={(e) => setMultaAtraso(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Padrão: 2%</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Juros ao dia (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={jurosDia}
                  onChange={(e) => setJurosDia(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Padrão: 0.033% ao dia</span>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                As 12 cobranças mensais serão criadas automaticamente para você com status pendente.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Inquilino' : 'Salvar & Gerar 12 Cobranças'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
