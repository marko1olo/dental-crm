/**
 * apps/web/src/components/settings/migrationModules/MigrationColumnMapperStep.tsx
 *
 * Interactive mapping of imported file columns to DB fields (ФИО, Телефон, Баланс, История приёмов)
 * and integration with server-side MigrationMappingPanel.
 */

import React from "react";
import { MigrationMappingPanel } from "../migration/MigrationMappingPanel";
import {
	MIGRATION_FIELD_TARGETS,
	type MapResponse,
	type MigrationFieldTarget,
	type UploadResponse,
} from "./migrationWizardTypes";

export interface MigrationColumnMapperStepProps {
	upload: UploadResponse | null;
	mapping: MapResponse | null;
	busy: boolean;
	allowLlm: boolean;
	onAllowLlmChange: (value: boolean) => void;
	onDryRun: () => void;
	onLiveRun: () => void;
	onRestart: () => void;
	csvHeaders: string[];
	columnMap: Record<string, MigrationFieldTarget>;
	onColumnTargetChange: (header: string, target: MigrationFieldTarget) => void;
}

export function MigrationColumnMapperStep({
	upload,
	mapping,
	busy,
	allowLlm,
	onAllowLlmChange,
	onDryRun,
	onLiveRun,
	onRestart,
	csvHeaders,
	columnMap,
	onColumnTargetChange,
}: MigrationColumnMapperStepProps) {
	return (
		<div className="space-y-4" data-testid="migration-column-mapper-step">
			{csvHeaders.length > 0 && (
				<div
					className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3"
					data-testid="interactive-csv-column-mapper"
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<h4 className="m-0 text-sm font-bold text-[var(--ink)]">
								Сопоставление колонок таблицы с карточкой пациента
							</h4>
							<p className="m-0 text-xs text-[var(--muted)]">
								Проверьте привязку колонок ФИО, телефонов (+7), балансов и истории приёмов перед импортом
							</p>
						</div>
						<span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
							Колонок: {csvHeaders.length}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
						{csvHeaders.map((header) => {
							const currentTarget = columnMap[header] ?? "ignore";
							return (
								<label
									key={header}
									className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-col gap-1.5"
								>
									<span className="text-xs font-bold text-[var(--ink)] truncate" title={header}>
										{header}
									</span>
									<select
										value={currentTarget}
										onChange={(e) =>
											onColumnTargetChange(
												header,
												e.target.value as MigrationFieldTarget,
											)
										}
										className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
										data-testid={`column-map-select-${header}`}
									>
										{MIGRATION_FIELD_TARGETS.map((item) => (
											<option key={item.target} value={item.target}>
												{item.label}
												{item.required ? " *" : ""}
											</option>
										))}
									</select>
								</label>
							);
						})}
					</div>
				</div>
			)}

			{upload !== null && (
				<MigrationMappingPanel
					upload={upload}
					mapping={mapping}
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={onAllowLlmChange}
					onDryRun={onDryRun}
					onLiveRun={onLiveRun}
					onRestart={onRestart}
				/>
			)}
		</div>
	);
}
