import React, { useState } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle,
	FileText,
	Loader2,
	Printer,
	Sparkles,
} from "lucide-react";
import { isValidFdiToothNumber } from "@dental/shared";
import type { ToothState } from "../odontogram/ToothChart.js";
import { showToast } from "../GlobalToast.js";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { logger } from "../../utils/logger.js";

export interface ToothUpdate {
	code: string;
	state: string;
	diagnosisOrFinding: string;
}

export interface ShadowAnalystReportProps {
	summary: string;
	toothUpdates?: ToothUpdate[] | undefined;
	onPrint?: (() => void) | undefined;
	studyTitle?: string | undefined;
	patientId?: string | null | undefined;
	onApplyToChart?: ((appliedCount: number) => Promise<void> | void) | undefined;
	onInsertToDiary?: ((text: string) => void) | undefined;
}

function mapFindingToToothState(rawState: string): ToothState {
	const lower = (rawState || "").toLowerCase().trim();
	if (lower.includes("pulpit")) return "Pulpitis";
	if (lower.includes("periodont")) return "Periodontitis";
	if (lower.includes("caries") || lower.includes("treatment")) return "Caries";
	if (lower.includes("missing") || lower.includes("extract")) return "Missing";
	if (lower.includes("crown") || lower.includes("prosthet")) return "Crown";
	if (lower.includes("implant")) return "Implant";
	if (lower.includes("fill") || lower.includes("done")) return "Filled";
	return "Caries";
}

function parseFdiToothNumber(code: string): number | null {
	const digits = code.replace(/\D/g, "");
	const num = parseInt(digits, 10);
	if (Number.isInteger(num) && isValidFdiToothNumber(num)) {
		return num;
	}
	return null;
}

