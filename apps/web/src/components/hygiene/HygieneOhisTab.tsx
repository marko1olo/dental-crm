/**
 * @dental/web/components/hygiene/HygieneOhisTab.tsx
 *
 * Секция расчета индекса гигиены Грина-Вермиллиона (OHI-S).
 * 6 канонических зубов (16, 11, 26, 31 вестибулярно; 36, 46 язычно).
 * Сенсорная эргономика: кнопки 0..3 адаптируются под тач >=44px на экранах <sm.
 */

import React from "react";
import { CANONICAL_OHI_S_TEETH } from "./hygieneCatalogData";

export interface HygieneOhisTabProps {
	readonly ohisTeeth: Readonly<Record<number, { debris: number; calculus: number }>>;
	readonly ohisResult: {
		readonly score: number;
		readonly label: string;
		readonly debris: number;
		readonly calculus: number;
		readonly badgeClass: string;
	};
	readonly onSetIdealOhis: () => void;
	readonly onUpdateTooth: (toothNumber: number, field: "debris" | "calculus", value: number) => void;
}

export const HygieneOhisTab: React.FC<HygieneOhisTabProps> = ({
	ohisTeeth,
	ohisResult,
	onSetIdealOhis,
	onUpdateTooth,
}) => {
	return (
		<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">
						OHI-S = {ohisResult.score.toFixed(1)}
					</span>
					<span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${ohisResult.badgeClass}`}>
						{ohisResult.label}
					</span>
					<span className="text-[11px] text-[var(--ink-muted)]">
						(DI: {ohisResult.debris.toFixed(1)}, CI: {ohisResult.calculus.toFixed(1)})
					</span>
				</div>
				<button
					type="button"
					data-testid="hygiene-btn-ideal-ohis"
					onClick={onSetIdealOhis}
					className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
				>
					✓ Идеальная гигиена (все 0.0)
				</button>
			</div>

			{/* Сетка 6 индексных зубов: адаптив 1 колонка на экранах <sm, 3 на sm, 6 на lg */}
			<div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{CANONICAL_OHI_S_TEETH.map((t) => {
					const current = ohisTeeth[t.toothNumber] ?? { debris: 0, calculus: 0 };
					return (
						<div
							key={t.toothNumber}
							className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-2"
						>
							<div className="text-xs font-bold text-[var(--ink)]">{t.surfaceLabelRu}</div>

							<div className="flex flex-col gap-1 text-left sm:text-center">
								<div className="text-[11px] sm:text-[10px] text-[var(--ink-muted)] font-medium">
									Налет (DI 0..3):
								</div>
								<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
									{[0, 1, 2, 3].map((val) => (
										<button
											key={`d-${val}`}
											type="button"
											onClick={() => onUpdateTooth(t.toothNumber, "debris", val)}
											className={`h-10 sm:h-6 min-h-[44px] sm:min-h-[24px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
												current.debris === val
													? "bg-[var(--primary)] text-white"
													: "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
											}`}
											aria-label={`${t.surfaceLabelRu} налет ${val}`}
										>
											{val}
										</button>
									))}
								</div>
							</div>

							<div className="flex flex-col gap-1 text-left sm:text-center">
								<div className="text-[11px] sm:text-[10px] text-[var(--ink-muted)] font-medium">
									Камень (CI 0..3):
								</div>
								<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
									{[0, 1, 2, 3].map((val) => (
										<button
											key={`c-${val}`}
											type="button"
											onClick={() => onUpdateTooth(t.toothNumber, "calculus", val)}
											className={`h-10 sm:h-6 min-h-[44px] sm:min-h-[24px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
												current.calculus === val
													? "bg-amber-600 text-white"
													: "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
											}`}
											aria-label={`${t.surfaceLabelRu} камень ${val}`}
										>
											{val}
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
};

HygieneOhisTab.displayName = "HygieneOhisTab";
