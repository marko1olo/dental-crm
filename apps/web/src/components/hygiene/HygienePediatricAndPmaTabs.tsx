/**
 * @dental/web/components/hygiene/HygienePediatricAndPmaTabs.tsx
 *
 * Секции расчета:
 * 1. Детского индекса Федорова-Володкиной (6 нижних фронтальных 43..33)
 * 2. Индекса гингивита РМА Парма (16, 11, 26, 36, 31, 46)
 * Сенсорная эргономика: кнопки адаптируются под тач >=44px на мобильных.
 */

import React from "react";

export const FEDOROV_TEETH = [43, 42, 41, 31, 32, 33] as const;
export const PMA_INDEX_TEETH = [16, 11, 26, 36, 31, 46] as const;

export interface HygieneFedorovTabProps {
	readonly fedorovScores: Readonly<Record<number, number>>;
	readonly fedorovResult: {
		readonly score: number;
		readonly ratingText: string;
	};
	readonly onSetIdealFedorov: () => void;
	readonly onUpdateTooth: (toothNumber: number, score: number) => void;
}

export const HygieneFedorovTab: React.FC<HygieneFedorovTabProps> = ({
	fedorovScores,
	fedorovResult,
	onSetIdealFedorov,
	onUpdateTooth,
}) => {
	return (
		<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">
						Kср = {fedorovResult.score.toFixed(1)} балла
					</span>
					<span className="text-[11px] px-2 py-0.5 rounded-full font-bold border border-teal-500/30 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">
						{fedorovResult.ratingText}
					</span>
				</div>
				<button
					type="button"
					data-testid="hygiene-btn-ideal-fedorov"
					onClick={onSetIdealFedorov}
					className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
				>
					✓ Окрашивания нет (1.0)
				</button>
			</div>

			<p className="text-xs text-[var(--ink-muted)]">
				Окрашивание вестибулярных поверхностей 6 нижних фронтальных зубов (43..33) раствором Шиллера-Писарева.
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{FEDOROV_TEETH.map((t) => {
					const current = fedorovScores[t] ?? 1;
					return (
						<div
							key={t}
							className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-2"
						>
							<div className="text-xs font-bold text-[var(--ink)]">Зуб {t} (губная)</div>
							<div className="grid grid-cols-5 gap-1 sm:gap-0.5">
								{[1, 2, 3, 4, 5].map((val) => (
									<button
										key={val}
										type="button"
										onClick={() => onUpdateTooth(t, val)}
										className={`h-10 sm:h-7 min-h-[44px] sm:min-h-[28px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
											current === val
												? "bg-purple-600 text-white"
												: "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
										}`}
										title={`${val} балл: ${val === 1 ? "нет" : val === 2 ? "1/4" : val === 3 ? "1/2" : val === 4 ? "3/4" : "вся"}`}
										aria-label={`Зуб ${t} балл ${val}`}
									>
										{val}
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

HygieneFedorovTab.displayName = "HygieneFedorovTab";

export interface HygienePmaTabProps {
	readonly pmaScores: Readonly<Record<number, number>>;
	readonly pmaResult: {
		readonly pmaPercent: number;
		readonly isHealthy: boolean;
		readonly ratingText: string;
	};
	readonly onSetIdealPma: () => void;
	readonly onUpdateTooth: (toothNumber: number, score: number) => void;
}

export const HygienePmaTab: React.FC<HygienePmaTabProps> = ({
	pmaScores,
	pmaResult,
	onSetIdealPma,
	onUpdateTooth,
}) => {
	return (
		<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">
						PMA = {pmaResult.pmaPercent}%
					</span>
					<span
						className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
							pmaResult.isHealthy
								? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
								: "border-rose-500/30 bg-rose-50 text-rose-700"
						}`}
					>
						{pmaResult.ratingText}
					</span>
				</div>
				<button
					type="button"
					data-testid="hygiene-btn-ideal-pma"
					onClick={onSetIdealPma}
					className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
				>
					✓ Десна здорова (0%)
				</button>
			</div>

			<p className="text-xs text-[var(--ink-muted)]">
				0 — воспаления нет, 1 — воспален десневой сосочек (P), 2 — край десны (M), 3 — альвеолярная десна (A).
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{PMA_INDEX_TEETH.map((t) => {
					const current = pmaScores[t] ?? 0;
					return (
						<div
							key={t}
							className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-2"
						>
							<div className="text-xs font-bold text-[var(--ink)]">Зуб {t}</div>
							<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
								{[0, 1, 2, 3].map((val) => (
									<button
										key={val}
										type="button"
										onClick={() => onUpdateTooth(t, val)}
										className={`h-10 sm:h-7 min-h-[44px] sm:min-h-[28px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
											current === val
												? "bg-rose-600 text-white"
												: "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
										}`}
										aria-label={`Зуб ${t} воспаление ${val}`}
									>
										{val}
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

HygienePmaTab.displayName = "HygienePmaTab";
