/**
 * apps/web/src/components/settings/migrationModules/MigrationPreviewAndValidationStep.tsx
 *
 * Preview of parsed patient cards, phone duplicate detection (+7...),
 * deduplication summary metrics, and running/reconciliation report views.
 */

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Phone, Users } from "lucide-react";
import { MigrationReportPanel } from "../migration/MigrationReportPanel";
import { MigrationRunningPanel } from "../migration/MigrationRunningPanel";
import type {
	DeduplicationReport,
	ParsedPatientPreviewRow,
	ReconciliationResponse,
	RunStatus,
	WizardStep,
} from "./migrationWizardTypes";

export interface MigrationPreviewAndValidationStepProps {
	step: WizardStep;
	previewRows: ParsedPatientPreviewRow[];
	dedupReport: DeduplicationReport;
	status: RunStatus | null;
	report: ReconciliationResponse | null;
	dryRun: boolean;
	runId: string;
	busy: boolean;
	downloadButton: React.ReactNode;
	onCancelRun: () => void;
	onLiveRun: () => void;
	onRollback: () => void;
	onRestart: () => void;
}

export function MigrationPreviewAndValidationStep({
	step,
	previewRows,
	dedupReport,
	status,
	report,
	dryRun,
	runId,
	busy,
	downloadButton,
	onCancelRun,
	onLiveRun,
	onRollback,
	onRestart,
}: MigrationPreviewAndValidationStepProps) {
	const [statusFilter, setStatusFilter] = useState<
		"all" | "ready" | "duplicate" | "invalid"
	>("all");

	const filteredPreviewRows = previewRows.filter((row) =>
		statusFilter === "all" ? true : row.validationStatus === statusFilter,
	);

	return (
		<div className="space-y-4" data-testid="migration-preview-and-validation-step">
			{previewRows.length > 0 && (
				<div
					className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3"
					data-testid="migration-patient-preview-card"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
								<Users size={16} className="text-teal-600" aria-hidden="true" />
								Предпросмотр карточек пациентов и дедупликация телефонов
							</h4>
							<p className="m-0 text-xs text-[var(--muted)]">
								Телефоны автоматически приведены к формату +7, дубликаты помечены до записи в БД
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-1.5">
							<button
								type="button"
								onClick={() => setStatusFilter("all")}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									statusFilter === "all"
										? "bg-teal-600 text-white border-teal-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								}`}
							>
								Все ({dedupReport.totalRows})
							</button>
							<button
								type="button"
								onClick={() => setStatusFilter("ready")}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									statusFilter === "ready"
										? "bg-teal-600 text-white border-teal-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								}`}
							>
								К импорту ({dedupReport.readyCount})
							</button>
							<button
								type="button"
								onClick={() => setStatusFilter("duplicate")}
								className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									statusFilter === "duplicate"
										? "bg-teal-600 text-white border-teal-600"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
								}`}
								data-testid="migration-filter-duplicates-btn"
							>
								Дубликаты ({dedupReport.duplicateCount})
							</button>
							{dedupReport.invalidCount > 0 && (
								<button
									type="button"
									onClick={() => setStatusFilter("invalid")}
									className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
										statusFilter === "invalid"
											? "bg-teal-600 text-white border-teal-600"
											: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									}`}
								>
									Ошибки ({dedupReport.invalidCount})
								</button>
							)}
						</div>
					</div>

					<div className="overflow-x-auto rounded-xl border border-[var(--line)]">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)]">
									<th className="py-2 px-3 font-semibold">#</th>
									<th className="py-2 px-3 font-semibold">ФИО пациента</th>
									<th className="py-2 px-3 font-semibold">Телефон (+7)</th>
									<th className="py-2 px-3 font-semibold">Баланс</th>
									<th className="py-2 px-3 font-semibold">Последний приём</th>
									<th className="py-2 px-3 font-semibold">Статус проверки</th>
								</tr>
							</thead>
							<tbody>
								{filteredPreviewRows.slice(0, 15).map((row) => (
									<tr
										key={row.rowIndex}
										className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--paper-soft)]/50"
									>
										<td className="py-2 px-3 text-[var(--muted)]">{row.rowIndex}</td>
										<td className="py-2 px-3 font-semibold text-[var(--ink)]">
											{row.fullName}
										</td>
										<td className="py-2 px-3 text-[var(--ink)]">
											<span className="inline-flex items-center gap-1">
												<Phone size={12} className="text-teal-600" aria-hidden="true" />
												{row.normalizedPhone}
											</span>
										</td>
										<td className="py-2 px-3 font-medium text-[var(--ink)]">
											{row.balanceRub !== 0
												? `${row.balanceRub.toLocaleString("ru-RU")} ₽`
												: "0 ₽"}
										</td>
										<td className="py-2 px-3 text-[var(--muted)]">
											{row.lastVisitDate || "—"}
										</td>
										<td className="py-2 px-3">
											{row.validationStatus === "ready" ? (
												<span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-semibold">
													<CheckCircle2 size={13} aria-hidden="true" />
													Готов к записи
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
													<AlertTriangle size={13} aria-hidden="true" />
													{row.validationReason}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{step === "running" && (
				<MigrationRunningPanel
					status={status}
					dryRun={dryRun}
					onCancel={onCancelRun}
				/>
			)}

			{step === "report" && report !== null && status !== null && (
				<MigrationReportPanel
					report={report}
					status={status}
					dryRun={dryRun}
					runId={runId}
					busy={busy}
					downloadButton={downloadButton}
					onLiveRun={onLiveRun}
					onRollback={onRollback}
					onRestart={onRestart}
				/>
			)}
		</div>
	);
}
