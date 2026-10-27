import { useMemo, useState } from "react";
import type {
	MigrationAutopilotSectionProps,
	MigrationOperatorActionsCommonProps,
} from "./migrationAutopilotTypes";

export function useMigrationAutopilotState(
	props: MigrationAutopilotSectionProps,
) {
	const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(
		null,
	);

	const operatorActionsCommonProps: MigrationOperatorActionsCommonProps =
		useMemo(
			() => ({
				typedMigrationAutopilotSources: props.typedMigrationAutopilotSources,
				migrationCandidatePreviewReady: props.migrationCandidatePreviewReady,
				smartImportInputReady: props.smartImportInputReady,
				isMigrationAutopilotLoading: props.isMigrationAutopilotLoading,
				isMigrationSourceDiscovering: props.isMigrationSourceDiscovering,
				isBrowserMigrationScanning: props.isBrowserMigrationScanning,
				isMigrationSourceWorkupLoading: props.isMigrationSourceWorkupLoading,
				isMigrationSourceProbeLoading: props.isMigrationSourceProbeLoading,
				isClinicPublicLookupLoading: props.isClinicPublicLookupLoading,
				isSmartImportLoading: props.isSmartImportLoading,
				runMigrationAutopilot: props.runMigrationAutopilot,
				discoverMigrationSources: props.discoverMigrationSources,
				pickBrowserMigrationSource: props.pickBrowserMigrationSource,
				lookupClinicPublicProfile: props.lookupClinicPublicProfile,
				planMigrationDiscoveryCandidate: props.planMigrationDiscoveryCandidate,
				probeMigrationDiscoveryCandidate: props.probeMigrationDiscoveryCandidate,
				addMigrationDiscoveryCandidateToSmartImport:
					props.addMigrationDiscoveryCandidateToSmartImport,
				previewMigrationAutopilotSources:
					props.previewMigrationAutopilotSources,
			}),
			[
				props.typedMigrationAutopilotSources,
				props.migrationCandidatePreviewReady,
				props.smartImportInputReady,
				props.isMigrationAutopilotLoading,
				props.isMigrationSourceDiscovering,
				props.isBrowserMigrationScanning,
				props.isMigrationSourceWorkupLoading,
				props.isMigrationSourceProbeLoading,
				props.isClinicPublicLookupLoading,
				props.isSmartImportLoading,
				props.runMigrationAutopilot,
				props.discoverMigrationSources,
				props.pickBrowserMigrationSource,
				props.lookupClinicPublicProfile,
				props.planMigrationDiscoveryCandidate,
				props.probeMigrationDiscoveryCandidate,
				props.addMigrationDiscoveryCandidateToSmartImport,
				props.previewMigrationAutopilotSources,
			],
		);

	const visibleSources = useMemo(
		() => (props.typedMigrationAutopilotSources ?? []).slice(0, 6),
		[props.typedMigrationAutopilotSources],
	);

	const visibleSteps = useMemo(
		() => (props.typedMigrationAutopilotSteps ?? []).slice(0, 6),
		[props.typedMigrationAutopilotSteps],
	);

	const visibleLanes = useMemo(
		() => (props.typedMigrationOperatorLanes ?? []).slice(0, 5),
		[props.typedMigrationOperatorLanes],
	);

	const visibleHandoff = useMemo(
		() => (props.typedMigrationHandoffChecklist ?? []).slice(0, 6),
		[props.typedMigrationHandoffChecklist],
	);

	return {
		operatorActionsCommonProps,
		visibleSources,
		visibleSteps,
		visibleLanes,
		visibleHandoff,
		selectedFingerprint,
		setSelectedFingerprint,
	};
}
