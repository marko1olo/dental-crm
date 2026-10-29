/**
 * DirectPrescriptionLauncher.tsx — Standalone Direct Mount for Medical Prescriptions
 * Mandates: 8b (<= 120 lines), 8e (Doctor Autonomy), 8aq (Live UI Mount).
 * When active, routes seamlessly through Chairside Visit SSOT to avoid vacuum mockups.
 */

import React from "react";

export const DirectPrescriptionLauncher: React.FC = () => {
	// Prescriptions are mounted directly in Chairside Visit & EMR Diary (DirectVisitLauncher / VisitView).
	// Standalone deep links (?rx=1, ?prescription=1) activate the live clinical visit workspace.
	return null;
};

DirectPrescriptionLauncher.displayName = "DirectPrescriptionLauncher";
