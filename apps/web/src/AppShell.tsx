import { Stethoscope } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { denteQueryClient } from "./lib/queryClient";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { DirectPricelistLauncher } from "./components/catalog/DirectPricelistLauncher";
import { DirectWarehouseLauncher } from "./components/inventory/DirectWarehouseLauncher";
import { DirectWarehouseMdlpLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/WarehouseMdlpLaunchers";
import { DirectOmnichannelStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/OmnichannelAndTelephonyStandaloneLauncher";
import { DirectTomorrowRemindersLauncher } from "./components/schedule/DirectTomorrowRemindersLauncher";
import { DirectPrescriptionLauncher } from "./components/prescriptions/DirectPrescriptionLauncher";
import { DirectDocumentsLauncher } from "./components/documents/DirectDocumentsLauncher";
import { DirectSanpinLauncher } from "./components/sanpin/DirectSanpinLauncher";
import { DirectCashboxLauncher } from "./components/cashbox/DirectCashboxLauncher";
import { DirectShiftLauncher } from "./components/shift/DirectShiftLauncher";
import { DirectDentalLabLauncher } from "./components/lab/DirectDentalLabLauncher";
import { StandalonePatientCardHost } from "./components/appLayout/modalsContainerModules/standalone/clinical/StandalonePatientCardHost";
import { DirectKnowledgeBaseLauncher } from "./components/knowledge/DirectKnowledgeBaseLauncher";
import { DirectWaitlistMatchesLauncher } from "./components/schedule/DirectWaitlistMatchesLauncher";
import { DirectMarketingLauncher } from "./components/marketing/DirectMarketingLauncher";
import { DirectLeadsStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/LeadsStandaloneLauncher";
import { DirectAnalyticsLauncher } from "./components/analytics/DirectAnalyticsLauncher";
import { DirectReportsLauncher } from "./components/appLayout/modalsContainerModules/standalone/ReportsStandaloneLauncher";
import { DirectClinicalBundlesLauncher } from "./components/visit/DirectClinicalBundlesLauncher";
import { DirectInsuranceLauncher } from "./components/insurance/DirectInsuranceLauncher";
import { DirectLoyaltyLauncher } from "./components/loyalty/DirectLoyaltyLauncher";
import { DirectRecallLauncher } from "./components/recalls/DirectRecallLauncher";
import { DirectOrthodonticsLauncher } from "./components/orthodontics/DirectOrthodonticsLauncher";
import { DirectDoctorWalletLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/DoctorWalletLaunchers";
import { DirectTreatmentPlanLauncher } from "./components/treatment-plans/DirectTreatmentPlanLauncher";
import { DirectTelephonyLauncher } from "./components/telephony/DirectTelephonyLauncher";
import { DirectPublicBookingLauncher } from "./components/booking/DirectPublicBookingLauncher";
import { DirectConsentLauncher } from "./components/consents/DirectConsentLauncher";
import { DirectPhotoProtocolLauncher } from "./components/photography/DirectPhotoProtocolLauncher";
import { DirectSurgeryLauncher } from "./components/surgery/DirectSurgeryLauncher";
import { DirectHygieneLauncher } from "./components/hygiene/DirectHygieneLauncher";
import { DirectPediatricLauncher } from "./components/pediatric/DirectPediatricLauncher";
import { DirectWarrantyLauncher } from "./components/warranty/DirectWarrantyLauncher";
import { DirectRvgCaptureLauncher } from "./components/radiology/DirectRvgCaptureLauncher";
import { DirectSettingsLauncher } from "./components/settings/DirectSettingsLauncher";
import { DirectHardwareLauncher } from "./components/hardware/DirectHardwareLauncher";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useThemeStore } from "./store/themeStore";
import { useAppStore } from "./store/appStore";
import { ThemeBackground } from "./components/theme";
import { CopilotGlobalHost } from "./components/copilot/CopilotGlobalHost";
import { Omnibar } from "./components/Omnibar";
import {
	extractHashRouteToken,
	isStandaloneActive,
	isStandalonePatientCardActive,
} from "./appModules/appRoutingHelpers";
import "./theme.css";

export { extractHashRouteToken, isStandaloneActive, isStandalonePatientCardActive };

const DentalWorkspace = lazy(() =>
	import("./App").then((module) => ({ default: module.App })),
);

const DiagnosticDrawer = lazy(() =>
	import("./components/diagnostics/DiagnosticDrawer").then((module) => ({
		default: module.DiagnosticDrawer,
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

function GlobalKeyboardShortcuts() {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "л" || e.key === "Л" || e.code === "KeyK")) {
				e.preventDefault();
				useAppStore.getState().setOmnibarOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
	return null;
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
		<QueryClientProvider client={denteQueryClient}>
			<BootErrorBoundary audience="clinic">
			<ThemeController />
			<ThemeBackground />
			<GlobalKeyboardShortcuts />
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
			<DirectPricelistLauncher />
			<DirectWarehouseLauncher />
			<DirectWarehouseMdlpLauncher />
			<DirectOmnichannelStandaloneLauncher />
			<DirectTomorrowRemindersLauncher />
			<DirectPrescriptionLauncher />
			<DirectSanpinLauncher />
			<DirectDocumentsLauncher />
			<DirectCashboxLauncher />
			<DirectShiftLauncher />
			<DirectDentalLabLauncher />
			<DirectKnowledgeBaseLauncher />
			<DirectWaitlistMatchesLauncher />
			<DirectMarketingLauncher />
			<DirectLeadsStandaloneLauncher />
			<DirectAnalyticsLauncher />
			<DirectReportsLauncher />
			<DirectClinicalBundlesLauncher />
			<DirectInsuranceLauncher />
			<DirectLoyaltyLauncher />
			<DirectRecallLauncher />
			<DirectOrthodonticsLauncher />
			<DirectDoctorWalletLauncher />
			<DirectTreatmentPlanLauncher />
			<DirectTelephonyLauncher />
			<DirectPublicBookingLauncher />
			<DirectConsentLauncher />
			<DirectPhotoProtocolLauncher />
			<DirectSurgeryLauncher />
			<DirectHygieneLauncher />
			<DirectPediatricLauncher />
			<DirectWarrantyLauncher />
			<DirectRvgCaptureLauncher />
			<DirectSettingsLauncher />
			<DirectHardwareLauncher />
			{standalone && isStandalonePatientCardActive() && (
				<StandalonePatientCardHost onClose={() => { window.location.hash = ""; setStandalone(false); }} />
			)}
			<GlobalToast />
			<CopilotGlobalHost />
			<Omnibar />
			<Suspense fallback={null}>
				<DiagnosticDrawer showTriggerButton={false} />
			</Suspense>
			</BootErrorBoundary>
		</QueryClientProvider>
	);
}
