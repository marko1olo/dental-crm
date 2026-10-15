/**
 * apps/web/src/components/schedule/useWaitlistSlotsDiscovery.ts
 * Slot discovery hook: finds free windows and fetches cancelled/freed slots from server.
 */

import { useEffect, useMemo, useState } from "react";
import { logger } from "../../utils/logger";
import { findDoctorFreeSlots } from "./doctorFreeSlotsEngine";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";

interface UseWaitlistSlotsDiscoveryParams {
  isOpen: boolean;
  targetSlot?: TargetSlotInfo | null | undefined;
  dashboard?: any;
  auth?: any;
}

export function useWaitlistSlotsDiscovery({
  isOpen,
  targetSlot,
  dashboard,
  auth,
}: UseWaitlistSlotsDiscoveryParams) {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [freedSlotsFromServer, setFreedSlotsFromServer] = useState<TargetSlotInfo[]>([]);

  const discoveredFreeSlots: TargetSlotInfo[] = useMemo(() => {
    if (targetSlot) return [targetSlot];
    const today = new Date().toISOString().slice(0, 10);
    const days = findDoctorFreeSlots({
      startDate: today,
      horizonDays: 3,
      durationMinutes: 30,
      appointments: dashboard?.appointments ?? [],
      chairs: dashboard?.clinicSettings?.chairs ?? [],
    });
    const list: TargetSlotInfo[] = [];
    for (const day of days) {
      for (const s of day.slots) {
        const doc = (dashboard?.clinicSettings?.staff ?? []).find((m: any) => m.id === s.doctorId);
        list.push({
          startsAt: s.startsAtIso,
          endsAt: s.endsAtIso,
          doctorUserId: s.doctorId,
          doctorName: doc?.fullName || doc?.name || "Дежурный врач",
          chairId: s.chairId,
          chairName: s.chairName,
          freedBecause: "Свободное окно в расписании",
        });
        if (list.length >= 6) break;
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [targetSlot, dashboard?.appointments, dashboard?.clinicSettings?.chairs, dashboard?.clinicSettings?.staff]);

  useEffect(() => {
    if (!isOpen || targetSlot) return;
    let isCancelled = false;
    async function fetchFreedSlots() {
      try {
        const res = await fetch("/api/schedule/freed-slots", {
          headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.slots)) {
            const mapped: TargetSlotInfo[] = data.slots.map((s: any) => ({
              appointmentId: s.appointmentId,
              startsAt: typeof s.startsAt === "string" ? s.startsAt : new Date(s.startsAt).toISOString(),
              endsAt: typeof s.endsAt === "string" ? s.endsAt : new Date(s.endsAt).toISOString(),
              doctorUserId: s.doctorUserId || null,
              doctorName: s.doctorName || "Дежурный врач",
              freedBecause: s.freedBecause || "приём отменён",
            }));
            setFreedSlotsFromServer(mapped);
          }
        }
      } catch (err) {
        logger.warn("Failed to load freed slots from server", err);
      }
    }
    void fetchFreedSlots();
    return () => { isCancelled = true; };
  }, [isOpen, targetSlot, auth]);

  const combinedDiscoveredSlots: TargetSlotInfo[] = useMemo(() => {
    if (targetSlot) return [targetSlot];
    const combined = [...freedSlotsFromServer];
    for (const slot of discoveredFreeSlots) {
      if (!combined.some((c) => c.startsAt === slot.startsAt && c.doctorUserId === slot.doctorUserId)) {
        combined.push(slot);
      }
      if (combined.length >= 8) break;
    }
    return combined.length > 0 ? combined : discoveredFreeSlots;
  }, [targetSlot, freedSlotsFromServer, discoveredFreeSlots]);

  const activeTargetSlot = targetSlot || combinedDiscoveredSlots[selectedSlotIndex] || null;

  return {
    selectedSlotIndex,
    setSelectedSlotIndex,
    combinedDiscoveredSlots,
    activeTargetSlot,
  };
}
