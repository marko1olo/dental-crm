import React from "react";

export interface FdiQuadrantRowProps {
	title: string;
	leftQuadrant: readonly number[];
	rightQuadrant: readonly number[];
	leftLabel: string;
	rightLabel: string;
	selectedTeethSet: Set<number>;
	toggleTooth: (t: number) => void;
	selectAllInQuadrant: (quadrant: readonly number[]) => void;
	isLower?: boolean;
}

export function FdiQuadrantRow({
	title, leftQuadrant, rightQuadrant, leftLabel, rightLabel,
	selectedTeethSet, toggleTooth, selectAllInQuadrant, isLower,
}: FdiQuadrantRowProps): React.JSX.Element {
	const renderToothBtn = (t: number) => {
		const isSelected = selectedTeethSet.has(t);
		return (
			<button
				key={t}
				type="button"
				onClick={() => toggleTooth(t)}
				className={`relative flex flex-col items-center justify-center min-w-[34px] sm:min-w-[40px] h-[44px] px-1 rounded-md text-xs font-semibold transition-all select-none cursor-pointer border ${
					isSelected
						? "bg-teal-600 dark:bg-teal-700 text-white border-teal-700 dark:border-teal-500 shadow-sm scale-102"
						: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#1e293b)] dark:text-slate-200 border-[var(--line,#e2e8f0)] dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-800"
				}`}
				data-testid={`tooth-btn-${t}`}
				aria-pressed={isSelected}
				title={`Зуб ${t} (${isSelected ? "Выбран" : "Не выбран"})`}
			>
				<span>{t}</span>
				{isSelected && (
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-300 dark:bg-emerald-400 mt-0.5" />
				)}
			</button>
		);
	};

	return (
		<>
			<div className={`text-[11px] font-medium text-[var(--muted,#64748b)] dark:text-slate-400 mb-2 flex items-center justify-between ${isLower ? "my-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 pt-2" : ""}`}>
				<span>{title}</span>
				<div className="flex gap-1.5">
					<button
						type="button"
						onClick={() => selectAllInQuadrant(leftQuadrant)}
						className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
					>
						{leftLabel}
					</button>
					<button
						type="button"
						onClick={() => selectAllInQuadrant(rightQuadrant)}
						className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800"
					>
						{rightLabel}
					</button>
				</div>
			</div>

			<div className={`flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto ${isLower ? "" : "pb-2"}`}>
				<div className="flex gap-1">{leftQuadrant.map(renderToothBtn)}</div>
				<div className="w-[2px] h-9 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />
				<div className="flex gap-1">{rightQuadrant.map(renderToothBtn)}</div>
			</div>
		</>
	);
}
