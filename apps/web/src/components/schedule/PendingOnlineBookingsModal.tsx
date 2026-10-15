import React, { useState } from "react";
import { Check, Clock, Globe, User, Phone, Stethoscope, Armchair, FileText, X } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface PendingOnlineBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingBookings: Appointment[];
  dashboard: Dashboard | null | undefined;
  loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | (() => void | Promise<void>) | undefined;
  onSelectAppointment?: ((app: Appointment) => void) | undefined;
}

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.message || errorJson?.error || "Не удалось подтвердить запись");
      }

      showToast("Запись подтверждена! Слот зафиксирован в расписании.", "success");
      if (typeof loadDashboard === "function") {
        await loadDashboard();
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Ошибка подтверждения записи",
        "error",
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const formatDateTime = (startsAt: string, endsAt?: string) => {
    try {
      const d = new Date(startsAt);
      const dateStr = d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        weekday: "short",
      });
      const startTime = d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = endsAt
        ? new Date(endsAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return `${dateStr}, ${startTime}${endTime ? ` - ${endTime}` : ""}`;
    } catch {
      return startsAt;
    }
  };

  const getDoctorName = (doctorId?: string | null) => {
    if (!doctorId) return "Любой свободный врач";
    const doc = dashboard?.clinicSettings?.staff?.find((s) => s.id === doctorId);
    return doc?.fullName || "Врач клиники";
  };

  const getChairName = (chairId?: string | null) => {
    if (!chairId) return "Кресло 1";
    const chair = dashboard?.clinicSettings?.chairs?.find((c) => c.id === chairId);
    return chair?.name || "Кресло";
  };

  const getPatientInfo = (booking: Appointment) => {
    const pat = dashboard?.patients?.find((p) => p.id === booking.patientId);
    if (pat) {
      return { name: pat.fullName, phone: pat.phone || null };
    }
    // Извлечение имени и телефона из комментария, если пациент новый
    const comment = booking.comment || "";
    const phoneMatch = comment.match(/(?:\+7|8)[\d\s\-()]{9,15}/);
    const nameMatch = comment.match(/Пациент:\s*([^,\n]+)/i);
    return {
      name: nameMatch?.[1] ? nameMatch[1].trim() : booking.patientId || "Пациент онлайн",
      phone: phoneMatch ? phoneMatch[0].trim() : null,
    };
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h2
                id="pending-online-bookings-title"
                className="font-bold text-base text-[var(--ink)] leading-tight"
              >
                Входящие онлайн-заявки с сайта
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Пациенты, забронировавшие слоты через публичный виджет
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-800 dark:text-cyan-200">
              {pendingBookings.length} {pendingBookings.length === 1 ? "заявка" : "заявок"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 min-h-0">
          {pendingBookings.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Check size={28} />
              </div>
              <h3 className="font-bold text-base text-[var(--ink)] mb-1">
                Все онлайн-заявки подтверждены
              </h3>
              <p className="text-sm text-[var(--muted)] max-w-sm mx-auto">
                Ожидающих подтверждения записей нет. Новые заявки с сайта появятся здесь автоматически.
              </p>
            </div>
          ) : (
            pendingBookings.map((booking) => {
              const patInfo = getPatientInfo(booking);
              const isConfirming = confirmingId === booking.id;

              return (
                <div
                  key={booking.id}
                  className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 hover:border-cyan-500/40 transition-colors space-y-3"
                  data-testid={`pending-online-booking-card-${booking.id}`}
                >
                  {/* Top: DateTime & Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                      <Clock size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>{formatDateTime(booking.startsAt, booking.endsAt)}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25">
                      Ожидает подтверждения
                    </span>
                  </div>

                  {/* Details Grid */}
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
                      <span>{getDoctorName(booking.doctorUserId ?? undefined)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--ink)]">
                      <Armchair size={13} className="text-[var(--muted)] shrink-0" />
                      <span>{getChairName(booking.chairId ?? undefined)}</span>
                    </div>
                    {booking.reason && (
                      <div className="flex items-center gap-2 text-[var(--ink)]">
                        <FileText size={13} className="text-[var(--muted)] shrink-0" />
                        <span className="truncate">{booking.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  {booking.comment && (
                    <div className="text-xs text-[var(--muted)] bg-[var(--paper)] p-2 rounded-lg border border-[var(--line)]">
                      <span className="font-semibold text-[var(--ink)]">Примечание: </span>
                      {booking.comment}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line)]/50">
                    {onSelectAppointment && (
                      <button
                        type="button"
                        onClick={() => onSelectAppointment(booking)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--ink)] transition-colors cursor-pointer"
                        data-testid={`view-online-booking-details-btn-${booking.id}`}
                      >
                        Детали записи
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirmBooking(booking)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      data-testid={`confirm-online-booking-btn-${booking.id}`}
                      data-test-confirm="slot"
                    >
                      <Check size={13} />
                      <span>{isConfirming ? "Подтверждение..." : "Подтвердить и занять слот"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
          <span>Подтверждение блокирует слот и отправляет уведомление пациенту</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--line)] hover:bg-[var(--line)]/80 text-[var(--ink)] font-semibold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingOnlineBookingsModal;
