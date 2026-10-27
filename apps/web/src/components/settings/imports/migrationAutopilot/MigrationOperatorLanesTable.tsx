import React from "react";
import type {
	MigrationAutopilotOperatorPacket,
	MigrationAutopilotPacketLane,
} from "@dental/shared";
import {
	migrationOperatorPacketStatusLabels,
	migrationOwnerLabels,
} from "../constants";
import { humanizeMigrationText } from "../helpers";

export interface MigrationOperatorLanesTableProps {
	operatorPacket?: MigrationAutopilotOperatorPacket | null;
	lanes: MigrationAutopilotPacketLane[];
}

export function MigrationOperatorLanesTable({
	operatorPacket,
	lanes,
}: MigrationOperatorLanesTableProps) {
	if (!lanes?.length && !operatorPacket) return null;

	return (
		<div className="migration-operator-lanes-block" data-testid="migration-operator-lanes-table">
			{operatorPacket && (
				<div className="migration-operator-score">
					<strong>
						Пакет миграции:{" "}
						{migrationOperatorPacketStatusLabels[operatorPacket.overallStatus] ?? operatorPacket.overallStatus} ·{" "}
						{Math.round(operatorPacket.score * 100)}%
					</strong>
					<span>
						базы {operatorPacket.totals.databaseSources} · снимки {operatorPacket.totals.mediaSources} · таблицы {operatorPacket.totals.tableSources} · из текста {operatorPacket.totals.smartPreviewSources} · следы {operatorPacket.totals.workstationHints} · ссылки {operatorPacket.totals.publicLookupTargets}
					</span>
				</div>
			)}

			<div className="migration-autopilot-summary migration-lanes-grid">
				{lanes.slice(0, 5).map((lane, idx) => (
					<article key={lane?.id ?? `lane-${idx}`} className="migration-lane-card">
						<strong>{lane?.title}</strong>
						<span>
							{migrationOwnerLabels[lane?.owner] ?? humanizeMigrationText(lane?.owner)} ·{" "}
							{migrationOperatorPacketStatusLabels[lane?.status] ?? humanizeMigrationText(lane?.status)} ·{" "}
							{Math.round((lane?.score ?? 0) * 100)}%
						</span>
						<small>{humanizeMigrationText(lane?.detail)}</small>
						{lane?.nextAction && <small>{humanizeMigrationText(lane.nextAction)}</small>}
					</article>
				))}
			</div>

			{operatorPacket?.firstActions && operatorPacket.firstActions.length > 0 && (
				<section className="migration-source-artifact-list" aria-label="Первые действия миграции">
					{operatorPacket.firstActions.slice(0, 6).map((action: string) => (
						<span key={action}>{humanizeMigrationText(action)}</span>
					))}
				</section>
			)}
		</div>
	);
}
