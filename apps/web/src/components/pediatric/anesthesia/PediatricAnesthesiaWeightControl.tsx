import React from "react";

interface PediatricAnesthesiaWeightControlProps {
	readonly weightKg: number;
	readonly setWeightKg: (w: number) => void;
}

export const PediatricAnesthesiaWeightControl: React.FC<PediatricAnesthesiaWeightControlProps> = ({
	weightKg,
	setWeightKg,
}) => {
	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-2.5">
			<div className="flex items-center justify-between mb-1.5">
				<label htmlFor="pediatric-weight-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
					Вес ребенка:
				</label>
				<span className="text-xs font-mono font-black text-teal-700 dark:text-teal-400">{weightKg} кг</span>
			</div>
			<div className="flex items-center gap-1.5 mb-2">
				<input
					id="pediatric-weight-input"
					type="number"
					min={5}
					max={80}
					step={1}
					value={weightKg}
					onChange={(e) => setWeightKg(Math.max(5, Math.min(80, Number(e.target.value) || 20)))}
					className="h-8 w-20 px-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-mono font-extrabold text-[var(--ink,#0f172a)] text-center focus:border-teal-500 focus:outline-hidden"
					data-testid="input-patient-weight-kg"
				/>
				<span className="text-xs text-[var(--muted,#64748b)]">кг</span>
			</div>
			<div className="flex flex-wrap gap-1">
				{[12, 16, 20, 25, 30, 40].map((w) => (
					<button
						key={w}
						type="button"
						onClick={() => setWeightKg(w)}
						className={`h-6 px-1.5 rounded text-[11px] font-mono font-bold border transition cursor-pointer ${
							weightKg === w
								? "bg-teal-600 text-white border-teal-600"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
						}`}
						data-testid={`quick-weight-${w}`}
					>
						{w} кг
					</button>
				))}
			</div>
		</div>
	);
};
