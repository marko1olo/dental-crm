import React, { useRef } from "react";
import { Clock, User, Phone, Stethoscope, Armchair, FileText, Check } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { formatDateTime, getDoctorName, getChairName, getPatientInfo } from "./pendingOnlineBookingsHelpers";

export interface PendingOnlineBookingCardProps {
  booking: Appointment;
  dashboard: Dashboard | null | undefined;
  isConfirming: boolean;
  onConfirm: (booking: Appointment) => void | Promise<void>;
  onSelectAppointment?: ((app: Appointment) => void) | undefined;
}

export const PendingOnlineBookingCard: React.FC<PendingOnlineBookingCardProps> = ({
  booking,
  dashboard,
  isConfirming,
  onConfirm,
  onSelectAppointment,
}) => {
  const patInfo = getPatientInfo(dashboard, booking);
  const isBusyRef = useRef(false);

  const handleDebouncedConfirm = () => {
    if (isBusyRef.current || isConfirming) return;
    isBusyRef.current = true;
    Promise.resolve(onConfirm(booking)).finally(() => {
      setTimeout(() => {
        isBusyRef.current = false;
      }, 350);
    });
  };

  return (
    <div
      className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 hover:border-cyan-500/40 transition-colors space-y-3"
      data-testid={`pending-online-booking-card-${booking.id}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
          <Clock size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>{formatDateTime(booking.startsAt, booking.endsAt)}</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25">
          Ожидает подтверждения
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <User size={13} className="text-[var(--muted)] shrink-0" />
          <span className="font-semibold">{patInfo.name}</span>
          {patInfo.phone && (
            <span className="text-[var(--muted)] flex items-center gap-1 font-mono">
              <Phone size={11} />
              {patInfo.phone}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <Stethoscope size={13} className="text-[var(--muted)] shrink-0" />
          <span>{getDoctorName(dashboard, booking.doctorUserId ?? undefined)}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <Armchair size={13} className="text-[var(--muted)] shrink-0" />
          <span>{getChairName(dashboard, booking.chairId ?? undefined)}</span>
        </div>
        {booking.reason && (
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <FileText size={13} className="text-[var(--muted)] shrink-0" />
            <span className="truncate">{booking.reason}</span>
          </div>
        )}
      </div>

      {booking.comment && (
        <div className="text-xs text-[var(--muted)] bg-[var(--paper)] p-2 rounded-lg border border-[var(--line)]">
          <span className="font-semibold text-[var(--ink)]">Примечание: </span>
          {booking.comment}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line)]/50">
        {onSelectAppointment && (
          <button
            type="button"
            onClick={() => onSelectAppointment(booking)}
            className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer min-h-[36px] pointer-coarse:min-h-[44px]"
            data-testid={`view-online-booking-details-btn-${booking.id}`}
          >
            Детали записи
          </button>
        )}
        <button
          type="button"
          disabled={false}
          onClick={handleDebouncedConfirm}
          aria-busy={isConfirming}
          className="primary-button dente-btn dente-btn-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer min-h-[36px] pointer-coarse:min-h-[44px] bg-[var(--teal)] hover:bg-[var(--teal-dark)]"
          data-testid={`confirm-online-booking-btn-${booking.id}`}
          data-test-confirm="slot"
        >
          {isConfirming ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Check size={13} className="shrink-0" />
          )}
          <span>{isConfirming ? "Подтверждение…" : "Подтвердить и занять слот"}</span>
        </button>
      </div>
    </div>
  );
};
