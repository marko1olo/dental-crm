import React from "react";
import type {
	MigrationAutopilotOperatorScriptStep,
	MigrationLocalSourceDiscoveryCandidate,
} from "@dental/shared";
import { migrationOwnerLabels } from "../constants";
import { humanizeMigrationText } from "../helpers";
import { MigrationOperatorStepActions } from "../MigrationOperatorStepActions";
import type { MigrationOperatorActionsCommonProps } from "./migrationAutopilotTypes";

export interface MigrationCandidatePreviewCardProps {
	dryRunSummary: any;
	primaryStep: MigrationAutopilotOperatorScriptStep | null | undefined;
	primaryCandidate: MigrationLocalSourceDiscoveryCandidate | null | undefined;
	operatorActionsProps: MigrationOperatorActionsCommonProps;
}

export function MigrationCandidatePreviewCard({
	dryRunSummary,
	primaryStep,
	primaryCandidate,
	operatorActionsProps,
}: MigrationCandidatePreviewCardProps) {
	if (!dryRunSummary && !primaryStep) return null;

	return (
		<div className="migration-candidate-preview-block" data-testid="migration-candidate-preview-card">
			{dryRunSummary && (
				<section
					className="migration-dry-run-summary"
					data-testid="migration-dry-run-summary"
					aria-label="Быстрый прогон миграции"
				>
					<div className="migration-dry-run-head">
						<strong>Быстрый прогон перед переносом</strong>
						<span>
							предпросмотр {dryRunSummary.previewableSources} · админ {dryRunSummary.adminBlockedSources} · врач {dryRunSummary.doctorReviewRequiredSources}
						</span>
					</div>
					<small>
						Оператор ~{dryRunSummary.estimatedOperatorMinutes} мин · простой клиники ~{dryRunSummary.estimatedClinicDowntimeMinutes} мин
					</small>
					{dryRunSummary.fastestRoute && <p>{humanizeMigrationText(dryRunSummary.fastestRoute)}</p>}
					{dryRunSummary.nextBestAction && <p>{humanizeMigrationText(dryRunSummary.nextBestAction)}</p>}
				</section>
			)}

			{primaryStep && (
				<section
					className="migration-primary-action"
					data-testid="migration-autopilot-primary-action"
					aria-label="Главное действие миграции сейчас"
				>
					<div className="migration-primary-action-meta">
						<strong>Сейчас: {primaryStep.title}</strong>
						<span>
							{migrationOwnerLabels[primaryStep.owner] ?? humanizeMigrationText(primaryStep.owner)} · {primaryStep.estimatedMinutes} мин ·{" "}
							{primaryStep.blocking ? "сначала это" : "можно параллельно"}
						</span>
						<small>{humanizeMigrationText(primaryStep.detail)}</small>
					</div>
					<MigrationOperatorStepActions
						step={primaryStep}
						scriptCandidate={primaryCandidate}
						testScope="primary"
						{...operatorActionsProps}
					/>
				</section>
			)}
		</div>
	);
}
