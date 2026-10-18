import type React from "react";
import { memo } from "react";
import type { OdontogramQuadrantId } from "../toothChartTypes";

export interface ToothChartQuadrantBarProps {
	currentQuadrant: OdontogramQuadrantId;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
}

export const ToothChartQuadrantBar: React.FC<ToothChartQuadrantBarProps> = memo(({
	currentQuadrant,
	isPediatricEffective,
	isMixedEffective,
	handleSelectQuadrant,
}) => {
	const count = isMixedEffective ? "24" : isPediatricEffective ? "20" : "32";
	const quadrants: Array<{ id: OdontogramQuadrantId; title: string; label: string; badge: string }> = [
		{
			id: isPediatricEffective ? "Q5" : "Q1",
			title: isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)",
			label: isPediatricEffective ? "Q5" : "Q1",
			badge: "ВЧ·П",
		},
		{
			id: isPediatricEffective ? "Q6" : "Q2",
			title: isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)",
			label: isPediatricEffective ? "Q6" : "Q2",
			badge: "ВЧ·Л",
		},
		{
			id: isPediatricEffective ? "Q8" : "Q4",
			title: isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)",
			label: isPediatricEffective ? "Q8" : "Q4",
			badge: "НЧ·П",
		},
		{
			id: isPediatricEffective ? "Q7" : "Q3",
			title: isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)",
			label: isPediatricEffective ? "Q7" : "Q3",
			badge: "НЧ·Л",
		},
	];

	return (
		<div
			className="odontogram-quadrant-bar mb-1 select-none min-h-[44px] sm:min-h-[32px] h-11 sm:h-9 flex overflow-x-auto no-scrollbar items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0"
			data-testid="odontogram-quadrant-bar"
		>
			<button
				type="button"
				onClick={() => handleSelectQuadrant("all")}
				className={`min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
					currentQuadrant === "all"
						? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
						: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:bg-[var(--paper-soft)]"
				}`}
				title="Показать полную зубную формулу"
				data-testid="quadrant-btn-all"
			>
				<span className="sm:hidden">Все ({count})</span>
				<span className="hidden sm:inline">Все зубы ({count})</span>
			</button>

			{quadrants.map((q) => {
				const isActive = currentQuadrant === q.id;
				return (
					<button
						key={q.id}
						type="button"
						onClick={() => handleSelectQuadrant(q.id)}
						className={`quadrant-btn min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-2.5 sm:px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							isActive
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={q.title}
						data-testid={`quadrant-btn-${q.id}`}
					>
						<span className="font-extrabold">{q.label}</span>
						<span className="text-xs px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">{q.badge}</span>
					</button>
				);
			})}
		</div>
	);
});
ToothChartQuadrantBar.displayName = "ToothChartQuadrantBar";
