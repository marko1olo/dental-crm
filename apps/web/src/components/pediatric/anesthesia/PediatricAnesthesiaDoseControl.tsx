import React from "react";
import type { PediatricAnesthesiaCalculationResult } from "./pediatricAnesthesiaSpecs";
import { PediatricAnesthesiaWeightControl } from "./PediatricAnesthesiaWeightControl";

interface PediatricAnesthesiaDoseControlProps {
	readonly weightKg: number;
	readonly setWeightKg: (w: number) => void;
	readonly carpules: number;
	readonly setCarpules: (c: number) => void;
	readonly calculation: PediatricAnesthesiaCalculationResult;
	readonly onSetMaxSafeDose: () => void;
}

export const PediatricAnesthesiaDoseControl: React.FC<PediatricAnesthesiaDoseControlProps> = ({
	weightKg,
	setWeightKg,
	carpules,
	setCarpules,
	calculation,
	onSetMaxSafeDose,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
			<PediatricAnesthesiaWeightControl weightKg={weightKg} setWeightKg={setWeightKg} />

			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-2.5">
				<div className="flex items-center justify-between mb-1.5">
					<label htmlFor="pediatric-carpules-input" className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Введено анестетика:
					</label>
					<span className="text-xs font-mono font-black text-teal-700 dark:text-teal-400">
						{carpules} карп. ({calculation.totalDoseAdministeredMg} мг)
					</span>
				</div>
				<div className="flex items-center gap-1.5 mb-2">
					<input
						id="pediatric-carpules-input"
						type="number"
						min={0.1}
						max={4.0}
						step={0.1}
						value={carpules}
						onChange={(e) => setCarpules(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
						className="h-8 w-20 px-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-mono font-extrabold text-[var(--ink,#0f172a)] text-center focus:border-teal-500 focus:outline-hidden"
						data-testid="input-anesthesia-carpules"
					/>
					<span className="text-xs text-[var(--muted,#64748b)]">карп. ({calculation.totalVolumeMl} мл)</span>
				</div>
				<div className="grid grid-cols-3 gap-1.5 mb-2" data-testid="pediatric-express-carpule-presets">
					{[
						{ label: "1/3 карпулы", volume: "0.6 мл", val: 0.33, id: "third" },
						{ label: "1/2 карпулы", volume: "0.9 мл", val: 0.5, id: "half" },
						{ label: "1 карпула", volume: "1.7 мл", val: 1.0, id: "one" },
					].map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setCarpules(p.val)}
							className={`min-h-[38px] sm:min-h-[34px] px-2 py-1 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center select-none active:scale-95 touch-manipulation ${
								carpules === p.val
									? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/20"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							data-testid={`preset-carpule-${p.id}`}
						>
							<span className="leading-tight font-extrabold">{p.label}</span>
							<span className="text-[10px] opacity-80 font-mono font-medium">({p.volume})</span>
						</button>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-1">
					{[0.25, 0.75, 1.5, 2.0].map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => setCarpules(c)}
							className={`h-6 px-1.5 rounded text-[11px] font-mono font-bold border transition cursor-pointer ${
								carpules === c
									? "bg-teal-600 text-white border-teal-600"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							data-testid={`quick-carpule-${c}`}
						>
							{c} карп
						</button>
					))}
					<button
						type="button"
						onClick={onSetMaxSafeDose}
						className="h-6 px-2 rounded text-[10px] font-bold border border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition cursor-pointer"
						data-testid="btn-set-max-safe-dose"
					>
						Макс: {calculation.maxSafeCarpulesCount} к.
					</button>
				</div>
			</div>
		</div>
	);
};
