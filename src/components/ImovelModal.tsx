import React, { useState } from 'react';
import { Imovel } from '../types/database';
import { X, Building2, MapPin } from 'lucide-react';

interface Props {
  imovelParaEditar?: Imovel | null;
  onClose: () => void;
  onSave: (data: Omit<Imovel, 'id' | 'user_id' | 'created_at'>) => Promise<unknown>;
}

export const ImovelModal: React.FC<Props> = ({ imovelParaEditar, onClose, onSave }) => {
  const isEditing = !!imovelParaEditar;
  const [apelido, setApelido] = useState(imovelParaEditar?.apelido_imovel || '');
  const [endereco, setEndereco] = useState(imovelParaEditar?.endereco || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apelido.trim() || !endereco.trim()) return;

    setLoading(true);
    try {
      await onSave({
        apelido_imovel: apelido.trim(),
        endereco: endereco.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">
            {isEditing ? 'Editar Imóvel' : 'Cadastrar Imóvel / Quarto / Kitnet'}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Dê um apelido fácil para você identificar no painel e nos recibos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Apelido do Imóvel *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="Ex: Kitnet 01 - Setor Bueno, Quarto 03..."
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Como aparecerá nas cobranças e faturas do inquilino.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Endereço Completo *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="Ex: Rua T-36, nº 420 - Setor Bueno, Goiânia/GO"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

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
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar Imóvel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
