/**
 * DENTE Dental CRM — Application Navigation Shell (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8d (Apple HIG / Studio Clinical Standard),
 * Mandate 8e (Doctor Autonomy), Mandate 8n (1-3 Chairs Sovereignty).
 */

import React, { useState } from "react";
import {
	AppMobileTabBar,
	AppSidebar,
	AppToastPortal,
	AppTopBar,
	AppViewRouter,
} from "../components/appLayout";
import { TelephonyDrawer } from "../components/telephony/TelephonyDrawer";
import { TelephonyFloatingWidget } from "../components/telephony/TelephonyFloatingWidget";
import { TelephonyToast } from "../components/telephony/TelephonyToast";
import { preloadWorkspaceView } from "../workspacePreload";
import { getFilteredAppViews } from "../workspaceShell";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";

interface AppNavigationShellProps {
	appLogic: any;
	sessionAuth: AppSessionAuthState;
	routing: AppHashRoutingState;
}

export function AppNavigationShell({ appLogic, sessionAuth, routing }: AppNavigationShellProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [defaultClinicNoticeHidden, setDefaultClinicNoticeHidden] = useState(false);
	const [isStripDismissedLocally, setIsStripDismissedLocally] = useState(
		() => typeof window !== "undefined" && localStorage.getItem("dente_onboarding_strip_dismissed") === "true",
	);

	const { dashboard, currentView, setCurrentView, selectedWorkspaceRole, activeVisitPatient, activePatient, activePatientInsight, activeCommunicationTasks, activeImagingStudies, activeUsableDocuments, patientId, clinicProfileDraft, setQuery, setScheduleDateFilter } = appLogic;

	const topBarProps = {
		dashboard,
		clinicName: dashboard.clinicName,
		todayIso: dashboard.todayIso,
		defaultClinicNoticeHidden,
		setDefaultClinicNoticeHidden,
		handleLockSession: sessionAuth.handleLockSession,
		openDoctorShiftCockpit: appLogic.openDoctorShiftCockpit,
		setIsCbctDirectModalOpen: routing.setIsCbctDirectModalOpen,
		isStripDismissedLocally,
		setIsStripDismissedLocally,
		...appLogic,
	};

	return (
		<main className="app-shell">
			<AppSidebar
				currentView={currentView}
				selectedWorkspaceRole={selectedWorkspaceRole}
				sidebarCollapsed={sidebarCollapsed}
				toggleSidebarCollapsed={() => setSidebarCollapsed((c) => !c)}
				handleLockSession={sessionAuth.handleLockSession}
				setCurrentView={setCurrentView}
			/>
			<AppViewRouter
				currentView={currentView}
				dashboard={dashboard}
				activeStaffUser={sessionAuth.activeStaffUser}
				activeVisitPatient={activeVisitPatient}
				activePatient={activePatient}
				activePatientInsight={activePatientInsight}
				activeCommunicationTasks={activeCommunicationTasks}
				activeImagingStudies={activeImagingStudies}
				activeUsableDocuments={activeUsableDocuments}
				patientId={patientId}
				clinicProfileDraft={clinicProfileDraft}
				appLogicValue={appLogic}
				topBar={<AppTopBar {...topBarProps} />}
				toastPortal={
					<AppToastPortal
						setCurrentView={setCurrentView}
						setQuery={setQuery}
						setScheduleDateFilter={setScheduleDateFilter}
					/>
				}
			/>
			<AppMobileTabBar
				currentView={currentView}
				onSelectView={(view) => {
					setCurrentView(view);
					if (typeof window !== "undefined") window.location.hash = view;
				}}
				onViewIntent={preloadWorkspaceView}
				allowedViews={getFilteredAppViews(selectedWorkspaceRole)}
			/>
			<TelephonyDrawer />
			<TelephonyFloatingWidget defaultExpanded={false} />
			<TelephonyToast />
		</main>
	);
}
