import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Lock, Mail, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { GoogleIcon } from '../components/GoogleIcon';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, navigate, resetToDemoData } = useApp();
  const [email, setEmail] = useState('maria.locadora@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha no login';
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
          <h2 className="text-2xl font-bold tracking-tight">Acesse seu Painel</h2>
          <p className="text-xs text-slate-300 mt-1">
            Cobrança de aluguéis e faturas no WhatsApp
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Botão Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>{googleLoading ? 'Conectando ao Google...' : 'Fazer Login com o Google'}</span>
          </button>

          {/* Divisor */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                ou com email e senha
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Senha
              </label>
              <a href="#" className="text-xs text-indigo-600 font-semibold hover:underline">
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Botão Acesso Rápido Demo */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                resetToDemoData();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Entrar como Locador Modelo (Dona Maria)
            </button>
          </div>

          {/* Link para Cadastro */}
          <div className="text-center pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Ainda não tem conta? </span>
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Cadastre-se grátis
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

