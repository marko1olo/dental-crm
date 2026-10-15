import React from "react";
import { Clock, Plus } from "lucide-react";
import type { TimelineItem } from "./scheduleMobileAgendaTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";

export interface ScheduleMobileGapRowProps {
  item: Extract<TimelineItem, { type: "gap" }>;
  effectiveDateKey: string;
  selectedDoctorId: string | null;
  selectedChairId: string | null;
  onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
}

export const ScheduleMobileGapRow: React.FC<ScheduleMobileGapRowProps> = ({
  item,
  effectiveDateKey,
  selectedDoctorId,
  selectedChairId,
  onSlotClick,
}) => {
  return (
    <div
      className="schedule-mobile-gap-row"
      onClick={() => {
        if (onSlotClick) {
          onSlotClick({
            dateKey: effectiveDateKey,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            doctorUserId: selectedDoctorId || null,
            chairId: selectedChairId || null,
            durationMinutes: item.durationMinutes,
          });
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Свободное окно: ${item.durationMinutes} мин с ${item.startsAtLocal} до ${item.endsAtLocal}`}
    >
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-[var(--teal,#0d9488)]" />
        <span>
          Свободно ({item.durationMinutes} мин) · {item.startsAtLocal} – {item.endsAtLocal}
        </span>
      </div>
      <span className="text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1">
        <Plus size={14} /> Записать
      </span>
    </div>
  );
};
