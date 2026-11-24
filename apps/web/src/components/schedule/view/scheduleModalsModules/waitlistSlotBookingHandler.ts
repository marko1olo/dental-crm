import { generateUuidV7, type Dashboard, type CreateAppointmentInput } from "@dental/shared";
import { clientLogger } from "../../../../services/logging/clientLogger";
import type { AppLogicContextType } from "../../../../contexts/AppLogicContext";
import type { WaitlistCandidateItem } from "../../waitlist/waitlistTypes";
import type { TargetSlotInfo } from "./scheduleModalsTypes";
import { useScheduleStore } from "../../../../store/scheduleStore";

export interface BookWaitlistDashboard {
  clinicSettings?: {
    staff?: Array<{ id: string; role?: string; specialties?: string[] }>;
  };
  appointments?: Array<{ doctorUserId?: string | null }>;
  reloadAppointments?: () => Promise<void> | void;
  showNotification?: (msg: string, type?: string) => void;
}

export interface BookWaitlistSlotParams {
  candidate: WaitlistCandidateItem;
  slot: TargetSlotInfo;
  dashboard?: Dashboard | BookWaitlistDashboard | null | undefined;
  auth?: AppLogicContextType["auth"] | null | undefined;
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
          headers: {
            ...headers,
            "Idempotency-Key": generateUuidV7(),
          },
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
      const defaultDocFromStore = useScheduleStore.getState().scheduleDefaultDoctorUserId;
      const filterDocFromStore = useScheduleStore.getState().scheduleDoctorFilterId;
      const doctorUserId =
        slot.doctorUserId ||
        candidate.preferredDoctorId ||
        defaultDocFromStore ||
        filterDocFromStore ||
        dashboard?.clinicSettings?.staff?.find(
          (s: { id: string; role?: string }) => s.role === "doctor" || s.role === "dentist",
        )?.id ||
        (dashboard?.appointments as Array<{ doctorUserId?: string | null }> | undefined)?.[0]?.doctorUserId ||
        auth?.activeWorkspaceProfile?.id ||
        (auth as { user?: { id?: string } } | null | undefined)?.user?.id;

      if (!doctorUserId) {
        throw new Error("Не удалось определить врача для записи. Пожалуйста, укажите врача в расписании.");
      }

      const payload: CreateAppointmentInput = {
        patientId: candidate.patientId,
        doctorUserId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "planned",
        reason: candidate.treatmentCategory || "Запись из листа ожидания",
        comment: candidate.notes || undefined,
        ...(slot.chairId && slot.chairId.trim() ? { chairId: slot.chairId.trim() } : {}),
      };

      const createRes = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          ...headers,
          "Idempotency-Key": generateUuidV7(),
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(
          errData?.message || `Ошибка создания записи (${createRes.status})`,
        );
      }
    }

    // 3. Переводим заявку в листе ожидания в канонический статус 'fulfilled' на бэкенде
    const entryId = candidate.id;
    if (entryId) {
      const idempotencyKey = generateUuidV7();

      const waitlistHeaders: Record<string, string> = {
        ...headers,
        "Idempotency-Key": idempotencyKey,
      };

      const patchStatusRes = await fetch(
        `/api/waitlist/${encodeURIComponent(entryId)}/status`,
        {
          method: "PATCH",
          headers: waitlistHeaders,
          body: JSON.stringify({ status: "fulfilled" }),
        },
      );

      if (!patchStatusRes.ok) {
        // Запасной вызов PUT /api/waitlist/:id со статусом fulfilled
        await fetch(`/api/waitlist/${encodeURIComponent(entryId)}`, {
          method: "PUT",
          headers: {
            ...headers,
            "Idempotency-Key": generateUuidV7(),
          },
          body: JSON.stringify({ status: "fulfilled" }),
        }).catch((err) => {
          clientLogger.warn("[waitlistSlotBookingHandler] Fallback PUT /api/waitlist failed:", err);
        });
      }
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
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : (err as { message?: string })?.message || "Не удалось записать пациента из листа ожидания";
    if (typeof showToast === "function") {
      showToast(errorMsg, "error");
    }
    throw err;
  }
}
