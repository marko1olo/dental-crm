/**
 * Standalone Launchers Hub (3D CBCT, Consent, Ceph, EGISZ, OPG, SBP, Receipts, etc.)
 * Layer 5: Canonical Master Coordinator & Presentation Facade (<= 250 lines)
 */

import type React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { Tooth46InspectionStand } from "../../odontogram/gate0/Tooth46InspectionStand";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";
import { renderPayrollLauncher } from "./standalone/PayrollStandaloneLauncher";
import { renderReportsStandaloneLauncher } from "./standalone/ReportsStandaloneLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./standalone/SpecializedAdministrativeLaunchers";
import { renderSpecializedClinicalLaunchers } from "./standalone/SpecializedClinicalLaunchers";

export function renderStandaloneLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// Guard: Standalone demo launchers and synthetic fixtures are strictly isolated to demo showcase mode or dev environment
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) {
		return null;
	}

	// 0. Gate 0 Odontogram Tooth 46 Stand & 32-Tooth Full Arch Mockup Launcher
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("odontogram-gate0") ||
			window.location.hash.includes("odontogram-gate0") ||
			window.location.search.includes("odontogram-32") ||
			window.location.hash.includes("odontogram-32"))
	) {
		return <Tooth46InspectionStand />;
	}

	// 0. Doctor Payroll & Commission Launcher (?payroll=1, ?payout=1, #payroll)
	const payrollLauncher = renderPayrollLauncher();
	if (payrollLauncher) {
		return payrollLauncher;
	}

	// 0. Executive Analytics & Reports Standalone Launcher (?reports=1, #reports, ?analytics=1)
	const reportsLauncher = renderReportsStandaloneLauncher();
	if (reportsLauncher) {
		return reportsLauncher;
	}

	// 1. Clinical Launchers (CBCT, Ceph, CT, OPG, Consent, Presentation)
	const clinicalLauncher = renderSpecializedClinicalLaunchers(props);
	if (clinicalLauncher) {
		return clinicalLauncher;
	}

	// 2. Administrative & Financial Launchers (EGISZ, Slot recovery, DMS, Scenarios, Presenter, SBP, Receipt)
	const administrativeLauncher =
		renderSpecializedAdministrativeLaunchers(props);
	if (administrativeLauncher) {
		return administrativeLauncher;
	}

	return null;
}
