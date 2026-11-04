import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordView: React.FC = () => {
  const { requestPasswordReset, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Digite seu e-mail.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await requestPasswordReset(email);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
        setEmail('');
        showToast('Enviamos um link para redefinir sua senha', 'Verifique seu e-mail', 'success');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao solicitar redefinição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden">
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Redefinir Senha</h2>
          <p className="text-xs text-slate-300 mt-1">Digite seu e-mail para receber um link de redefinição</p>
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
              <span>Link enviado com sucesso</span>
            </div>
          )}
          {!success && !errorMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
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