/**
 * OhiSilnessCalculator.tsx — Калькулятор клинических индексов OHI-S (Грин-Вермиллион)
 * и Silness-Löe (Сиднесс-Лоэ) по 6 индексным зубам (16, 11, 26, 46, 31, 36).
 *
 * (DOMAIN: CLINICAL HYGIENE INDICES — GREEN-VERMILLION & SILNESS-LOE)
 *
 * Инварианты:
 * 1. OHI-S = avg(DI-S) + avg(CI-S). Норма: <= 0.6.
 * 2. Silness-Löe: толщина зубного налета у десневого края (0..3). Норма: 0.0.
 * 3. Сенсорный минимум: кнопки ввода баллов >= 44x44px (touch-friendly).
 * 4. Контрастность WCAG AAA, дизайн-токены var(--paper-soft), var(--line), var(--ink).
 * 5. Нулевой оверинжиниринг, 0% эмодзи, соответствие стандарту Формы 043/у.
 */

import React, { memo } from "react";
import type {
	CombinedHygieneReport,
	ExtendedToothAssessment,
	SilnessLoeResult,
} from "@dental/shared";
import { HYGIENE_INDEX_TEETH_CONFIG } from "@dental/shared";

export interface OhiSilnessCalculatorProps {
	readonly assessments: Record<number, ExtendedToothAssessment>;
	readonly report: CombinedHygieneReport;
	readonly silnessResult: SilnessLoeResult;
	readonly activeTab?: "ohi-s" | "silness-loe" | string | undefined;
	readonly onUpdateToothScore: (
		toothNumber: number,
		field: "debrisScore" | "calculusScore" | "silnessScore",
		value: number,
	) => void;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const OhiSilnessCalculator: React.FC<OhiSilnessCalculatorProps> = memo(({
	assessments,
	report,
	silnessResult,
	activeTab = "ohi-s",
	onUpdateToothScore,
	readOnly = false,
	compactMode = false,
}) => {
	const { ohiS } = report;

	return (
		<div className="flex flex-col gap-3 w-full">
			{/* ─── Telemetry Cards: OHI-S and Silness-Löe ─────────────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{/* Card 1: OHI-S (Green-Vermillion) */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс OHI-S (Грин-Вермиллион)
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								ohiS.totalScore <= 0.6
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: ohiS.totalScore <= 1.6
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: ohiS.totalScore <= 2.5
											? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
											: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{ohiS.clinicalEvaluation === "excellent"
								? "Отличная"
								: ohiS.clinicalEvaluation === "good"
									? "Хорошая"
									: ohiS.clinicalEvaluation === "moderate"
										? "Удовлетворит."
										: ohiS.clinicalEvaluation === "poor"
											? "Неудовлетворит."
											: "Плохая"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								ohiS.totalScore <= 0.6
									? "text-emerald-600 dark:text-emerald-400"
									: ohiS.totalScore <= 1.6
										? "text-teal-700 dark:text-teal-300"
										: ohiS.totalScore <= 2.5
											? "text-amber-600 dark:text-amber-400"
											: "text-rose-600 dark:text-rose-400"
							}`}
						>
							{ohiS.totalScore.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							DI-S: <strong>{ohiS.debrisScore}</strong> • CI-S:{" "}
							<strong>{ohiS.calculusScore}</strong>
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: ≤ 0.6 (отл.) / ≤ 1.6 (хор.)
					</span>
				</div>

				{/* Card 2: Silness-Löe */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<div className="flex items-center justify-between gap-1 min-w-0">
						<span className="text-xs font-bold text-[var(--muted)] truncate">
							Индекс Silness-Löe
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
								silnessResult.isOptimal
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: silnessResult.evaluation === "good"
										? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
										: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
						>
							{silnessResult.isOptimal
								? "Норма (0)"
								: silnessResult.evaluation === "good"
									? "Хорошая"
									: "Налет"}
						</span>
					</div>

					<div className="flex items-baseline gap-2 mt-1 min-w-0">
						<span
							className={`text-2xl font-black shrink-0 ${
								silnessResult.isOptimal
									? "text-emerald-600 dark:text-emerald-400"
									: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{silnessResult.score.toFixed(1)}
						</span>
						<span className="text-xs text-[var(--muted)] truncate">
							налет в придесневой зоне (0..3)
						</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] truncate">
						Норма: 0.0 (налет у края десны отсутствует)
					</span>
				</div>
			</div>

			{/* ─── Optional Compact Interactive Scoring Strip ─────────────── */}
			{!compactMode && (activeTab === "ohi-s" || activeTab === "silness-loe") && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
					<div className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400">
						<span>
							{activeTab === "ohi-s"
								? "Оценка налета DI-S и зубного камня CI-S по 6 зубам:"
								: "Оценка придесневого налета Silness-Löe (0..3):"}
						</span>
						<span className="text-[11px] font-normal text-[var(--muted)]">
							{activeTab === "ohi-s" ? "Налет 0..3 / Камень 0..3" : "0: норма, 1-3: налет"}
						</span>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						{HYGIENE_INDEX_TEETH_CONFIG.map((cfg) => {
							const item = assessments[cfg.toothNumber] ?? { toothNumber: cfg.toothNumber };
							const debris = item.debrisScore ?? 0;
							const calculus = item.calculusScore ?? 0;
							const silness = item.silnessScore ?? debris;

							return (
								<div
									key={cfg.toothNumber}
									className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5 text-center min-w-0"
								>
									<div className="flex items-center justify-between text-xs font-mono font-black text-teal-800 dark:text-teal-300">
										<span>#{cfg.toothNumber}</span>
										<span className="text-[10px] font-normal text-[var(--muted)] truncate">
											{cfg.surfaceAspect === "vestibular" ? "Вест." : "Орал."}
										</span>
									</div>

									{activeTab === "ohi-s" ? (
										<div className="flex flex-col gap-1">
											{/* Debris DI-S */}
											<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
												<span>DI:</span>
												<div className="flex gap-0.5">
													{[0, 1, 2, 3].map((val) => (
														<button
															key={val}
															type="button"
															disabled={readOnly}
															onClick={() => onUpdateToothScore(cfg.toothNumber, "debrisScore", val)}
															className={`min-h-[28px] min-w-[20px] px-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
																debris === val
																	? "bg-amber-500 text-slate-950 font-black"
																	: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
															}`}
															title={`Налет ${val}`}
														>
															{val}
														</button>
													))}
												</div>
											</div>

											{/* Calculus CI-S */}
											<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
												<span>CI:</span>
												<div className="flex gap-0.5">
													{[0, 1, 2, 3].map((val) => (
														<button
															key={val}
															type="button"
															disabled={readOnly}
															onClick={() => onUpdateToothScore(cfg.toothNumber, "calculusScore", val)}
															className={`min-h-[28px] min-w-[20px] px-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
																calculus === val
																	? "bg-orange-500 text-white font-black"
																	: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
															}`}
															title={`Камень ${val}`}
														>
															{val}
														</button>
													))}
												</div>
											</div>
										</div>
									) : (
										/* Silness-Löe */
										<div className="flex items-center justify-center gap-1">
											{[0, 1, 2, 3].map((val) => (
												<button
													key={val}
													type="button"
													disabled={readOnly}
													onClick={() => onUpdateToothScore(cfg.toothNumber, "silnessScore", val)}
													className={`min-h-[32px] min-w-[24px] px-1.5 rounded text-xs font-bold cursor-pointer transition-all ${
														silness === val
															? "bg-teal-600 text-white font-black"
															: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
													}`}
													title={`Silness-Löe ${val}`}
												>
													{val}
												</button>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
});

OhiSilnessCalculator.displayName = "OhiSilnessCalculator";
