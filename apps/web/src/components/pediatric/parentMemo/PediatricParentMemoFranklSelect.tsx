import React from "react";
import type { FranklRating } from "../../odontogram/pediatricDentitionEngine";
import { FRANKL_SCALE_DEFINITIONS } from "../../odontogram/pediatricDentitionEngine";

interface PediatricParentMemoFranklSelectProps {
	readonly frankl: FranklRating;
	readonly setFrankl: (f: FranklRating) => void;
}

export const PediatricParentMemoFranklSelect: React.FC<PediatricParentMemoFranklSelectProps> = ({
	frankl,
	setFrankl,
}) => {
	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
			<div className="text-xs font-bold text-[var(--ink,#0f172a)] mb-2">
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
							className={`min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer touch-manipulation select-none active:scale-95 ${
								isSelected
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs ring-2 ring-[var(--teal,#0d9488)]/20"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
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
