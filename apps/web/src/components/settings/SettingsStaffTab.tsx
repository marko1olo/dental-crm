import React, { useState } from "react";
import { UserPlus, ShieldCheck, Edit2, AlertTriangle, KeyRound } from "lucide-react";
import type { StaffRole } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import {
  CREATABLE_STAFF_ROLES,
  parseStaffMutationPayload,
  staffRoleTitle,
} from "./settingsInviteRoles";

interface SettingsStaffTabProps {
  props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
  const { dashboard, staffRoleLabels, loadDashboard } = props;
  const staff = dashboard?.clinicSettings?.staff || [];
  /*
   * Список сотрудников приходит из дашборда. Отличить «сотрудников нет» от
   * «данные клиники не прочитаны» можно только по наличию самого дашборда:
   * состояния его загрузки сюда не передаётся. Меньшее из двух — не утверждать
   * ничего, когда дашборда нет вовсе.
   */
  const clinicDataLoaded = Boolean(dashboard?.clinicSettings);

  const [loading, setLoading] = useState(false);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState("");
  /*
   * Должность типизирована StaffRole. В соседней форме приглашения такой же
   * список был набран руками и отправлял роль «admin», которой нет в схеме, —
   * приглашённый администратор получал права владельца. Разбор
   * в ./settingsInviteRoles.ts; здесь список берётся из того же места.
   */
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("doctor");
  const [newStaffEmail, setNewStaffEmail] = useState("");

