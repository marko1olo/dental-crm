/**
 * DENTE CRM — App Logic Compatibility Types (Layer 0)
 *
 * Interfaces and contracts for legacy hook compatibility adapters.
 */

import type { StaffRole } from "@dental/shared";

// biome-ignore lint/suspicious/noExplicitAny: legacy compatibility bag contracts
export interface AppLogicCompatibilityInputParams {
	readonly appStore: any;
	readonly settingsStore: any;
	readonly imagingStore: any;
	readonly soundNotifications: any;
	readonly auth: any;
	readonly navigationState: any;
	readonly patientSelection: any;
	readonly scheduleLogic: any;
	readonly clinicalSession: any;
	readonly billingModal: any;
	readonly modalController: any;
	readonly offlineSync: any;
	readonly settingsAndIntegrations: any;
	readonly staffSettingsLogic: any;
	readonly migrationQueries: any;
	readonly imagingQueries: any;
	readonly communicationsQueries: any;
	readonly emergencyTriage: any;
	readonly navigationSync: any;
	readonly browserDirectoryInputRef?: any;
	readonly browserMigrationInputRef?: any;
	readonly refreshSpeechRuntimeRef?: any;
	readonly paymentMutationIdRef?: any;
	readonly loadDashboard?: any;
	readonly recentPatientViewsVersion?: any;
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
}

export interface ProfileAndLegalCompatibility {
	readonly legalMissingFields: string[];
	readonly legalReadinessPercent: number;
	readonly updateClinicProfileDraft: (field: string, value: unknown) => void;
}
