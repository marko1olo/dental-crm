import React, { useState } from 'react';
import { Shield, Building, Mail, KeyRound, ArrowRight, User } from 'lucide-react';
import { showToast } from '../GlobalToast';

interface RegisterProps {
  onSuccess: (clinicProfile: any, userProfile: any) => void;
  onSwitchToLogin: () => void;
}

export function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName || !ownerName || !email || !password) {
      showToast('Заполните все поля', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName, ownerName, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка регистрации');

      localStorage.setItem('dente_clinic_token', data.clinicToken);
      localStorage.setItem('dente_staff_token', data.staffToken);
      showToast('Регистрация успешна!', 'success');
      onSuccess({ organizationId: data.organizationId }, { id: data.userId });
    } catch (err: any) {
      showToast(err.message || 'Не удалось зарегистрироваться', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-glow auth-glow--left"></div>
      <div className="auth-glow auth-glow--right"></div>
      <div className="auth-modal animate-fade-in-up" style={{ maxWidth: '440px' }}>
        <div className="auth-header-center">
          <div className="auth-logo-box"><Shield size={32} /></div>
          <h2 className="auth-logo-title">DENTE CRM-MIS</h2>
          <p className="auth-logo-subtitle">Регистрация клиники</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label"><Building size={12} className="auth-icon-inline" /> Название клиники</label>
            <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Dental Clinic" className="auth-input" disabled={loading} />
          </div>
          <div className="auth-form-group">
            <label className="auth-label"><User size={12} className="auth-icon-inline" /> ФИО Владельца</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Иванов И.И." className="auth-input" disabled={loading} />
          </div>
          <div className="auth-form-group">
            <label className="auth-label"><Mail size={12} className="auth-icon-inline" /> Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@clinic.com" className="auth-input" disabled={loading} />
          </div>
          <div className="auth-form-group">
            <label className="auth-label"><KeyRound size={12} className="auth-icon-inline" /> Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="auth-input" disabled={loading} />
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? <div className="auth-spinner"></div> : <>Зарегистрироваться <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="auth-footer-hints auth-footer-hints--border">
          <p>Уже есть аккаунт? <button type="button" onClick={onSwitchToLogin} className="auth-link-btn">Войти</button></p>
        </div>
      </div>
    </div>
  );
}
