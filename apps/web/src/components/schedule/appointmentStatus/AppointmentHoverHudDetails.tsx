import React from "react";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  MessageSquare,
  Phone,
  Stethoscope,
  User,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { AppointmentStatusPopupProps } from "./types";

export function AppointmentHoverHudDetails({
  appointment,
  dashboard,
  appointmentPatient,
  appointmentPatientName,
  patientBalance,
  appointmentDoctor,
  appointmentChair,
  cardTeeth,
  allergyAlert,
  formatTime,
}: AppointmentStatusPopupProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
        <span className="text-[15px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
          <User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
          {appointmentPatientName || "Пациент"}
        </span>
        {patientBalance !== null ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (appointmentPatient?.id) {
                usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
              }
              useAppStore.getState().setCurrentView("finance");
              showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
            }}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
              patientBalance > 0
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
                : patientBalance < 0
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/25"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
            }`}
            title="Касса: расчёт пациента"
            data-testid={`timeline-hover-balance-btn-${appointment.id}`}
          >
            <CreditCard size={11} className="shrink-0" />
            <span>
              {patientBalance > 0
                ? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
                : patientBalance < 0
                  ? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
                  : "Оплата: 0 ₽"}
            </span>
          </button>
        ) : (
          <span className="text-[11px] text-[var(--muted)] font-mono">Баланс: 0 ₽</span>
        )}
      </div>

      {appointmentPatient?.phone && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
            <Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
            <span>{appointmentPatient.phone}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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
            className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Открыть чат в WhatsApp"
          >
            <MessageSquare size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp</span>
          </button>
        </div>
      )}

      {allergyAlert && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
          <span>{allergyAlert}</span>
        </div>
      )}

      <div className="pt-2 border-t border-[var(--line)] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--ink)]">
          <Clock size={13} className="text-[var(--teal)] shrink-0" />
          <span className="font-semibold text-[var(--ink)]">
            <span className="text-[var(--muted)] font-medium">Жалобы / Услуги: </span>
            {appointment?.reason || (appointment as Record<string, any>)?.notes || appointment?.comment || "Первичный осмотр и консультация"}
          </span>
        </div>
        {cardTeeth.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
            {cardTeeth.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
            <Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
            <span className="truncate">{appointmentDoctor?.fullName || "Врач не назначен"}</span>
          </span>
          <span>{appointmentChair?.name || "Кресло"}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
          <span>Время визита:</span>
          <span className="font-bold text-[var(--ink)]">
            {formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
          </span>
        </div>
      </div>
    </>
  );
}
