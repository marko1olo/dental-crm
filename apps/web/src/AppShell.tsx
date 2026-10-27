import { Stethoscope } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { DirectMedicalInsertLauncher } from "./components/documents/DirectMedicalInsertLauncher";
import { DirectPricelistLauncher } from "./components/catalog/DirectPricelistLauncher";
import { DirectWarehouseMdlpLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/WarehouseMdlpLaunchers";
import { DirectOmnichannelStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/OmnichannelAndTelephonyStandaloneLauncher";
import { DirectPrescriptionLauncher } from "./components/prescriptions/DirectPrescriptionLauncher";
import { DirectDocumentsCatalogLauncher } from "./components/documents/DirectDocumentsCatalogLauncher";
import { DirectSanPinStandaloneLauncher } from "./components/appLayout/modalsContainerModules/standalone/administrative/SanPinStandaloneLauncher";
import { DirectImplantPassportLauncher } from "./components/implants/DirectImplantPassportLauncher";
import { DirectFastCheckoutLauncher } from "./components/finance/DirectFastCheckoutLauncher";
import { DirectReportsLauncher } from "./components/reports/DirectReportsLauncher";
import { DirectDentalLabOrderLauncher } from "./components/lab/DirectDentalLabOrderLauncher";
import { DirectKnowledgeBaseLauncher } from "./components/knowledge/DirectKnowledgeBaseLauncher";
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

export function AppShell() {
	return (
		<BootErrorBoundary audience="clinic">
			<ThemeController />
			<ThemeBackground />
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
			<DirectMedicalInsertLauncher />
			<DirectPricelistLauncher />
			<DirectWarehouseMdlpLauncher />
			<DirectOmnichannelStandaloneLauncher />
			<DirectPrescriptionLauncher />
			<DirectSanPinStandaloneLauncher />
			<DirectDocumentsCatalogLauncher />
			<DirectImplantPassportLauncher />
			<DirectFastCheckoutLauncher />
			<DirectReportsLauncher />
			<DirectDentalLabOrderLauncher />
			<DirectKnowledgeBaseLauncher />
			<GlobalToast />
			<Suspense fallback={null}>
				<DiagnosticDrawer showTriggerButton={false} />
				<CopilotGlobalHost />
				<DentalAgentCockpit />
			</Suspense>
		</BootErrorBoundary>
	);
}
