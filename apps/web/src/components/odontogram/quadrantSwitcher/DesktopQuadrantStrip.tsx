/**
 * DENTE Dental CRM — Desktop Quadrant Strip Navigation
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { OdontogramQuadrantId } from "../ToothChart";

export interface DesktopQuadrantStripProps {
	currentQuadrant: OdontogramQuadrantId;
	onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	allTeethCount: string;
}

export const DesktopQuadrantStrip: React.FC<DesktopQuadrantStripProps> = ({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	allTeethCount,
}) => {
	const quads: Array<{ id: OdontogramQuadrantId; label: string; sub: string; title: string }> = [
		{
			id: isPediatricEffective ? "Q5" : "Q1",
			label: isPediatricEffective ? "Q5 55–51" : "Q1 18–11",
			sub: "ВЧ·П",
			title: isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)",
		},
		{
			id: isPediatricEffective ? "Q6" : "Q2",
			label: isPediatricEffective ? "Q6 61–65" : "Q2 21–28",
			sub: "ВЧ·Л",
			title: isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)",
		},
		{
			id: isPediatricEffective ? "Q8" : "Q4",
			label: isPediatricEffective ? "Q8 85–81" : "Q4 48–41",
			sub: "НЧ·П",
			title: isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)",
		},
		{
			id: isPediatricEffective ? "Q7" : "Q3",
			label: isPediatricEffective ? "Q7 71–75" : "Q3 31–38",
			sub: "НЧ·Л",
			title: isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)",
		},
	];

	return (
		<div className="hidden sm:flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5 w-full">
			<button
				type="button"
				onClick={() => onSelectQuadrant("all")}
				className={`min-h-[32px] h-8 px-2.5 sm:px-3.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
					currentQuadrant === "all"
						? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
						: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:bg-[var(--paper-soft)]"
				}`}
				title="Показать полную зубную формулу (все зубы)"
				data-testid="quadrant-btn-all"
			>
				Все ({allTeethCount})
			</button>
			<div className="h-4 w-px bg-[var(--line-strong,#cbd5e1)] dark:bg-white/20 mx-0.5 shrink-0" />
			<div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
				{quads.map((q) => (
					<button
						key={q.id}
						type="button"
						onClick={() => onSelectQuadrant(q.id)}
						className={`quadrant-btn min-h-[32px] h-8 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-1.5 sm:gap-2 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === q.id
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={q.title}
						data-testid={`quadrant-btn-${q.id}`}
					>
						<span className="font-extrabold whitespace-nowrap">{q.label}</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">{q.sub}</span>
					</button>
				))}
			</div>
		</div>
	);
};
