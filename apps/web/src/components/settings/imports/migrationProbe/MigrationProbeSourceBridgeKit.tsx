import React from "react";
import type { MigrationLocalSourceProbeResponse } from "@dental/shared";
import {
	migrationAdapterStatusLabels,
	migrationBridgeKitKindLabels,
	migrationBridgeKitStatusLabels,
} from "../constants";
import {
	humanizeMigrationColumns,
	humanizeMigrationList,
	humanizeMigrationText,
} from "../helpers";
import { MigrationTechnicalNotes } from "./MigrationTechnicalNotes";

export interface MigrationProbeSourceBridgeKitProps {
	probe: MigrationLocalSourceProbeResponse;
	formatByteSize: (bytes: number) => string;
}

export function MigrationProbeSourceBridgeKit({
	probe,
	formatByteSize,
}: MigrationProbeSourceBridgeKitProps) {
	return (
		<>
			<section className="migration-source-workup-lanes" aria-label="План проверки источника миграции">
				<article>
					<strong>
						Маршрут: {migrationBridgeKitKindLabels[probe.bridgeKit.kind] ?? humanizeMigrationText(probe.bridgeKit.kind)} ·{" "}
						{migrationBridgeKitStatusLabels[probe.bridgeKit.status] ?? humanizeMigrationText(probe.bridgeKit.status)}
					</strong>
					<p>{humanizeMigrationText(probe.bridgeKit.nextAction)}</p>
					<small>{humanizeMigrationList(probe.bridgeKit.requiredTools, 4)}</small>
				</article>
				<article>
					<strong>Запрещено наружу</strong>
					<span>{humanizeMigrationColumns(probe.bridgeKit.outputManifest.forbiddenFields, 4)}</span>
					<small>{humanizeMigrationText(probe.bridgeKit.privacyBoundary)}</small>
				</article>
			</section>
			<div className="migration-source-workup-lanes">
				<article>
					<strong>Инвентарь</strong>
					<p>
						базы {probe.counts.databases} · резервные копии {probe.counts.dumps} · таблицы {probe.counts.tables} · архивы{" "}
						{probe.counts.archives} · КТ/серии {probe.counts.dicom} · снимки {probe.counts.images} · 3D {probe.counts.models}
					</p>
					<small>
						{probe.detectedVendors.length ? humanizeMigrationList(probe.detectedVendors) : "Программа не распознана"}
					</small>
				</article>
				<article>
					<strong>Сигнатуры</strong>
					<p>{humanizeMigrationList(probe.formatSignals, 8) || "Только имя/расширение, без читаемой сигнатуры"}</p>
					<small>Пути и похожие на ФИО имена файлов скрыты во внутренние номера.</small>
				</article>
			</div>
			<div className="dicom-discovery-grid">
				{probe.adapters.slice(0, 4).map((adapter) => (
					<article key={adapter.id}>
						<strong>{humanizeMigrationText(adapter.title)}</strong>
						<span>
							{migrationAdapterStatusLabels[adapter.status] ?? humanizeMigrationText(adapter.status)} ·{" "}
							{Math.round(adapter.confidence * 100)}%
						</span>
						<small>{humanizeMigrationText(adapter.input)}</small>
						<small>{humanizeMigrationText(adapter.output)}</small>
						<span>{humanizeMigrationText(adapter.nextAction)}</span>
					</article>
				))}
			</div>
			{probe.artifactSamples.length ? (
				<section className="migration-source-artifact-list" aria-label="Безопасные примеры найденных артефактов">
					{probe.artifactSamples.slice(0, 8).map((artifact) => (
						<span key={artifact.id}>
							{artifact.safeName} · {humanizeMigrationText(artifact.kind)}
							{artifact.byteSize !== null ? ` · ${formatByteSize(artifact.byteSize)}` : ""}
						</span>
					))}
				</section>
			) : null}
			{probe.warnings.slice(0, 4).map((warning) => (
				<small key={warning}>{humanizeMigrationText(warning)}</small>
			))}
			<MigrationTechnicalNotes
				title="Технические границы пробы"
				items={probe.privacyWarnings}
				testId="migration-source-probe-privacy-notes"
			/>
		</>
	);
}
