/**
 * PerioMobileQuadrantBar.tsx — Переключатель 4 квадрантов (Q1–Q4) и полоса 8 зубов на мобильном.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import { PERIO_SITE_KEYS, type PerioToothRecord } from "@dental/shared";
import React from "react";

export type PerioQuadrantKey = "Q1" | "Q2" | "Q3" | "Q4";

export const QUADRANT_TEETH: Record<PerioQuadrantKey, number[]> = {
	Q1: [18, 17, 16, 15, 14, 13, 12, 11],
	Q2: [21, 22, 23, 24, 25, 26, 27, 28],
	Q3: [31, 32, 33, 34, 35, 36, 37, 38],
	Q4: [48, 47, 46, 45, 44, 43, 42, 41],
};

const QUADRANT_NAMES: Record<PerioQuadrantKey, { label: string; sub: string }> = {
	Q1: { label: "Q1 Верх-Пр", sub: "18–11" },
	Q2: { label: "Q2 Верх-Лев", sub: "21–28" },
	Q3: { label: "Q3 Низ-Лев", sub: "31–38" },
	Q4: { label: "Q4 Низ-Пр", sub: "48–41" },
};

export interface PerioMobileQuadrantBarProps {
	readonly activeQuadrant: PerioQuadrantKey;
	readonly onSelectQuadrant: (qKey: PerioQuadrantKey) => void;
	readonly selectedToothNumber: number;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly onSelectTooth: (num: number) => void;
	readonly onFocusSite: (num: number, key: string) => void;
}

export const PerioMobileQuadrantBar: React.FC<PerioMobileQuadrantBarProps> = React.memo(({
	activeQuadrant, onSelectQuadrant, selectedToothNumber, toothMap, onSelectTooth, onFocusSite,
}) => {
	const teethInCurrentQuadrant = QUADRANT_TEETH[activeQuadrant];

	return (
		<div className="w-full flex flex-col gap-1.5">
			<div className="w-full grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				{(["Q1", "Q2", "Q3", "Q4"] as const).map((qKey) => (
					<button
						key={qKey} type="button" onClick={() => onSelectQuadrant(qKey)}
						className={`min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
							activeQuadrant === qKey
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-teal-500/50 font-bold"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid={`perio-quadrant-tab-${qKey}`}
					>
						<span className="text-xs font-black tracking-tight">{QUADRANT_NAMES[qKey].label}</span>
						<span className="text-[10px] text-[var(--muted)]">{QUADRANT_NAMES[qKey].sub}</span>
					</button>
				))}
			</div>

			<div className="grid grid-cols-8 gap-1 w-full p-1.5 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)]">
				{teethInCurrentQuadrant.map((tNum) => {
					const t = toothMap.get(tNum);
					const isSelected = selectedToothNumber === tNum;
					const isMissing = t?.isMissing ?? false;
					let maxPd = 0; let hasBop = false;
					if (t && !isMissing) {
						for (const k of PERIO_SITE_KEYS) {
							const pd = t[k]?.probingDepthMm ?? 0;
							if (pd > maxPd) maxPd = pd;
							if (t[k]?.bleedingOnProbing) hasBop = true;
						}
					}

					return (
						<button
							key={tNum} type="button"
							onClick={() => { onSelectTooth(tNum); onFocusSite(tNum, "midBuccal"); }}
							className={`min-h-[48px] py-1 px-0.5 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer border ${
								isMissing
									? "opacity-40 bg-[var(--paper-soft)] border-[var(--line)]"
									: isSelected
										? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500 ring-2 ring-teal-400/50 shadow-sm"
										: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
							}`}
							data-testid={`perio-quadrant-tooth-${tNum}`}
							title={`Зуб #${tNum}: глубина ${maxPd} мм`}
						>
							<span className="text-xs font-black font-mono leading-none">{tNum}</span>
							{!isMissing ? (
								<div className="flex items-center gap-0.5 mt-0.5">
									<span className={`text-[9px] font-mono font-bold px-1 rounded-sm leading-tight ${
										maxPd <= 3 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : maxPd <= 5 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-rose-500/25 text-rose-700 dark:text-rose-300 font-black"
									}`}>{maxPd}</span>
									{hasBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
								</div>
							) : (
								<span className="text-[8px] text-[var(--muted)]">Отс</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
});

PerioMobileQuadrantBar.displayName = "PerioMobileQuadrantBar";
