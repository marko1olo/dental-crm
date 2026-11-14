import { useMemo, useRef, useState } from "react";
import { loadUiPreferences } from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { useAppStore } from "../../store/appStore";
import { useImagingStore } from "../../store/imagingStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useAuthLogic } from "../domains/useAuthLogic";
import { useCommunicationsQueries } from "../domains/useCommunicationsQueries";
import { useDashboardLoaderLogic } from "../domains/useDashboardLoaderLogic";
import { useImagingQueries } from "../domains/useImagingQueries";
import { useMigrationQueries } from "../domains/useMigrationQueries";
import { useStaffSettingsLogic } from "../domains/useStaffSettingsLogic";
import { buildAppLogicCompatibilityBag } from "./appLogicModules/appLogicCompatibilityBag";
import { useAppEmergencyHandlers } from "./appLogicModules/useAppEmergencyHandlers";
import { useAppNavigationSync } from "./appLogicModules/useAppNavigationSync";
import { useBillingModalLogic } from "./useBillingModalLogic";
import { useClinicalSessionLogic } from "./useClinicalSessionLogic";
import { useHotkeysController } from "./useHotkeysController";
import { useModalController } from "./useModalController";
import { useNavigationState } from "./useNavigationState";
import { useOfflineSyncLogic } from "./useOfflineSyncLogic";
import { usePatientSelectionState } from "./usePatientSelectionState";
import { useScheduleLogic } from "./useScheduleLogic";
import { useSettingsAndIntegrationsLogic } from "./useSettingsAndIntegrationsLogic";

import type { UseAppLogicReturn } from "./types";
export type * from "./types";

