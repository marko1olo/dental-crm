import React from "react";
import type {
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotSource,
	MigrationLocalSourceDiscoveryCandidate,
} from "@dental/shared";
import {
	ClipboardCheck,
	Database,
	FileCheck2,
	RefreshCw,
	ScanSearch,
	Search,
	UploadCloud,
	UserCheck,
} from "lucide-react";
import { migrationOperatorSourceBoundActions } from "./constants";
import type { MigrationOperatorActionScope } from "./types";

export interface MigrationOperatorStepActionsProps {
	step: MigrationAutopilotOperatorScriptStep;
	scriptCandidate: MigrationLocalSourceDiscoveryCandidate | null | undefined;
	testScope: MigrationOperatorActionScope;
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

export function MigrationOperatorStepActions({
	step,
	scriptCandidate,
	testScope,
	typedMigrationAutopilotSources,
	migrationCandidatePreviewReady,
	smartImportInputReady,
	isMigrationAutopilotLoading,
	isMigrationSourceDiscovering,
	isBrowserMigrationScanning,
	isMigrationSourceWorkupLoading,
	isMigrationSourceProbeLoading,
	isClinicPublicLookupLoading,
	isSmartImportLoading,
	runMigrationAutopilot,
	discoverMigrationSources,
	pickBrowserMigrationSource,
	lookupClinicPublicProfile,
	planMigrationDiscoveryCandidate,
	probeMigrationDiscoveryCandidate,
	addMigrationDiscoveryCandidateToSmartImport,
	previewMigrationAutopilotSources,
}: MigrationOperatorStepActionsProps) {
	const primaryButtonTestId =
		testScope === "primary" ? "migration-primary-action-button" : undefined;
	const scriptTestId = (value: string) =>
		testScope === "script" ? value : primaryButtonTestId;
	const actionButtonClass =
		testScope === "primary" ? "primary-button" : "secondary-button";
	const operatorStepNeedsCandidate = Boolean(
		step.sourceFingerprint &&
			migrationOperatorSourceBoundActions.includes(step.action) &&
			!scriptCandidate,
	);
	const operatorStepPreviewReady =
		step.action !== "build_preview" ||
		(scriptCandidate
			? migrationCandidatePreviewReady(scriptCandidate)
			: typedMigrationAutopilotSources.some((source) =>
					migrationCandidatePreviewReady(source.candidate),
				));

	return (
		<div className="migration-source-card-actions">
			<div className="dente-segmented-bar" role="toolbar" aria-label={`Действия шага: ${step.buttonLabel}`}>
				{operatorStepNeedsCandidate ? (
					<>
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								void runMigrationAutopilot(undefined, {
									includeSmartImportText: smartImportInputReady,
								})
							}
							disabled={isMigrationAutopilotLoading}
							data-testid={scriptTestId("operator-script-refresh-plan")}
						>
							<RefreshCw aria-hidden="true" size={13} /> <span>Обновить план</span>
						</button>
						<small className="migration-action-hint">
							Источник уже не в текущем автоплане
						</small>
					</>
				) : null}
			{step.action === "discover_sources" ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => void discoverMigrationSources()}
					disabled={
						isMigrationSourceDiscovering || isMigrationAutopilotLoading
					}
					data-testid={scriptTestId("operator-script-discover-sources")}
				>
					<ScanSearch aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "pick_source" ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => void pickBrowserMigrationSource()}
					disabled={isBrowserMigrationScanning || isMigrationAutopilotLoading}
					data-testid={scriptTestId("operator-script-pick-source")}
				>
					<Database aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "open_plan" && scriptCandidate ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
					disabled={isMigrationSourceWorkupLoading}
					data-testid={primaryButtonTestId}
				>
					<ClipboardCheck aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "open_probe" && scriptCandidate ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => probeMigrationDiscoveryCandidate(scriptCandidate)}
					disabled={isMigrationSourceProbeLoading}
					data-testid={primaryButtonTestId}
				>
					<ScanSearch aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "add_to_parser" && scriptCandidate ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() =>
						addMigrationDiscoveryCandidateToSmartImport(scriptCandidate)
					}
					data-testid={primaryButtonTestId}
				>
					<UploadCloud aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "run_clinic_lookup" ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => void lookupClinicPublicProfile()}
					disabled={isClinicPublicLookupLoading}
					data-testid={primaryButtonTestId}
				>
					<Search aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "prepare_export" && scriptCandidate ? (
				<button
					className={actionButtonClass}
					type="button"
					onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
					disabled={isMigrationSourceWorkupLoading}
					data-testid={primaryButtonTestId}
				>
					<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
				</button>
			) : null}
			{step.action === "build_preview" && !operatorStepNeedsCandidate ? (
				<>
					<button
						className={actionButtonClass}
						type="button"
						onClick={() =>
							void previewMigrationAutopilotSources(step.sourceFingerprint ?? undefined)
						}
						disabled={isSmartImportLoading || !operatorStepPreviewReady}
						data-testid={scriptTestId("operator-script-build-preview")}
					>
						<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
					</button>
					{!operatorStepPreviewReady ? (
						<small className="migration-action-hint">
							Сначала откройте план или проверку источника: у этой подсказки
							пока нет файлов для предпросмотра.
						</small>
					) : null}
				</>
			) : null}
			{step.action === "manual" || step.action === "doctor_review" ? (
				<span>
					<UserCheck aria-hidden="true" /> {step.buttonLabel}
				</span>
			) : null}
			</div>
		</div>
	);
}
