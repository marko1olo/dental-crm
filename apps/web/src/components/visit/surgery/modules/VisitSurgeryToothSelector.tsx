import React from "react";

interface VisitSurgeryToothSelectorProps {
	effectiveTooth: number;
	commonTeeth: readonly number[] | number[];
	onSelectTooth: (tooth: number) => void;
}

export const VisitSurgeryToothSelector: React.FC<VisitSurgeryToothSelectorProps> = ({
	effectiveTooth,
	commonTeeth,
	onSelectTooth,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
			<div className="flex items-center gap-2">
				<span className="text-xs font-semibold tracking-tight text-[var(--primary)]">
					Зуб операции (FDI):
				</span>
				<span className="text-sm font-semibold font-mono px-2.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
					{`#${effectiveTooth}`}
				</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{commonTeeth.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => onSelectTooth(t)}
						className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer touch-manipulation transition-all ${
							effectiveTooth === t
								? "bg-[var(--primary)] text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
						}`}
						data-testid={`btn-select-tooth-${t}`}
					>
						{t}
					</button>
				))}
			</div>
		</div>
	);
};
