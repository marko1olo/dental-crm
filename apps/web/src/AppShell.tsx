import { Stethoscope } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { DirectMedicalInsertLauncher } from "./components/documents/DirectMedicalInsertLauncher";
import { DirectPricelistLauncher } from "./components/catalog/DirectPricelistLauncher";
import { DirectWarehouseLauncher } from "./components/inventory/DirectWarehouseLauncher";
import { DirectWarehouseMdlpLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/WarehouseMdlpLaunchers";
import { DirectOmnichannelStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/OmnichannelAndTelephonyStandaloneLauncher";
import { DirectPrescriptionLauncher } from "./components/prescriptions/DirectPrescriptionLauncher";
import { DirectDocumentsCatalogLauncher } from "./components/documents/DirectDocumentsCatalogLauncher";
import { DirectDocumentsLauncher } from "./components/documents/DirectDocumentsLauncher";
import { DirectSanpinLauncher } from "./components/sanpin/DirectSanpinLauncher";
import { DirectImplantPassportLauncher } from "./components/implants/DirectImplantPassportLauncher";
import { DirectSurgeryLauncher } from "./components/surgery/DirectSurgeryLauncher";
import { DirectRadiologyLauncher } from "./components/radiology/DirectRadiologyLauncher";
import { DirectVisiographLauncher } from "./components/visiograph/DirectVisiographLauncher";
import { DirectFastCheckoutLauncher } from "./components/finance/DirectFastCheckoutLauncher";
import { DirectCashboxSsotLauncher } from "./components/finance/DirectCashboxSsotLauncher";
import { DirectCashboxLauncher } from "./components/cashbox/DirectCashboxLauncher";
import { DirectShiftLauncher } from "./components/shift/DirectShiftLauncher";
import { DirectCashierLauncher } from "./components/finance/DirectCashierLauncher";
import { DirectReportsLauncher } from "./components/reports/DirectReportsLauncher";
import { DirectDentalLabLauncher } from "./components/lab/DirectDentalLabLauncher";
import { DirectSettingsLauncher } from "./components/settings/DirectSettingsLauncher";
import { DirectKnowledgeBaseLauncher } from "./components/knowledge/DirectKnowledgeBaseLauncher";
import { DirectWaitlistMatchesLauncher } from "./components/schedule/DirectWaitlistMatchesLauncher";
import { DirectAppointmentLauncher } from "./components/schedule/DirectAppointmentLauncher";
import { DirectScheduleLauncher } from "./components/schedule/DirectScheduleLauncher";
import { DirectMarketingLauncher } from "./components/marketing/DirectMarketingLauncher";
import { DirectMarketingRoiLauncher } from "./components/analytics/DirectMarketingRoiLauncher";
import { DirectAnalyticsLauncher } from "./components/analytics/DirectAnalyticsLauncher";
import { DirectClinicalBundlesLauncher } from "./components/visit/DirectClinicalBundlesLauncher";
import { DirectVisitLauncher } from "./components/visit/DirectVisitLauncher";
import { DirectEmrLauncher } from "./components/emr/DirectEmrLauncher";
import { DirectCopilotLauncher } from "./components/copilot/DirectCopilotLauncher";
import { DirectChairsideHudLauncher } from "./components/copilot/DirectChairsideHudLauncher";
import { DirectInsuranceLauncher } from "./components/insurance/DirectInsuranceLauncher";
import { DirectLoyaltyLauncher } from "./components/loyalty/DirectLoyaltyLauncher";
import { DirectPerioLauncher } from "./components/perio/DirectPerioLauncher";
import { DirectAnesthesiaLauncher } from "./components/anesthesia/DirectAnesthesiaLauncher";
import { DirectPatientCardLauncher } from "./components/patients/DirectPatientCardLauncher";
import { DirectPatientStudioLauncher } from "./components/patients/DirectPatientStudioLauncher";
import { DirectRecallLauncher } from "./components/recalls/DirectRecallLauncher";
import { DirectRecallsLauncher } from "./components/recalls/DirectRecallsLauncher";
import { DirectOrthoLauncher } from "./components/orthodontics/DirectOrthoLauncher";
import { DirectOrthodonticsLauncher } from "./components/orthodontics/DirectOrthodonticsLauncher";
import { DirectPayrollLauncher } from "./components/payroll/DirectPayrollLauncher";
import { DirectTreatmentPlanLauncher } from "./components/treatment-plans/DirectTreatmentPlanLauncher";
import { DirectOdontogramLauncher } from "./components/odontogram/DirectOdontogramLauncher";
import { DirectGate0InspectionLauncher } from "./components/odontogram/DirectGate0InspectionLauncher";
import { DirectTelephonyLauncher } from "./components/telephony/DirectTelephonyLauncher";
import { DirectPublicBookingLauncher } from "./components/booking/DirectPublicBookingLauncher";
import { DirectConsentLauncher } from "./components/consents/DirectConsentLauncher";
import { DirectEndodonticsLauncher } from "./components/endo/DirectEndodonticsLauncher";
import { DirectOrthopedicsLauncher } from "./components/orthopedics/DirectOrthopedicsLauncher";
import { DirectHygieneLauncher } from "./components/hygiene/DirectHygieneLauncher";
import { DirectPediatricLauncher } from "./components/pediatric/DirectPediatricLauncher";
import { DirectLeadsLauncher } from "./components/leads/DirectLeadsLauncher";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useThemeStore } from "./store/themeStore";
import { ThemeBackground } from "./components/theme";
import "./theme.css";

const DentalWorkspace = lazy(() =>
	import("./App").then((module) => ({ default: module.App })),
);

const DiagnosticDrawer = lazy(() =>
	import("./components/diagnostics/DiagnosticDrawer").then((module) => ({
		default: module.DiagnosticDrawer,
	})),
);

const CopilotGlobalHost = lazy(() =>
	import("./components/copilot/CopilotGlobalHost").then((module) => ({
		default: module.CopilotGlobalHost,
	})),
);

const DentalAgentCockpit = lazy(() =>
	import("./components/ai/DentalAgentCockpit").then((module) => ({
		default: module.DentalAgentCockpit,
	})),
);

function ThemeController() {
	const themeMode = useThemeStore((state) => state.themeMode);
	const isAccessibilityMode = useThemeStore(
		(state) => state.isAccessibilityMode,
	);
	const a11yFontSize = useThemeStore((state) => state.a11yFontSize);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const applyTheme = () => {
			applyThemeToRoot(
				document.documentElement,
				resolveTheme(themeMode, media.matches, {
					isAccessibilityMode,
					a11yFontSize,
				}),
			);
		};

		applyTheme();
		if (themeMode !== "auto") return undefined;

		media.addEventListener("change", applyTheme);
		return () => media.removeEventListener("change", applyTheme);
	}, [themeMode, isAccessibilityMode, a11yFontSize]);

	return null;
}

function isStandaloneActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("standalone") ||
		h.includes("standalone") ||
		h.includes("cashbox") ||
		s.includes("cashbox") ||
		h.includes("checkout") ||
		s.includes("checkout") ||
		h.includes("cashier") ||
		s.includes("cashier") ||
		h.includes("kassa") ||
		s.includes("kassa") ||
		h.includes("odontogram") ||
		s.includes("odontogram") ||
		h.includes("dental-chart") ||
		s.includes("dental-chart") ||
		h.includes("odontogram-gate0") ||
		h.includes("odontogram-32") ||
		h.includes("odontogram-mandible") ||
		h.includes("arch32") ||
		s.includes("stand=arch32") ||
		h.includes("appointment_booking") ||
		h.includes("quick_booking") ||
		h.includes("appointment") ||
		s.includes("appointment") ||
		h.includes("quick-book") ||
		s.includes("quick-book") ||
		h.includes("booking-modal") ||
		h.includes("booking") ||
		s.includes("booking") ||
		h.includes("dental_lab") ||
		h.includes("lab") ||
		h.includes("ztl") ||
		s.includes("lab") ||
		s.includes("ztl") ||
		h.includes("waitlist") ||
		h.includes("visit_standalone") ||
		s.includes("visit_standalone") ||
		h.includes("chairside-visit") ||
		s.includes("chairside-visit") ||
		s.includes("inventory") ||
		h.includes("inventory") ||
		s.includes("warehouse") ||
		h.includes("warehouse") ||
		s.includes("inbound") ||
		h.includes("inbound") ||
		s.includes("sanpin") ||
		h.includes("sanpin") ||
		s.includes("sterilization") ||
		h.includes("sterilization") ||
		s.includes("autoclave") ||
		h.includes("autoclave") ||
		s.includes("documents") ||
		h.includes("documents") ||
		s.includes("consents") ||
		h.includes("consents") ||
		s.includes("docs-studio") ||
		h.includes("docs-studio") ||
		s.includes("documents_catalog") ||
		s.includes("document_templates") ||
		h.includes("documents-catalog") ||
		h.includes("documents_catalog") ||
		h.includes("document-templates") ||
		s.includes("consent_sign_drawer") ||
		s.includes("patient_consent_drawer") ||
		h.includes("consent-sign-drawer") ||
		h.includes("patient-consent-drawer") ||
		s.includes("radiology") ||
		h.includes("radiology") ||
		s.includes("visiograph") ||
		h.includes("visiograph") ||
		s.includes("rvg") ||
		h.includes("rvg") ||
		s.includes("implant-passport") ||
		h.includes("implant-passport") ||
		s.includes("implants") ||
		h.includes("implants") ||
		s.includes("surgery") ||
		h.includes("surgery") ||
		s.includes("extraction") ||
		h.includes("extraction") ||
		s.includes("copilot_standalone") ||
		h.includes("copilot-standalone") ||
		s.includes("copilot_workspace") ||
		h.includes("copilot-workspace") ||
		h.includes("chairside-hud") ||
		s.includes("chairside-hud") ||
		h.includes("hud") ||
		s.includes("hud") ||
		h === "#copilot" ||
		h === "#ai" ||
		s.includes("copilot=1") ||
		s.includes("anesthesia") ||
		h.includes("anesthesia") ||
		s.includes("patient_card") ||
		h.includes("patient_card") ||
		s.includes("patient-card") ||
		h.includes("patient-card") ||
		s.includes("patients") ||
		h.includes("patients") ||
		s.includes("patient-studio") ||
		h.includes("patient-studio") ||
		s.includes("express-patient") ||
		h.includes("express-patient") ||
		s.includes("payroll") ||
		h.includes("payroll") ||
		s.includes("salary") ||
		h.includes("salary") ||
		s.includes("earnings") ||
		h.includes("earnings") ||
		s.includes("doctor-payout") ||
		h.includes("doctor-payout") ||
		s.includes("telephony") ||
		h.includes("telephony") ||
		s.includes("calls") ||
		h.includes("calls") ||
		s.includes("softphone") ||
		h.includes("softphone") ||
		s.includes("schedule") ||
		h.includes("schedule") ||
		s.includes("appointments") ||
		h.includes("appointments") ||
		h.includes("chair-schedule") ||
		s.includes("presenter") ||
		h.includes("presenter") ||
		s.includes("treatment-plan") ||
		h.includes("treatment-plan") ||
		s.includes("treatment-plans") ||
		h.includes("treatment-plans") ||
		s.includes("treatment-studio") ||
		h.includes("treatment-studio") ||
		h.includes("plans") ||
		h.includes("estimates") ||
		s.includes("executive_studio") ||
		h.includes("executive-studio") ||
		s.includes("analytics=direct") ||
		s.includes("dashboard=direct") ||
		s.includes("reports") ||
		h.includes("reports") ||
		s.includes("leads") ||
		h.includes("leads") ||
		h.includes("crm-leads") ||
		h.includes("kanban") ||
		s.includes("settings") ||
		h.includes("settings") ||
		s.includes("clinic-setup") ||
		h.includes("clinic-setup") ||
		s.includes("clinic-requisites") ||
		h.includes("clinic-requisites")
	);
}

