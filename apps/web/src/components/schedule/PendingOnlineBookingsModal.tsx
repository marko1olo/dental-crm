import React, { useState } from "react";
import { Globe, X } from "lucide-react";
import { generateUuidV7, type Appointment } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import type { PendingOnlineBookingsModalProps } from "./pendingOnlineBookingsTypes";
import { PendingOnlineBookingCard } from "./PendingOnlineBookingCard";
import { PendingOnlineBookingsEmptyState } from "./PendingOnlineBookingsEmptyState";

export type { PendingOnlineBookingsModalProps };

export const PendingOnlineBookingsModal: React.FC<PendingOnlineBookingsModalProps> = ({
  isOpen,
  onClose,
  pendingBookings,
  dashboard,
  loadDashboard,
  onSelectAppointment,
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmBooking = async (booking: Appointment) => {
    try {
      setConfirmingId(booking.id);
      const res = await fetch(`/api/appointments/${booking.id}`, {
        method: "PATCH",
        headers: denteClinicalMutationHeaders({
          "Content-Type": "application/json",
          "Idempotency-Key": generateUuidV7(),
        }),
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!res.ok) {
        let serverError: string | undefined;
        try {
          const errJson: unknown = await res.json();
          if (errJson && typeof errJson === "object") {
            if ("message" in errJson && typeof errJson.message === "string" && errJson.message) {
              serverError = errJson.message;
            } else if ("error" in errJson && typeof errJson.error === "string" && errJson.error) {
              serverError = errJson.error;
            }
          }
        } catch (parseErr) {
          if (parseErr instanceof Error) {
            serverError = undefined;
          }
        }
        throw new Error(serverError || `Не удалось подтвердить запись (HTTP ${res.status})`);
      }
      showToast("Запись подтверждена! Слот зафиксирован в расписании.", "success");
      if (typeof loadDashboard === "function") await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка подтверждения записи", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      data-testid="pending-online-bookings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-online-bookings-title"
    >
      <div className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] rounded-2xl shadow-2xl border border-[var(--line)] flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h2 id="pending-online-bookings-title" className="font-bold text-base text-[var(--ink)] leading-tight">
                Входящие онлайн-заявки с сайта
              </h2>
              <p className="text-xs text-[var(--muted)]">Пациенты, забронировавшие слоты через публичный виджет</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-800 dark:text-cyan-200">
              {pendingBookings.length} {pendingBookings.length === 1 ? "заявка" : "заявок"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 min-h-0">
          {pendingBookings.length === 0 ? (
            <PendingOnlineBookingsEmptyState />
          ) : (
            pendingBookings.map((booking) => (
              <PendingOnlineBookingCard
                key={booking.id}
                booking={booking}
                dashboard={dashboard}
                isConfirming={confirmingId === booking.id}
                onConfirm={handleConfirmBooking}
                onSelectAppointment={onSelectAppointment}
              />
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
          <span>Подтверждение блокирует слот и отправляет уведомление пациенту</span>
        </div>
      </div>
    </div>
  );
};

export default PendingOnlineBookingsModal;
