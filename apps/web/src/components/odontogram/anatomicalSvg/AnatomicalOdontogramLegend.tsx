/**
 * DENTE Dental CRM — Anatomical Odontogram Color Legend
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";

export const AnatomicalOdontogramLegend: React.FC = () => {
	const items = [
		{ label: "Кариес", colorClass: "bg-[#f59e0b]" },
		{ label: "Пульпит", colorClass: "bg-[#ef4444]" },
		{ label: "Периодонтит", colorClass: "bg-orange-500" },
		{ label: "Пломба", colorClass: "bg-[#3b82f6]" },
		{ label: "Коронка", colorClass: "bg-[#10b981]" },
		{ label: "Имплант", colorClass: "bg-[#64748b]" },
		{ label: "План", colorClass: "bg-slate-400 border border-slate-500" },
		{ label: "Отсутствует", colorClass: "bg-[#64748b]" },
		{ label: "Ретинирован", colorClass: "bg-purple-500" },
		{ label: "Корень", colorClass: "bg-rose-700" },
		{ label: "Мостовидный протез", colorClass: "bg-blue-600" },
	];

	return (
		<div className="tooth-chart-legend-row my-2 hidden sm:block">
			<div className="tooth-chart-legend">
				{items.map((it) => (
					<span key={it.label} className="tooth-chart-legend-item">
						<span className={`w-2.5 h-2.5 rounded-full shadow-sm ${it.colorClass}`} /> {it.label}
					</span>
				))}
			</div>
		</div>
	);
};