export function AppShell() {
	const [standalone, setStandalone] = useState<boolean>(() => isStandaloneActive());

	useEffect(() => {
		const update = () => setStandalone(isStandaloneActive());
		window.addEventListener("hashchange", update);
		window.addEventListener("popstate", update);
		return () => {
			window.removeEventListener("hashchange", update);
			window.removeEventListener("popstate", update);
		};
	}, []);
	return (
		<BootErrorBoundary audience="clinic">
			<ThemeController />
			<ThemeBackground />
			{!standalone && (
				<Suspense
					fallback={
						<main className="boot-state" aria-busy="true">
							<Stethoscope aria-hidden="true" className="boot-logo" />
							<h1>DENTE</h1>
							<p>Загрузка CRM</p>
						</main>
					}
				>
					<DentalWorkspace />
				</Suspense>
			)}
			<DirectMedicalInsertLauncher />
			<DirectPricelistLauncher />
			<DirectWarehouseLauncher />
			<DirectWarehouseMdlpLauncher />
			<DirectOmnichannelStandaloneLauncher />
			<DirectPrescriptionLauncher />
			<DirectSanpinLauncher />
			<DirectDocumentsCatalogLauncher />
			<DirectDocumentsLauncher />
			<DirectImplantPassportLauncher />
			<DirectSurgeryLauncher />
			<DirectRadiologyLauncher />
			<DirectVisiographLauncher />
			<DirectFastCheckoutLauncher />
			<DirectCashboxSsotLauncher />
			<DirectCashboxLauncher />
			<DirectShiftLauncher />
			<DirectCashierLauncher />
			<DirectReportsLauncher />
			<DirectDentalLabLauncher />
			<DirectKnowledgeBaseLauncher />
			<DirectWaitlistMatchesLauncher />
			<DirectAppointmentLauncher />
			<DirectScheduleLauncher />
			<DirectMarketingLauncher />
			<DirectMarketingRoiLauncher />
			<DirectAnalyticsLauncher />
			<DirectClinicalBundlesLauncher />
			<DirectVisitLauncher />
			<DirectEmrLauncher />
			<DirectCopilotLauncher />
			<DirectChairsideHudLauncher />
			<DirectInsuranceLauncher />
			<DirectLoyaltyLauncher />
			<DirectPerioLauncher />
			<DirectAnesthesiaLauncher />
			<DirectPatientCardLauncher />
			<DirectPatientStudioLauncher />
			<DirectRecallLauncher />
			<DirectRecallsLauncher />
			<DirectOrthoLauncher />
			<DirectOrthodonticsLauncher />
			<DirectPayrollLauncher />
			<DirectTreatmentPlanLauncher />
			<DirectOdontogramLauncher />
			<DirectGate0InspectionLauncher />
			<DirectTelephonyLauncher />
			<DirectPublicBookingLauncher />
			<DirectConsentLauncher />
			<DirectEndodonticsLauncher />
			<DirectOrthopedicsLauncher />
			<DirectHygieneLauncher />
			<DirectPediatricLauncher />
			<DirectLeadsLauncher />
			<DirectSettingsLauncher />
			<GlobalToast />
			<Suspense fallback={null}>
				<DiagnosticDrawer showTriggerButton={false} />
				<CopilotGlobalHost />
				<DentalAgentCockpit />
			</Suspense>
		</BootErrorBoundary>
	);
}
