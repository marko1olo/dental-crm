/**
 * DENTE Dental CRM — Root Application Shell Facade (Layer 5)
 * Mandate 8b (Architecture Decomposition), Mandate 8e (Doctor Autonomy),
 * Mandate 8n (1-3 Chairs Sovereignty).
 */

import React, { useEffect } from "react";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { renderStandaloneLaunchers } from "./components/appLayout";
import { useAppLogic } from "./useAppLogic";
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

	const { currentView, dashboard, loadDashboard } = appLogicValue;

	useEffect(() => scheduleIdleWorkspacePreload(currentView), [currentView]);
	useEffect(() => scheduleClinicalHotModulesWarmup(), []);

	useEffect(() => {
		if (sessionAuth.clinicAuthed && sessionAuth.staffAuthed && !dashboard) {
			void loadDashboard();
		}
	}, [sessionAuth.clinicAuthed, sessionAuth.staffAuthed, dashboard, loadDashboard]);

	const standalone = renderStandaloneLaunchers(routing);
	if (standalone) {
		return (
			<AppLogicProvider value={appLogicValue}>{standalone}</AppLogicProvider>
		);
	}

	if (!sessionAuth.clinicAuthed || !sessionAuth.staffAuthed || sessionAuth.showStaffPinPad || !dashboard || appLogicValue.accessUnlockRequired || appLogicValue.error) {
		return <AppBootScreens sessionAuth={sessionAuth} appLogic={appLogicValue} />;
	}

	return (
		<AppSessionProviders appLogic={appLogicValue}>
			<AppNavigationShell appLogic={appLogicValue} sessionAuth={sessionAuth} routing={routing} />
			<AppModalsContainer routing={routing} sessionAuth={sessionAuth} appLogic={appLogicValue} />
		</AppSessionProviders>
	);
}
