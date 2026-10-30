/**
 * Standalone Launchers Hub (3D CBCT, Consent, Ceph, EGISZ, OPG, SBP, Receipts, etc.)
 * Layer 5: Canonical Master Coordinator & Presentation Facade (<= 250 lines)
 */

import React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { Tooth46InspectionStand } from "../../odontogram/gate0/Tooth46InspectionStand";
import { PatientOmnichannelHubModal } from "../../messaging/PatientOmnichannelHubModal";
import { DocumentsView } from "../../../DocumentsView";
import { EmkComplaintsSection } from "../../visit/emk/EmkComplaintsSection";
import { DirectCopilotLauncher } from "../../copilot/DirectCopilotLauncher";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";
import { renderPayrollLauncher } from "./standalone/PayrollStandaloneLauncher";
import { renderReportsStandaloneLauncher } from "./standalone/ReportsStandaloneLauncher";
import { renderSpecializedAdministrativeLaunchers } from "./standalone/SpecializedAdministrativeLaunchers";
import { renderSpecializedClinicalLaunchers } from "./standalone/SpecializedClinicalLaunchers";
import { StandaloneClinicalTemplatesHost } from "./standalone/clinical/StandaloneClinicalTemplatesHost";
import { StandaloneEmrMedicalRecordHost } from "./standalone/clinical/StandaloneEmrMedicalRecordHost";
import { StandalonePatientCardHost } from "./standalone/clinical/StandalonePatientCardHost";
import { DirectVisitLauncher } from "../../visit/DirectVisitLauncher";
import { DirectSanpinLauncher } from "../../sanpin/DirectSanpinLauncher";
import { DirectSterilizationLauncher } from "../../sanpin/DirectSterilizationLauncher";
import { DirectVisiographLauncher } from "../../visiograph/DirectVisiographLauncher";
import { DirectCashRegisterLauncher } from "../../billing/DirectCashRegisterLauncher";
import { DirectWarehouseLauncher } from "../../inventory/DirectWarehouseLauncher";
import { DirectOdontogramLauncher } from "../../odontogram/DirectOdontogramLauncher";
import { DirectPatientLauncher } from "../../patients/DirectPatientLauncher";
import { DirectTelephonyLauncher } from "../../telephony/DirectTelephonyLauncher";
import { DirectScheduleLauncher } from "../../schedule/DirectScheduleLauncher";
import { DirectTreatmentPlanLauncher } from "../../treatment-plans/DirectTreatmentPlanLauncher";
import { DirectDentalLabLauncher } from "../../lab/DirectDentalLabLauncher";
import { DirectAnalyticsLauncher } from "../../analytics/DirectAnalyticsLauncher";
import { DirectOrthodonticsLauncher } from "../../orthodontics/DirectOrthodonticsLauncher";
import { clearUrlTokens, hasUrlToken } from "./standalone/deepLinkUrl";