  // PIN editing state
  const [editingPinForId, setEditingPinForId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  // Password editing state
  const [editingPasswordForId, setEditingPasswordForId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  /*
   * Кого именно касается сообщение. «PIN-код успешно изменен» не говорило, у кого:
   * кнопки PIN стоят на каждой карточке персонала, и при пяти сотрудниках подряд
   * администратор не знает, тому ли он его сменил.
   */
  const staffNameById = (staffId: string): string => {
    const member = staff.find((item: any) => item?.id === staffId);
    const fullName =
      typeof member?.fullName === "string" ? member.fullName.trim() : "";
    return fullName.length > 0 ? `«${fullName}»` : "сотрудника";
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      showToast("Укажите ФИО сотрудника", "warning");
      return;
    }

    setLoading(true);
    const failedAction = `Сотрудник «${newStaffName.trim()}» не добавлен`;
    try {
      const clinicToken = localStorage.getItem("dente_clinic_token");
      const res = await fetch("/api/settings/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken || "",
        },
        body: JSON.stringify({
          fullName: newStaffName.trim(),
          role: newStaffRole,
          email: newStaffEmail.trim() || null,
          active: true,
          canSignMedicalRecords: newStaffRole === "doctor",
          canManageMoney: newStaffRole === "administrator" || newStaffRole === "owner",
          canManageImports: true,
          color: "#3b82f6"
        }),
      });
      /* Тело читается строкой и разбирается чистой функцией: res.json() до
         проверки res.ok бросал английское исключение прямо в лицо. */
      const outcome = parseStaffMutationPayload(res.status, await res.text());
      if (!outcome.ok) {
        console.error("[персонал] сотрудник не добавлен, ответ", outcome.status);
        showToast(
          outcome.message ?? actionFailureToast(failedAction, outcome.status),
          "error",
        );
        return;
      }
      const addedName = newStaffName.trim();
      setNewStaffName("");
      setNewStaffEmail("");
      /*
       * БЫЛО: «Сотрудник успешно добавлен. Пожалуйста, перезагрузите страницу.»
       *
       * Список персонала берётся из дашборда, а дашборд сам не перечитывался —
       * поэтому добавленного человека в списке не было, и программа просила
       * администратора перезагрузить страницу вручную. Перечитывать данные
       * клиники умеет loadDashboard, он приходит сюда вместе с остальными
       * настройками; просьба к человеку сделать работу программы убрана.
       */
      if (typeof loadDashboard === "function") {
        await loadDashboard();
        showToast(
          `Сотрудник «${addedName}» добавлен. Назначьте ему PIN-код для планшета в списке слева.`,
          "success",
        );
        return;
      }
      showToast(
        `Сотрудник «${addedName}» добавлен. Обновите страницу, чтобы увидеть его в списке.`,
        "success",
      );
    } catch (err) {
      // Текст исключения наружу не идёт: он английский («Failed to fetch»).
      console.error("[персонал] добавление не дошло до сервера", err);
      showToast(actionFailureToast(failedAction, null), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent, staffId: string) => {
    e.preventDefault();
    const staffName = staffNameById(staffId);
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      showToast("PIN-код — ровно 4 цифры, без букв и пробелов", "warning");
      return;
    }

    setLoading(true);
    const failedAction = `PIN-код для ${staffName} не изменён`;
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
      const outcome = parseStaffMutationPayload(res.status, await res.text());
      if (!outcome.ok) {
        console.error("[персонал] PIN не изменён, ответ", outcome.status);
        /* Поле ввода НЕ закрываем при отказе: иначе неясно, сменился PIN или нет,
           и набирать его придётся заново. */
        showToast(
          outcome.message ?? actionFailureToast(failedAction, outcome.status),
          "error",
        );
        return;
      }
      setEditingPinForId(null);
      setNewPin("");
      showToast(
        `PIN-код для ${staffName} изменён — сообщите его сотруднику, старый больше не работает`,
        "success",
      );
    } catch (err) {
      console.error("[персонал] смена PIN не дошла до сервера", err);
      showToast(actionFailureToast(failedAction, null), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent, staffId: string) => {
    e.preventDefault();
    const staffName = staffNameById(staffId);
    if (newPassword.length < 6) {
      showToast("Пароль — не короче 6 знаков", "warning");
      return;
    }

    setLoading(true);
    const failedAction = `Пароль для ${staffName} не изменён`;
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
      const outcome = parseStaffMutationPayload(res.status, await res.text());
      if (!outcome.ok) {
        console.error("[персонал] пароль не изменён, ответ", outcome.status);
        showToast(
          outcome.message ?? actionFailureToast(failedAction, outcome.status),
          "error",
        );
        return;
      }
      setEditingPasswordForId(null);
      setNewPassword("");
      showToast(
        `Пароль для ${staffName} изменён — сообщите его сотруднику, старый больше не работает`,
        "success",
      );
    } catch (err) {
      console.error("[персонал] смена пароля не дошла до сервера", err);
      showToast(actionFailureToast(failedAction, null), "error");
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
        {/*
            ПУСТОЙ СПИСОК БЕЗ ЕДИНОГО СЛОВА — ТУПИК.

            Здесь рисовалась только сетка карточек: когда сотрудников нет или
            данные клиники не прочитаны, под заголовком «Активный персонал» был
            пустой прямоугольник, и администратор не понимал, что произошло.
            Отличить эти два случая можно лишь по наличию самого дашборда —
            состояния его загрузки сюда не передают, поэтому во втором случае
            ничего о персонале не утверждается.
          */}
          {staff.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 m-0 py-6 text-center">
              {clinicDataLoaded
                ? "Сотрудников пока нет. Добавьте первого в форме «Добавить сотрудника» и назначьте ему PIN-код для планшета."
                : "Данные клиники ещё не прочитаны, поэтому список персонала показать нельзя. Обновите страницу; если список не появится, сообщите администратору."}
            </p>
          )}
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
                    {/*
                      БЫЛО: `staffRoleLabels ? staffRoleLabels[member.role] : member.role`.
                      Роль вне схемы (такие в базе есть — их создала форма
                      приглашения, пока отправляла «admin») давала undefined, и на
                      месте должности не было НИЧЕГО: администратор не мог понять,
                      чего у человека не хватает. А без справочника подписей на
                      экран попадало имя роли латиницей.
                    */}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {staffRoleTitle(String(member.role ?? ""))}
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
              {/*
                Список выведен из общего списка ролей, а не набран здесь. Значения
                в этой форме были верные — но ровно такой же рукописный список в
                соседней форме приглашения отправлял роль, которой нет в схеме, и
                это стоило прав доступа. Второй рукописный список тех же ролей —
                вопрос времени, а не вопрос внимательности.
              */}
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
              >
                {CREATABLE_STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {staffRoleTitle(role)}
                  </option>
                ))}
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
