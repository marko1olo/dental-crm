import React from "react";
import { Activity, Check, HeartPulse, Timer } from "lucide-react";
import type { PediatricSedationState } from "./types";

interface PediatricSedationControlsProps {
	readonly sedation: PediatricSedationState;
	readonly onSedationChange: (next: PediatricSedationState) => void;
}

export const PediatricSedationControls: React.FC<PediatricSedationControlsProps> = ({
	sedation,
	onSedationChange,
}) => {
	const handleN2OChange = (ratioN2O: number) => {
		const clampedN2O = Math.min(60, Math.max(10, ratioN2O));
		onSedationChange({
			...sedation,
			gasRatioN2O: clampedN2O,
			gasRatioO2: 100 - clampedN2O,
		});
	};

	const isSpO2Safe = sedation.spO2Percent >= 95;

	return (
		<div className="space-y-3 pt-2 border-t border-[var(--line)]">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="flex items-center justify-between text-xs font-bold text-[var(--ink)] mb-1">
						<span>Концентрация N2O / O2:</span>
						<span className="font-mono">{sedation.gasRatioN2O}% N2O / {sedation.gasRatioO2}% O2</span>
					</div>
					<div className="flex gap-1.5">
						{[30, 40, 50].map((presetN2O) => (
							<button
								key={presetN2O}
								type="button"
								onClick={() => handleN2OChange(presetN2O)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-bold font-mono border transition cursor-pointer touch-manipulation flex-1 ${
									sedation.gasRatioN2O === presetN2O
										? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								{presetN2O}% N2O
							</button>
						))}
					</div>
				</div>

				<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="flex items-center justify-between text-xs font-bold text-[var(--ink)] mb-1">
						<span className="flex items-center gap-1">
							<HeartPulse className="h-3.5 w-3.5 text-[var(--danger)]" />
							Мониторинг витальных функций:
						</span>
						<span className={`font-mono text-xs font-extrabold ${isSpO2Safe ? "text-[var(--success-ink,var(--success))]" : "text-[var(--danger)]"}`}>
							SpO2 {sedation.spO2Percent}% • {sedation.pulseBpm} уд/м
						</span>
					</div>
					<div className="flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
						<Activity className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
						<span>{isSpO2Safe ? "Пульсоксиметрия в норме (SpO2 >= 95%)" : "Сатурация < 95% — усилить 100% O2"}</span>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink)] bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
				<div className="flex items-center gap-1.5">
					<Timer className="h-4 w-4 text-[var(--primary)] shrink-0" />
					<span>Длительность подачи смеси:</span>
					<span className="font-mono font-bold">{sedation.durationMinutes} мин</span>
				</div>
				<div className="flex items-center gap-1 text-[11px] text-[var(--primary)] font-semibold">
					<Check className="h-3.5 w-3.5" />
					<span>Денитрогенизация: 100% O2 ({sedation.postOxygenationMinutes} мин)</span>
				</div>
			</div>
		</div>
	);
};