export function useAppLogic(): UseAppLogicReturn {
	const appStore = useAppStore();
	const settingsStore = useSettingsStore();
	const imagingStore = useImagingStore();

	const [soundNotificationsMuted, setSoundNotificationsMuted] = useState<boolean>(() => {
		return loadUiPreferences().soundNotificationsMuted ?? false;
	});
	const soundNotifications = useMemo(
		() => ({
			muted: soundNotificationsMuted,
			setMuted: setSoundNotificationsMuted,
			testOnlineBookingSound: () => {},
			testSlotEndSound: () => {},
		}),
		[soundNotificationsMuted],
	);

	const authRef = useRef<ReturnType<typeof useAuthLogic> | null>(null);
	const loadPersistenceHealthRef = useRef<(() => Promise<void>) | null>(null);
	const refreshSpeechRuntimeRef = useRef<((options?: { silent?: boolean }) => Promise<void> | void) | null>(null);
	const browserDirectoryInputRef = useRef<HTMLInputElement | null>(null);
	const browserMigrationInputRef = useRef<HTMLInputElement | null>(null);
	const paymentMutationIdRef = useRef<string | null>(null);
	const [recentPatientViewsVersion, setRecentPatientViewsVersion] = useState(0);

	const { loadDashboard } = useDashboardLoaderLogic({
		authRef,
		setDashboard: appStore.setDashboard,
		setAccessUnlockRequired: appStore.setAccessUnlockRequired,
		setAccessUnlockMessage: appStore.setAccessUnlockMessage,
		showToast,
		setError: appStore.setError,
		loadPersistenceHealthRef,
		refreshSpeechRuntimeRef,
	});

	const auth = useAuthLogic({
		setError: appStore.setError,
		loadDashboard,
		loadTelegramControlPlane: (options) =>
			settingsAndIntegrations.telegramSettingsModule.loadTelegramControlPlane(options),
	});
	authRef.current = auth;

	const navigationState = useNavigationState({ dashboard: appStore.dashboard });
	const { currentView, setCurrentView, settingsTab, setSettingsTab } = navigationState;

	const patientSelection = usePatientSelectionState({
		auth,
		dashboard: appStore.dashboard,
		setError: appStore.setError,
		setDashboard: appStore.setDashboard,
		clinicProfileDraft: appStore.clinicProfileDraft,
		activeOrganizationId:
			appStore.dashboard?.clinicSettings?.profile?.organizationId ?? null,
	});

	const scheduleLogic = useScheduleLogic({
		dashboard: appStore.dashboard,
		setDashboard: appStore.setDashboard,
		auth,
		setError: appStore.setError,
		selectedPatientId: patientSelection.selectedPatientId ?? "",
		setSelectedPatientId: patientSelection.setSelectedPatientId,
		loadDashboard,
		selectedSpecialty: "",
		clinicProfileDraft: appStore.clinicProfileDraft,
		setSettingsTab,
	});

	const clinicalSession = useClinicalSessionLogic({
		auth,
		dashboard: appStore.dashboard,
		loadDashboard,
		setError: appStore.setError,
		setDashboard: appStore.setDashboard,
		documentPatient: patientSelection.patient.documentPatient,
		activeAppointment: scheduleLogic.activeAppointment,
		activeDoctor: scheduleLogic.activeDoctor,
		activePatient: patientSelection.activePatient,
		selectedPatientId: patientSelection.selectedPatientId ?? "",
	});

	const billingModal = useBillingModalLogic({
		auth,
		dashboard: appStore.dashboard,
		documentPatient: patientSelection.patient.documentPatient,
		paymentPatientContextReady: true,
		paymentPatientContextMessage: "",
		realActiveVisitId: appStore.dashboard?.activeVisit?.id ?? null,
		loadDashboard,
		setError: appStore.setError,
	});

	const modalController = useModalController({
		dashboard: appStore.dashboard,
		currentView,
		settingsTab,
		setCurrentView,
		setSettingsTab,
		setError: appStore.setError,
		setUiPreferencesSyncError: appStore.setUiPreferencesSyncError,
	});

	useHotkeysController({
		setCurrentView,
		setQuery: patientSelection.setQuery,
	});

	const offlineSync = useOfflineSyncLogic({
		auth,
		setError: appStore.setError,
	});
	loadPersistenceHealthRef.current = offlineSync.loadPersistenceHealth;

	const settingsAndIntegrations = useSettingsAndIntegrationsLogic({
		auth,
		dashboard: appStore.dashboard,
		setDashboard: appStore.setDashboard,
		loadDashboard,
		setError: appStore.setError,
		currentView,
		setCurrentView,
		settingsTab,
		onboardingDismissed: modalController.onboardingDismissed,
		onboardingStep: modalController.onboardingStep,
		activePatient: patientSelection.activePatient,
		activeDoctor: scheduleLogic.activeDoctor,
		activeAppointment: scheduleLogic.activeAppointment,
		documentPatient: patientSelection.patient.documentPatient,
		selectedPatientId: patientSelection.selectedPatientId ?? "",
		uiPreferencesHydrated: appStore.uiPreferencesHydrated,
		setSelectedDocumentKind: () => {},
		activePayments: billingModal.activePayments,
		activeTreatmentPlanItems: billingModal.activeTreatmentPlanItems,
		visitNoteForm: clinicalSession.visitNoteForm,
		clinicalAdminSecretSession: modalController.clinicalAdminSecretDraft,
		settingsAdminSecretSession: modalController.settingsAdminSecretSession,
	});

	const staffSettingsLogic = useStaffSettingsLogic({
		auth,
		setError: appStore.setError,
		loadDashboard,
		saveClinicProfileIfDirty: settingsAndIntegrations.saveClinicProfileIfDirty,
	});

	const migrationQueries = useMigrationQueries({ auth });
	const imagingQueries = useImagingQueries({ auth });
	const communicationsQueries = useCommunicationsQueries({ auth });

	const navigationSync = useAppNavigationSync({
		currentView,
		setCurrentView,
		setSettingsTab,
	});

	const emergencyTriage = useAppEmergencyHandlers({
		dashboard: appStore.dashboard,
		documentPatient: patientSelection.patient.documentPatient,
	});

	return buildAppLogicCompatibilityBag({
		appStore,
		settingsStore,
		imagingStore,
		soundNotifications,
		auth,
		navigationState,
		patientSelection,
		scheduleLogic,
		clinicalSession,
		billingModal,
		modalController,
		offlineSync,
		settingsAndIntegrations,
		staffSettingsLogic,
		migrationQueries,
		imagingQueries,
		communicationsQueries,
		emergencyTriage,
		navigationSync,
		loadDashboard,
		browserDirectoryInputRef,
		browserMigrationInputRef,
		refreshSpeechRuntimeRef,
		paymentMutationIdRef,
		recentPatientViewsVersion,
	}) as UseAppLogicReturn;
}
