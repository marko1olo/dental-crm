/**
 * @dental/web/components/hygiene/HygieneSilnessLoeTab.tsx
 *
 * Секция расчета индекса зубного налета Silness-Löe.
 * 6 ключевых зубов (16, 12, 24, 36, 32, 44), 4 анатомические поверхности.
 * Сенсорная эргономика: кнопки 0..3 адаптируются под тач >=44px на мобильных.
 */

import React from "react";

export type SilnessSurface = "vestibular" | "oral" | "mesial" | "distal";

export const SILNESS_LOE_TEETH = [16, 12, 24, 36, 32, 44] as const;

export const SILNESS_SURFACES: readonly { key: SilnessSurface; label: string }[] = [
	{ key: "vestibular", label: "Вестиб." },
	{ key: "oral", label: "Оральн." },
	{ key: "mesial", label: "Медиал." },
	{ key: "distal", label: "Дистал." },
] as const;

export interface HygieneSilnessLoeTabProps {
	readonly silnessScores: Readonly<Record<number, Record<SilnessSurface, number>>>;
	readonly silnessResult: {
		readonly score: number;
		readonly ratingText: string;
		readonly badgeClass: string;
	};
	readonly onSetIdealSilness: () => void;
	readonly onUpdateSurface: (toothNumber: number, surface: SilnessSurface, value: number) => void;
}

export const HygieneSilnessLoeTab: React.FC<HygieneSilnessLoeTabProps> = ({
	silnessScores,
	silnessResult,
	onSetIdealSilness,
	onUpdateSurface,
}) => {
	return (
		<div
			className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl"
			data-testid="hygiene-silness-loe-panel"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">
						Silness-Löe = {silnessResult.score.toFixed(1)}
					</span>
					<span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${silnessResult.badgeClass}`}>
						{silnessResult.ratingText}
					</span>
				</div>
				<button
					type="button"
					data-testid="hygiene-btn-ideal-silness"
					onClick={onSetIdealSilness}
					className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
				>
					✓ Налета нет (0.0)
				</button>
			</div>

			<p className="text-xs text-[var(--ink-muted)]">
				Оценка зубного налета по 4 поверхностям ключевых зубов (16, 12, 24, 36, 32, 44): 0 — норма, 1 — тонкая пленка, 2 — умеренное скопление, 3 — обильные отложения.
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
				{SILNESS_LOE_TEETH.map((t) => {
					const current = silnessScores[t] ?? { vestibular: 0, oral: 0, mesial: 0, distal: 0 };
					const toothAvg = ((current.vestibular + current.oral + current.mesial + current.distal) / 4).toFixed(1);
					return (
						<div
							key={t}
							className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink)]">Зуб {t}</span>
								<span className="text-[11px] font-mono font-semibold text-[var(--ink-muted)]">
									Ср: {toothAvg}
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-1.5">
								{SILNESS_SURFACES.map((surf) => (
									<div key={surf.key} className="flex flex-col gap-1 sm:gap-0.5">
										<span className="text-[11px] sm:text-[10px] text-[var(--ink-muted)] font-medium">
											{surf.label}
										</span>
										<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
											{[0, 1, 2, 3].map((val) => (
												<button
													key={val}
													type="button"
													onClick={() => onUpdateSurface(t, surf.key, val)}
													className={`h-10 sm:h-6 min-h-[44px] sm:min-h-[24px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
														current[surf.key] === val
															? "bg-[var(--primary)] text-white"
															: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
													}`}
													title={`${surf.label}: ${val} (${val === 0 ? "норма" : val === 1 ? "тонкая пленка" : val === 2 ? "умеренно" : "обильно"})`}
													aria-label={`Зуб ${t} ${surf.label} ${val}`}
												>
													{val}
												</button>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

HygieneSilnessLoeTab.displayName = "HygieneSilnessLoeTab";