export function ShadowAnalystReport({
	summary,
	toothUpdates,
	onPrint,
	studyTitle,
	patientId,
	onApplyToChart,
	onInsertToDiary,
}: ShadowAnalystReportProps) {
	const appLogic = useOptionalAppLogicContext();
	const [isApplying, setIsApplying] = useState(false);
	const [isApplied, setIsApplied] = useState(false);

	const updates = toothUpdates ?? [];
	const criticalCount = updates.filter(
		(u) =>
			(u?.state ?? "").toLowerCase().includes("caries") ||
			(u?.state ?? "").toLowerCase().includes("pulpitis") ||
			(u?.state ?? "").toLowerCase().includes("periodont"),
	).length;

	const handleApplyFindings = async () => {
		if (isApplying || isApplied) return;
		setIsApplying(true);

		try {
			let appliedCount = 0;

			// 1. Group valid tooth findings by ToothState
			const stateToTeeth = new Map<ToothState, number[]>();
			for (const u of updates) {
				const fdi = parseFdiToothNumber(u.code);
				if (!fdi) continue;
				const state = mapFindingToToothState(u.state);
				const existing = stateToTeeth.get(state) ?? [];
				if (!existing.includes(fdi)) {
					existing.push(fdi);
				}
				stateToTeeth.set(state, existing);
			}

			// 2. Persist to /api/patients/:id/tooth-states/batch if patientId is known
			if (patientId && stateToTeeth.size > 0) {
				const mutationHeaders = appLogic?.denteClinicalMutationHeaders
					? appLogic.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: { "Content-Type": "application/json" };

				for (const [state, toothNumbers] of stateToTeeth.entries()) {
					const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
						method: "POST",
						headers: mutationHeaders,
						body: JSON.stringify({ toothNumbers, state }),
					});
					if (res.ok) {
						appliedCount += toothNumbers.length;
					} else {
						logger.warn(`[ShadowAnalyst] batch update failed for state ${state}: ${res.status}`);
					}
				}
			} else {
				appliedCount = updates.length;
			}

			// 3. Prepare clinical diary text and dispatch/insert to Form 043/u
			const diaryLines = [
				`[ShadowAnalyst · Рентген-анализ]`,
				summary,
			];
			if (updates.length > 0) {
				diaryLines.push("Детализация по зубам:");
				for (const u of updates) {
					diaryLines.push(`• Зуб ${u.code}: ${u.diagnosisOrFinding}`);
				}
			}
			const diaryText = diaryLines.join("\n");

			if (onInsertToDiary) {
				onInsertToDiary(diaryText);
			}

			// Also fire clinical event for visit diary tab listener
			window.dispatchEvent(
				new CustomEvent("dente-apply-findings-to-diary", {
					detail: { text: diaryText, toothUpdates: updates, summary },
				}),
			);

			// 4. Invoke optional parent callback
			if (onApplyToChart) {
				await onApplyToChart(appliedCount);
			}

			setIsApplied(true);
			showToast(
				appliedCount > 0
					? `Находки ИИ успешно перенесены в формулу (${appliedCount} зубов) и дневник приёма`
					: "Заключение ИИ внесено в дневник приёма",
				"success",
			);
		} catch (err) {
			logger.error("[ShadowAnalyst] failed to apply findings to chart / diary", err);
			showToast("Не удалось автоматически применить все находки ИИ", "error");
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<div className="sa-panel">
			<div className="sa-panel-header">
				<div className="sa-panel-title">
					<Sparkles size={15} />
					<span>ShadowAnalyst · AI Expert</span>
					{criticalCount > 0 && (
						<span className="sa-badge-critical">{criticalCount} крит.</span>
					)}
				</div>
				<div className="sa-panel-actions min-w-0">
					{studyTitle && (
						<span className="sa-study-label truncate min-w-0" title={studyTitle}>
							{studyTitle}
						</span>
					)}
					{onPrint && (
						<button
							className="sa-icon-btn shrink-0"
							onClick={onPrint}
							title="Распечатать отчёт"
							type="button"
						>
							<Printer size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="sa-panel-body">
				{/* 1-Click Apply CTA Banner (Mandate 8e & 8k) */}
				<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/40 flex items-center justify-between gap-2.5">
					<div className="min-w-0 flex-1">
						<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Sparkles size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Перенос находок в карту</span>
						</div>
						<div className="text-[11px] text-[var(--muted)] truncate">
							В зубную формулу и дневник Формы 043/у
						</div>
					</div>

					<button
						type="button"
						data-testid="btn-shadow-analyst-apply"
						onClick={handleApplyFindings}
						disabled={isApplying}
						className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-2xs shrink-0 ${
							isApplied
								? "bg-emerald-600 text-white"
								: "bg-teal-600 hover:bg-teal-500 text-white"
						} disabled:opacity-50`}
						title="Перенести находки ИИ в зубную формулу и дневник приёма Формы 043/у (1 клик)"
					>
						{isApplied ? (
							<>
								<Check size={13} />
								<span>Перенесено</span>
							</>
						) : isApplying ? (
							<>
								<Loader2 size={13} className="animate-spin" />
								<span>Перенос...</span>
							</>
						) : (
							<>
								<Sparkles size={13} />
								<span>В формулу и дневник</span>
							</>
						)}
					</button>
				</div>

				{/* Summary */}
				<div className="sa-section">
					<div className="sa-section-label">
						<FileText size={12} />
						Заключение
					</div>
					<p className="sa-summary-text">{summary}</p>
				</div>

				{/* Tooth table */}
				{updates.length > 0 && (
					<div className="sa-section">
						<div className="sa-section-label">
							<AlertTriangle size={12} />
							Детализация по зубам · {updates.length} поз.
						</div>
						<div className="sa-tooth-grid">
							{updates.map((update) => {
								const updateState = (update?.state ?? "").toLowerCase();
								const isCritical =
									updateState.includes("caries") ||
									updateState.includes("pulpitis") ||
									updateState.includes("periodont");
								const isDone =
									update?.state === "done" ||
									update?.state === "implant" ||
									update?.state === "prosthetic";
								return (
									<div
										key={`tooth-${update.code}-${update.diagnosisOrFinding}`}
										className={`sa-tooth-row ${isCritical ? "sa-tooth-row--critical" : ""} ${isDone ? "sa-tooth-row--done" : ""}`}
									>
										<span className="sa-tooth-num shrink-0">{update.code}</span>
										<span className="sa-tooth-text truncate min-w-0" title={update.diagnosisOrFinding}>
											{update.diagnosisOrFinding}
										</span>
										{isCritical && (
											<AlertTriangle size={12} className="sa-tooth-icon" />
										)}
										{isDone && (
											<CheckCircle
												size={12}
												className="sa-tooth-icon sa-tooth-icon--done"
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default ShadowAnalystReport;
