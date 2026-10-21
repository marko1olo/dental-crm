import React from "react";
import {
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
} from "./appointmentModalQuickReasons/quickReasonsPresets";
import { AppointmentReasonChips } from "./appointmentModalQuickReasons/AppointmentReasonChips";
import { AppointmentTechnicalBreakChips } from "./appointmentModalQuickReasons/AppointmentTechnicalBreakChips";

export {
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
};

export interface AppointmentModalQuickReasonsProps {
  onApplyReasonPreset: (preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => void;
  onApplyTechnicalBreakPreset: (preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => void;
}

export function AppointmentModalQuickReasons({
  onApplyReasonPreset,
  onApplyTechnicalBreakPreset,
}: AppointmentModalQuickReasonsProps) {
  return (
    <div className="space-y-2 mt-2" data-testid="appointment-quick-reasons">
      <AppointmentReasonChips onApplyReasonPreset={onApplyReasonPreset} />
      <AppointmentTechnicalBreakChips onApplyTechnicalBreakPreset={onApplyTechnicalBreakPreset} />
    </div>
  );
}
