import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastEventDetail {
  type: ToastType;
  text: string;
  duration?: number;
}

// Global utility function to trigger a toast
export function showToast(text: string, type: ToastType = 'info', duration: number = 4000) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent<ToastEventDetail>('dente-toast', {
      detail: { text, type, duration }
    });
    window.dispatchEvent(event);
  }
}

import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export function GlobalToast() {
  const [toast, setToast] = useState<ToastEventDetail | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEventDetail>;
      setToast(customEvent.detail);
      
      const duration = customEvent.detail.duration || 4000;
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, duration);
    };

    window.addEventListener('dente-toast', handleToast);
    return () => {
      window.removeEventListener('dente-toast', handleToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const bgColors = {
    error: 'bg-rose-500/90 border-rose-500/50 text-white',
    success: 'bg-emerald-500/90 border-emerald-500/50 text-white',
    warning: 'bg-amber-500/90 border-amber-500/50 text-white',
    info: 'bg-blue-500/90 border-blue-500/50 text-white'
  };
  
  const iconMap = {
    error: <AlertCircle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-xl border ${bgColors[toast.type]} animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm`}>
      {iconMap[toast.type]}
      <span className="text-sm font-medium leading-tight">{toast.text}</span>
      <button type="button" onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity" aria-label="Закрыть">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
