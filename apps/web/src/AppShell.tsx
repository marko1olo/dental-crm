import { Stethoscope } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { DirectMedicalInsertLauncher } from "./components/documents/DirectMedicalInsertLauncher";
import { DirectPricelistLauncher } from "./components/catalog/DirectPricelistLauncher";
import { DirectWarehouseLauncher } from "./components/inventory/DirectWarehouseLauncher";
import { DirectWarehouseMdlpLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/WarehouseMdlpLaunchers";
import { DirectOmnichannelStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/OmnichannelAndTelephonyStandaloneLauncher";
import { DirectPrescriptionLauncher } from "./components/prescriptions/DirectPrescriptionLauncher";
import { DirectDocumentsCatalogLauncher } from "./components/documents/DirectDocumentsCatalogLauncher";
import { DirectSanpinLauncher } from "./components/sanpin/DirectSanpinLauncher";
import { DirectImplantPassportLauncher } from "./components/implants/DirectImplantPassportLauncher";
import { DirectSurgeryLauncher } from "./components/surgery/DirectSurgeryLauncher";
import { DirectRadiologyLauncher } from "./components/radiology/DirectRadiologyLauncher";
import { DirectVisiographLauncher } from "./components/visiograph/DirectVisiographLauncher";
import { DirectFastCheckoutLauncher } from "./components/finance/DirectFastCheckoutLauncher";
import { DirectCashboxSsotLauncher } from "./components/finance/DirectCashboxSsotLauncher";
import { DirectCashboxLauncher } from "./components/cashbox/DirectCashboxLauncher";
import { DirectReportsLauncher } from "./components/reports/DirectReportsLauncher";
import { DirectDentalLabLauncher } from "./components/lab/DirectDentalLabLauncher";
import { DirectKnowledgeBaseLauncher } from "./components/knowledge/DirectKnowledgeBaseLauncher";
import { DirectWaitlistMatchesLauncher } from "./components/schedule/DirectWaitlistMatchesLauncher";
import { DirectAppointmentBookingLauncher } from "./components/schedule/DirectAppointmentBookingLauncher";
import { DirectMarketingRoiLauncher } from "./components/analytics/DirectMarketingRoiLauncher";
import { DirectClinicalBundlesLauncher } from "./components/visit/DirectClinicalBundlesLauncher";
import { DirectVisitLauncher } from "./components/visit/DirectVisitLauncher";
import { DirectEmrLauncher } from "./components/emr/DirectEmrLauncher";
import { DirectCopilotLauncher } from "./components/copilot/DirectCopilotLauncher";
import { DirectInsuranceLauncher } from "./components/insurance/DirectInsuranceLauncher";
import { DirectPerioLauncher } from "./components/perio/DirectPerioLauncher";
import { DirectAnesthesiaLauncher } from "./components/anesthesia/DirectAnesthesiaLauncher";
import { DirectPatientCardLauncher } from "./components/patients/DirectPatientCardLauncher";
import { DirectRecallsLauncher } from "./components/recalls/DirectRecallsLauncher";
import { DirectOrthoLauncher } from "./components/orthodontics/DirectOrthoLauncher";
import { DirectPayrollLauncher } from "./components/payroll/DirectPayrollLauncher";
import { DirectTreatmentPlanLauncher } from "./components/treatment-plans/DirectTreatmentPlanLauncher";
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
		h.includes("appointment_booking") ||
		h.includes("quick_booking") ||
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
		s.includes("imaging") ||
		h.includes("imaging") ||
		s.includes("implant-passport") ||
		h.includes("implant-passport") ||
		s.includes("implants") ||
		h.includes("implants") ||
		s.includes("copilot_standalone") ||
		h.includes("copilot-standalone") ||
		s.includes("copilot_workspace") ||
		h.includes("copilot-workspace") ||
		h === "#copilot" ||
		h === "#ai" ||
		s.includes("copilot=1") ||
		s.includes("anesthesia") ||
		h.includes("anesthesia") ||
		s.includes("patient_card") ||
		h.includes("patient_card") ||
		s.includes("patient-card") ||
		h.includes("patient-card") ||
		s.includes("payroll") ||
		h.includes("payroll") ||
		s.includes("salary") ||
		h.includes("salary") ||
		s.includes("earnings") ||
		h.includes("earnings") ||
		s.includes("doctor-payout") ||
		h.includes("doctor-payout")
	);
}

export function AppShell() {
	const standalone = isStandaloneActive();
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
			<DirectImplantPassportLauncher />
			<DirectSurgeryLauncher />
			<DirectRadiologyLauncher />
			<DirectVisiographLauncher />
			<DirectFastCheckoutLauncher />
			<DirectCashboxSsotLauncher />
			<DirectCashboxLauncher />
			<DirectReportsLauncher />
			<DirectDentalLabLauncher />
			<DirectKnowledgeBaseLauncher />
			<DirectWaitlistMatchesLauncher />
			<DirectAppointmentBookingLauncher />
			<DirectMarketingRoiLauncher />
			<DirectClinicalBundlesLauncher />
			<DirectVisitLauncher />
			<DirectEmrLauncher />
			<DirectCopilotLauncher />
			<DirectInsuranceLauncher />
			<DirectPerioLauncher />
			<DirectAnesthesiaLauncher />
			<DirectPatientCardLauncher />
			<DirectRecallsLauncher />
			<DirectOrthoLauncher />
			<DirectPayrollLauncher />
			<DirectTreatmentPlanLauncher />
			<GlobalToast />
			<Suspense fallback={null}>
				<DiagnosticDrawer showTriggerButton={false} />
				<CopilotGlobalHost />
				<DentalAgentCockpit />
			</Suspense>
		</BootErrorBoundary>
	);
}
