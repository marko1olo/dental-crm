/**
 * WaitlistDrawer.tsx — Канонический интерфейс листа ожидания и умного заполнения окон DENTE
 * (Мандат 8b: Sweet Spot ~280-320 строк; Мандат 8am: 1 Primary CTA; Apple HIG: Bottom Sheet & Grouped Cards).
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import type { TargetSlotInfo, WaitlistCandidateItem, WaitlistUrgency } from "./waitlistTypes";
import {
  TREATMENT_CATEGORIES,
  generateWaitlistOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
} from "./waitlistTypes";
import { useWaitlistState } from "./useWaitlistState";

export interface WaitlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null;
  onBookSlot?: (patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void;
  updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
  onAppointmentCreated?: (() => void) | undefined;
  dashboard?: any;
  auth?: any;
}

export function WaitlistDrawer(props: WaitlistDrawerProps) {
  const {
    isOpen,
    onClose,
    targetSlot,
    onBookSlot,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    onAppointmentCreated,
    dashboard: propDashboard,
    auth: propAuth,
  } = props;

  const ctx = useOptionalAppLogicContext();
  const dashboard = propDashboard || ctx?.dashboard;
  const auth = propAuth || ctx?.auth;

  // Обработчик бронирования слота с авто-заполнением черновика приёма
  const handleSlotBooking = async (candidate: WaitlistCandidateItem, slot: TargetSlotInfo) => {
    if (onBookSlot) {
      await onBookSlot(candidate, slot);
    } else if (updateNewAppointmentDraft) {
      updateNewAppointmentDraft("patientId", candidate.patientId);
      updateNewAppointmentDraft("patientName", candidate.patientName);
      updateNewAppointmentDraft("patientPhone", candidate.patientPhone);
      if (candidate.treatmentCategory) {
        updateNewAppointmentDraft("reason", candidate.treatmentCategory);
      }
      if (slot.doctorUserId) {
        updateNewAppointmentDraft("doctorUserId", slot.doctorUserId);
      }
      if (slot.startsAt) {
        updateNewAppointmentDraft("startsAt", slot.startsAt);
      }
      if (slot.endsAt) {
        updateNewAppointmentDraft("endsAt", slot.endsAt);
      }
      if (focusNewAppointmentEditor) {
        focusNewAppointmentEditor();
      }
      onClose();
    }
    if (onAppointmentCreated) {
      onAppointmentCreated();
    }
  };

  const state = useWaitlistState({
    isOpen,
    targetSlot,
    onBookSlot: handleSlotBooking,
    onClose,
    dashboard,
    auth,
  });

  const titleId = useId();
  if (!isOpen) return null;

  const clinicName = dashboard?.clinicSettings?.name || "Стоматология DENTE";
  const staffDoctors = (dashboard?.clinicSettings?.staff || []).filter(
    (s: any) => s.role === "doctor" || s.role === "dentist",
  );
  const clinicPatients = dashboard?.patients || [];

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="waitlist-drawer"
      className="fixed inset-0 z-[1200] flex justify-end bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ overflowX: "hidden" }}
    >
      <div
        className="w-full max-w-[540px] h-full flex flex-col bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] shadow-2xl border-l border-[var(--line,#e2e8f0)] transition-transform duration-300 ease-out md:rounded-l-2xl sm:rounded-none"
        style={{
          backgroundColor: "var(--paper, #ffffff)",
          color: "var(--text, #0f172a)",
        }}
      >
        {/* Мобильный Drag Handle по Apple HIG */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" />
        </div>

        {/* ШАПКА */}
        <header className="px-5 py-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between shrink-0">
          <div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--text,#0f172a)]">
              Лист ожидания и быстрая запись
            </h2>
            <p className="text-xs text-[var(--text-muted,#64748b)] mt-0.5">
              {targetSlot
                ? `Подбор пациентов под освободившееся окно (${state.rankedCandidates.length})`
                : `Пациенты в очереди клиники (${state.items.length})`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)] transition-colors text-lg font-light cursor-pointer"
            style={{ border: "none", background: "transparent" }}
            aria-label="Закрыть лист ожидания"
          >
            ✕
          </button>
        </header>

        {/* ПЛАШКА ЦЕЛЕВОГО СЛОТА (ЕСЛИ ОТКРЫТО ДЛЯ ЗАПОЛНЕНИЯ ОКНА) */}
        {targetSlot && (
          <div
            className="px-5 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--badge-teal-bg,rgba(13,148,136,0.08))] flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base" role="img" aria-label="slot">⚡</span>
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--teal,#0d9488)] uppercase tracking-wide block">
                  Освободившееся окно для записи
                </span>
                <span className="text-xs font-medium text-[var(--text,#0f172a)] truncate block">
                  {new Date(targetSlot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {targetSlot.doctorName ? ` • ${targetSlot.doctorName}` : ""}
                  {targetSlot.chairName ? ` • ${targetSlot.chairName}` : ""}
                </span>
              </div>
            </div>
            {state.matchedCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--teal,#0d9488)] text-white whitespace-nowrap">
                {state.matchedCount} совпад.
              </span>
            )}
          </div>
        )}

        {/* НАВИГАЦИОННЫЕ ВКЛАДКИ */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-[var(--line,#e2e8f0)] shrink-0 overflow-x-auto">
          {targetSlot && (
            <button
              type="button"
              onClick={() => state.setActiveTab("smart_match")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ${
                state.activeTab === "smart_match"
                  ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
                  : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
              }`}
            >
              <span>🎯 Подбор на окно</span>
              <span className="opacity-80 text-[10px]">({state.rankedCandidates.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => state.setActiveTab("all_patients")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ${
              state.activeTab === "all_patients"
                ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
                : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
            }`}
          >
            <span>📋 Все в очереди</span>
            <span className="opacity-80 text-[10px]">({state.items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => state.setActiveTab("add_new")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ml-auto ${
              state.activeTab === "add_new"
                ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
                : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
            }`}
          >
            <span>+ Добавить пациента</span>
          </button>
        </div>

        {/* ТЕЛО: СПИСКИ ИЛИ ФОРМА */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {state.error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex justify-between items-center border border-red-200">
              <span>{state.error}</span>
              <button type="button" onClick={() => state.setError(null)} className="text-red-500 font-bold ml-2">✕</button>
            </div>
          )}

          {/* ВКЛАДКА ПОДБОРА ИЛИ ВСЕХ КАНДИДАТОВ */}
          {state.activeTab !== "add_new" ? (
            <>
              {/* ПАНЕЛЬ ФИЛЬТРОВ */}
              <div className="space-y-2 pb-1">
                <div className="relative">
                  <input
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) => state.setSearchQuery(e.target.value)}
                    placeholder="Поиск по пациенту, телефону, врачу..."
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                    style={{ paddingLeft: "36px" }}
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted,#64748b)]">🔍</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {targetSlot?.doctorUserId && state.activeTab === "smart_match" && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none bg-[var(--paper-subtle,#f1f5f9)] px-2.5 py-1 rounded-md text-[var(--text,#0f172a)]">
                      <input
                        type="checkbox"
                        checked={state.sameDoctorOnly}
                        onChange={(e) => state.setSameDoctorOnly(e.target.checked)}
                        className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)] focus:ring-0"
                      />
                      <span>Только к этому врачу</span>
                    </label>
                  )}
                  <select
                    value={state.urgencyFilter}
                    onChange={(e) => state.setUrgencyFilter(e.target.value)}
                    className="h-7 text-xs rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-2 focus:ring-0"
                  >
                    <option value="all">Все приоритеты</option>
                    <option value="urgent">Острая боль</option>
                    <option value="treatment_plan">По плану лечения</option>
                    <option value="hygiene">Профгигиена</option>
                    <option value="routine">Плановые</option>
                  </select>
                </div>
              </div>

              {/* СПИСОК КАНДИДАТОВ ПО APPLE HIG GROUPED CARDS */}
              {state.rankedCandidates.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted,#64748b)]">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm font-medium">Кандидаты не найдены</p>
                  <p className="text-xs mt-1">Добавьте пациента в лист ожидания через кнопку «+ Добавить»</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {state.rankedCandidates.map(({ candidate, scoring }) => {
                    const offerText = generateWaitlistOfferMessage({
                      patientName: candidate.patientName,
                      doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
                      startsAt: targetSlot?.startsAt,
                      clinicName,
                    });

                    return (
                      <div
                        key={candidate.id}
                        className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)]/40 transition-all shadow-sm space-y-2.5"
                      >
                        {/* Верхняя строка карточки: Пациент, Срочность и Рейтинг */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm text-[var(--text,#0f172a)]">
                              {candidate.patientName}
                            </div>
                            <div className="text-xs text-[var(--text-muted,#64748b)] flex items-center gap-1.5 mt-0.5">
                              <span>{candidate.patientPhone || "Без телефона"}</span>
                              {candidate.preferredDoctorName && (
                                <span>• Врач: {candidate.preferredDoctorName}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="px-2 py-0.5 text-[11px] font-medium rounded-full"
                              style={{
                                backgroundColor: scoring.urgency === "acute_pain" || scoring.urgency === "urgent"
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "rgba(100, 116, 139, 0.1)",
                                color: scoring.urgency === "acute_pain" || scoring.urgency === "urgent"
                                  ? "var(--danger, #ef4444)"
                                  : "var(--text-muted, #64748b)",
                              }}
                            >
                              {scoring.urgencyLabel}
                            </span>
                            {targetSlot && (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--badge-teal-bg,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]">
                                {scoring.score}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Причины соответствия / теги */}
                        {scoring.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[11px]">
                            {scoring.matchReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)]"
                              >
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        {candidate.notes && (
                          <p className="text-xs text-[var(--text-muted,#64748b)] italic bg-[var(--paper-subtle,#f8fafc)] p-2 rounded-md">
                            «{candidate.notes}»
                          </p>
                        )}

                        {/* КНОПКИ ДЕЙСТВИЯ: Мессенджеры + Ровно 1 Primary CTA кнопка */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,#f1f5f9)]">
                          {/* Мессенджеры и копирование */}
                          <div className="flex items-center gap-1.5">
                            {candidate.patientPhone && (
                              <>
                                <button
                                  type="button"
                                  title="Написать в WhatsApp"
                                  onClick={() => openWhatsAppChat(candidate.patientPhone!, offerText)}
                                  className="h-8 px-2.5 min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#25D366]/10 text-xs font-medium text-[#128C7E] flex items-center gap-1 transition-colors"
                                >
                                  <span>WhatsApp</span>
                                </button>
                                <button
                                  type="button"
                                  title="Написать в Telegram"
                                  onClick={() => openTelegramChat(candidate.patientPhone!, offerText)}
                                  className="h-8 px-2.5 min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#0088cc]/10 text-xs font-medium text-[#0088cc] flex items-center gap-1 transition-colors"
                                >
                                  <span>TG</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              title="Скопировать вежливый текст предложения"
                              onClick={() => state.handleCopyOfferMessage(candidate)}
                              className="h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,#f1f5f9)] text-xs text-[var(--text-muted,#64748b)] transition-colors"
                            >
                              {state.copiedId === candidate.id ? "Скопировано!" : "📋 Текст"}
                            </button>
                          </div>

                          {/* ЕДИНСТВЕННЫЙ PRIMARY CTA (Мандат 8am): «Записать в окно» */}
                          {targetSlot ? (
                            <button
                              type="button"
                              onClick={() => state.handleBookCandidate(candidate)}
                              className="h-9 px-4 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                            >
                              <span>Записать в окно</span>
                              <span>→</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (updateNewAppointmentDraft) {
                                  updateNewAppointmentDraft("patientId", candidate.patientId);
                                  updateNewAppointmentDraft("patientName", candidate.patientName);
                                  updateNewAppointmentDraft("patientPhone", candidate.patientPhone);
                                  if (focusNewAppointmentEditor) focusNewAppointmentEditor();
                                  onClose();
                                }
                              }}
                              className="h-8 px-3 rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/10 text-xs font-semibold transition-colors"
                            >
                              Назначить
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ФОРМА БЫСТРОГО ДОБАВЛЕНИЯ ПАЦИЕНТА В ЛИСТ ОЖИДАНИЯ */
            <form onSubmit={state.handleCreateEntry} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                  Пациент клиники *
                </label>
                <div className="space-y-1.5">
                  <select
                    value={state.newPatientId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      state.setNewPatientId(pId);
                      const pat = clinicPatients.find((p: any) => p.id === pId);
                      if (pat) {
                        state.setNewPatientName(pat.fullName);
                        state.setNewPatientPhone(pat.phone || "");
                      }
                    }}
                    className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                  >
                    <option value="">-- Выберите существующего пациента --</option>
                    {clinicPatients.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.phone || "нет тел."})
                      </option>
                    ))}
                  </select>

                  {!state.newPatientId && (
                    <input
                      type="text"
                      placeholder="Или введите ФИО нового пациента..."
                      value={state.newPatientName}
                      onChange={(e) => state.setNewPatientName(e.target.value)}
                      className="w-full h-9 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                  Желаемый врач
                </label>
                <select
                  value={state.newDoctorId}
                  onChange={(e) => state.setNewDoctorId(e.target.value)}
                  className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                >
                  <option value="">Любой врач клиники</option>
                  {staffDoctors.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                    Срочность приёма
                  </label>
                  <select
                    value={state.newUrgency}
                    onChange={(e) => state.setNewUrgency(e.target.value as WaitlistUrgency)}
                    className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                  >
                    <option value="routine">Плановый осмотр</option>
                    <option value="urgent">Острая боль / Cito</option>
                    <option value="treatment_plan">По плану лечения</option>
                    <option value="hygiene">Профгигиена</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                    Направление
                  </label>
                  <select
                    value={state.newCategory}
                    onChange={(e) => state.setNewCategory(e.target.value)}
                    className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                  >
                    {TREATMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                  Предпочтительное время
                </label>
                <select
                  value={state.newTimeOfDay}
                  onChange={(e) => state.setNewTimeOfDay(e.target.value)}
                  className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
                >
                  <option value="any">Любое время</option>
                  <option value="morning">Утро (08:00 - 12:00)</option>
                  <option value="day">День (12:00 - 17:00)</option>
                  <option value="evening">Вечер (17:00 - 21:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
                  Клинический комментарий
                </label>
                <textarea
                  rows={2}
                  value={state.newNotes}
                  onChange={(e) => state.setNewNotes(e.target.value)}
                  placeholder="Например: жалуется на реакцию от холодного в зубе 3.6..."
                  className="w-full text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] p-2.5 focus:ring-1 focus:ring-[var(--teal,#0d9488)] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => state.setActiveTab(targetSlot ? "smart_match" : "all_patients")}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={state.isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs font-semibold shadow-sm transition-all"
                >
                  {state.isSubmitting ? "Сохранение..." : "Добавить в лист ожидания"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
}

export default WaitlistDrawer;
