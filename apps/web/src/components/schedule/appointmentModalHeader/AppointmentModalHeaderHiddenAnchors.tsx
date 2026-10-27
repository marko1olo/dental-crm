import type { Dashboard } from "@dental/shared";
import React from "react";
import {
  handlePrintBlankConsent,
  handlePrintBlankContract,
} from "./headerPrintActions";

export interface AppointmentModalHeaderHiddenAnchorsProps {
  dashboard: Dashboard;
  patientId: string;
  currentPatientName: string;
}

export function AppointmentModalHeaderHiddenAnchors({
  dashboard,
  patientId,
  currentPatientName,
}: AppointmentModalHeaderHiddenAnchorsProps) {
  return (
    <>
      <button
        type="button"
        onClick={() =>
          handlePrintBlankContract(dashboard, patientId, currentPatientName)
        }
        className="sr-only"
        data-testid="appointment-modal-print-blank-contract-btn"
      >
        <span>Бланк договора</span>
      </button>
      <button
        type="button"
        onClick={() =>
          handlePrintBlankConsent(dashboard, patientId, currentPatientName)
        }
        className="sr-only"
        data-testid="appointment-modal-print-blank-consent-btn"
      >
        <span>ИДС</span>
      </button>
    </>
  );
}
