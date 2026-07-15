import React, { useState } from 'react';
import { Shield, Mail, KeyRound, ArrowRight, Building, Eye, EyeOff } from 'lucide-react';
import { showToast } from '../GlobalToast';

interface UserLoginProps {
  onSuccess: (clinicProfile: any, userProfile: any) => void;
  onSwitchToRegister: () => void;
  onSwitchToClinicMode: () => void;
}

export function UserLogin({ onSuccess, onSwitchToRegister, onSwitchToClinicMode }: UserLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Заполните все поля', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка входа');

      localStorage.setItem('dente_clinic_token', data.clinicToken);
      localStorage.setItem('dente_staff_token', data.staffToken);
      const organizationId = data.user?.organizationId ?? data.organizationId;
      if (organizationId) localStorage.setItem('dente_organization_id', organizationId);
      showToast('Вход выполнен', 'success');
      onSuccess(
        { organizationId: data.user?.organizationId ?? data.organizationId },
        data.user
      );
    } catch (err: any) {
      showToast(err.message || 'Неверный email или пароль', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-glow auth-glow--left"></div>
      <div className="auth-glow auth-glow--right"></div>
      <div className="auth-modal animate-fade-in-up" style={{ maxWidth: '400px' }}>
        <div className="auth-header-center">
          <div className="auth-logo-box"><Shield size={32} /></div>
          <h2 className="auth-logo-title">DENTE CRM-MIS</h2>
          <p className="auth-logo-subtitle">Вход для сотрудников</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label"><Mail size={12} className="auth-icon-inline" /> Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              className="auth-input"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label"><KeyRound size={12} className="auth-icon-inline" /> Пароль</label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input auth-input--with-icon"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-icon-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? <div className="auth-spinner"></div> : <>Войти в профиль <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="auth-footer-hints auth-footer-hints--border">
          <p>Нет аккаунта? <button type="button" onClick={onSwitchToRegister} className="auth-link-btn">Зарегистрировать клинику</button></p>
          <p style={{ marginTop: '10px' }}>
            <button type="button" onClick={onSwitchToClinicMode} className="auth-link-btn--muted auth-link-btn">
              <Building size={13} /> Режим общего ПК клиники
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
