import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import type { SlotCellData } from "./types";

export const DEFAULT_EMPTY_SLOT_CELL_DATA: SlotCellData = {
  cellAppointments: [] as Appointment[],
  continuingAppointments: [] as Appointment[],
  cellMaintenance: [] as ChairMaintenanceBlock[],
};

export function calcBaseSlotHeightPx(gridStep?: number): number {
  return Math.max(38, Math.round(((gridStep || 15) / 15) * 38));
}

export function isMorningSlot(slot: string): boolean {
  const h = Number.parseInt(slot.slice(0, 2), 10);
  return Number.isFinite(h) ? h < 14 : true;
}

export function calcSlotStartMin(hour: string): number {
  const [sH, sM] = hour.split(":").map(Number);
  return (sH ?? 0) * 60 + (sM ?? 0);
}

export function calcAppointmentsSpan(
  appointments: Appointment[],
  gridStep: number,
  slotsListLength: number,
  hIndex: number,
): number {
  const maxSpan = Math.max(
    1,
    ...appointments.map((a) => {
      let duration = (a as any).durationMinutes;
      if (!duration && a.startsAt && a.endsAt) {
        const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
        if (!Number.isNaN(diffMs) && diffMs > 0) {
          duration = Math.round(diffMs / 60000);
        }
      }
      return Math.max(1, Math.round((duration || 30) / (gridStep || 30)));
    }),
  );
  return Math.min(maxSpan, slotsListLength - hIndex);
}

export function calcMaintenanceDuration(mBlock: ChairMaintenanceBlock): number {
  return mBlock.startsAt && mBlock.endsAt
    ? Math.round(
        (Date.parse(mBlock.endsAt) - Date.parse(mBlock.startsAt)) / 60000,
      )
    : 30;
}

export function getMaintenanceReasonLabel(mBlock: ChairMaintenanceBlock): string {
  return (
    mBlock.note ||
    (mBlock.reason === "sanitation"
      ? "Санитарная обработка"
      : mBlock.reason === "tech_break"
        ? "Технический перерыв"
        : mBlock.reason === "maintenance"
          ? "Техобслуживание"
          : mBlock.reason)
  );
}
