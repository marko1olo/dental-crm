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
	type AppTopBarProps,
} from "../components/appLayout";
import { TelephonyDrawer } from "../components/telephony/TelephonyDrawer";
import { preloadWorkspaceView } from "../workspacePreload";
import { type AppView } from "../workspaceShell";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";
import { resolveClinicMode } from "../lib/clinicCapabilities";
import { getVisibleRailViews, viewsHiddenByFeatureFlags } from "../workspaceShellModules/sidebarNavigationData";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";
import type { useAppLogic } from "../useAppLogic";
import type { CommunicationTask, GeneratedDocument, ImagingSourceKind, ImagingStudy, StaffRole } from "@dental/shared";
import type { ClinicProfileDraft } from "../components/onboarding/wizard/types";
import type { AdminSecretUnlockDomain } from "../constants/uiPreferencesConstants";

interface AppNavigationShellProps {
	appLogic: ReturnType<typeof useAppLogic>;
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

	const topBarProps: AppTopBarProps = {
		...appLogic,
		continueOnboardingInDraftMode: (view?: string) => {
			if (typeof appLogic.continueOnboardingInDraftMode === "function") {
				return appLogic.continueOnboardingInDraftMode(view as AppView | undefined);
			}
		},
		moveOnboardingTo: (step: string | number) => {
			if (typeof appLogic.moveOnboardingTo === "function") {
				return appLogic.moveOnboardingTo(step as Parameters<typeof appLogic.moveOnboardingTo>[0]);
			}
		},
		onboardingFinishGuidanceId: appLogic.onboardingFinishGuidanceId ?? "onboarding-finish-guidance",
		onboardingStaffCreateGuidanceId: appLogic.onboardingStaffCreateGuidanceId ?? "onboarding-staff-create-guidance",
		onboardingChairCreateGuidanceId: appLogic.onboardingChairCreateGuidanceId ?? "onboarding-chair-create-guidance",
		telegramReminderLeadTimesDraft: Array.isArray(appLogic.telegramReminderLeadTimesDraft)
			? appLogic.telegramReminderLeadTimesDraft.map(String).join(",")
			: String(appLogic.telegramReminderLeadTimesDraft ?? ""),
		telegramAdminSecretSession: Boolean(appLogic.telegramAdminSecretSession),
		setTelegramPrivacyModeDraft: (mode: string) => {
			if (typeof appLogic.setTelegramPrivacyModeDraft === "function") {
				if (mode === "no_phi_by_default" || mode === "limited_admin_only" || mode === "consented_phi_templates") {
					appLogic.setTelegramPrivacyModeDraft(mode);
				}
			}
		},
		telegramHandoffNotice:
			appLogic.telegramHandoffNotice &&
			typeof appLogic.telegramHandoffNotice === "object"
				? appLogic.telegramHandoffNotice
				: null,
		dashboard,
		clinicName: dashboard?.clinicName ?? "",
		todayIso: dashboard?.todayIso ?? new Date().toISOString().slice(0, 10),
		defaultClinicNoticeHidden,
		setDefaultClinicNoticeHidden,
		handleLockSession: sessionAuth.handleLockSession,
		openDoctorShiftCockpit: appLogic.openDoctorShiftCockpit ?? (() => {}),
		setIsCbctDirectModalOpen: routing.setIsCbctDirectModalOpen,
		isStripDismissedLocally,
		setIsStripDismissedLocally,
		setUiLanguage: (lang: string) => {
			if (lang === "ru" || lang === "en") {
				appLogic.setUiLanguage(lang);
			}
		},
		updateClinicProfileDraft: (fieldOrPatch: string | Partial<ClinicProfileDraft>, value?: unknown) => {
			if (typeof fieldOrPatch === "string") {
				appLogic.updateClinicProfileDraft?.(fieldOrPatch, value);
			} else if (fieldOrPatch && typeof fieldOrPatch === "object") {
				Object.entries(fieldOrPatch).forEach(([k, v]) => {
					appLogic.updateClinicProfileDraft?.(k, v);
				});
			}
		},
		addStaffMember: async () => {
			if (typeof appLogic.addStaffMember === "function") {
				await (appLogic.addStaffMember as (role?: StaffRole) => Promise<unknown>)(appLogic.newStaffRole as StaffRole);
			}
		},
		saveStaffSchedule: async (staffId: string) => {
			if (typeof appLogic.saveStaffSchedule === "function") {
				await appLogic.saveStaffSchedule(staffId);
			}
		},
		saveChairSchedule: async (chairId: string) => {
			if (typeof appLogic.saveChairSchedule === "function") {
				await appLogic.saveChairSchedule(chairId);
			}
		},
		imagingImportSourceKind: (appLogic.imagingImportSourceKind as ImagingSourceKind | undefined) ?? "manual_upload",
		setImportPreview: (preview: unknown) => {
			if (typeof appLogic.setImportPreview === "function") {
				(appLogic.setImportPreview as (p: unknown) => void)(preview);
			}
		},
		setImportCommit: (commit: unknown) => {
			if (typeof appLogic.setImportCommit === "function") {
				(appLogic.setImportCommit as (c: unknown) => void)(commit);
			}
		},
		setSmartImportPreview: (preview: unknown) => {
			if (typeof appLogic.setSmartImportPreview === "function") {
				(appLogic.setSmartImportPreview as (p: unknown) => void)(preview);
			}
		},
		setSmartImportCommit: (commit: unknown) => {
			if (typeof appLogic.setSmartImportCommit === "function") {
				(appLogic.setSmartImportCommit as (c: unknown) => void)(commit);
			}
		},
		setImagingImportSourceKind: (kind: ImagingSourceKind) => {
			if (typeof appLogic.setImagingImportSourceKind === "function") {
				(appLogic.setImagingImportSourceKind as (k: ImagingSourceKind) => void)(kind);
			}
		},
		setImagingImportPreview: (preview: unknown) => {
			if (typeof appLogic.setImagingImportPreview === "function") {
				(appLogic.setImagingImportPreview as (p: unknown) => void)(preview);
			}
		},
		setImagingImportCommit: (commit: unknown) => {
			if (typeof appLogic.setImagingImportCommit === "function") {
				(appLogic.setImagingImportCommit as (c: unknown) => void)(commit);
			}
		},
		setDicomSeriesPreview: (preview: unknown) => {
			if (typeof appLogic.setDicomSeriesPreview === "function") {
				(appLogic.setDicomSeriesPreview as (p: unknown) => void)(preview);
			}
		},
		setDicomViewerLaunchManifest: (manifest: unknown) => {
			if (typeof appLogic.setDicomViewerLaunchManifest === "function") {
				(appLogic.setDicomViewerLaunchManifest as (m: unknown) => void)(manifest);
			}
		},
		setDicomViewerToolStateBundle: (bundle: unknown) => {
			if (typeof appLogic.setDicomViewerToolStateBundle === "function") {
				(appLogic.setDicomViewerToolStateBundle as (b: unknown) => void)(bundle);
			}
		},
		setDicomViewerWorkbenchManifest: (manifest: unknown) => {
			if (typeof appLogic.setDicomViewerWorkbenchManifest === "function") {
				(appLogic.setDicomViewerWorkbenchManifest as (m: unknown) => void)(manifest);
			}
		},
		setDicomWebCheck: (check: unknown) => {
			if (typeof appLogic.setDicomWebCheck === "function") {
				(appLogic.setDicomWebCheck as (c: unknown) => void)(check);
			}
		},
		setDicomWebEndpointUrl: (url: string) => {
			if (typeof appLogic.setDicomWebEndpointUrl === "function") {
				(appLogic.setDicomWebEndpointUrl as (u: string) => void)(url);
			}
		},
		unlockTelegramAdminSession: (domainOverride?: AdminSecretUnlockDomain) => {
			if (typeof appLogic.unlockTelegramAdminSession === "function") {
				(appLogic.unlockTelegramAdminSession as (d?: AdminSecretUnlockDomain) => void)(domainOverride);
			}
		},
	};

