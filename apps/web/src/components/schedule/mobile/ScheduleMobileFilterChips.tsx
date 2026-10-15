import React from "react";
import { Users, User, Armchair } from "lucide-react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import { useScheduleStore } from "../../../store/scheduleStore";

export interface ScheduleMobileFilterChipsProps {
  selectedDoctorId: string | null;
  selectedChairId: string | null;
  doctors: any[];
  chairs: any[];
  onSelectDoctor?: ((id: string | null) => void) | undefined;
  onSelectChair?: ((id: string | null) => void) | undefined;
}

export const ScheduleMobileFilterChips: React.FC<ScheduleMobileFilterChipsProps> = ({
  selectedDoctorId,
  selectedChairId,
  doctors,
  chairs,
  onSelectDoctor,
  onSelectChair,
}) => {
  return (
    <div className="schedule-mobile-chips-wrapper">
      <div className="schedule-mobile-chips-scroller">
        <button
          type="button"
          className={`schedule-mobile-filter-chip ${!selectedDoctorId && !selectedChairId ? "active" : ""}`}
          onClick={() => {
            useScheduleStore.getState().setScheduleDoctorFilterId(null);
            useScheduleStore.getState().setScheduleChairFilterId(null);
            if (onSelectDoctor) onSelectDoctor(null);
            if (onSelectChair) onSelectChair(null);
          }}
        >
          <Users size={13} className="shrink-0" />
          <span>Все врачи и кабинеты</span>
        </button>

        {doctors.map((doc: any) => {
          const isSelected = selectedDoctorId === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              className={`schedule-mobile-filter-chip ${isSelected ? "active" : ""}`}
              onClick={() => {
                const nextVal = isSelected ? null : doc.id;
                useScheduleStore.getState().setScheduleDoctorFilterId(nextVal);
                if (onSelectDoctor) onSelectDoctor(nextVal);
              }}
            >
              <User size={13} />
              <span>{formatDoctorShortName(doc.fullName)}</span>
            </button>
          );
        })}

        {chairs.map((chair: any) => {
          const isSelected = selectedChairId === chair.id;
          return (
            <button
              key={chair.id}
              type="button"
              className={`schedule-mobile-filter-chip ${isSelected ? "active" : ""}`}
              onClick={() => {
                const nextVal = isSelected ? null : chair.id;
                useScheduleStore.getState().setScheduleChairFilterId(nextVal);
                if (onSelectChair) onSelectChair(nextVal);
              }}
            >
              <Armchair size={13} className="shrink-0" />
              <span>{chair.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
