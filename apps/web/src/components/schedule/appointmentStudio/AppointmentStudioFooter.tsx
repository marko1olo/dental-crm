import React from "react";
import { Check } from "lucide-react";
import { formatSlotTimeRange } from "../appointmentCatalogData";

export interface AppointmentStudioFooterProps {
  startTime: string;
  durationMinutes: number;
  onSave: () => void;
}

export const AppointmentStudioFooter: React.FC<AppointmentStudioFooterProps> = ({
  startTime,
  durationMinutes,
  onSave,
}) => {
  return (
    <div className="appointment-studio-footer">
      <button
        type="button"
        disabled={false}
        onClick={onSave}
        className="appointment-studio-primary-cta"
        data-testid="studio-save-appointment-btn"
      >
        <Check size={18} strokeWidth={2.5} />
        <span>Записать на приём ({formatSlotTimeRange(startTime, durationMinutes)})</span>
      </button>
    </div>
  );
};
