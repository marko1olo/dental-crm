import React from "react";
import type { MigrationAutopilotHandoffChecklistItem } from "@dental/shared";
import {
	migrationHandoffPhaseLabels,
	migrationOperatorPacketStatusLabels,
	migrationOwnerLabels,
} from "../constants";
import { humanizeMigrationText } from "../helpers";

export interface MigrationHandoffChecklistViewProps {
	checklist: MigrationAutopilotHandoffChecklistItem[];
	triageItems?: any[];
}

export function MigrationHandoffChecklistView({
	checklist,
	triageItems = [],
}: MigrationHandoffChecklistViewProps) {
	return (
		<div className="migration-handoff-checklist-block">
			{triageItems.length > 0 && (
				<section
					className="migration-triage-queue"
					data-testid="migration-triage-queue"
					aria-label="Короткая очередь миграции для администратора"
				>
					<div className="migration-triage-head">
						<strong>Очередь действий перед переносом</strong>
						<span>Сначала стопоры, затем задачи для параллельной подготовки.</span>
					</div>
					<div className="migration-triage-grid">
						{triageItems.map((item, idx) => (
							<div
								className={`migration-triage-item status-${item?.status}`}
								key={item?.id ?? `triage-item-${idx}`}
							>
								<strong>{item?.title}</strong>
								<span>
									{migrationOwnerLabels[item?.owner] ?? humanizeMigrationText(item?.owner)} ·{" "}
									{migrationHandoffPhaseLabels[item?.phase] ?? humanizeMigrationText(item?.phase)} ·{" "}
									{migrationOperatorPacketStatusLabels[item?.status] ?? humanizeMigrationText(item?.status)} ·{" "}
									{item?.blocking ? "сначала это" : "параллельно"}
								</span>
								<small>{humanizeMigrationText(item?.detail)}</small>
								{item?.requiredArtifact && <small>Нужно: {humanizeMigrationText(item.requiredArtifact)}</small>}
								{item?.doneWhen && <small>Готово: {humanizeMigrationText(item.doneWhen)}</small>}
							</div>
						))}
					</div>
				</section>
			)}

			{checklist?.length > 0 && (
				<section
					className="migration-autopilot-summary migration-grouped-checklist"
					data-testid="migration-autopilot-handoff-checklist"
					aria-label="Чеклист передачи миграции"
				>
					<div className="dicom-discovery-head">
						<strong>Чеклист готовности базы (пациенты, визиты, прайс-лист)</strong>
					</div>
					{checklist.slice(0, 6).map((item, idx) => (
						<article key={item?.id ?? `handoff-${idx}`} className="migration-checklist-card">
							<strong>{item?.title}</strong>
							<span>
								{migrationOwnerLabels[item?.owner] ?? humanizeMigrationText(item?.owner)} ·{" "}
								{migrationHandoffPhaseLabels[item?.phase] ?? humanizeMigrationText(item?.phase)} ·{" "}
								{migrationOperatorPacketStatusLabels[item?.status] ?? humanizeMigrationText(item?.status)}
							</span>
							<small>{humanizeMigrationText(item?.detail)}</small>
							{item?.requiredArtifact && <small>Нужно: {humanizeMigrationText(item.requiredArtifact)}</small>}
							{item?.doneWhen && <small>{humanizeMigrationText(item.doneWhen)}</small>}
						</article>
					))}
				</section>
			)}
		</div>
	);
}
