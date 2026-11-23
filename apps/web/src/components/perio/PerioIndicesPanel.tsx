/**
 * apps/web/src/components/perio/PerioIndicesPanel.tsx
 *
 * Клиническая панель расширенных индексов гигиены и состояния пародонта:
 * - O'Leary Plaque Control Record (PCR) и допуск к пародонтальной хирургии/имплантации
 * - Green-Vermillion Simplified Oral Hygiene Index (OHI-S: DI-S + CI-S)
 * - Parma Papillary-Marginal-Alveolar (PMA) gingival inflammation index
 * - WHO Periodontal Screening and Recording (PSR) & deep pockets
 *
 * Мандаты: 8b (декомпозиция <= 120 строк), 8d (Zero emojis), 8am (дизайн-токены).
 */

import React from "react";
import type { OlearyPcrSummary, OhiSResult, PmaResult, PerioChartSummary } from "@dental/shared";
import { Info, X } from "lucide-react";

export interface PerioIndicesPanelProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly olearySummary: OlearyPcrSummary;
	readonly ohiResult: OhiSResult;
	readonly pmaResult: PmaResult;
	readonly summary: PerioChartSummary;
	readonly psrFormula: string;
	readonly suggestedDiagnosisRu: string;
	readonly icd10Code?: string | undefined;
	readonly onInsertDiagnosisToVisit?: ((icd10: string, diagText: string) => void) | undefined;
}

export const PerioIndicesPanel: React.FC<PerioIndicesPanelProps> = React.memo(({
	isOpen,
	onClose,
	olearySummary,
	ohiResult,
	pmaResult,
	summary,
	psrFormula,
	suggestedDiagnosisRu,
	icd10Code,
	onInsertDiagnosisToVisit,
}) => {
	if (!isOpen) return null;

	return (
		<div
			data-testid="perio-comprehensive-indices-panel"
			className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 text-xs animate-in fade-in duration-150"
		>
			<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<Info className="w-4 h-4 text-[var(--primary)] shrink-0" />
					<span className="font-bold text-sm text-[var(--ink)]">
						Клинические индексы гигиены и пародонта
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] px-2 text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
					aria-label="Закрыть панель индексов"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{/* 1. O'Leary PCR */}
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink)]">O'Leary PCR (Налёт)</span>
						<span
							className={`font-extrabold text-sm ${
								olearySummary.pcrPercent <= 15
									? "text-[var(--success,#10b981)]"
									: olearySummary.pcrPercent <= 30
										? "text-[var(--warning,#f59e0b)]"
										: "text-[var(--danger,#e11d48)]"
							}`}
						>
							{olearySummary.pcrPercent}%
						</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] leading-tight">
						{olearySummary.ratingDescriptionRu}
					</div>
					<div className="text-[10px] font-semibold mt-1 pt-1 border-t border-[var(--line)] flex items-center justify-between">
						<span className="text-[var(--muted)]">Хирургический допуск:</span>
						<span className={olearySummary.isSurgicalClearanceMet ? "text-[var(--success,#10b981)]" : "text-[var(--danger,#e11d48)]"}>
							{olearySummary.isSurgicalClearanceMet ? "Допущен (<=15%)" : "Требуется профгигиена"}
						</span>
					</div>
				</div>

				{/* 2. OHI-S (Грин-Вермиллион) */}
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink)]">OHI-S (Грин-Вермиллион)</span>
						<span
							className={`font-extrabold text-sm ${
								ohiResult.totalScore <= 0.6
									? "text-[var(--success,#10b981)]"
									: ohiResult.totalScore <= 1.6
										? "text-[var(--warning,#f59e0b)]"
										: "text-[var(--danger,#e11d48)]"
							}`}
						>
							{ohiResult.totalScore.toFixed(1)}
						</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] leading-tight">
						{ohiResult.ratingText}
					</div>
					<div className="text-[10px] text-[var(--muted)] mt-1 pt-1 border-t border-[var(--line)] flex items-center justify-between">
						<span>Налёт DI-S: {ohiResult.debrisScore.toFixed(1)}</span>
						<span>Камень CI-S: {ohiResult.calculusScore.toFixed(1)}</span>
					</div>
				</div>

				{/* 3. PMA (Парма) */}
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink)]">PMA (Воспаление)</span>
						<span
							className={`font-extrabold text-sm ${
								pmaResult.pmaPercent === 0
									? "text-[var(--success,#10b981)]"
									: pmaResult.pmaPercent <= 25
										? "text-[var(--warning,#f59e0b)]"
										: "text-[var(--danger,#e11d48)]"
							}`}
						>
							{pmaResult.pmaPercent}%
						</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] leading-tight">
						{pmaResult.ratingText}
					</div>
					<div className="text-[10px] text-[var(--muted)] mt-1 pt-1 border-t border-[var(--line)] flex items-center justify-between">
						<span>BOP (Кровоточивость):</span>
						<span className="font-bold text-[var(--ink)]">{summary.fmbsPercent}%</span>
					</div>
				</div>

				{/* 4. Скрининг ВОЗ (PSR) & карманы */}
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink)]">Скрининг ВОЗ (PSR)</span>
						<span className="font-extrabold text-sm text-[var(--primary)]">{psrFormula}</span>
					</div>
					<div className="text-[11px] font-medium text-[var(--ink)] leading-tight">
						{suggestedDiagnosisRu}
					</div>
					<div className="text-[10px] text-[var(--muted)] mt-1 pt-1 border-t border-[var(--line)] flex items-center justify-between">
						<span>Карманы &gt;= 4 мм:</span>
						<span
							className={`font-bold ${
								summary.deepPocketsCount > 0
									? "text-[var(--danger,#e11d48)]"
									: "text-[var(--success,#10b981)]"
							}`}
						>
							{summary.deepPocketsCount}
						</span>
					</div>
					{onInsertDiagnosisToVisit && (
						<button
							type="button"
							data-testid="perio-insert-icd-btn"
							onClick={() => onInsertDiagnosisToVisit(icd10Code || "K05.1", suggestedDiagnosisRu)}
							className="mt-1 h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper-soft)] hover:bg-[var(--primary)] hover:text-white border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
							title={`Внести ${icd10Code || "K05"} в приём`}
						>
							+ Внести диагноз в приём
						</button>
					)}
				</div>
			</div>
		</div>
	);
});

PerioIndicesPanel.displayName = "PerioIndicesPanel";
export default PerioIndicesPanel;
