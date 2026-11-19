import { useMemo } from "react";
import { type Dashboard, getPatientActiveLabStatus } from "@dental/shared";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { SEED_LAB_ORDERS } from "../lab/dentalLabCatalogData";

export interface QuickBookingLabCollisionInfo {
  hasCollision: boolean;
  message: string;
  orderNumber: string;
  dueDate: string;
  dueDateLocal: string;
  orderId?: string | undefined;
  workType?: string | undefined;
}

export interface UseQuickBookingCollisionParams {
  startsAtLocal: string;
  durationMinutes: number;
  doctorUserId: string;
  chairId: string;
  assistantUserId: string | null;
  patientId: string | null;
  appointmentType: QuickBookingAppointmentType;
  reason: string;
  editingAppointmentId: string | null;
  dashboard?: Dashboard | null | undefined;
  fromLocal: (local: string) => string;
  toLocal: (iso: string) => string;
}

export function useQuickBookingCollision({
  startsAtLocal,
  durationMinutes,
  doctorUserId,
  chairId,
  assistantUserId,
  patientId,
  appointmentType,
  reason,
  editingAppointmentId,
  dashboard,
  fromLocal,
  toLocal,
}: UseQuickBookingCollisionParams) {
  const collision = useMemo(() => {
    if (!startsAtLocal) {
      return {
        hasCollision: false,
        conflictType: null,
        conflictingAppointment: null,
        message: null,
        suggestedSlot: null,
        labCollision: null as QuickBookingLabCollisionInfo | null,
      };
    }
    const startsAtIso = fromLocal(startsAtLocal);
    const startMs = Date.parse(startsAtIso);
    const endsAtIso = new Date(startMs + durationMinutes * 60_000).toISOString();

    const resourceCollision = checkAppointmentResourceCollision(
      {
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        doctorUserId: doctorUserId || null,
        chairId: chairId || null,
        assistantUserId: assistantUserId || null,
        patientId: patientId || null,
        isCito: appointmentType === "emergency",
        reason,
      },
      dashboard?.appointments,
      {
        excludeAppointmentId: editingAppointmentId,
        staff: dashboard?.clinicSettings?.staff,
        chairs: dashboard?.clinicSettings?.chairs,
        patients: dashboard?.patients,
        formatTimeFn: (iso) => toLocal(iso).slice(11, 16),
        isCito: appointmentType === "emergency",
        allowCitoOverbooking: appointmentType === "emergency",
      },
    );

    // Проверка коллизии готовности работы ЗТЛ со временем визита (Мандат 8e / 8bd)
    let labCollision: QuickBookingLabCollisionInfo | null = null;
    const rawDashLab = dashboard && "labOrders" in dashboard
      ? (dashboard as { labOrders?: Array<Record<string, unknown>> }).labOrders
      : undefined;
    const labOrders = Array.isArray(rawDashLab) && rawDashLab.length > 0
      ? rawDashLab
      : (isDemoShowcaseMode()
          ? SEED_LAB_ORDERS.map((o) => ({
              id: o.id,
              orderNumber: typeof o.orderNumber === "string" ? o.orderNumber : `ЗТЛ-${o.orderNumber || 100}`,
              patientId: o.patientId || null,
              dueDate: o.dueDate,
              status: o.stage === "in_production" ? "in_progress" : o.stage === "in_clinic" ? "ready_in_clinic" : o.stage === "seated" ? "completed" : "sent",
              stage: o.stage,
              material: o.materialId,
              workTypeRu: o.notes,
            }))
          : undefined);
    if (patientId && startsAtLocal) {
      const activeLabStatus = getPatientActiveLabStatus(
        labOrders as any,
        patientId,
        startsAtIso,
      );
      if (
        activeLabStatus &&
        activeLabStatus.state !== "ready_in_clinic" &&
        activeLabStatus.dueDateIso
      ) {
        const dueMs = Date.parse(activeLabStatus.dueDateIso);
        if (Number.isFinite(dueMs) && startMs < dueMs) {
          const dueDateObj = new Date(dueMs);
          const dueDayMonthRu = `${String(dueDateObj.getDate()).padStart(2, "0")}.${String(dueDateObj.getMonth() + 1).padStart(2, "0")}.${dueDateObj.getFullYear()}`;
          const orderNum = activeLabStatus.orderNumber || (activeLabStatus.orderId ? `ЗТЛ-${activeLabStatus.orderId.slice(0, 6).toUpperCase()}` : "ЗТЛ");
          const workTypeStr = activeLabStatus.workTypeRu ? ` (${activeLabStatus.workTypeRu})` : "";
          labCollision = {
            hasCollision: true,
            message: `Работа по наряду ${orderNum}${workTypeStr} будет готова только ${dueDayMonthRu}. Визит назначен раньше срока готовности из ЗТЛ.`,
            orderNumber: orderNum,
            dueDate: activeLabStatus.dueDateIso,
            dueDateLocal: toLocal(activeLabStatus.dueDateIso),
            orderId: activeLabStatus.orderId,
            workType: activeLabStatus.workTypeRu || undefined,
          };
        }
      }
    }

    return {
      ...resourceCollision,
      labCollision,
    };
  }, [
    startsAtLocal,
    durationMinutes,
    doctorUserId,
    chairId,
    assistantUserId,
    patientId,
    appointmentType,
    editingAppointmentId,
    reason,
    fromLocal,
    toLocal,
    dashboard?.appointments,
    dashboard?.clinicSettings?.staff,
    dashboard?.clinicSettings?.chairs,
    dashboard?.patients,
    (dashboard as any)?.labOrders,
  ]);

  return collision;
}
