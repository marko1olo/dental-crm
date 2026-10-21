import React from "react";

export interface DoctorDiscountsSelectorProps {
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
}

export const DoctorDiscountsSelector: React.FC<DoctorDiscountsSelectorProps> = ({
	discountPercent,
	setDiscountPercent,
}) => {
	return (
		<div className="space-y-2">
			<label className="text-xs font-bold text-[var(--muted,#64748b)] block">
				Скидка врача на план лечения:
			</label>
			<div className="flex items-center gap-1.5 flex-wrap">
				{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
					<button
						key={pct}
						type="button"
						onClick={() => setDiscountPercent(pct)}
						className={`px-3 py-1.5 min-h-[36px] rounded-xl font-mono font-bold text-xs cursor-pointer transition-all ${
							discountPercent === pct
								? pct === 100
									? "bg-emerald-600 text-white shadow-xs"
									: "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
								: pct === 100
									? "bg-[var(--paper-soft)] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
					>
						{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
					</button>
				))}
			</div>
			<div className="flex items-center gap-2 pt-1">
				<span className="text-xs text-[var(--muted,#64748b)] font-semibold">Произвольный %:</span>
				<input
					type="number"
					min="0"
					max="100"
					value={discountPercent}
					onChange={(e) => {
						const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
						setDiscountPercent(val);
					}}
					className="w-20 h-8 px-2 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-center focus:ring-1 focus:ring-[var(--teal)]"
					placeholder="%"
				/>
				<span className="text-xs text-[var(--muted)] font-bold">%</span>
			</div>
		</div>
	);
};
