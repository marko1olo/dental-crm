import React, { useState } from 'react';
import { Lock, UserCheck, Delete, LogOut } from 'lucide-react';
import { showToast } from '../GlobalToast';

interface StaffPinPadProps {
  staffMembers: any[];
  onUnlockSuccess: (user: any) => void;
  onClinicLogout: () => void;
}

export function StaffPinPad({ staffMembers, onUnlockSuccess, onClinicLogout }: StaffPinPadProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeStaff = Array.isArray(staffMembers) ? staffMembers.filter(m => m?.active ?? true) : [];

  const handleKeyPress = (num: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(pin.slice(0, -1));
  };

  const submitPin = async (completedPin: string) => {
    if (!selectedUser) return;
    setLoading(true);
    setErrorShake(false);

    try {
      const clinicToken = localStorage.getItem('dente_clinic_token');
      const response = await fetch('/api/auth/staff/unlock', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-dente-clinic-token': clinicToken || ''
        },
        body: JSON.stringify({ userId: selectedUser.id, pinCode: completedPin })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Неверный PIN-код");
      }

      localStorage.setItem("dente_staff_token", data.staffToken);
      showToast(`Добро пожаловать, ${data.user.fullName}!`, "success");
      onUnlockSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Неверный PIN-код", "error");
      setErrorShake(true);
      setPin('');
      setTimeout(() => setErrorShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-glow auth-glow--left"></div>
      <div className="auth-glow auth-glow--right"></div>

      <div className="auth-modal auth-modal--wide animate-fade-in-up">
        {/* Left Side: Staff Selector */}
        <div className="auth-modal-left">
          <div className="auth-header">
            <h3 className="auth-title">Сотрудники клиники</h3>
            <p className="auth-subtitle">Выберите свой профиль для разблокировки смены</p>
          </div>

          <div className="auth-staff-grid">
            {activeStaff.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed text-xs text-slate-400 bg-slate-800/40 col-span-full">
                Список сотрудников загружается или пуст. Добавьте персонал в разделе Настройки → Кадры.
              </div>
            ) : (
              activeStaff.map((staff) => {
                const isSelected = selectedUser?.id === staff.id;
                const initials = staff.fullName ? staff.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : '??';
                return (
                  <button
                    key={staff.id}
                    type="button"
                    className={`auth-staff-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedUser(staff);
                      setPin('');
                    }}
                  >
                    <div className="auth-staff-avatar bg-indigo-600">
                      {initials}
                    </div>
                    <div className="auth-staff-info">
                      <div className="auth-staff-name">{staff.fullName}</div>
                      <div className="auth-staff-role">{staff.role}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="auth-footer-actions">
            <button
              type="button"
              className="auth-link-btn auth-link-btn--muted"
              onClick={onClinicLogout}
            >
              <LogOut size={14} /> Выйти из аккаунта клиники
            </button>
          </div>
        </div>

        {/* Right Side: PIN Entry */}
        <div className="auth-modal-right">
          <div className="auth-pin-header">
            <div className="auth-pin-icon">
              {selectedUser ? <UserCheck size={24} /> : <Lock size={24} />}
            </div>
            <h4>
              {selectedUser ? selectedUser.fullName : 'Выберите профиль'}
            </h4>
            <div className="auth-pin-target">
              {selectedUser ? `Введите PIN-код` : 'Нажмите на сотрудника слева'}
            </div>
          </div>

          {/* Dots */}
          <div className={`auth-pin-dots ${errorShake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`auth-pin-dot ${pin.length > idx ? 'filled' : ''}`}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="auth-pin-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                className="auth-pin-btn"
                disabled={!selectedUser || loading}
                onClick={() => handleKeyPress(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="auth-pin-btn auth-pin-btn--secondary"
              disabled={!selectedUser || loading}
              onClick={() => setSelectedUser(null)}
            >
              Сброс
            </button>
            <button
              key="0"
              type="button"
              className="auth-pin-btn"
              disabled={!selectedUser || loading}
              onClick={() => handleKeyPress('0')}
            >
              0
            </button>
            <button
              type="button"
              className="auth-pin-btn auth-pin-btn--danger"
              disabled={!selectedUser || loading || pin.length === 0}
              onClick={handleBackspace}
            >
              <Delete size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
