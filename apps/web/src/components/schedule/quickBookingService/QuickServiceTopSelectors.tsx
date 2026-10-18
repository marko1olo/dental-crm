import React from "react";
import { QuickAppointmentTypeSelector, QuickSegmentedStatusHeader } from "./QuickPresetChipsBar";
import { SelectedServicesSummaryCard } from "./SelectedServicesSummaryCard";
import type { QuickBookingServiceSectionProps } from "./types";

type QuickServiceTopSelectorsProps = Pick<
  QuickBookingServiceSectionProps,
  | "appointmentType"
  | "handleSelectAppointmentType"
  | "status"
  | "setStatus"
  | "reason"
  | "setReason"
  | "initialSlot"
>;

export function QuickServiceTopSelectors({
  appointmentType,
  handleSelectAppointmentType,
  status,
  setStatus,
  reason,
  setReason,
  initialSlot,
}: QuickServiceTopSelectorsProps) {
  return (
    <>
      <QuickSegmentedStatusHeader
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
        status={status}
        setStatus={setStatus}
        reason={reason}
        setReason={setReason}
      />
      <SelectedServicesSummaryCard initialSlot={initialSlot} />
      <QuickAppointmentTypeSelector
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
      />
    </>
  );
}