	const featureFlags = useWorkspaceProfile();
	const clinicMode = resolveClinicMode(dashboard?.clinicSettings?.profile?.mode);
	const hiddenByModules = viewsHiddenByFeatureFlags(featureFlags);
	const allowedMobileViews = getVisibleRailViews(selectedWorkspaceRole, clinicMode).filter(
		(v) => !hiddenByModules.includes(v),
	);

	return (
		<main className="app-shell">
			<AppSidebar
				currentView={currentView}
				selectedWorkspaceRole={selectedWorkspaceRole}
				sidebarCollapsed={sidebarCollapsed}
				toggleSidebarCollapsed={() => setSidebarCollapsed((c) => !c)}
				handleLockSession={sessionAuth.handleLockSession}
				setCurrentView={(view) => setCurrentView(view as AppView)}
			/>
			<AppViewRouter
				currentView={currentView}
				dashboard={dashboard}
				activeStaffUser={sessionAuth.activeStaffUser}
				activeVisitPatient={activeVisitPatient}
				activePatient={activePatient}
				activePatientInsight={activePatientInsight}
				activeCommunicationTasks={(activeCommunicationTasks ?? null) as readonly CommunicationTask[] | null}
				activeImagingStudies={(activeImagingStudies ?? null) as readonly ImagingStudy[] | null}
				activeUsableDocuments={(activeUsableDocuments ?? null) as readonly GeneratedDocument[] | null}
				patientId={(patientId ?? null) as string | null}
				clinicProfileDraft={clinicProfileDraft}
				appLogicValue={appLogic}
				topBar={<AppTopBar {...topBarProps} />}
				toastPortal={
					<AppToastPortal
						setCurrentView={(view) => setCurrentView(view as AppView)}
						setQuery={setQuery}
						setScheduleDateFilter={(date) => {
							if (typeof setScheduleDateFilter === "function") {
								setScheduleDateFilter(date);
							}
						}}
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
				allowedViews={allowedMobileViews}
			/>
			<TelephonyDrawer />
		</main>
	);
}
