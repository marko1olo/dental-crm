/**
 * DENTE Dental CRM — Root Application Shell Facade (Layer 5)
 * Mandate 8b (Architecture Decomposition), Mandate 8e (Doctor Autonomy),
 * Mandate 8n (1-3 Chairs Sovereignty).
 */

import React, { useEffect } from "react";
import { ClinicalErrorBoundary } from "./components/common/ClinicalErrorBoundary";
import { useAppLogic } from "./useAppLogic";
import { useAppStore } from "./store/appStore";
import { primaryViewToAppView, resolveClinicRoute } from "./router/routeResolver";
import {
	scheduleClinicalHotModulesWarmup,
	scheduleIdleWorkspacePreload,
} from "./workspacePreload";
import {
	AppBootScreens,
	AppModalsContainer,
	AppNavigationShell,
	AppSessionProviders,
	useAppHashRouting,
	useAppSessionAuth,
} from "./appModules";

export function App() {
	const appLogicValue = useAppLogic();
	const sessionAuth = useAppSessionAuth(appLogicValue.setSelectedWorkspaceRole);
	const routing = useAppHashRouting(
		appLogicValue.openDoctorShiftCockpit,
		sessionAuth.setShowStaffPinPad,
	);

	const { currentView, dashboard, loadDashboard, setCurrentView, setSettingsTab } = appLogicValue;

	useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);
	useEffect(() => scheduleClinicalHotModulesWarmup(), []);

	useEffect(() => {
		if (sessionAuth.clinicAuthed && sessionAuth.staffAuthed && !dashboard) {
			void loadDashboard();
		}
	}, [sessionAuth.clinicAuthed, sessionAuth.staffAuthed, dashboard, loadDashboard]);

	useEffect(() => {
		const syncFromLocation = () => {
			if (typeof window === "undefined") return;
			const resolved = resolveClinicRoute(window.location.search, window.location.hash);
			const nextAppView = primaryViewToAppView(resolved.view);
			if (nextAppView !== useAppStore.getState().currentView) {
				setCurrentView(nextAppView);
			}
			if (resolved.view === "pricelist") {
				setSettingsTab("prices");
			} else if (resolved.view === "settings" && resolved.subTab) {
				setSettingsTab(resolved.subTab);
			}
		};
		syncFromLocation();
		window.addEventListener("hashchange", syncFromLocation);
		window.addEventListener("popstate", syncFromLocation);
		return () => {
			window.removeEventListener("hashchange", syncFromLocation);
			window.removeEventListener("popstate", syncFromLocation);
		};
	}, [setCurrentView, setSettingsTab]);

	if (!sessionAuth.clinicAuthed || !sessionAuth.staffAuthed || sessionAuth.showStaffPinPad || !dashboard || appLogicValue.accessUnlockRequired || appLogicValue.error) {
		return <AppBootScreens sessionAuth={sessionAuth} appLogic={appLogicValue} />;
	}

	return (
		<AppSessionProviders appLogic={appLogicValue}>
			<ClinicalErrorBoundary workspaceName="Навигация приложения" workspaceKey="navigation">
				<AppNavigationShell appLogic={appLogicValue} sessionAuth={sessionAuth} routing={routing} />
			</ClinicalErrorBoundary>
			<ClinicalErrorBoundary workspaceName="Модальные окна и студии" workspaceKey="modals">
				<AppModalsContainer routing={routing} sessionAuth={sessionAuth} appLogic={appLogicValue} />
			</ClinicalErrorBoundary>
		</AppSessionProviders>
	);
}
