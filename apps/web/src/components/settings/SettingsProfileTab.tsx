import React, { useState, useEffect } from "react";
import { User, KeyRound, Lock, AlertTriangle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { showToast } from "../GlobalToast";

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
  email?: string | null;
  organizationId?: string;
}

interface SettingsProfileTabProps {
  props: Record<string, any>;
}

function getPasswordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Слабый" };
  if (score <= 3) return { score: 2, label: "Средний" };
  return { score: 3, label: "Надёжный" };
}

export function SettingsProfileTab({ props }: SettingsProfileTabProps) {
  const { staffRoleLabels } = props;

  const [profile, setProfile] = useState<UserProfile | null>(props.activeStaffUser ?? null);
  const [profileLoading, setProfileLoading] = useState(!profile);

  // Fetch fresh profile from server on mount
  useEffect(() => {
    const staffToken = localStorage.getItem("dente_staff_token");
    if (!staffToken) return;
    setProfileLoading(true);
    fetch("/api/auth/user/me", {
      headers: { "x-dente-staff-token": staffToken }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setProfile(data.user); })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // PIN change
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast("Заполните все поля", "warning"); return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Новые пароли не совпадают", "error"); return;
    }
    if (newPassword.length < 8) {
      showToast("Пароль должен быть не менее 8 символов", "warning"); return;
    }

    setPasswordLoading(true);
    try {
      const r = await fetch("/api/auth/user/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Ошибка смены пароля");
      showToast("Пароль успешно изменён", "success");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin || !newPin || !confirmPin) {
      showToast("Заполните все поля PIN-кода", "warning"); return;
    }
    if (newPin !== confirmPin) {
      showToast("PIN-коды не совпадают", "error"); return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      showToast("PIN-код — 4 цифры", "warning"); return;
    }

    setPinLoading(true);
    try {
      const r = await fetch("/api/auth/user/update-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
        },
        body: JSON.stringify({ oldPin, newPin }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Ошибка смены PIN");
      showToast("PIN-код успешно изменён", "success");
      setOldPin(""); setNewPin(""); setConfirmPin("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setPinLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
        <div className="animate-spin h-8 w-8 text-sky-500 border-2 border-slate-300 dark:border-slate-700 border-t-sky-500 rounded-full" />
        <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm font-medium">Загрузка профиля...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle size={32} className="text-rose-500" />
        <p className="text-rose-500 dark:text-rose-400 mt-2 text-sm font-medium">
          Профиль не найден. Войдите через PIN или перезайдите в систему.
        </p>
      </div>
    );
  }

  const strengthClass = newPassword
    ? strength.score === 1 ? "weak" : strength.score === 2 ? "medium" : "strong"
    : "";

  return (
    <div className="settings-tab-pane animate-fade-in-up">
      <div className="settings-header">
        <h2 id="tabpanel-profile-title">Мой профиль</h2>
        <p>Личные данные, пароль и PIN-код для входа в систему.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "600px" }}>
        {/* Personal data */}
        <section className="settings-section">
          <div className="settings-section-header">
            <User aria-hidden="true" size={20} />
            <h3>Личные данные</h3>
          </div>
          <div className="form-grid">
            <label className="form-span-2">
              ФИО
              <input type="text" value={profile.fullName} disabled />
            </label>
            <label className="form-span-1">
              Email
              <input type="email" value={profile.email || "Не указан"} disabled />
            </label>
            <label className="form-span-1">
              Роль
              <input
                type="text"
                value={staffRoleLabels?.[profile.role] ?? profile.role}
                disabled
              />
            </label>
          </div>
          <p className="form-hint" style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            Изменить ФИО или Email может только владелец клиники в разделе «Клиника → Сотрудники».
          </p>
        </section>

        {/* Password */}
        <section className="settings-section">
          <div className="settings-section-header">
            <KeyRound aria-hidden="true" size={20} />
            <h3>Смена пароля</h3>
          </div>
          <p className="form-hint" style={{ marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Пароль используется для входа в систему с личных устройств по email.
          </p>
          <form onSubmit={handleUpdatePassword} className="form-grid">
            <label className="form-span-2">
              Текущий пароль
              <div style={{ position: "relative" }}>
                <input
                  type={showOldPw ? "text" : "password"}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
                />
                <button type="button" onClick={() => setShowOldPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]">
                  {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="form-span-1">
              Новый пароль
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Мин. 8 символов"
                  disabled={passwordLoading}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPw(v => !v)} 
                  aria-label={showNewPw ? "Скрыть новый пароль" : "Показать новый пароль"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword && (
                <div className="flex gap-1 mt-1.5 items-center">
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: strength.score >= i ? (strength.score === 1 ? "var(--danger,#ef4444)" : strength.score === 2 ? "var(--warn-500,#f59e0b)" : "var(--success,#10b981)") : "var(--line,rgba(255,255,255,0.08))", transition: "background 0.3s" }} />
                  ))}
                  <span className="text-[10px] text-[var(--muted,#94a3b8)] min-w-[45px] text-right">{strength.label}</span>
                </div>
              )}
            </label>
            <label className="form-span-1">
              Подтвердите пароль
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  disabled={passwordLoading}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPw(v => !v)} 
                  aria-label={showConfirmPw ? "Скрыть подтверждение пароля" : "Показать подтверждение пароля"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <div className="form-actions form-span-2">
              <button 
                className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]" 
                type="submit" 
                disabled={passwordLoading}
              >
                <KeyRound size={15} /> {passwordLoading ? "Сохранение..." : "Обновить пароль"}
              </button>
            </div>
          </form>
        </section>

        {/* PIN Security Block */}
        <section className="settings-section">
          <h3>Защитный PIN-код</h3>
          <p className="section-desc">Для быстрого разблокирования экрана при отсутствии на рабочем месте.</p>
          <form className="settings-form-grid" onSubmit={handleUpdatePin}>
            <label className="form-span-1">
              Новый PIN (4 цифры)
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                maxLength={4}
                disabled={pinLoading}
                className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all text-center tracking-[6px] text-lg"
              />
            </label>
            <label className="form-span-1">
              Подтвердите PIN
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                maxLength={4}
                disabled={pinLoading}
                className={`focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all text-center tracking-[6px] text-lg ${
                  confirmPin && newPin !== confirmPin ? "border-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)]" : ""
                }`}
              />
              {confirmPin && newPin !== confirmPin && <span className="text-[10px] text-[var(--danger,#ef4444)] mt-1 block">PIN-коды не совпадают</span>}
            </label>
            <div className="form-actions form-span-2">
              <button 
                className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]" 
                type="submit" 
                disabled={pinLoading}
              >
                <ShieldCheck size={15} /> {pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
