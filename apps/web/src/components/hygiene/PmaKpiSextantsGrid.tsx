/**
 * PmaKpiSextantsGrid.tsx — Субкомпонент отображения карточек PMA, КПИ Леуса
 * и интерактивной сетки 6 индексных зубов ВОЗ (16, 11, 26 • 46, 31, 36).
 *
 * Архитектурная декомпозиция HygieneIndicesPanel по стандарту /decomposer и Мандату 8b (<=800 строк).
 */

import React, { memo } from "react";
import {
	HYGIENE_INDEX_TEETH_CONFIG,
	WHO_HYGIENE_SEXTANTS,
	type CombinedHygieneReport,
	type ExtendedToothAssessment,
} from "@dental/shared";

export interface PmaKpiSextantsGridProps {
	readonly assessments: Record<number, ExtendedToothAssessment>;
	readonly report: CombinedHygieneReport;
	readonly onUpdateToothScore: (
		toothNumber: number,
		field: "pmaScore" | "kpiScore",
		value: number,
	) => void;
	readonly readOnly?: boolean;
}

export const PmaKpiSextantsGrid: React.FC<PmaKpiSextantsGridProps> = memo(({
	assessments,
	report,
	onUpdateToothScore,
	readOnly = false,
}) => {
	return (
		<div className="flex flex-col gap-3">
			{/* Карточки вторичных индексов (PMA и КПИ) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{/* PMA */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс PMA (Парма / воспаление)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.pma.severity === "intact"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.pma.severity === "mild"
										? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.pma.severity === "intact"
								? "Норма 0%"
								: report.pma.severity === "mild"
									? "Легкий"
									: "Средний/Тяжелый"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.pma.pmaPercent === 0
									? "text-emerald-600 dark:text-emerald-400"
									: report.pma.pmaPercent <= 25
										? "text-amber-600 dark:text-amber-400"
										: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{report.pma.pmaPercent}%
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							баллы: <strong>{report.pma.totalPoints}</strong> из {report.pma.maxPossiblePoints}
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0% (воспаление десны отсутствует)
					</span>
				</div>

				{/* КПИ Леуса */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							КПИ Леуса (состояние пародонта)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								report.kpi.severity === "healthy"
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: report.kpi.severity === "risk"
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{report.kpi.severity === "healthy" ? "Здоров 0.0" : "Изменения"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								report.kpi.kpiScore === 0
									? "text-emerald-600 dark:text-emerald-400"
									: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{report.kpi.kpiScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							обследовано: <strong>{report.kpi.assessedTeethCount}</strong> зубов
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0.0 (здоровый периодонт)
					</span>
				</div>
			</div>

			{/* Сетка 6 индексных зубов для PMA и КПИ */}
			<div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center justify-between flex-wrap gap-1">
				<span className="truncate">
					СЕТКА 6 ИНДЕКСНЫХ ЗУБОВ (16, 11, 26 • 46, 31, 36) — ВОСПАЛЕНИЕ И ПЕРИОДОНТ:
				</span>
				<span className="text-[11px] text-[var(--muted)] font-normal truncate">
					Кликните на цифру для выбора балла
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
				{HYGIENE_INDEX_TEETH_CONFIG.map((cfg) => {
					const item = assessments[cfg.toothNumber] ?? { toothNumber: cfg.toothNumber };
					const pma = item.pmaScore ?? 0;
					const kpi = item.kpiScore ?? 0;
					const sextantDef = WHO_HYGIENE_SEXTANTS.find((s) => s.indexToothNumber === cfg.toothNumber);

					return (
						<div
							key={cfg.toothNumber}
							className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2.5 min-w-0"
						>
							{/* Tooth Header */}
							<div className="flex items-center justify-between min-w-0">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-800 dark:text-teal-300 font-mono font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
										{cfg.toothNumber}
									</span>
									<div className="min-w-0 flex-1">
										<div className="text-xs font-bold text-[var(--ink)] truncate">
											{cfg.anatomicalNameRu}
										</div>
										<div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium truncate">
											{cfg.surfaceLabelRu}
										</div>
									</div>
								</div>
								{sextantDef && (
									<span
										className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 shrink-0"
										title={`Секстант ВОЗ ${sextantDef.sextant}: зубы ${sextantDef.teethRangeRu}`}
									>
										{sextantDef.sextant} ({sextantDef.teethRangeRu})
									</span>
								)}
							</div>

							{/* PMA */}
							<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/60">
								<span className="text-[11px] text-[var(--muted)] font-medium truncate">
									Воспаление (PMA):
								</span>
								<div className="flex items-center gap-1 shrink-0">
									{[
										{ val: 0, label: "0", hint: "0: Десна здорова" },
										{ val: 1, label: "P", hint: "1: Сосочек (P - Papillary)" },
										{ val: 2, label: "M", hint: "2: Маргинальная десна (M)" },
										{ val: 3, label: "A", hint: "3: Альвеолярная десна (A)" },
									].map(({ val, label, hint }) => (
										<button
											key={val}
											type="button"
											disabled={readOnly}
											onClick={() => onUpdateToothScore(cfg.toothNumber, "pmaScore", val)}
											className={`min-h-[44px] min-w-[30px] sm:min-w-[34px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
												pma === val
													? val === 0
														? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
														: "bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-300"
													: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
											}`}
											title={hint}
										>
											{label}
										</button>
									))}
								</div>
							</div>

							{/* KPI */}
							<div className="flex items-center justify-between text-xs">
								<span className="text-[11px] text-[var(--muted)] font-medium truncate">
									Периодонт (КПИ):
								</span>
								<div className="flex items-center gap-1 shrink-0">
									{[
										{ val: 0, label: "0", hint: "0: Здоровый периодонт" },
										{ val: 1, label: "1", hint: "1: Кровоточивость (BOP)" },
										{ val: 2, label: "2", hint: "2: Зубной камень" },
										{ val: 3, label: "3", hint: "3: Карман 4-5 мм" },
										{ val: 4, label: "4", hint: "4: Карман ≥ 6 мм или подвижность" },
									].map(({ val, label, hint }) => (
										<button
											key={val}
											type="button"
											disabled={readOnly}
											onClick={() => onUpdateToothScore(cfg.toothNumber, "kpiScore", val)}
											className={`min-h-[44px] min-w-[28px] sm:min-w-[32px] px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
												kpi === val
													? val === 0
														? "bg-emerald-500 text-slate-950 font-black ring-1 ring-emerald-300"
														: val <= 2
															? "bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300"
															: "bg-rose-600 text-white font-black ring-1 ring-rose-300"
													: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
											}`}
											title={hint}
										>
											{label}
										</button>
									))}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
});

PmaKpiSextantsGrid.displayName = "PmaKpiSextantsGrid";