export function renderStandaloneLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// Guard: Standalone demo launchers and synthetic fixtures are strictly isolated to demo showcase mode or dev environment
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) {
		return null;
	}

	// 0. Direct Dental Laboratory & Orthopedic Orders Studio Standalone Launcher (#lab, #dental-lab, #ztl, ?standalone=dental_lab, ?lab=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("standalone=dental_lab") ||
			window.location.search.includes("standalone=lab_order") ||
			window.location.search.includes("standalone=lab_hub") ||
			window.location.search.includes("tab=lab") ||
			window.location.search.includes("lab=1") ||
			window.location.search.includes("dental-lab=1") ||
			window.location.hash === "#lab" ||
			window.location.hash === "#ztl" ||
			window.location.hash === "#dental-lab" ||
			window.location.hash === "#lab-studio" ||
			window.location.hash === "#lab-orders" ||
			window.location.hash.includes("dental-lab") ||
			window.location.hash.includes("dental_lab"))
	) {
		return <DirectDentalLabLauncher />;
	}

	// 0. Direct Orthodontics Studio & Activation Protocol Standalone Launcher (#orthodontics, #ortho-protocol, ?orthodontics=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("orthodontics") ||
			window.location.hash.includes("orthodontics") ||
			window.location.search.includes("ortho-protocol") ||
			window.location.hash.includes("ortho-protocol") ||
			window.location.search.includes("ortho_protocol") ||
			window.location.hash.includes("ortho_protocol") ||
			window.location.hash.includes("ortho-studio"))
	) {
		return <DirectOrthodonticsLauncher />;
	}

	// 0. Direct Telephony Studio & Calls Journal Standalone Launcher (#telephony, #calls, #softphone, ?telephony=1, ?calls=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("telephony") ||
			window.location.hash.includes("telephony") ||
			window.location.search.includes("calls") ||
			window.location.hash.includes("calls") ||
			window.location.search.includes("softphone") ||
			window.location.hash.includes("softphone"))
	) {
		return <DirectTelephonyLauncher />;
	}

	// 0. Direct Chair Schedule Studio Standalone Launcher (#schedule-studio, #chair-schedule, ?schedule_studio=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("schedule_studio") ||
			window.location.hash.includes("schedule-studio") ||
			window.location.search.includes("chair-schedule") ||
			window.location.hash.includes("chair-schedule") ||
			window.location.hash === "#schedule" ||
			window.location.hash === "#appointments")
	) {
		return <DirectScheduleLauncher />;
	}

	// 0. Direct Treatment Plan Studio Standalone Launcher (#treatment-plans, #treatment-plan, #treatment-studio, ?treatment-plan=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("treatment-studio") ||
			window.location.hash.includes("treatment-studio") ||
			window.location.search.includes("treatment-plan") ||
			window.location.hash.includes("treatment-plan") ||
			window.location.search.includes("treatment_plan") ||
			window.location.hash.includes("treatment_plan") ||
			window.location.search.includes("treatment-plans") ||
			window.location.hash.includes("treatment-plans"))
	) {
		return <DirectTreatmentPlanLauncher />;
	}

	// 0. Direct Cash Register & Billing Checkout Studio Standalone Launcher (#billing-checkout, ?billing-checkout, #cashbox-studio)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("billing-checkout") || window.location.hash.includes("billing-checkout") ||
			window.location.search.includes("billing_checkout") || window.location.hash.includes("billing_checkout") ||
			window.location.search.includes("checkout-studio") || window.location.hash.includes("checkout-studio"))
	) {
		return <DirectCashRegisterLauncher />;
	}

	// 0. Direct Warehouse & Consumables Studio Standalone Launcher (#warehouse, #inventory-hub, ?warehouse=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("warehouse") || window.location.hash.includes("warehouse") ||
			window.location.search.includes("inventory-hub") || window.location.hash.includes("inventory-hub") ||
			window.location.search.includes("stock") || window.location.hash.includes("stock"))
	) {
		return <DirectWarehouseLauncher />;
	}

	// 0. Direct Chairside Visiograph (RVG) Launcher (?visiograph=1, #visiograph, ?rvg=1, #rvg, #rvg-studio)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("visiograph") || window.location.hash.includes("visiograph") ||
			window.location.search.includes("rvg") || window.location.hash.includes("rvg") ||
			window.location.search.includes("rvg-studio") || window.location.hash.includes("rvg-studio"))
	) {
		return <DirectVisiographLauncher />;
	}

	// 0. Direct Chairside Visit & EMR Diary Launcher (?visit_standalone=1, ?standalone=visit, #visit_standalone)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("visit_standalone") ||
			window.location.search.includes("standalone=visit") ||
			window.location.search.includes("chairside-visit") ||
			window.location.hash.includes("visit_standalone") ||
			window.location.hash.includes("chairside-visit"))
	) {
		return <DirectVisitLauncher />;
	}

	// 0. Direct Sterilization & Autoclave Hub (#sterilization, #sanpin-autoclave, #autoclave, ?sterilization=1, ?autoclave=1)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("sterilization") || window.location.hash.includes("sterilization") ||
			window.location.search.includes("autoclave") || window.location.hash.includes("autoclave") ||
			window.location.hash.includes("sanpin-autoclave"))
	) {
		return <DirectSterilizationLauncher />;
	}

	// 0. Direct SanPiN Production Control Hub (?sanpin=1, #sanpin)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("sanpin") || window.location.hash.includes("sanpin"))
	) {
		return <DirectSanpinLauncher />;
	}

	// 0. Direct Chairside Odontogram Studio Launcher (?odontogram=1, #odontogram, #dental-chart, #odontogram-studio)
	if (
		typeof window !== "undefined" &&
		!window.location.search.includes("odontogram-gate0") &&
		!window.location.hash.includes("odontogram-gate0") &&
		(window.location.search.includes("odontogram") ||
			window.location.hash.includes("odontogram") ||
			window.location.search.includes("dental-chart") ||
			window.location.hash.includes("dental-chart") ||
			window.location.search.includes("dental_chart") ||
			window.location.hash.includes("dental_chart"))
	) {
		return <DirectOdontogramLauncher />;
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

	// 0. EMK Complaints & Voice Dictation Standalone Host (?emk_complaints=1, #emk-complaints)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("emk_complaints") ||
			window.location.hash.includes("emk-complaints") ||
			window.location.search.includes("emk-complaints"))
	) {
		return (
			<div className="w-full min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-start max-w-4xl mx-auto box-border">
				<EmkComplaintsSection
					visitNoteForm={{
						complaint: "Ноющая боль в зубе 36 от сладкого и термических раздражителей, сохраняющаяся до 15-20 минут.",
						complaints: "Ноющая боль в зубе 36 от сладкого и термических раздражителей, сохраняющаяся до 15-20 минут.",
						anamnesis: "Соматически здоров. Аллергологический анамнез не отягощен. Хронические заболевания отрицает.",
					}}
					updateVisitNoteField={() => {}}
				/>
			</div>
		);
	}

	// 0. Copilot Assistant Standalone Launcher (?copilot_standalone=1, #copilot-standalone)
	if (
		typeof window !== "undefined" &&
		(window.location.search.includes("copilot_standalone") ||
			window.location.hash.includes("copilot-standalone") ||
			window.location.search.includes("copilot_drawer") ||
			window.location.hash.includes("copilot-drawer") ||
			window.location.search.includes("copilot_proof") ||
			window.location.hash.includes("copilot-proof"))
	) {
		return <DirectCopilotLauncher />;
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
				className="w-full min-h-screen p-3 sm:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] overflow-y-auto"
				data-testid="standalone-documents-catalog-root"
			>
				<DocumentsView />
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

	// 0. Electronic Medical Record (EMR) Standalone Launcher (?emr=1, #emr, ?medical-card=1)
	if (
		typeof window !== "undefined" &&
		(hasUrlToken(["emr", "medical-card", "form043", "card043"]))
	) {
		return (
			<StandaloneEmrMedicalRecordHost
				onClose={() => clearUrlTokens(["emr", "medical-card", "form043", "card043"])}
			/>
		);
	}

	// 0. Direct Patient Studio & Express Registration Launcher (#patients, #patient-studio, ?patients=1, ?patient_studio=1)
	if (
		typeof window !== "undefined" &&
		hasUrlToken(["patients", "patient-studio", "patient_studio", "express-patient", "express_patient"])
	) {
		return <DirectPatientLauncher />;
	}

	// 0. Patient Card 360 Standalone Launcher (?patient_card=1, #patient-card)
	if (
		typeof window !== "undefined" &&
		hasUrlToken(["patient-card", "patient_card"])
	) {
		return (
			<StandalonePatientCardHost
				onClose={() => clearUrlTokens(["patient-card", "patient_card"])}
			/>
		);
	}

	// 0. Doctor Payroll & Commission Launcher (?payroll=1, ?payout=1, #payroll)
	const payrollLauncher = renderPayrollLauncher();
	if (payrollLauncher) {
		return payrollLauncher;
	}

	// 0. Direct Executive Analytics Studio Launcher (#analytics, #dashboard, #executive-studio, ?analytics=direct)
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#analytics" ||
			window.location.hash === "#dashboard" ||
			window.location.hash === "#executive-studio" ||
			window.location.hash.includes("executive-studio") ||
			window.location.search.includes("executive_studio") ||
			window.location.search.includes("analytics=direct") ||
			window.location.search.includes("dashboard=direct"))
	) {
		return <DirectAnalyticsLauncher />;
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
