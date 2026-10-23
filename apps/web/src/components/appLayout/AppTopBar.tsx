/**
 * AppTopBar — Главная шапка CRM и системные полосы состояния (Мандат 8b, <= 120 строк).
 * Декомпозирован в подмодули apps/web/src/components/appLayout/topBarModules/
 */

import React from "react";
import { WorkspaceTopbar } from "../../workspaceShell";
import { preloadWorkspaceView } from "../../workspacePreload";
import {
	TopBarContinuitySection,
	TopBarEmergencyBell,
	TopBarModalsHost,
	TopBarNotices,
	TopBarOnboardingStrips,
} from "./topBarModules";
import type { AppTopBarProps } from "./types";

export function AppTopBar(props: AppTopBarProps) {
	const {
		dashboard,
		defaultClinicNoticeHidden,
		setDefaultClinicNoticeHidden,
		reopenOnboarding,
		goToVisitDictation,
		setSelectedWorkspaceRole,
		selectedWorkspaceRole,
		roleFocusOrder,
		showAdministrationTopActions,
		showDoctorVisitShortcut,
		staffRoleLabels,
		handleLockSession,
		openDoctorShiftCockpit,
		setIsCbctDirectModalOpen,
		activeCitoAlerts,
		dismissCitoAlert,
		currentView,
	} = props;

	return (
		<>
			<TopBarNotices
				clinicName={dashboard?.clinicName}
				defaultClinicNoticeHidden={defaultClinicNoticeHidden}
				setDefaultClinicNoticeHidden={setDefaultClinicNoticeHidden}
				reopenOnboarding={reopenOnboarding}
				error={props.error}
				setError={props.setError}
				uiPreferencesSyncError={props.uiPreferencesSyncError}
				setUiPreferencesSyncError={props.setUiPreferencesSyncError}
				telegramHandoffNotice={props.telegramHandoffNotice}
				setTelegramHandoffNotice={props.setTelegramHandoffNotice}
			/>

			<WorkspaceTopbar
				clinicName={dashboard?.clinicName || "Стоматология"}
				onGoToDictation={goToVisitDictation}
				onGoToSchedule={() => {
					if (typeof window !== "undefined") {
						const isSchedule = window.location.hash === "#schedule" || window.location.hash === "schedule";
						if (isSchedule) {
							window.dispatchEvent(new CustomEvent("dente-open-quick-booking"));
						} else {
							window.location.hash = "schedule";
						}
					}
				}}
				onGoToVisit={() => {
					if (typeof window !== "undefined") window.location.hash = "visit";
				}}
				onReopenOnboarding={reopenOnboarding}
				onRoleChange={setSelectedWorkspaceRole}
				onViewIntent={preloadWorkspaceView}
				roleFocusOrder={roleFocusOrder}
				selectedWorkspaceRole={selectedWorkspaceRole}
				showAdministrationTopActions={showAdministrationTopActions}
				showDoctorVisitShortcut={showDoctorVisitShortcut}
				staffRoleLabels={staffRoleLabels}
				todayIso={dashboard?.todayIso}
				onLockSession={handleLockSession}
				onOpenDoctorShiftCockpit={openDoctorShiftCockpit}
				onOpenCbctDemo={() => setIsCbctDirectModalOpen(true)}
				currentView={currentView as any}
			/>

			<TopBarEmergencyBell
				activeCitoAlerts={activeCitoAlerts}
				dismissCitoAlert={dismissCitoAlert}
				showSosButton={false}
			/>

			<TopBarContinuitySection {...props} />

			<TopBarOnboardingStrips {...props} />

			<TopBarModalsHost {...props} />
		</>
	);
}
