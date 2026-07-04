import React, { useState } from 'react';
import { Shield, KeyRound, Building, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { showToast } from '../GlobalToast';

interface ClinicLoginProps {
  onLoginSuccess: (clinicProfile: any) => void;
}

export function ClinicLogin({ onLoginSuccess }: ClinicLoginProps) {
  const [email, setEmail] = useState('clinic@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Заполните все поля", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/clinic/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка входа");
      }

      localStorage.setItem("dente_clinic_token", data.clinicToken);
      showToast("Вход в рабочее пространство клиники успешен", "success");
      onLoginSuccess(data.clinicProfile);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Неверные учетные данные клиники", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-xl select-none">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md p-8 bg-neutral-900/40 border border-neutral-800 rounded-3xl shadow-2xl backdrop-blur-md mx-4 animate-fade-in-up">
        
        {/* Header Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">DENTE CRM-MIS</h2>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">Активация кабинета</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email/Login ID Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building size={12} /> Логин / Email клиники
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@example.com"
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound size={12} /> Мастер-пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-4 pr-10 py-3 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-medium rounded-xl py-3 px-4 text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Вход в кабинет <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Авторизация требуется для загрузки расписания и шифрования данных.<br />
            Демо-доступ: <code className="text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">clinic@example.com</code> / <code className="text-neutral-400 bg-neutral-950 px-1 py-0.5 rounded">dente2026</code>
          </p>
        </div>

      </div>
    </div>
  );
}
