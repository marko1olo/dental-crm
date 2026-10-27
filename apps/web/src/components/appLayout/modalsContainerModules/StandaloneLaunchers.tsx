/**
 * Standalone Launchers Hub (3D CBCT, Consent, Ceph, EGISZ, OPG, SBP, Receipts, etc.)
 * Layer 5: Canonical Master Coordinator & Presentation Facade (<= 250 lines)
 */

import type React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { Tooth46InspectionStand } from "../../odontogram/gate0/Tooth46InspectionStand";
import { PatientOmnichannelHubModal } from "../../messaging/PatientOmnichannelHubModal";
import { DocumentsTemplateGrid } from "../../../documentsView/DocumentsTemplateGrid";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";
import { renderPayrollLauncher } from "./standalone/PayrollStandaloneLauncher";
import { renderReportsStandaloneLauncher } from "./standalone/ReportsStandaloneLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./standalone/SpecializedAdministrativeLaunchers";
import { renderSpecializedClinicalLaunchers } from "./standalone/SpecializedClinicalLaunchers";
import { StandaloneClinicalTemplatesHost } from "./standalone/clinical/StandaloneClinicalTemplatesHost";
import { clearUrlTokens } from "./standalone/deepLinkUrl";

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
			window.location.hash.includes("odontogram-32") ||
			window.location.search.includes("odontogram-mandible") ||
			window.location.hash.includes("odontogram-mandible"))
	) {
		return <Tooth46InspectionStand />;
	}

	// 0. Omnichannel Messaging Hub Standalone Launcher (?omnichannel_hub=1, #omnichannel_hub)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("omnichannel_hub") ||
			window.location.hash.includes("omnichannel_hub") ||
			window.location.search.includes("messaging_hub") ||
			window.location.hash.includes("messaging_hub"))
	) {
		return (
			<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen bg-[var(--paper)] text-[var(--ink)] box-border flex flex-col overflow-hidden">
				<PatientOmnichannelHubModal isOpen={true} onClose={() => {}} portal={false} />
			</div>
		);
	}

	// 0. Documents Template Catalog Standalone Launcher (?documents_catalog=1, #documents-catalog)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("documents_catalog") ||
			window.location.hash.includes("documents-catalog") ||
			window.location.hash.includes("documents_catalog"))
	) {
		return (
			<div
				className="w-full min-h-screen p-4 sm:p-6 bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] overflow-y-auto"
				data-testid="standalone-documents-catalog-root"
			>
				<DocumentsTemplateGrid
					selectedDocumentKind="primary_intake_package"
					onSelectDocumentKind={() => {}}
					onCreateDocument={() => {}}
					onOpenFocusEditor={() => {}}
					activeCategoryTab="all"
					searchQuery=""
					onOpenPrimaryIntakePackage={() => {}}
				/>
			</div>
		);
	}

	// 0. Clinical Protocols & SOAP Templates Standalone Launcher (?protocols=1, #protocols)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("protocols") ||
			window.location.hash.includes("protocols") ||
			window.location.search.includes("clinical-templates") ||
			window.location.hash.includes("clinical-templates"))
	) {
		return (
			<StandaloneClinicalTemplatesHost
				onClose={() => clearUrlTokens(["protocols", "clinical-templates"])}
			/>
		);
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
