import type { Appointment } from "@dental/shared";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Globe,
  Zap,
} from "lucide-react";
import React, { useEffect } from "react";
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
import type { AppointmentModalProps } from "./AppointmentModalTypes";
import { useAppointmentModalState } from "./useAppointmentModalState";

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

  const readiness =
    (appointment && appointmentReadinessById instanceof Map
      ? appointmentReadinessById.get(appointment.id)
      : undefined) ?? null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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

      <div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line-strong)] rounded-2xl shadow-2xl z-10 text-[var(--ink)] flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4">
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
                  title="Перевести статус в «Подтвержден» в 1 клик"
                  data-testid="modal-confirm-online-booking-btn"
                >
                  <Check size={13} />
                  <span>Подтвердить запись</span>
                </button>
              )}
            </div>
          )}

          {/* CITO Notice Banner */}
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
                  Экстренный приём CITO (Острая боль)
                </span>
                <span className="text-[var(--muted)] text-xs">
                  Мягкий овербукинг разрешён
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold uppercase shrink-0">
                CITO
              </span>
            </div>
          )}

          {/* Readiness score bar */}
          {readiness && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${readiness.state === "ready" ? "bg-emerald-500" : readiness.state === "needs_attention" ? "bg-amber-500" : "bg-rose-500"}`}
                />
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Готовность: {readiness.nextAction}
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--teal)]">
                {readiness.score}%
              </span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Patient Section */}
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

            {/* Doctor, Assistant, Chair & Time Section */}
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
            />

            {/* Status Section */}
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

            {/* Reason */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Повод обращения / Услуга
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
                placeholder="Например: Лечение кариеса, консультация, острая боль..."
              />
              <AppointmentModalQuickReasons
                onApplyReasonPreset={handleApplyReasonPreset}
                onApplyTechnicalBreakPreset={handleApplyTechnicalBreakPreset}
              />
            </div>

            {/* Comment */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Комментарий
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
              />
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
                className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5"
                data-testid="appointment-modal-inline-helper"
              >
                <AlertCircle size={13} className="shrink-0" />
                <span>
                  Укажите пациента из списка или создайте во вкладке «+ Новый
                  пациент»
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
                  Служебная блокировка расписания врача (пациент не требуется)
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

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={(e) => handleSave(e)}
              disabled={isSaving}
              className={`flex-1 h-9 px-5 text-[var(--on-teal)] font-extrabold rounded-lg text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                collision.isCitoOverbooking || isCito
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : collision.hasCollision
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95"
              }`}
              data-testid="appointment-modal-save-btn"
            >
              <Check size={16} />
              <span>
                {isSaving
                  ? "Сохраняю…"
                  : collision.isCitoOverbooking || isCito
                    ? "Сохранить CITO (Острая боль)"
                    : collision.hasCollision
                      ? "Записать с овербукингом (острая боль)"
                      : isNewAppointment
                        ? "Записать на приём"
                        : "Сохранить изменения"}
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
