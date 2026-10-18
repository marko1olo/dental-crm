import type React from "react";
import { memo } from "react";
import type { ToothState } from "../toothChartTypes";

export interface ToothCarouselPathologyGridProps {
	currentState: ToothState;
	handleFastState: (state: ToothState) => void;
}

export const ToothCarouselPathologyGrid: React.FC<ToothCarouselPathologyGridProps> = memo(({
	currentState,
	handleFastState,
}) => {
	const buttons: Array<{ state: ToothState; label: string; code: string; activeClass: string; inactiveClass: string }> = [
		{
			state: "Caries",
			label: "Кариес",
			code: "C",
			activeClass: "bg-orange-500 text-white border-orange-600 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-orange-600 border-orange-500/30 hover:bg-orange-500/10",
		},
		{
			state: "Pulpitis",
			label: "Пульпит",
			code: "P",
			activeClass: "bg-rose-500 text-white border-rose-600 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-rose-600 border-rose-500/30 hover:bg-rose-500/10",
		},
		{
			state: "Periodontitis",
			label: "Периодонт",
			code: "Pt",
			activeClass: "bg-amber-600 text-white border-amber-700 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-amber-600 border-amber-500/30 hover:bg-amber-500/10",
		},
		{
			state: "Filled",
			label: "Пломба",
			code: "F",
			activeClass: "bg-sky-500 text-white border-sky-600 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-sky-600 border-sky-500/30 hover:bg-sky-500/10",
		},
		{
			state: "Crown",
			label: "Коронка",
			code: "Cr",
			activeClass: "bg-emerald-600 text-white border-emerald-700 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10",
		},
		{
			state: "Implant",
			label: "Имплант",
			code: "Imp",
			activeClass: "bg-indigo-600 text-white border-indigo-700 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10",
		},
		{
			state: "Missing",
			label: "Удален",
			code: "X",
			activeClass: "bg-slate-600 text-white border-slate-700 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-slate-600 border-slate-500/30 hover:bg-slate-500/10",
		},
		{
			state: "Healthy",
			label: "Здоров",
			code: "0",
			activeClass: "bg-teal-600 text-white border-teal-700 shadow-sm",
			inactiveClass: "bg-[var(--odontogram-paper)] text-teal-600 border-teal-500/30 hover:bg-teal-500/10",
		},
	];

	return (
		<div className="grid grid-cols-4 gap-1.5 w-full max-w-sm pt-1">
			{buttons.map((b) => (
				<button
					key={b.state}
					type="button"
					onClick={() => handleFastState(b.state)}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === b.state ? b.activeClass : b.inactiveClass
					}`}
					title={`${b.label} (${b.code})`}
				>
					<span>{b.label}</span>
					<span className="text-[10px] opacity-80">{b.code}</span>
				</button>
			))}
		</div>
	);
});
ToothCarouselPathologyGrid.displayName = "ToothCarouselPathologyGrid";
