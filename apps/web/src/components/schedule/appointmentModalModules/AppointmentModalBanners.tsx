import React from "react";
import { Check, Globe, Zap } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { AppointmentModalBannersProps } from "./appointmentModalTypes";

export type { AppointmentModalBannersProps };

export function AppointmentModalBanners({
  props,
  state,
  isNewAppointment,
}: AppointmentModalBannersProps) {
  const { appointment, onSave, onClose } = props;
  const {
    status,
    setStatus,
    doctorUserId,
    chairId,
    reason,
    comment,
    isCito,
  } = state;

  const isOnlineBooking = Boolean(
    (appointment?.comment &&
      /онлайн|виджет|online|сайт/i.test(appointment.comment)) ||
    (appointment?.reason &&
      /онлайн|виджет|online|сайт/i.test(appointment.reason)),
  );

  return (
    <>
      {/* Online Booking Notice Banner & 1-Click Confirmation */}
      {isOnlineBooking && (
        <div
          className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-cyan-100 flex items-center justify-between gap-3 text-xs"
          data-testid="modal-online-booking-banner"
        >
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">Онлайн-запись через сайт</span>
            <span className="text-[var(--muted)] text-xs hidden sm:inline">Слот забронирован пациентом</span>
          </div>
          {status === "planned" && (
            <button
              type="button"
              onClick={async () => {
                setStatus("confirmed");
                if (appointment?.id && !isNewAppointment) {
                  try {
                    const res = await fetch(`/api/appointments/${appointment.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "confirmed" }),
                    });
                    if (res.ok) {
                      showToast("Запись подтверждена! Слот зафиксирован.", "success");
                      if (typeof onSave === "function") {
                        await onSave(appointment.id, {
                          ...appointment,
                          // Без явного выбора — null: сервер резолвит реального
                          // врача/кресло из БД. «chair-default» не был алиасом
                          // сервера и ломал сохранение невалидным идентификатором.
                          doctorUserId: appointment.doctorUserId || doctorUserId || null,
                          chairId: appointment.chairId || chairId || null,
                          reason: appointment.reason || reason || "",
                          comment: appointment.comment || comment || "",
                          assistantUserId: appointment.assistantUserId ?? null,
                          status: "confirmed",
                        } as any);
                      }
                      onClose();
                    }
                  } catch {
                    // Fallback
                  }
                }
              }}
              className="h-8 min-h-[32px] px-3 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-xs"
              title="Подтвердить и занять слот"
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
            <Zap size={15} className="text-rose-600 dark:text-rose-400 shrink-0 fill-current" />
            <span className="font-bold text-xs sm:text-sm">Экстренная запись: острая боль</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold uppercase shrink-0">
            СРОЧНО
          </span>
        </div>
      )}
    </>
  );
}
