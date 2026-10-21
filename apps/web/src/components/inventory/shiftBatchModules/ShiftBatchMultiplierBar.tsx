import type React from "react";
import { Minus, Plus, Zap } from "lucide-react";

export interface ShiftBatchMultiplierBarProps {
	readonly multiplier: number;
	readonly setMultiplier: React.Dispatch<React.SetStateAction<number>>;
}

export const ShiftBatchMultiplierBar: React.FC<ShiftBatchMultiplierBarProps> = ({
	multiplier,
	setMultiplier,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
			<div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
				<Zap className="w-4 h-4 text-teal-600 shrink-0" />
				<span>Множитель процедур (число пациентов):</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="inline-flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper)] h-8 overflow-hidden shrink-0">
					<button
						type="button"
						onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
						className="w-8 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold"
					>
						<Minus size={12} />
					</button>
					<span className="w-10 text-center font-bold text-xs font-mono tabular-nums">
						{multiplier}x
					</span>
					<button
						type="button"
						onClick={() => setMultiplier((m) => m + 1)}
						className="w-8 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold"
					>
						<Plus size={12} />
					</button>
				</div>
				<div className="flex items-center gap-1">
					{[1, 2, 5, 8].map((preset) => (
						<button
							key={preset}
							type="button"
							onClick={() => setMultiplier(preset)}
							className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
								multiplier === preset
									? "bg-teal-600 text-white border-teal-600"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							{preset}x
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
