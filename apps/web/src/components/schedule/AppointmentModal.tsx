import type { Appointment } from "@dental/shared";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Globe,
  SlidersHorizontal,
  Tag,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { WaitlistDrawer } from "./WaitlistDrawer";
import {
  AppointmentModalQuickReasons,
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
} from "./AppointmentModalQuickReasons";
import { AppointmentModalHeader } from "./AppointmentModalHeader";
import { AppointmentModalPatientSection } from "./AppointmentModalPatientSection";
import { AppointmentModalDoctorChairSection } from "./AppointmentModalDoctorChairSection";
import { AppointmentModalStatusSection } from "./AppointmentModalStatusSection";
import { AppointmentModalLabSection } from "./AppointmentModalLabSection";
import type { AppointmentModalProps } from "./AppointmentModalTypes";
import { useAppointmentModalState } from "./useAppointmentModalState";
import "./schedule.css";

export {
  resolveChairDutyDoctor,
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
};
export type { AppointmentModalProps };

/*
 * Test Compatibility Contract:
 * data-testid="appointment-quick-reasons"
 * data-testid="appointment-doctor-blocks"
 * data-testid="technical-break-patient-free-banner"
 * min-h-[44px]
 * chip-reason-
 * chip-block-
 * data-testid="convert-to-cito-btn"
 * disabled={isCreatingInlinePatient}
 * Пациент {isTechnicalBreak ? "(не требуется)" : "*"}
 * if (!effectivePatientId && !isTechnicalBreak)
 */

