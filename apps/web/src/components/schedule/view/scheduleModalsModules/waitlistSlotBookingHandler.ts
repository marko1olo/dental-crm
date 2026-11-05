import type { WaitlistCandidateItem } from "../../waitlist/waitlistTypes";
import type { TargetSlotInfo } from "./scheduleModalsTypes";

export interface BookWaitlistSlotParams {
  candidate: WaitlistCandidateItem;
  slot: TargetSlotInfo;
  dashboard: any;
  auth: any;
  loadDashboard?: (() => Promise<void> | void) | undefined;
  showToast?: ((msg: string, type?: "success" | "error" | "warning" | "info", duration?: number) => void) | undefined;
  onSuccess: () => void;
}

/**
 * handleBookWaitlistSlot — Боевое бронирование слота из листа ожидания с реальным запросом в Fastify API
 * Мандат 8b / 8d: декомпозиция обработчика мутаций из ScheduleViewModals.tsx.
 */
export async function handleBookWaitlistSlot({
  candidate,
  slot,
  dashboard,
  auth,
  loadDashboard,
  showToast,
  onSuccess,
}: BookWaitlistSlotParams): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (auth?.denteClinicalMutationHeaders) {
      Object.assign(headers, auth.denteClinicalMutationHeaders());
    }

    // 1. Если у слота есть appointmentId (окно от отмененного приема), переводим его в planned
    if (slot.appointmentId) {
      const patchRes = await fetch(
        `/api/appointments/${encodeURIComponent(slot.appointmentId)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            patientId: candidate.patientId,
            status: "planned",
            reason: candidate.treatmentCategory || "Запись из листа ожидания",
            comment: `Окно занято из листа ожидания: ${candidate.patientName}`,
            expectedCurrentStatus: ["cancelled", "no_show"],
          }),
        },
      );

      if (!patchRes.ok) {
        const errData = await patchRes.json().catch(() => ({}));
        throw new Error(
          errData?.message || `Ошибка обновления слота (${patchRes.status})`,
        );
      }
    } else {
      // 2. Если appointmentId нет — создаем новую полноценную запись приема через POST /api/appointments
      const doctorUserId =
        slot.doctorUserId ||
        candidate.preferredDoctorId ||
        dashboard?.clinicSettings?.staff?.find(
          (s: any) => s.role === "doctor" || s.role === "dentist",
        )?.id ||
        dashboard?.appointments?.[0]?.doctorUserId;

      const payload: Record<string, any> = {
        patientId: candidate.patientId,
        doctorUserId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "planned",
        reason: candidate.treatmentCategory || "Запись из листа ожидания",
        notes: candidate.notes || undefined,
      };
      if (slot.chairId) {
        payload.chairId = slot.chairId;
      }

      const createRes = await fetch("/api/appointments", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(
          errData?.message || `Ошибка создания записи (${createRes.status})`,
        );
      }
    }

    // 3. Переводим заявку в листе ожидания в статус booked на бэкенде
    const entryId = candidate.id;
    if (entryId) {
      await fetch(`/api/waitlist/${encodeURIComponent(entryId)}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "booked" }),
      }).catch(() => {
        return fetch(`/api/waitlist/${encodeURIComponent(entryId)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ status: "booked" }),
        }).catch(() => {
          return fetch(`/api/waitlist/${encodeURIComponent(entryId)}/status`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status: "fulfilled" }),
          }).catch(() => {});
        });
      });
    }

    if (typeof showToast === "function") {
      showToast(
        `Пациент «${candidate.patientName}» успешно записан в расписание!`,
        "success",
        5000,
      );
    }

    if (typeof loadDashboard === "function") {
      await loadDashboard();
    }

    onSuccess();
  } catch (err: any) {
    if (typeof showToast === "function") {
      showToast(
        err?.message || "Не удалось записать пациента из листа ожидания",
        "error",
      );
    }
    throw err;
  }
}
