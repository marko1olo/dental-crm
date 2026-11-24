/**
 * @dental/web/components/hygiene/HygieneStudioOhisSection.tsx
 *
 * Секция канонического 6-зубного калькулятора OHI-S и быстрых пресетов для Студии гигиены.
 * Мандаты: 8b (<=300 строк), 8ze (Apple HIG, тач >=44x44px).
 */

import React from "react";
import {
	OHI_S_PRESETS,
	CANONICAL_OHI_S_TEETH,
	createIdealOhiSTeethScores,
	type OhiSPreset,
} from "./hygieneCatalogData";

export interface HygieneStudioOhisSectionProps {
	readonly ohisTeeth: Record<number, { debris: number; calculus: number }>;
	readonly setOhisTeeth: React.Dispatch<React.SetStateAction<Record<number, { debris: number; calculus: number }>>>;
	readonly selectedOhiS: OhiSPreset;
}

export const HygieneStudioOhisSection: React.FC<HygieneStudioOhisSectionProps> = ({
	ohisTeeth,
	setOhisTeeth,
	selectedOhiS,
}) => {
	return (
		<div className="space-y-2.5 p-3.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Индекс гигиены Грина-Вермиллиона (OHI-S)
					</span>
					<span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${selectedOhiS.badgeClass}`}>
						{selectedOhiS.ratingText}
					</span>
					<span className="text-xs text-[var(--ink-muted)]">
						(DI: {selectedOhiS.debris.toFixed(1)}, CI: {selectedOhiS.calculus.toFixed(1)})
					</span>
				</div>

				<button
					type="button"
					data-testid="hygiene-btn-ideal-ohis-studio"
					onClick={() => setOhisTeeth(createIdealOhiSTeethScores())}
					className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
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
									Налет DI (0..3):
								</div>
								<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
									{[0, 1, 2, 3].map((val) => (
										<button
											key={`d-${val}`}
											type="button"
											onClick={() => setOhisTeeth((p) => {
												const prevEntry = p[t.toothNumber] ?? { debris: 0, calculus: 0 };
												return { ...p, [t.toothNumber]: { ...prevEntry, debris: val } };
											})}
											className={`h-10 sm:h-6 min-h-[44px] sm:min-h-[24px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
												current.debris === val ? "bg-[var(--primary-strong)] text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)]"
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
									Камень CI (0..3):
								</div>
								<div className="grid grid-cols-4 gap-1 sm:gap-0.5">
									{[0, 1, 2, 3].map((val) => (
										<button
											key={`c-${val}`}
											type="button"
											onClick={() => setOhisTeeth((p) => {
												const prevEntry = p[t.toothNumber] ?? { debris: 0, calculus: 0 };
												return { ...p, [t.toothNumber]: { ...prevEntry, calculus: val } };
											})}
											className={`h-10 sm:h-6 min-h-[44px] sm:min-h-[24px] text-xs sm:text-[10px] font-bold rounded cursor-pointer transition-colors ${
												current.calculus === val ? "bg-[var(--warning,#f59e0b)] text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)]"
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

			{/* Быстрые пресеты для совместимости с автотестами */}
			<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line-subtle)] overflow-x-auto text-xs">
				{OHI_S_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						data-testid={`hygiene-preset-${preset.id}`}
						onClick={() => {
							if (preset.id === "ideal") {
								setOhisTeeth(createIdealOhiSTeethScores());
							} else if (preset.id === "fair") {
								setOhisTeeth({ 16: { debris: 1, calculus: 0 }, 11: { debris: 1, calculus: 0 }, 26: { debris: 1, calculus: 0 }, 31: { debris: 1, calculus: 0 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 0, calculus: 0 } });
							} else if (preset.id === "poor") {
								setOhisTeeth({ 16: { debris: 1, calculus: 1 }, 11: { debris: 1, calculus: 1 }, 26: { debris: 1, calculus: 1 }, 31: { debris: 1, calculus: 1 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 1, calculus: 1 } });
							} else {
								setOhisTeeth({ 16: { debris: 2, calculus: 1 }, 11: { debris: 2, calculus: 1 }, 26: { debris: 2, calculus: 2 }, 31: { debris: 2, calculus: 1 }, 36: { debris: 1, calculus: 1 }, 46: { debris: 2, calculus: 2 } });
							}
						}}
						className="px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] font-semibold text-[11px] shrink-0 cursor-pointer"
					>
						{preset.label}
					</button>
				))}
			</div>
		</div>
	);
};

HygieneStudioOhisSection.displayName = "HygieneStudioOhisSection";
