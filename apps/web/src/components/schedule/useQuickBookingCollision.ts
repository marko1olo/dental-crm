import { useEffect, useMemo, useState } from "react";
import {
  type Dashboard,
  getPatientActiveLabStatus,
  type MinimalLabOrderForSchedule,
} from "@dental/shared";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { clientLogger } from "../../services/logging/clientLogger";
import { SEED_LAB_ORDERS } from "../lab/dentalLabCatalogData";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QuickBookingDashboard = Dashboard & {
  readonly labOrders?: readonly MinimalLabOrderForSchedule[] | undefined;
};

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
  dashboard?: QuickBookingDashboard | null | undefined;
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
  const [fetchedPatientLabOrders, setFetchedPatientLabOrders] = useState<readonly MinimalLabOrderForSchedule[]>([]);

  useEffect(() => {
    if (!patientId || !UUID_REGEX.test(patientId) || isDemoShowcaseMode()) {
      setFetchedPatientLabOrders([]);
      return;
    }
    let active = true;
    fetch(`/api/lab/orders?patientId=${encodeURIComponent(patientId)}`, {
      headers: denteClinicalReadHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) {
          clientLogger.warn("[useQuickBookingCollision] Failed to fetch patient lab orders", {
            status: res.status,
            patientId,
          }, { module: "Schedule" });
          return null;
        }
        return res.json();
      })
      .then((rawJson: unknown) => {
        if (!active || !rawJson) return;
        const payload =
          typeof rawJson === "object" && "data" in rawJson
            ? ((rawJson as { data?: unknown }).data ?? rawJson)
            : rawJson;
        if (Array.isArray(payload)) {
          setFetchedPatientLabOrders(payload as MinimalLabOrderForSchedule[]);
        } else if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)) {
          setFetchedPatientLabOrders((payload as { items: MinimalLabOrderForSchedule[] }).items);
        }
      })
      .catch((err) => {
        if (!active) return;
        clientLogger.warn("[useQuickBookingCollision] Network error loading patient lab orders", err, { module: "Schedule" });
      });

    return () => {
      active = false;
    };
  }, [patientId]);

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
    const rawDashLab = dashboard?.labOrders;
    const apptLabOrders: MinimalLabOrderForSchedule[] = [];
    for (const appt of dashboard?.appointments ?? []) {
      if (typeof appt !== "object" || appt === null || !("labOrder" in appt)) continue;
      const rawLabOrder = appt.labOrder;
      if (
        rawLabOrder &&
        typeof rawLabOrder === "object" &&
        "id" in rawLabOrder &&
        typeof rawLabOrder.id === "string"
      ) {
        const embedded = rawLabOrder as MinimalLabOrderForSchedule;
        apptLabOrders.push({
          ...embedded,
          patientId: embedded.patientId ?? appt.patientId ?? null,
        });
      }
    }
    const combinedOrdersById = new Map<string, MinimalLabOrderForSchedule>();
    for (const o of Array.isArray(rawDashLab) ? rawDashLab : []) {
      if (typeof o.id === "string" && o.id) {
        combinedOrdersById.set(o.id, o);
      }
    }
    for (const o of apptLabOrders) {
      if (o.id && !combinedOrdersById.has(o.id)) {
        combinedOrdersById.set(o.id, o);
      }
    }
    for (const o of fetchedPatientLabOrders) {
      if (o.id) {
        combinedOrdersById.set(o.id, o);
      }
    }
    const mergedLabOrders = Array.from(combinedOrdersById.values());
    const labOrders: readonly MinimalLabOrderForSchedule[] | undefined =
      mergedLabOrders.length > 0
        ? mergedLabOrders
        : (isDemoShowcaseMode()
            ? SEED_LAB_ORDERS.map((o) => ({
                id: o.id,
                orderNumber: typeof o.orderNumber === "string" ? o.orderNumber : `ЗТЛ-${o.orderNumber || 100}`,
                patientId: o.patientId || null,
                dueDate: o.dueDate,
                status: o.stage === "in_production" ? "in_progress" : o.stage === "in_clinic" ? "ready_in_clinic" : o.stage === "seated" ? "completed" : "sent",
                stage: o.stage,
                material: o.materialId,
                workTypeRu: o.notes ?? null,
              }))
            : undefined);
    if (patientId && startsAtLocal) {
      const activeLabStatus = getPatientActiveLabStatus(
        labOrders,
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
    dashboard?.labOrders,
    fetchedPatientLabOrders,
  ]);

  return collision;
}
