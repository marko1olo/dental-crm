import React, { useState } from "react";
import { UserPlus, ShieldCheck, Edit2, AlertTriangle, KeyRound } from "lucide-react";
import { showToast } from "../GlobalToast";

interface SettingsStaffTabProps {
  props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
  const { dashboard, staffRoleLabels } = props;
  const staff = dashboard?.clinicSettings?.staff || [];
  
  const [loading, setLoading] = useState(false);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("doctor");
  const [newStaffEmail, setNewStaffEmail] = useState("");

  // PIN editing state
  const [editingPinForId, setEditingPinForId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  // Password editing state
  const [editingPasswordForId, setEditingPasswordForId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      showToast("Укажите ФИО сотрудника", "warning");
      return;
    }

    setLoading(true);
    try {
      const clinicToken = localStorage.getItem("dente_clinic_token");
      const res = await fetch("/api/settings/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken || "",
        },
        body: JSON.stringify({
          fullName: newStaffName,
          role: newStaffRole,
          email: newStaffEmail || null,
          active: true,
          canSignMedicalRecords: newStaffRole === "doctor",
          canManageMoney: newStaffRole === "administrator" || newStaffRole === "owner",
          canManageImports: true,
          color: "#3b82f6"
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ошибка добавления сотрудника");
      showToast("Сотрудник успешно добавлен. Пожалуйста, перезагрузите страницу.", "success");
      setNewStaffName("");
      setNewStaffEmail("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent, staffId: string) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      showToast("PIN-код должен состоять из 4 цифр", "warning");
      return;
    }

    setLoading(true);
    try {
      const clinicToken = localStorage.getItem("dente_clinic_token");
      const res = await fetch(`/api/settings/staff/${staffId}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken || "",
        },
        body: JSON.stringify({ pinCode: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ошибка обновления PIN-кода");
      showToast("PIN-код успешно изменен", "success");
      setEditingPinForId(null);
      setNewPin("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent, staffId: string) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Пароль должен быть не менее 6 символов", "warning");
      return;
    }

    setLoading(true);
    try {
      const clinicToken = localStorage.getItem("dente_clinic_token");
      const res = await fetch(`/api/settings/staff/${staffId}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken || "",
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ошибка обновления пароля");
      showToast("Пароль успешно изменен", "success");
      setEditingPasswordForId(null);
      setNewPassword("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="staff-management-studio animate-fade-in" aria-label="Управление персоналом">
      <div className="import-copy">
        <h3>Управление персоналом</h3>
        <p>Добавляйте новых врачей, ассистентов и администраторов. Устанавливайте PIN-коды для доступа к планшету клиники.</p>
      </div>

      <div className="settings-cards-grid">
        {/* Список сотрудников */}
        <article className="settings-card col-span-full">
          <div className="settings-card-header">
            <h4>Активный персонал</h4>
          </div>
          {/* min(280px,100%): иначе колонка шире узкого контейнера и
              карточки сотрудников обрезаются справа. */}
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))]">
            {staff.map((member: any) => (
              <div key={member.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 min-h-[140px] flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white" 
                    style={{ backgroundColor: member.color || "#3b82f6" }}
                  >
                    {member.fullName ? member.fullName.charAt(0) : "S"}
                  </div>
                  <div>
                    <h5 className="m-0 text-sm font-semibold text-slate-900 dark:text-white">{member.fullName}</h5>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {staffRoleLabels ? staffRoleLabels[member.role] : member.role}
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                  {editingPinForId === member.id ? (
                    <form onSubmit={(e) => handleUpdatePin(e, member.id)} className="flex gap-2">
                      <input 
                        type="password" 
                        maxLength={4}
                        placeholder="PIN" 
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-20 text-center px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button type="submit" className="primary-button px-3 py-1 text-xs" disabled={loading}>ОК</button>
                      <button type="button" className="secondary-button px-3 py-1 text-xs" onClick={() => setEditingPinForId(null)}>Отмена</button>
                    </form>
                  ) : editingPasswordForId === member.id ? (
                    <form onSubmit={(e) => handleUpdatePassword(e, member.id)} className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="Пароль" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button type="submit" className="primary-button px-3 py-1 text-xs" disabled={loading}>ОК</button>
                      <button type="button" className="secondary-button px-3 py-1 text-xs" onClick={() => setEditingPasswordForId(null)}>Отмена</button>
                    </form>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        className="secondary-button flex-1 justify-center py-1 text-xs flex items-center gap-1 cursor-pointer" 
                        onClick={() => { setEditingPinForId(member.id); setEditingPasswordForId(null); setNewPin(""); }}
                        title="Назначить PIN-код для планшета"
                      >
                        <KeyRound size={14} /> PIN
                      </button>
                      <button 
                        className="secondary-button flex-1 justify-center py-1 text-xs flex items-center gap-1 cursor-pointer" 
                        onClick={() => { setEditingPasswordForId(member.id); setEditingPinForId(null); setNewPassword(""); }}
                        title="Назначить пароль для входа"
                      >
                        <ShieldCheck size={14} /> Пароль
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Форма добавления сотрудника */}
        <article className="settings-card">
          <div className="settings-card-header">
            <h4><UserPlus size={18} /> Добавить сотрудника</h4>
          </div>
          <form onSubmit={handleCreateStaff} className="settings-card-body">
            <label>
              ФИО
              <input 
                type="text" 
                placeholder="Иванов Иван Иванович" 
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
              />
            </label>

            <label>
              Должность
              <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)}>
                <option value="doctor">Врач</option>
                <option value="assistant">Ассистент</option>
                <option value="administrator">Администратор</option>
                <option value="manager">Управляющий</option>
              </select>
            </label>

            <label>
              Email (логин для личного доступа)
              <input 
                type="email" 
                placeholder="doctor@clinic.com" 
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
            </label>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                <ShieldCheck size={16} /> Создать сотрудника
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}
