/**
 * DENTE CRM — App Logic Compatibility Types (Layer 0)
 *
 * Interfaces and contracts for legacy hook compatibility adapters.
 */

import type { StaffRole } from "@dental/shared";
import type { AppStore } from "../../../../store/appStore.js";
import type { useSettingsStore } from "../../../../store/settingsStore.js";
import type { ImagingStore } from "../../../../store/imagingStore.js";
import type {
	BillingModalLogicSlice,
	ClinicalSessionLogicSlice,
	ModalControllerSlice,
	NavigationStateSlice,
	OfflineSyncLogicSlice,
	PatientSelectionStateSlice,
	ScheduleLogicSlice,
	SettingsAndIntegrationsLogicSlice,
} from "../../types.js";
import type {
	AppLogicEmergencyTriage,
	AppLogicNavigationSyncState,
	AppLogicSoundNotifications,
} from "../appLogicStateTypes.js";

type SettingsStoreState = ReturnType<typeof useSettingsStore.getState>;

export interface AppLogicCompatibilityInputParams {
	readonly appStore: AppStore | Record<string, unknown>;
	readonly settingsStore: SettingsStoreState | Record<string, unknown>;
	readonly imagingStore: ImagingStore | Record<string, unknown>;
	readonly soundNotifications: AppLogicSoundNotifications | Record<string, unknown>;
	readonly auth: Record<string, unknown>;
	readonly navigationState: NavigationStateSlice | Record<string, unknown>;
	readonly patientSelection: PatientSelectionStateSlice | Record<string, unknown>;
	readonly scheduleLogic: ScheduleLogicSlice | Record<string, unknown>;
	readonly clinicalSession: ClinicalSessionLogicSlice | Record<string, unknown>;
	readonly billingModal: BillingModalLogicSlice | Record<string, unknown>;
	readonly modalController: ModalControllerSlice | Record<string, unknown>;
	readonly offlineSync: OfflineSyncLogicSlice | Record<string, unknown>;
	readonly settingsAndIntegrations: SettingsAndIntegrationsLogicSlice | Record<string, unknown>;
	readonly staffSettingsLogic: Record<string, unknown>;
	readonly migrationQueries: Record<string, unknown>;
	readonly imagingQueries: Record<string, unknown>;
	readonly communicationsQueries: Record<string, unknown>;
	readonly emergencyTriage: AppLogicEmergencyTriage | Record<string, unknown>;
	readonly navigationSync: AppLogicNavigationSyncState | Record<string, unknown>;
	readonly browserDirectoryInputRef?: React.RefObject<HTMLInputElement | null> | Record<string, unknown> | undefined;
	readonly browserMigrationInputRef?: React.RefObject<HTMLInputElement | null> | Record<string, unknown> | undefined;
	readonly refreshSpeechRuntimeRef?: React.MutableRefObject<(() => void) | null> | Record<string, unknown> | undefined;
	readonly paymentMutationIdRef?: React.MutableRefObject<string | null> | Record<string, unknown> | undefined;
	readonly loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | (() => Promise<void>) | undefined;
	readonly recentPatientViewsVersion?: number | undefined;
	readonly [key: string]: unknown;
}

export interface LegacyStubsAndFallbacks {
	readonly attachPricelistImage: (file: File) => Promise<void>;
	readonly clearPricelistImage: () => void;
	readonly draft: null;
	readonly isDraftAccepting: false;
	readonly isDraftLoading: false;
	readonly isPendingVisitSyncing: false;
	readonly lastPendingVisitSaveAt: null;
	readonly lastServerDraftSavedAt: null;
	readonly lastVisitSaveReceipt: null;
	readonly localDraftWasRestored: false;
	readonly pendingVisitSaveCount: 0;
	readonly serverDraftSyncState: "idle";
	readonly goToVisitDictation: () => void;
	readonly handleQuickConsult: () => void;
	readonly isQuickConsultLoading: false;
	readonly documentIngestionTarget: "general";
	readonly setDocumentIngestionTarget: () => void;
	readonly selectedSpecialty: string;
	readonly setSelectedSpecialty: () => void;
	readonly setSelectedProtocolId: () => void;
	readonly visitToothStateByCode: Record<string, unknown>;
	readonly serviceTitle: (serviceId: string) => string;
	readonly money: (v: unknown) => string;
	readonly activeCommunicationTasks: null;
	readonly addImagingViewerNoteAnnotation: null;
	readonly applyProtocolTemplate: null;
	readonly applyProtocolTemplateDirectly: null;
	readonly assembleSpeechRecording: () => Promise<void>;
	readonly chooseRecognitionPreset: null;
	readonly selectedPaymentReceiptTotalRub: 0;
	readonly selectedProtocolTemplate: null;
	readonly selectedTaxPaymentTotalRub: 0;
	readonly shiftWarnings: null;
	readonly specialtiesWithTemplates: readonly unknown[];
	readonly specialtyProtocolTemplates: readonly unknown[];
	readonly visibleVisitSpecialtyFocusOptions: readonly unknown[];
	readonly visitPrimaryAction: null;
	readonly visitSafetyCards: readonly unknown[];
	readonly visitWorkflowSteps: readonly unknown[];
}

export interface ProfileAndLegalCompatibility {
	readonly legalMissingFields: string[];
	readonly legalReadinessPercent: number;
	readonly updateClinicProfileDraft: (field: string, value: unknown) => void;
}
