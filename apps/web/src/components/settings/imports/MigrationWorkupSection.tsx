import React from "react";
import type { MigrationLocalSourceWorkupResponse } from "@dental/shared";
import {
	migrationAutomationLevelLabels,
	migrationBridgeKitKindLabels,
	migrationBridgeKitStatusLabels,
	migrationEntityLabels,
	migrationOwnerLabels,
	migrationReadinessLevelLabels,
	migrationWorkupStepStatusLabels,
} from "./constants";
import {
	humanizeMigrationColumns,
	humanizeMigrationList,
	humanizeMigrationText,
	migrationHandoffRouteLabel,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "./helpers";

export interface MigrationWorkupSectionProps {
	typedMigrationSourceWorkup:
		| MigrationLocalSourceWorkupResponse
		| null
		| undefined;
	typedMigrationWorkupReadinessIssues: any[];
}

export function MigrationWorkupSection({
	typedMigrationSourceWorkup,
	typedMigrationWorkupReadinessIssues,
}: MigrationWorkupSectionProps) {
	if (!typedMigrationSourceWorkup) return null;

	const renderMigrationTechnicalNotes = (
		title: string,
		items: string[],
		testId?: string,
	) => {
		const visibleItems = items.filter(Boolean).slice(0, 8);
		if (!visibleItems.length) return null;

		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>
					{visibleItems.map((item) => (
						<small key={item}>{humanizeMigrationText(item)}</small>
					))}
				</div>
			</details>
		);
	};

	return (
		<section
			className="dicom-discovery-result migration-source-workup-result"
			data-testid="migration-source-workup-result"
			aria-label="План миграции найденного источника"
		>
			<div className="dicom-discovery-head">
				<strong>
					План переноса:{" "}
					{migrationSourceDisplayName(typedMigrationSourceWorkup)} ·{" "}
					{migrationSourceKindLabel(typedMigrationSourceWorkup.sourceKind)}
				</strong>
				<span>
					{humanizeMigrationText(typedMigrationSourceWorkup.sourceLabel)} ·{" "}
					{typedMigrationSourceWorkup.sourceExists
						? "источник доступен"
						: "источник сейчас не доступен"}{" "}
					·{" "}
					{migrationAutomationLevelLabels[
						typedMigrationSourceWorkup.automationLevel
					] ??
						humanizeMigrationText(
							typedMigrationSourceWorkup.automationLevel,
						)}
				</span>
				<span>
					{humanizeMigrationText(typedMigrationSourceWorkup.nextAction)}
				</span>
				<span>
					{humanizeMigrationText(typedMigrationSourceWorkup.recommendedRoute)}
				</span>
			</div>
			<section
				className="migration-source-workup-lanes"
				aria-label="Готовность источника к миграции"
			>
				<article>
					<strong>
						Готовность:{" "}
						{migrationReadinessLevelLabels[
							typedMigrationSourceWorkup.readiness.level
						] ??
							humanizeMigrationText(
								typedMigrationSourceWorkup.readiness.level,
							)}{" "}
						·{" "}
						{Math.round(
							typedMigrationSourceWorkup.readiness.score * 100,
						)}
						%
					</strong>
					<p>
						{humanizeMigrationText(
							typedMigrationSourceWorkup.readiness.nextAction,
						)}
					</p>
					<small>
						Блокеры {typedMigrationSourceWorkup.readiness.blockers.length} ·
						предупреждения{" "}
						{typedMigrationSourceWorkup.readiness.warnings.length} · готово{" "}
						{typedMigrationSourceWorkup.readiness.ready.length}
					</small>
				</article>
				<article>
					<strong>Что мешает</strong>
					{typedMigrationWorkupReadinessIssues.slice(0, 3).map((item) => (
						<span key={item.id}>
							{migrationOwnerLabels[item.owner] ??
								humanizeMigrationText(item.owner)}
							: {humanizeMigrationText(item.title)}
						</span>
					))}
				</article>
			</section>
			<section
				className="migration-source-workup-lanes"
				aria-label="План подключения источника миграции"
			>
				<article>
					<strong>
						Маршрут:{" "}
						{migrationBridgeKitKindLabels[
							typedMigrationSourceWorkup.bridgeKit.kind
						] ??
							humanizeMigrationText(
								typedMigrationSourceWorkup.bridgeKit.kind,
							)}{" "}
						·{" "}
						{migrationBridgeKitStatusLabels[
							typedMigrationSourceWorkup.bridgeKit.status
						] ??
							humanizeMigrationText(
								typedMigrationSourceWorkup.bridgeKit.status,
							)}
					</strong>
					<p>
						{humanizeMigrationText(
							typedMigrationSourceWorkup.bridgeKit.nextAction,
						)}
					</p>
					<small>
						{humanizeMigrationList(
							typedMigrationSourceWorkup.bridgeKit.requiredTools,
							4,
						)}
					</small>
				</article>
				<article>
					<strong>Файл для проверки</strong>
					<span>
						{humanizeMigrationText(
							typedMigrationSourceWorkup.bridgeKit.outputManifest.format,
						)}
					</span>
					<small>
						{humanizeMigrationColumns(
							typedMigrationSourceWorkup.bridgeKit.outputManifest
								.requiredColumns,
							5,
						)}
					</small>
				</article>
			</section>
			<div className="migration-source-workup-lanes">
				<article>
					<strong>Что можно вытянуть</strong>
					<p>
						{typedMigrationSourceWorkup.extractableEntities
							.map(
								(entity) =>
									migrationEntityLabels[entity] ??
									humanizeMigrationText(entity),
							)
							.join(" · ")}
					</p>
					<small>
						{humanizeMigrationList(
							typedMigrationSourceWorkup.requiredArtifacts,
						)}
					</small>
				</article>
				<article>
					<strong>Передача в CRM</strong>
					{typedMigrationSourceWorkup.handoffs
						.slice(0, 3)
						.map((handoff) => (
							<span key={`${handoff.method}:${handoff.endpoint}`}>
								{humanizeMigrationText(handoff.title)} ·{" "}
								{migrationHandoffRouteLabel(handoff)}
							</span>
						))}
				</article>
			</div>
			<div className="dicom-discovery-grid">
				{typedMigrationSourceWorkup.steps.map((step) => (
					<article key={step.id}>
						<strong>{step.title}</strong>
						<span>
							{migrationWorkupStepStatusLabels[step.status] ??
								humanizeMigrationText(step.status)}{" "}
							· {humanizeMigrationText(step.actionLabel)}
						</span>
						<small>{humanizeMigrationText(step.detail)}</small>
					</article>
				))}
			</div>
			{typedMigrationSourceWorkup.warnings
				.slice(0, 4)
				.map((warning) => (
					<small key={warning}>{humanizeMigrationText(warning)}</small>
				))}
			{renderMigrationTechnicalNotes(
				"Технические границы плана",
				typedMigrationSourceWorkup.privacyWarnings,
				"migration-source-workup-privacy-notes",
			)}
		</section>
	);
}
