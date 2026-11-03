import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          title: 'text-emerald-300',
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/95 border-amber-500/40 text-amber-100',
          icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
          title: 'text-amber-300',
        };
      case 'error':
        return {
          bg: 'bg-rose-950/95 border-rose-500/40 text-rose-100',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          title: 'text-rose-300',
        };
      default:
        return {
          bg: 'bg-slate-900/95 border-indigo-500/40 text-slate-100',
          icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
          title: 'text-indigo-300',
        };
    }
  };

  const style = getColors();

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div
        className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 ${style.bg}`}
      >
        <div className="mt-0.5">{style.icon}</div>
        <div className="flex-1 pr-1">
          <h4 className={`text-sm font-bold ${style.title}`}>{toast.title}</h4>
          <p className="text-xs mt-0.5 leading-relaxed text-slate-200">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
