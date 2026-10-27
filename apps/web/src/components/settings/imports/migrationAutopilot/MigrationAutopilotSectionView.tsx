import React from "react";
import { humanizeMigrationColumns, humanizeMigrationText } from "../helpers";
import { MigrationCandidatePreviewCard } from "./MigrationCandidatePreviewCard";
import { MigrationClinicLookupView } from "./MigrationClinicLookupView";
import { MigrationHandoffChecklistView } from "./MigrationHandoffChecklistView";
import { MigrationOperatorActionButtons } from "./MigrationOperatorActionButtons";
import { MigrationOperatorLanesTable } from "./MigrationOperatorLanesTable";
import { MigrationSourcesOverview } from "./MigrationSourcesOverview";
import type { MigrationAutopilotSectionProps } from "./migrationAutopilotTypes";
import { useMigrationAutopilotState } from "./useMigrationAutopilotState";

export function MigrationAutopilotSectionView(props: MigrationAutopilotSectionProps) {
	const { migrationAutopilot } = props;
	const { operatorActionsCommonProps, visibleSources, visibleLanes, visibleHandoff } = useMigrationAutopilotState(props);

	if (!migrationAutopilot) return null;

	const renderNotes = (title: string, items: string[], testId?: string) => {
		const visible = items.filter(Boolean).slice(0, 8);
		if (!visible.length) return null;
		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>{visible.map((it) => (<small key={it}>{humanizeMigrationText(it)}</small>))}</div>
			</details>
		);
	};

	return (
		<section className="dicom-discovery-result migration-autopilot-result" data-testid="migration-autopilot-result" aria-label="Автоплан миграции баз данных, снимков и реквизитов">
			<div className="dicom-discovery-head">
				<strong>
					Автоплан миграции: источников {migrationAutopilot.discovery.candidateCount} · проб {migrationAutopilot.discovery.probedCount} · папок {migrationAutopilot.discovery.scannedFolders}
				</strong>
				<span>{humanizeMigrationText(migrationAutopilot.nextAction)}</span>
				<span>Работайте сверху вниз: пробный импорт, карточки источников, затем предпросмотр.</span>
			</div>

			<MigrationOperatorActionButtons
				onRunAutopilot={() => props.runMigrationAutopilot()}
				onDiscoverSources={props.discoverMigrationSources}
				onPickBrowserSource={props.pickBrowserMigrationSource}
				onLookupClinicProfile={props.lookupClinicPublicProfile}
				isLoading={props.isMigrationAutopilotLoading}
				isDiscovering={props.isMigrationSourceDiscovering}
				isBrowserScanning={props.isBrowserMigrationScanning}
				isClinicLookupLoading={props.isClinicPublicLookupLoading}
			/>

			{migrationAutopilot.operatorPacket && (
				<div className="migration-autopilot-operator-packet" data-testid="migration-autopilot-operator-packet">
					<MigrationOperatorLanesTable operatorPacket={migrationAutopilot.operatorPacket} lanes={visibleLanes} />
					<MigrationCandidatePreviewCard
						dryRunSummary={props.migrationDryRunSummary}
						primaryStep={props.migrationPrimaryOperatorStep}
						primaryCandidate={props.migrationPrimaryOperatorCandidate}
						operatorActionsProps={operatorActionsCommonProps}
					/>
					<MigrationHandoffChecklistView checklist={visibleHandoff} triageItems={props.migrationTriageItems} />
					{renderNotes(
						"Границы онлайн-поиска",
						[
							`Онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy?.allowed) || "нет доступных полей"}`,
							`Не отправлять в онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy?.forbidden, 6)}`,
						],
						"migration-autopilot-technical-boundary",
					)}
				</div>
			)}

			<MigrationSourcesOverview
				sources={visibleSources}
				isWorkupLoading={props.isMigrationSourceWorkupLoading}
				isProbeLoading={props.isMigrationSourceProbeLoading}
				isSmartImportLoading={props.isSmartImportLoading}
				candidatePreviewReady={props.migrationCandidatePreviewReady}
				candidatePreviewHint={props.migrationCandidatePreviewHint}
				onPlanCandidate={props.planMigrationDiscoveryCandidate}
				onProbeCandidate={props.probeMigrationDiscoveryCandidate}
				onAddToSmartImport={props.addMigrationDiscoveryCandidateToSmartImport}
				onPreviewCandidate={props.previewMigrationDiscoveryCandidate}
			/>

			<MigrationClinicLookupView
				clinicLookup={props.typedMigrationAutopilotClinicLookup}
				clinicProfileSaveState={props.clinicProfileSaveState}
				clinicProfileSaveButtonText={props.clinicProfileSaveButtonText}
				saveClinicProfileFromDraft={props.saveClinicProfileFromDraft}
				applyClinicLookupSuggestion={props.applyClinicLookupSuggestion}
				clinicLookupSuggestionFieldEntries={props.clinicLookupSuggestionFieldEntries}
				clinicLookupSuggestionApplySummary={props.clinicLookupSuggestionApplySummary}
			/>

			{(migrationAutopilot.warnings ?? []).slice(0, 4).map((w: string) => (
				<small key={w}>{humanizeMigrationText(w)}</small>
			))}
			{renderNotes("Технические границы автоплана", migrationAutopilot.privacyWarnings, "migration-autopilot-privacy-notes")}
		</section>
	);
}
