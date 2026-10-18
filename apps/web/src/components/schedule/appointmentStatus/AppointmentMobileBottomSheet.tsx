import React from "react";
import {
  AlertTriangle,
  Copy,
  MessageSquare,
  Phone,
  User,
  X,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import type { AppointmentMobileBottomSheetProps } from "./types";
import { AppointmentMobileStatusButtons } from "./AppointmentMobileStatusButtons";

export function AppointmentMobileBottomSheet({
  appointment,
  dashboard,
  isOpen,
  onClose,
  appointmentPatient,
  appointmentPatientName,
  patientBalance,
  appointmentDoctor,
  appointmentAssistant,
  appointmentChair,
  allergyAlert,
  formatTime,
  handleQuickStatusChange,
  openAppointmentEditor,
}: AppointmentMobileBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Подробности приёма"
      data-testid="appointment-mobile-bottom-sheet"
    >
      <div
        className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-[var(--line-strong)] rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black text-[var(--ink)] truncate" title={appointmentPatientName}>
              {appointmentPatientName}
            </div>
            <div
              className="text-xs text-[var(--muted)] font-medium truncate min-w-0"
              title={`${formatTime(appointment.startsAt)} – ${formatTime(appointment.endsAt)} · ${appointment.reason || "Прием"}`}
            >
              {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)} · {appointment.reason || "Прием"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
          <span className="font-bold text-[var(--muted)]">Статус оплаты / Баланс:</span>
          {patientBalance !== null ? (
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
                patientBalance > 0
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                  : patientBalance < 0
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
                    : "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
              }`}
            >
              {patientBalance > 0
                ? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
                : patientBalance < 0
                  ? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
                  : "0 ₽ (Оплачено)"}
            </span>
          ) : (
            <span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">0 ₽ (Оплачено)</span>
          )}
        </div>

        {appointmentPatient?.phone && (
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
              <Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
              <span>{appointmentPatient.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const text = generateAppointmentWhatsAppMessage({
                    patientName: appointmentPatientName,
                    doctorName: appointmentDoctor?.fullName,
                    doctorSpecialty: appointmentDoctor?.role,
                    appointmentStartsAt: appointment.startsAt,
                    clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                    clinicAddress: dashboard?.clinicSettings?.profile?.address,
                    clinicPhone: dashboard?.clinicSettings?.profile?.phone,
                    treatmentReason: appointment.reason,
                  });
                  openWhatsAppChat(appointmentPatient.phone!, text);
                }}
                className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = generateAppointmentWhatsAppMessage({
                    patientName: appointmentPatientName,
                    doctorName: appointmentDoctor?.fullName,
                    doctorSpecialty: appointmentDoctor?.role,
                    appointmentStartsAt: appointment.startsAt,
                    clinicName: dashboard?.clinicSettings?.profile?.clinicName,
                    clinicAddress: dashboard?.clinicSettings?.profile?.address,
                    clinicPhone: dashboard?.clinicSettings?.profile?.phone,
                    treatmentReason: appointment.reason,
                  });
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    void navigator.clipboard.writeText(text);
                    showToast("Текст напоминания скопирован", "success");
                  }
                }}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
                title="Скопировать SMS"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        )}

        {allergyAlert && (
          <div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 animate-bounce" />
            <span>{allergyAlert}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Врач:</span>
            <span className="font-bold">{appointmentDoctor?.fullName || "Не назначен"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Ассистент:</span>
            <span>{appointmentAssistant?.fullName || "Не назначен"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)]">Кабинет:</span>
            <span className="font-mono font-semibold">{appointmentChair?.name || "Кабинет 1"}</span>
          </div>
        </div>

        <AppointmentMobileStatusButtons
          handleQuickStatusChange={handleQuickStatusChange}
          onClose={onClose}
        />

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              openAppointmentEditor(appointment);
            }}
            className="primary-button w-full min-h-[48px] rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
          >
            <User size={16} />
            <span>Настроить запись</span>
          </button>
        </div>
      </div>
    </div>
  );
}
