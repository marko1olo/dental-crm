import React from "react";
import { Plus, RotateCcw } from "lucide-react";

interface PlateScrewSectionProps {
	readonly plateActivationTurns: number;
	readonly setPlateActivationTurns: (turns: number) => void;
	readonly onAddExpansionScrewAction: () => void;
}

export const PlateScrewSection: React.FC<PlateScrewSectionProps> = ({
	plateActivationTurns,
	setPlateActivationTurns,
	onAddExpansionScrewAction,
}) => {
	return (
		<div className="bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line)] flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<RotateCcw size={14} className="text-[var(--primary)]" />
					Съемная пластинка: активация расширяющего винта
				</span>
			</div>
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-xs text-[var(--muted)]">Количество оборотов:</span>
					<div className="flex items-center gap-1">
						{[1, 2, 4].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setPlateActivationTurns(t)}
								className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
									plateActivationTurns === t
										? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"
								}`}
							>
								{t === 1 ? "1/4 оборота (0.25 мм)" : t === 2 ? "2/4 (0.5 мм)" : "Полный (1 мм)"}
							</button>
						))}
					</div>
				</div>
				<button
					type="button"
					onClick={onAddExpansionScrewAction}
					className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
				>
					<Plus size={13} />
					Внести поворот винта в протокол
				</button>
			</div>
		</div>
	);
};
