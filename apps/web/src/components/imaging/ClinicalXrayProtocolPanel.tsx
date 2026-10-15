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

export interface ClinicalXrayProtocolPanelProps {
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

/**
 * Чистый клинический протокол рентгенодиагностики (Мандат 8e, 8n).
 * Врач сам оценивает находки и переносит их в дневник приёма и зубную формулу.
 */
export function ClinicalXrayProtocolPanel({
	summary,
	toothUpdates,
	onPrint,
	studyTitle,
	patientId,
	onApplyToChart,
	onInsertToDiary,
}: ClinicalXrayProtocolPanelProps) {
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

			// 1. Группировка зубов по статусу
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

			// 2. Сохранение в API зубной формулы пациента
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
						logger.warn(`[ClinicalXray] batch update failed for state ${state}: ${res.status}`);
					}
				}
			} else {
				appliedCount = updates.length;
			}

			// 3. Формирование текста дневника приёма для медицинской карты
			const diaryLines = [
				`[Рентгенодиагностика · Протокол исследования]`,
				summary,
			];
			if (updates.length > 0) {
				diaryLines.push("Описание состояния зубов:");
				for (const u of updates) {
					diaryLines.push(`• Зуб ${u.code}: ${u.diagnosisOrFinding}`);
				}
			}
			const diaryText = diaryLines.join("\n");

			if (onInsertToDiary) {
				onInsertToDiary(diaryText);
			}

			window.dispatchEvent(
				new CustomEvent("dente-apply-findings-to-diary", {
					detail: { text: diaryText, toothUpdates: updates, summary },
				}),
			);

			if (onApplyToChart) {
				await onApplyToChart(appliedCount);
			}

			setIsApplied(true);
			showToast(
				appliedCount > 0
					? `Данные рентгенодиагностики внесены в карту (${appliedCount} зубов) и дневник приёма`
					: "Протокол рентгенодиагностики внесён в дневник приёма",
				"success",
			);
		} catch (err) {
			logger.error("[ClinicalXray] failed to apply findings", err);
			showToast("Не удалось перенести данные рентгенодиагностики", "error");
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<div className="sa-panel clinical-xray-panel">
			<div className="sa-panel-header">
				<div className="sa-panel-title flex items-center gap-2">
					<FileText size={15} className="text-teal-500" />
					<span className="font-semibold text-sm text-[var(--ink)]">Протокол рентгенодиагностики</span>
					{criticalCount > 0 && (
						<span className="sa-badge-critical">{criticalCount} очаг(а)</span>
					)}
				</div>
				<div className="sa-panel-actions min-w-0 flex items-center gap-2">
					{studyTitle && (
						<span className="sa-study-label truncate min-w-0 text-xs text-[var(--muted)]" title={studyTitle}>
							{studyTitle}
						</span>
					)}
					{onPrint && (
						<button
							className="sa-icon-btn shrink-0"
							onClick={onPrint}
							title="Распечатать протокол рентгенодиагностики"
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
							<FileText size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Перенос данных в карту</span>
						</div>
						<div className="text-[11px] text-[var(--muted)] truncate">
							В зубную формулу и дневник приёма медицинской карты
						</div>
					</div>
					<button
						type="button"
						className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
							isApplied
								? "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 cursor-default"
								: "bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-strong,#0f766e)] text-white shadow-2xs"
						}`}
						disabled={isApplying || isApplied}
						onClick={handleApplyFindings}
					>
						{isApplying ? (
							<>
								<Loader2 size={12} className="animate-spin" />
								<span>Перенос...</span>
							</>
						) : isApplied ? (
							<>
								<Check size={12} />
								<span>Перенесено</span>
							</>
						) : (
							<>
								<CheckCircle size={12} />
								<span>В карту</span>
							</>
						)}
					</button>
				</div>

				{/* Описание исследования */}
				<div className="sa-summary-section mt-2 text-xs leading-relaxed text-[var(--ink)]">
					{summary}
				</div>

				{/* Список выявленных находок по зубам */}
				{updates.length > 0 && (
					<div className="sa-findings-list mt-3 flex flex-col gap-1.5">
						<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
							Детализация по зубам ({updates.length})
						</span>
						<div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
							{updates.map((u, i) => (
								<div
									key={`${u.code}-${i}`}
									className="px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs"
								>
									<span className="font-mono font-bold text-teal-600 dark:text-teal-400">
										Зуб #{u.code}
									</span>
									<span className="text-[var(--ink)] text-right truncate max-w-[200px]" title={u.diagnosisOrFinding}>
										{u.diagnosisOrFinding}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default ClinicalXrayProtocolPanel;
