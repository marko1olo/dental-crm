import React from "react";
import { type FranklRating, FRANKL_SCALE_DEFINITIONS } from "@dental/shared";

interface PediatricParentMemoFranklSelectProps {
	readonly frankl: FranklRating;
	readonly setFrankl: (f: FranklRating) => void;
}

export const PediatricParentMemoFranklSelect: React.FC<PediatricParentMemoFranklSelectProps> = ({
	frankl,
	setFrankl,
}) => {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3">
			<div className="text-xs font-semibold text-[var(--ink)] mb-2">
				Шкала поведения Франкла:
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" data-testid="memo-frankl-selector">
				{([1, 2, 3, 4] as const).map((r) => {
					const def = FRANKL_SCALE_DEFINITIONS[r];
					const isSelected = frankl === r;
					return (
						<button
							key={r}
							type="button"
							onClick={() => setFrankl(r)}
							className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95 ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs ring-2 ring-[var(--primary)]/20"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-strong)]"
							}`}
							data-testid={`memo-frankl-btn-${r}`}
						>
							<span>{def.symbol}</span>
							<span className="truncate">{def.labelRu}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
