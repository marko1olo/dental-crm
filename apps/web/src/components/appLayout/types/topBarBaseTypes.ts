import type { StaffRole, DentalSpecialty, ClinicMode } from "@dental/shared";
import type { Dispatch, SetStateAction } from "react";

export interface TopBarCoreProps {
	dashboard: any;
	clinicName: string;
	todayIso: string;
	defaultClinicNoticeHidden: boolean;
	setDefaultClinicNoticeHidden: Dispatch<SetStateAction<boolean>>;
	reopenOnboarding: () => void;
	goToVisitDictation: () => void;
	setSelectedWorkspaceRole: (role: StaffRole) => void;
	selectedWorkspaceRole: StaffRole;
	roleFocusOrder: StaffRole[];
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	staffRoleLabels: Record<StaffRole, string>;
	handleLockSession: () => void;
	openDoctorShiftCockpit: () => void;
	setIsCbctDirectModalOpen: (open: boolean) => void;
	currentView: string;
	setCurrentView: (view: string) => void;
	setSettingsTab: (tab: string) => void;
	isDoctorShiftCockpitOpen: boolean;
	closeDoctorShiftCockpit: () => void;
	activeDoctor: any;
}

export interface TopBarEmergencyAndSyncProps {
	activeCitoAlerts: any[];
	dismissCitoAlert: (alertId: string) => void;
	browserContinuityCritical: boolean;
	browserContinuity: any;
	isOnline: boolean;
	isPendingVisitSyncing: boolean;
	refreshBrowserContinuity: (opts: { silent: boolean }) => Promise<void>;
	flushPendingSpeechChunks: (opts: { silent: boolean }) => Promise<void>;
	flushPendingVisitSaves: (opts: { silent: boolean }) => Promise<void>;
	pendingSpeechChunkCount: number;
	pendingVisitSaveCount: number;
	networkState: any;
	pendingMutationCount: number;
	syncOfflineMutations: () => Promise<void>;
	isSyncingMutations: boolean;
}

export interface TopBarNoticeAndErrorProps {
	error: string | null;
	setError: Dispatch<SetStateAction<string | null>>;
	uiPreferencesSyncError: string | null;
	setUiPreferencesSyncError: Dispatch<SetStateAction<string | null>>;
	telegramHandoffNotice: any;
	setTelegramHandoffNotice: Dispatch<SetStateAction<any>>;
}
