import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, CheckCircle2, XCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export const ResetPasswordView: React.FC = () => {
  const { updatePassword, navigate, user, supabaseConnected, showToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInvalidLink, setShowInvalidLink] = useState(false);

  useEffect(() => {
    // Se não há usuário conectado, o link pode estar expirado ou inválido
    if (!user) {
      setShowInvalidLink(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não conferem.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await updatePassword(password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
        showToast('Senha atualizada com sucesso', 'Sua senha foi alterada. Você será redirecionado para o painel.', 'success');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  if (showInvalidLink) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="bg-slate-900 text-white p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-indigo-200" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Link inválido ou expirado</h2>
            <p className="text-xs text-slate-300 mt-1">O link de redefinição de senha não é mais válido. <a href="/recuperar-senha" className="text-indigo-600 hover:underline">Solicite um novo link</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Redefinir Senha</h2>
          <p className="text-xs text-slate-300 mt-1">Digite uma nova senha</p>
        </div>
        <div className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Senha atualizada</span>
            </div>
          )}
          {!success && !errorMsg && !showInvalidLink && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nova senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirmar senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Atualizando...' : 'Atualizar senha'}
              </button>
            </form>
          )}
          {showInvalidLink && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Link inválido ou expirado. <a href="/recuperar-senha">Solicite um novo link</a></span>
            </div>
          )}
          <div className="text-center pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Já tem uma conta? </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Fazer login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};