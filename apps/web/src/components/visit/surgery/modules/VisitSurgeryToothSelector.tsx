import React from "react";

interface VisitSurgeryToothSelectorProps {
	effectiveTooth: number;
	commonTeeth: number[];
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
				<span className="text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					Зуб операции (FDI):
				</span>
				<span className="text-sm font-black font-mono px-2.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
					{`#${effectiveTooth}`}
				</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{commonTeeth.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => onSelectTooth(t)}
						className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-mono font-black cursor-pointer touch-manipulation transition-all ${
							effectiveTooth === t
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
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
