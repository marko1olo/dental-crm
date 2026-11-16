import React from "react";
import type {
	MigrationLocalSourceProbeResponse,
	MigrationReadinessItem,
} from "@dental/shared";
import {
	migrationOwnerLabels,
	migrationReadinessLevelLabels,
} from "../constants";
import {
	humanizeMigrationText,
	migrationSourceDisplayName,
	migrationSourceKindLabel,
} from "../helpers";
import { MigrationProbeSourceBridgeKit } from "./MigrationProbeSourceBridgeKit";

export interface MigrationProbeSourceResultProps {
	probe: MigrationLocalSourceProbeResponse;
	readinessIssues: MigrationReadinessItem[];
	formatByteSize: (bytes: number) => string;
}

export function MigrationProbeSourceResult({
	probe,
	readinessIssues,
	formatByteSize,
}: MigrationProbeSourceResultProps) {
	return (
		<section
			className="dicom-discovery-result migration-source-probe-result"
			data-testid="migration-source-probe-result"
			aria-label="Проверка найденного источника миграции без записи"
		>
			<div className="dicom-discovery-head">
				<strong>
					Проверка источника: {migrationSourceDisplayName(probe)} · {migrationSourceKindLabel(probe.sourceKind)}
				</strong>
				<span>
					{humanizeMigrationText(probe.sourceLabel)} · папок {probe.scannedFolders} · файлов {probe.scannedFiles}
				</span>
				<span>{humanizeMigrationText(probe.nextAction)}</span>
				<span>{humanizeMigrationText(probe.recommendedRoute)}</span>
			</div>
			<section className="migration-source-workup-lanes" aria-label="Готовность пробы источника к миграции">
				<article>
					<strong>
						Готовность: {migrationReadinessLevelLabels[probe.readiness.level] ?? humanizeMigrationText(probe.readiness.level)} ·{" "}
						{Math.round(probe.readiness.score * 100)}%
					</strong>
					<p>{humanizeMigrationText(probe.readiness.nextAction)}</p>
					<small>
						Блокеры {probe.readiness.blockers.length} · предупреждения {probe.readiness.warnings.length} · готово{" "}
						{probe.readiness.ready.length}
					</small>
				</article>
				<article>
					<strong>Что мешает</strong>
					{readinessIssues.slice(0, 3).map((item) => (
						<span key={item.id}>
							{migrationOwnerLabels[item.owner] ?? humanizeMigrationText(item.owner)}: {humanizeMigrationText(item.title)}
						</span>
					))}
				</article>
			</section>
			<MigrationProbeSourceBridgeKit probe={probe} formatByteSize={formatByteSize} />
		</section>
	);
}
