import type {
	MigrationAutopilotHandoffChecklistItem,
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
} from "@dental/shared";

export interface MigrationAutopilotSectionProps {
	migrationAutopilot: MigrationAutopilotResponse | null | undefined;
	typedMigrationAutopilotSources: MigrationAutopilotSource[];
	typedMigrationAutopilotClinicLookup: any;
	typedMigrationAutopilotSteps: MigrationAutopilotStep[];
	typedMigrationOperatorLanes: MigrationAutopilotPacketLane[];
	typedMigrationHandoffChecklist: MigrationAutopilotHandoffChecklistItem[];
	migrationDryRunSummary: any;
	migrationTriageItems: any[];
	migrationOperatorScriptSteps: MigrationAutopilotOperatorScriptStep[];
	migrationPrimaryOperatorStep:
		| MigrationAutopilotOperatorScriptStep
		| null
		| undefined;
	migrationPrimaryOperatorCandidate:
		| MigrationLocalSourceDiscoveryCandidate
		| null
		| undefined;
	migrationCandidatePreviewReady: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => boolean;
	migrationCandidatePreviewHint: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => string;
	smartImportInputReady: boolean;
	isMigrationAutopilotLoading: boolean;
	isMigrationSourceDiscovering: boolean;
	isBrowserMigrationScanning: boolean;
	isMigrationSourceWorkupLoading: boolean;
	isMigrationSourceProbeLoading: boolean;
	isClinicPublicLookupLoading: boolean;
	isSmartImportLoading: boolean;
	clinicProfileSaveState: string;
	clinicProfileSaveButtonText: string;
	runMigrationAutopilot: (
		candidate?: any,
		options?: { includeSmartImportText?: boolean },
	) => void;
	discoverMigrationSources: () => void;
	pickBrowserMigrationSource: () => void;
	lookupClinicPublicProfile: () => void;
	planMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	probeMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	addMigrationDiscoveryCandidateToSmartImport: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	previewMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	previewMigrationAutopilotSources: (fingerprint?: string) => void;
	saveClinicProfileFromDraft: () => void;
	applyClinicLookupSuggestion: (fields: Record<string, unknown>) => void;
	clinicLookupSuggestionFieldEntries: (
		fields: Record<string, unknown>,
	) => [string, unknown][];
	clinicLookupSuggestionApplySummary: (
		fields: Record<string, unknown>,
	) => string;
}

export interface MigrationOperatorActionsCommonProps {
	typedMigrationAutopilotSources: MigrationAutopilotSource[];
	migrationCandidatePreviewReady: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => boolean;
	smartImportInputReady: boolean;
	isMigrationAutopilotLoading: boolean;
	isMigrationSourceDiscovering: boolean;
	isBrowserMigrationScanning: boolean;
	isMigrationSourceWorkupLoading: boolean;
	isMigrationSourceProbeLoading: boolean;
	isClinicPublicLookupLoading: boolean;
	isSmartImportLoading: boolean;
	runMigrationAutopilot: (
		candidate?: any,
		options?: { includeSmartImportText?: boolean },
	) => void;
	discoverMigrationSources: () => void;
	pickBrowserMigrationSource: () => void;
	lookupClinicPublicProfile: () => void;
	planMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	probeMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	addMigrationDiscoveryCandidateToSmartImport: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	previewMigrationAutopilotSources: (fingerprint?: string) => void;
}
