import React from "react";
import type {
	MigrationAutopilotSource,
	MigrationLocalSourceDiscoveryCandidate,
} from "@dental/shared";
import { ClipboardCheck, FileCheck2, ScanSearch, UploadCloud } from "lucide-react";
import {
	migrationAdapterStatusLabels,
	migrationBridgeKitKindLabels,
	migrationBridgeKitStatusLabels,
	migrationOwnerLabels,
	migrationPriorityLabels,
	migrationReadinessLevelLabels,
} from "../constants";
import {
	humanizeMigrationList,
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "../helpers";

export interface MigrationSourcesOverviewProps {
	sources: MigrationAutopilotSource[];
	isWorkupLoading: boolean;
	isProbeLoading: boolean;
	isSmartImportLoading: boolean;
	candidatePreviewReady: (c: MigrationLocalSourceDiscoveryCandidate) => boolean;
	candidatePreviewHint: (c: MigrationLocalSourceDiscoveryCandidate) => string;
	onPlanCandidate: (c: MigrationLocalSourceDiscoveryCandidate) => void;
	onProbeCandidate: (c: MigrationLocalSourceDiscoveryCandidate) => void;
	onAddToSmartImport: (c: MigrationLocalSourceDiscoveryCandidate) => void;
	onPreviewCandidate: (c: MigrationLocalSourceDiscoveryCandidate) => void;
}

export function MigrationSourcesOverview({
	sources,
	isWorkupLoading,
	isProbeLoading,
	isSmartImportLoading,
	candidatePreviewReady,
	candidatePreviewHint,
	onPlanCandidate,
	onProbeCandidate,
	onAddToSmartImport,
	onPreviewCandidate,
}: MigrationSourcesOverviewProps) {
	if (!sources?.length) return null;

	return (
		<div className="dicom-discovery-grid" data-testid="migration-sources-grid">
			{sources.slice(0, 6).map((source, index) => {
				const name = migrationSourceDisplayName(source.candidate, index);
				const isReady = candidatePreviewReady(source.candidate);
				return (
					<article key={source.candidate.sourceFingerprint} className="migration-source-card">
						<strong>{name}</strong>
						<span>
							{migrationPriorityLabels[source.priority] ?? humanizeMigrationText(source.priority)} ·{" "}
							{migrationOwnerLabels[source.owner] ?? humanizeMigrationText(source.owner)} ·{" "}
							{Math.round(source.score * 100)}%
						</span>
						{source.readiness && (
							<small>
								Готовность: {migrationReadinessLevelLabels[source.readiness.level] ?? humanizeMigrationText(source.readiness.level)} ·{" "}
								{Math.round(source.readiness.score * 100)}% · блокеров {source.readiness.blockers.length}
							</small>
						)}
						{source.bridgeKit && (
							<small>
								Маршрут: {migrationBridgeKitKindLabels[source.bridgeKit.kind] ?? humanizeMigrationText(source.bridgeKit.kind)} ·{" "}
								{migrationBridgeKitStatusLabels[source.bridgeKit.status] ?? humanizeMigrationText(source.bridgeKit.status)} ·{" "}
								{humanizeMigrationList(source.bridgeKit.requiredTools, 2)}
							</small>
						)}
						<small>
							{migrationSourceKindLabel(source.candidate.sourceKind)} · источник {index + 1} · файлов {source.candidate.matchedFiles}
						</small>
						{source.probe ? (
							<small>
								Проверено: базы {source.probe.counts.databases} · снимков {source.probe.counts.images} · таблиц {source.probe.counts.tables}
							</small>
						) : (
							<small>Источник еще не проверяли детально.</small>
						)}
						<span>{humanizeMigrationText(source.recommendedAction)}</span>
						{source.riskFlags?.slice(0, 3).map((flag) => (
							<small key={flag}>{humanizeMigrationText(flag)}</small>
						))}
						<div className="migration-source-card-actions">
							<button className="text-button" type="button" onClick={() => onPlanCandidate(source.candidate)} disabled={isWorkupLoading} aria-label={`Открыть план переноса: ${name}`}>
								<ClipboardCheck aria-hidden="true" /> План переноса
							</button>
							<button className="text-button" type="button" onClick={() => onProbeCandidate(source.candidate)} disabled={isProbeLoading} aria-label={`Проверить источник: ${name}`}>
								<ScanSearch aria-hidden="true" /> Проверить
							</button>
							<button className="text-button" type="button" onClick={() => onAddToSmartImport(source.candidate)} aria-label={`Отправить источник в разбор: ${name}`}>
								<UploadCloud aria-hidden="true" /> В разбор
							</button>
							<button className="text-button" type="button" onClick={() => onPreviewCandidate(source.candidate)} disabled={isSmartImportLoading || !isReady} title={candidatePreviewHint(source.candidate)} aria-label={`Построить предпросмотр: ${name}`}>
								<FileCheck2 aria-hidden="true" /> Предпросмотр
							</button>
							{!isReady && <small className="migration-action-hint">{candidatePreviewHint(source.candidate)}</small>}
						</div>
					</article>
				);
			})}
		</div>
	);
}
