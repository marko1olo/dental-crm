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

  // Re-use sa-toast styles from ShadowAnalyst or define minimal inline/fallback
  return (
    <div className={`sa-toast sa-toast--${toast.type}`} style={{ zIndex: 9999, position: 'fixed', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--surface-sunken, #0f172a)', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
      <span>{toast.text}</span>
      <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto', fontSize: '18px', padding: '0 4px' }} aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
