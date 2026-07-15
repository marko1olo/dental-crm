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
      if (data.clinicProfile?.organizationId) localStorage.setItem("dente_organization_id", data.clinicProfile.organizationId);
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
    <div className="auth-overlay">
      <div className="auth-glow auth-glow--left"></div>
      <div className="auth-glow auth-glow--right"></div>

      <div className="auth-modal animate-fade-in-up">
        
        <div className="auth-header-center">
          <div className="auth-logo-box">
            <Shield size={32} />
          </div>
          <h2 className="auth-logo-title">DENTE CRM-MIS</h2>
          <p className="auth-logo-subtitle">Активация кабинета</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">
              <Building size={12} className="auth-icon-inline" /> Логин / Email клиники
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@example.com"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">
              <KeyRound size={12} className="auth-icon-inline" /> Мастер-пароль
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input auth-input--with-icon"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-input-icon-btn"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <div className="auth-spinner"></div>
            ) : (
              <>
                Вход в кабинет <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-hints auth-footer-hints--border">
          <p>
            Авторизация требуется для загрузки расписания и шифрования данных.<br />
            Демо-доступ: <code>clinic@example.com</code> / <code>dente2026</code>
          </p>
        </div>

      </div>
    </div>
  );
}