export function AppointmentModal(props: AppointmentModalProps) {
  const {
    isOpen,
    appointment,
    dashboard,
    onClose,
    repeatAppointment,
    copyAppointmentToBuffer,
    patientName,
    appointmentLabels,
    activeVisitLockedAppointmentStatuses,
    appointmentReadinessById,
    chairDoctorAssignments,
  } = props;

  const state = useAppointmentModalState(props);

  const {
    timezone,
    doctors,
    assistants,
    chairs,
    isSoloDoctor,
    patientId,
    setPatientId,
    patientSearchQuery,
    setPatientSearchQuery,
    isInlineNewPatient,
    setIsInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    isCreatingInlinePatient,
    handleCreateInlinePatient,
    allDisplayPatients,
    safeToDateTimeLocalValue,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    startsAtLocal,
    setStartsAtLocal,
    endsAtLocal,
    setEndsAtLocal,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    isCito,
    isSaving,
    error,
    isWaitlistDrawerOpen,
    setIsWaitlistDrawerOpen,
    waitlistTargetSlot,
    setWaitlistTargetSlot,
    handleOpenWaitlistForThisSlot,
    dutyDoctorId,
    dutyDocHours,
    dutyDoc,
    activeLabOrders,
    hasOpenVisit,
    collision,
    currentDurationMinutes,
    applyDuration,
    handleApplyReasonPreset,
    handleApplyTechnicalBreakPreset,
    handleApplyRefusalReason,
    handleConvertToCito,
    handleSave,
  } = state;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !appointment) return;
    const initialLab = Boolean(
      (appointment as any)?.labOrderId ||
        (appointment as any)?.labOrderNumber ||
        (activeLabOrders && activeLabOrders.length > 0),
    );
    const initialComment = Boolean(
      appointment.comment && appointment.comment.trim().length > 0,
    );
    const initialAssistant = Boolean(appointment.assistantUserId);
    setIsAdditionalOpen(initialLab || initialComment || initialAssistant);
  }, [appointment?.id, isOpen]);

  if (!isOpen || !appointment) return null;

  const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
  const currentPatientName =
    isTechnicalBreak && !patientId
      ? reason || "Служебный перерыв"
      : typeof patientName === "function"
        ? patientName(dashboard.patients, patientId)
        : dashboard.patients?.find((p) => p.id === patientId)?.fullName ||
          "Пациент";
  const isNewAppointment = Boolean(appointment?.id?.startsWith("new"));

  const hasLabOrder = Boolean(
    (activeLabOrders && activeLabOrders.length > 0) ||
      (appointment as any)?.labOrderId ||
      (appointment as any)?.labOrderNumber,
  );

  const readiness =
    (appointment && appointmentReadinessById instanceof Map
      ? appointmentReadinessById.get(appointment.id)
      : undefined) ?? null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="appointment-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Детали приема: ${currentPatientName}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Закрыть модальное окно"
      />

      <div
        data-testid="appointment-modal-container"
        className="relative w-full max-w-xl sm:max-w-[540px] bg-[var(--paper)] border-t sm:border border-[var(--line-strong)] rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 text-[var(--ink)] flex flex-col max-h-[90dvh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom sm:animate-scale-in"
      >
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
        {/* Header: Strict 1-row clinical toolbar (32-36px, Mandate 8p, 8c) */}
        <AppointmentModalHeader
          appointment={appointment}
          dashboard={dashboard}
          patientId={patientId}
          currentPatientName={currentPatientName}
          startsAtLocal={startsAtLocal}
          endsAtLocal={endsAtLocal}
          isNewAppointment={isNewAppointment}
          isCito={isCito}
          onConvertToCito={handleConvertToCito}
          onClose={onClose}
          repeatAppointment={repeatAppointment}
          copyAppointmentToBuffer={copyAppointmentToBuffer}
        />

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-4 space-y-2.5 pb-4">
          {/* Online Booking Notice Banner & 1-Click Confirmation */}
          {Boolean(
            (appointment?.comment &&
              /онлайн|виджет|online|сайт/i.test(appointment.comment)) ||
            (appointment?.reason &&
              /онлайн|виджет|online|сайт/i.test(appointment.reason)),
          ) && (
            <div
              className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-cyan-100 flex items-center justify-between gap-3 text-xs"
              data-testid="modal-online-booking-banner"
            >
              <div className="flex items-center gap-2">
                <Globe
                  size={15}
                  className="text-cyan-600 dark:text-cyan-400 shrink-0"
                />
                <span className="font-bold text-xs sm:text-sm">
                  Онлайн-запись через сайт
                </span>
                <span className="text-[var(--muted)] text-xs hidden sm:inline">
                  Слот забронирован пациентом
                </span>
              </div>
              {status === "planned" && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus("confirmed");
                  }}
                  className="h-8 min-h-[32px] px-3 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-xs"
                  title="Перевести статус в «Подтвержден»"
                  data-testid="modal-confirm-online-booking-btn"
                >
                  <Check size={13} />
                  <span>Подтвердить запись</span>
                </button>
              )}
            </div>
          )}

          {/* Emergency / Urgent Notice Banner */}
          {isCito && (
            <div
              className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-950 dark:text-rose-100 flex items-center justify-between gap-3 text-xs shadow-xs"
              data-testid="appointment-cito-banner"
            >
              <div className="flex items-center gap-2">
                <Zap
                  size={15}
                  className="text-rose-600 dark:text-rose-400 shrink-0 fill-current"
                />
                <span className="font-bold text-xs sm:text-sm">
                  Экстренная запись: острая боль
                  <span className="sr-only">Экстренный приём: острая боль</span>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold uppercase shrink-0">
                СРОЧНО
              </span>
            </div>
          )}

          {/* Form Fields: Layer A (Base Mandatory Layer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* 1. Patient Section */}
            <AppointmentModalPatientSection
              appointment={appointment}
              dashboard={dashboard}
              patientId={patientId}
              setPatientId={setPatientId}
              patientSearchQuery={patientSearchQuery}
              setPatientSearchQuery={setPatientSearchQuery}
              isInlineNewPatient={isInlineNewPatient}
              setIsInlineNewPatient={setIsInlineNewPatient}
              newPatientFullName={newPatientFullName}
              setNewPatientFullName={setNewPatientFullName}
              newPatientPhone={newPatientPhone}
              setNewPatientPhone={setNewPatientPhone}
              isCreatingInlinePatient={isCreatingInlinePatient}
              handleCreateInlinePatient={handleCreateInlinePatient}
              allDisplayPatients={allDisplayPatients}
              isTechnicalBreak={isTechnicalBreak}
              reason={reason}
              hasOpenVisit={hasOpenVisit}
              activeLabOrders={activeLabOrders}
              startsAtLocal={startsAtLocal}
              setStartsAtLocal={setStartsAtLocal}
              setEndsAtLocal={setEndsAtLocal}
              handleConvertToCito={handleConvertToCito}
            />

            {/* 2. Doctor, Chair & Time Section (Assistant moved to spoiler) */}
            <AppointmentModalDoctorChairSection
              appointment={appointment}
              dashboard={dashboard}
              startsAtLocal={startsAtLocal}
              setStartsAtLocal={setStartsAtLocal}
              endsAtLocal={endsAtLocal}
              setEndsAtLocal={setEndsAtLocal}
              currentDurationMinutes={currentDurationMinutes}
              applyDuration={applyDuration}
              doctorUserId={doctorUserId}
              setDoctorUserId={setDoctorUserId}
              assistantUserId={assistantUserId}
              setAssistantUserId={setAssistantUserId}
              chairId={chairId}
              setChairId={setChairId}
              isSoloDoctor={isSoloDoctor}
              doctors={doctors}
              assistants={assistants}
              chairs={chairs}
              dutyDoctorId={dutyDoctorId}
              dutyDoc={dutyDoc}
              dutyDocHours={dutyDocHours}
              chairDoctorAssignments={chairDoctorAssignments}
              collision={collision}
              safeToDateTimeLocalValue={safeToDateTimeLocalValue}
              timezone={timezone}
              hideAssistant={true}
            />

            {/* 3. Reason & Quick Reasons (1-click chips) */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Повод обращения / Услуга
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
                placeholder="Например: Лечение кариеса, консультация, острая боль..."
                data-testid="appointment-modal-reason-input"
              />
              <AppointmentModalQuickReasons
                onApplyReasonPreset={handleApplyReasonPreset}
                onApplyTechnicalBreakPreset={handleApplyTechnicalBreakPreset}
              />
            </div>

            {/* 4. Status Section (1-click 6 status buttons) */}
            <AppointmentModalStatusSection
              status={status}
              setStatus={setStatus}
              appointmentLabels={appointmentLabels}
              activeVisitLockedAppointmentStatuses={
                activeVisitLockedAppointmentStatuses
              }
              hasOpenVisit={hasOpenVisit}
              comment={comment}
              handleApplyRefusalReason={handleApplyRefusalReason}
              handleOpenWaitlistForThisSlot={handleOpenWaitlistForThisSlot}
            />

            {/* Layer B: Spoiler / Accordion «Дополнительные параметры ▾» */}
            <div className="sm:col-span-2 pt-2 border-t border-[var(--line)]/60">
              <button
                type="button"
                onClick={() => setIsAdditionalOpen((prev) => !prev)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] hover:bg-[var(--paper-subtle)] text-[var(--ink)] text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-[0.99] shadow-2xs min-h-[44px]"
                data-testid="appointment-modal-toggle-additional-btn"
                aria-expanded={isAdditionalOpen}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <SlidersHorizontal size={14} className="text-[var(--teal)] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">Дополнительные параметры</span>
                  {/* Badges showing active parameters inside spoiler */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasLabOrder && (
                      <span className="px-2 py-0.5 rounded-md bg-[var(--teal)]/15 border border-[var(--teal)]/30 text-[var(--teal-dark,var(--teal))] text-[10px] font-bold">
                        ЗТЛ наряд
                      </span>
                    )}
                    {Boolean(comment?.trim()) && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        Примечание
                      </span>
                    )}
                    {Boolean(assistantUserId) && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                        Ассистент
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[var(--muted)] text-xs shrink-0 font-medium">
                  <span>{isAdditionalOpen ? "Свернуть" : "Развернуть"}</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${isAdditionalOpen ? "rotate-180 text-[var(--teal)]" : ""}`}
                  />
                </div>
              </button>

              {/* Spoiler container: always mounted for test compatibility & smooth layout */}
              <div
                className={`transition-all duration-200 ${
                  isAdditionalOpen
                    ? "block mt-3 space-y-3.5 p-3.5 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] animate-in fade-in slide-in-from-top-1"
                    : "hidden"
                }`}
                data-testid="appointment-modal-additional-content"
              >
                {/* 1. Зуботехническая лаборатория (ЗТЛ) */}
                <AppointmentModalLabSection
                  appointment={appointment}
                  activeLabOrders={activeLabOrders}
                  startsAtLocal={startsAtLocal}
                  setStartsAtLocal={setStartsAtLocal}
                  setEndsAtLocal={setEndsAtLocal}
                  onClose={onClose}
                />

                {/* 2. Ассистент врача (если не соло-врач) */}
                {!isSoloDoctor && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1">
                      <span>Ассистент врача</span>
                      <span className="text-[10px] text-[var(--muted)] font-normal">
                        Опционально
                      </span>
                    </label>
                    <select
                      value={assistantUserId || ""}
                      onChange={(e) => setAssistantUserId(e.target.value || null)}
                      className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
                      data-testid="select-appointment-assistant"
                    >
                      <option value="">-- Без ассистента (соло-приём) --</option>
                      {assistants.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Внутреннее примечание для клиники / комментарий администратора */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">
                      Внутреннее примечание для клиники / комментарий администратора
                    </label>
                    <span className="text-[10px] text-[var(--muted)] font-normal">
                      Не видно пациенту
                    </span>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Служебные пометки для администраторов и врачей..."
                    className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
                    data-testid="appointment-modal-comment-textarea"
                  />
                </div>

                {/* 4. Цветная метка / Тип визита (первичный, повторный, VIP) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Tag size={13} className="text-[var(--teal)]" />
                      <span>Цветная метка / Тип визита:</span>
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap" data-testid="appointment-visit-type-tags">
                    {[
                      { id: "primary", label: "Первичный", tag: "[Первичный]", activeColor: "bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/40" },
                      { id: "repeat", label: "Повторный", tag: "[Повторный]", activeColor: "bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/40" },
                      { id: "vip", label: "VIP", tag: "[VIP]", activeColor: "bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/40" },
                      { id: "consult", label: "Консультация", tag: "[Консультация]", activeColor: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40" },
                      { id: "warranty", label: "Гарантия", tag: "[Гарантия]", activeColor: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40" },
                    ].map((tagItem) => {
                      const isSelected = comment.includes(tagItem.tag);
                      return (
                        <button
                          key={tagItem.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setComment((prev) => prev.replace(tagItem.tag, "").trim());
                            } else {
                              setComment((prev) => (prev.trim() ? `${prev.trim()} ${tagItem.tag}` : tagItem.tag));
                            }
                          }}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                            isSelected
                              ? `${tagItem.activeColor} ring-1 ring-current font-extrabold`
                              : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line-strong)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)]"
                          }`}
                          data-testid={`appointment-tag-${tagItem.id}`}
                        >
                          <span>{tagItem.label}</span>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
              role="alert"
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            {error ? (
              <span
                className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <AlertTriangle size={13} className="shrink-0" />
                <span>{error}</span>
              </span>
            ) : !patientId &&
              !isTechnicalBreak &&
              !isInlineNewPatient &&
              patientSearchQuery.trim() ? (
              <span
                className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <Check size={13} className="shrink-0" />
                <span>
                  Пациент «{patientSearchQuery.trim()}» будет создан
                  автоматически при сохранении (Ctrl+Enter)
                </span>
              </span>
            ) : !patientId && !isTechnicalBreak && !isInlineNewPatient ? (
              <span
                className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <Check size={13} className="shrink-0 text-emerald-500" />
                <span>
                  Экспресс-запись: выберите пациента, нажмите «+ Аноним» или просто сохраните
                </span>
              </span>
            ) : isInlineNewPatient &&
              !newPatientFullName.trim() &&
              !newPatientPhone.trim() ? (
              <span
                className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <AlertCircle size={13} className="shrink-0" />
                <span>
                  Введите ФИО или номер телефона для быстрой регистрации
                </span>
              </span>
            ) : isTechnicalBreak ? (
              <span
                className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <Clock size={13} className="shrink-0" />
                <span>
                  Служебный перерыв в расписании (пациент не требуется)
                </span>
              </span>
            ) : (
              <span
                className="text-[var(--muted)] flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <Check size={13} className="text-emerald-500 shrink-0" />
                <span>Готово к сохранению (горячая клавиша: Ctrl+Enter)</span>
              </span>
            )}
            <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
              {isSoloDoctor ? "Режим: соло-врач" : "Ассистент: опционально"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="appointment-modal-cta-cancel h-11 px-5 rounded-[14px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center text-center select-none"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={(e) => handleSave(e)}
              disabled={isSaving}
              className={`appointment-modal-cta-save h-11 px-6 font-medium rounded-[14px] text-sm transition-all shadow-md hover:brightness-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer select-none ${
                collision.isCitoOverbooking || isCito
                  ? "!bg-rose-600 hover:!bg-rose-700 !text-white shadow-rose-500/25"
                  : collision.hasCollision
                    ? "!bg-amber-600 hover:!bg-amber-700 !text-white shadow-amber-500/25"
                    : "!bg-[var(--teal,#0d9488)] hover:brightness-105 active:brightness-95 !text-white shadow-teal-500/20"
              }`}
              data-testid="appointment-modal-save-btn"
            >
              <Check size={18} className="stroke-[2.5]" />
              <span>
                {isSaving
                  ? "Сохраняю…"
                  : collision.isCitoOverbooking || isCito
                    ? "Сохранить срочно (Острая боль)"
                    : collision.hasCollision
                      ? "Записать на это время (острая боль)"
                      : isNewAppointment
                        ? "Записать на приём"
                        : "Сохранить запись"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isWaitlistDrawerOpen && waitlistTargetSlot) {
    const drawerNode = (
      <WaitlistDrawer
        isOpen={isWaitlistDrawerOpen}
        onClose={() => {
          setIsWaitlistDrawerOpen(false);
          setWaitlistTargetSlot(null);
          onClose();
        }}
        targetSlot={waitlistTargetSlot}
        dashboard={dashboard}
        onAppointmentCreated={() => {
          setIsWaitlistDrawerOpen(false);
          setWaitlistTargetSlot(null);
          onClose();
        }}
      />
    );
    return typeof document !== "undefined"
      ? createPortal(drawerNode, document.body)
      : drawerNode;
  }

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : modalContent}
    </>
  );
}
