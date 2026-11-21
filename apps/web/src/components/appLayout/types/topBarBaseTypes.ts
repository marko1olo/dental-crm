import type { StaffRole, DentalSpecialty, ClinicMode, Dashboard } from "@dental/shared";
import type { Dispatch, SetStateAction } from "react";
import type { BrowserContinuityStatus } from "../../../browserContinuity";
import type { NetworkState } from "../../../utils/networkConnectivity";
import type { ActiveCitoAlert } from "../../../hooks/useLanP2P";
import type { DenteTelegramHandoffTarget } from "../../../AppConstants";
import type { AppView } from "../../../utils/routeUtils";

export interface ActiveDoctorInfo {
	id?: string;
	fullName?: string;
	name?: string;
	specialty?: string;
	[key: string]: unknown;
}

export interface TopBarCoreProps {
	dashboard: Dashboard | null | undefined;
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
	currentView: AppView;
	setCurrentView: (view: AppView) => void;
	setSettingsTab: (tab: string) => void;
	isDoctorShiftCockpitOpen: boolean;
	closeDoctorShiftCockpit: () => void;
	activeDoctor?: ActiveDoctorInfo | null | undefined;
}

export interface TopBarEmergencyAndSyncProps {
	activeCitoAlerts: ActiveCitoAlert[];
	dismissCitoAlert: (alertId: string) => void;
	browserContinuityCritical: boolean;
	browserContinuity: BrowserContinuityStatus | null | undefined;
	isOnline: boolean;
	isPendingVisitSyncing: boolean;
	refreshBrowserContinuity: (opts: { silent: boolean }) => Promise<void>;
	flushPendingSpeechChunks: (opts: { silent: boolean }) => Promise<void>;
	flushPendingVisitSaves: (opts: { silent: boolean }) => Promise<void>;
	pendingSpeechChunkCount: number;
	pendingVisitSaveCount: number;
	networkState: NetworkState | null | undefined;
	pendingMutationCount: number;
	syncOfflineMutations: () => Promise<void>;
	isSyncingMutations: boolean;
}

export interface TopBarNoticeAndErrorProps {
	error: string | null;
	setError: Dispatch<SetStateAction<string | null>>;
	uiPreferencesSyncError: string | null;
	setUiPreferencesSyncError: Dispatch<SetStateAction<string | null>>;
	telegramHandoffNotice: DenteTelegramHandoffTarget | null | undefined;
	setTelegramHandoffNotice: Dispatch<SetStateAction<DenteTelegramHandoffTarget | null>>;
}
