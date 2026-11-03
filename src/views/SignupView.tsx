import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Lock, Mail, User, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GoogleIcon } from '../components/GoogleIcon';

export const SignupView: React.FC = () => {
  const { signup, loginWithGoogle, navigate } = useApp();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || password.length < 6) {
      setErrorMsg('Preencha todos os campos. A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await signup(email, password, nome);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha no cadastro';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na autenticação com o Google';
      setErrorMsg(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-950">
            <Building2 className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Criar Conta</h2>
          <p className="text-xs text-slate-300 mt-1">
            Gestão automática de aluguéis e cobranças no WhatsApp.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>{googleLoading ? 'Conectando ao Google...' : 'Continuar com o Google'}</span>
          </button>

          {/* Divisor */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                ou preencha com seu email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Seu Nome Completo *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email *
            </label>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Criar Senha (mínimo 6 dígitos) *
            </label>
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Acesso imediato às cobranças automáticas</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recebimento direto na sua chave Pix</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Criando conta...' : 'Começar Configuração'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Link para Login */}
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
        </form>
        </div>
      </div>
    </div>
  );
};

