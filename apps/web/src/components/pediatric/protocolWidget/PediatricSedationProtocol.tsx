import React from "react";
import {
	Activity,
	AlertCircle,
	Check,
	HeartPulse,
	Timer,
	Wind,
} from "lucide-react";
import type { PediatricSedationState } from "./types";

export interface PediatricSedationProtocolProps {
	readonly sedation: PediatricSedationState;
	readonly onSedationChange: (next: PediatricSedationState) => void;
}

export const PediatricSedationProtocol: React.FC<
	PediatricSedationProtocolProps
> = ({ sedation, onSedationChange }) => {
	const handleToggleEnabled = () => {
		onSedationChange({
			...sedation,
			enabled: !sedation.enabled,
		});
	};

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
		<div className="mb-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Wind className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Протокол седации ЗАКС (N2O / O2):
					</span>
				</div>
				<button
					type="button"
					onClick={handleToggleEnabled}
					className={`flex min-h-[36px] sm:min-h-0 sm:h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 touch-manipulation ${
						sedation.enabled
							? "bg-cyan-600 text-white"
							: "border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="pediatric-sedation-toggle-btn"
				>
					{sedation.enabled ? (
						<>
							<Check className="h-3.5 w-3.5" />
							<span>Седация активна</span>
						</>
					) : (
						<span>Без седации (1-клик включить)</span>
					)}
				</button>
			</div>

			{sedation.enabled && (
				<div className="space-y-3 pt-2 border-t border-[var(--line,#e2e8f0)]">
					{/* Соотношение газов ЗАКС */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-2.5 dark:border-cyan-800/60 dark:bg-cyan-950/40">
							<div className="flex items-center justify-between text-xs font-bold text-cyan-900 dark:text-cyan-200 mb-1">
								<span>Концентрация N2O / O2:</span>
								<span className="font-mono">
									{sedation.gasRatioN2O}% N2O / {sedation.gasRatioO2}% O2
								</span>
							</div>
							<div className="flex gap-1.5">
								{[30, 40, 50].map((presetN2O) => (
									<button
										key={presetN2O}
										type="button"
										onClick={() => handleN2OChange(presetN2O)}
										className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 rounded-md text-xs font-bold font-mono border transition cursor-pointer touch-manipulation flex-1 ${
											sedation.gasRatioN2O === presetN2O
												? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
												: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)]"
										}`}
									>
										{presetN2O}% N2O
									</button>
								))}
							</div>
						</div>

						{/* Пульсоксиметрия SpO2 и ЧСС */}
						<div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
							<div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
								<span className="flex items-center gap-1">
									<HeartPulse className="h-3.5 w-3.5 text-rose-500" />
									Мониторинг витальных функций:
								</span>
								<span
									className={`font-mono text-xs font-extrabold ${
										isSpO2Safe ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"
									}`}
								>
									SpO2 {sedation.spO2Percent}% • {sedation.pulseBpm} уд/м
								</span>
							</div>
							<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
								<Activity className="h-3.5 w-3.5 text-teal-600 shrink-0" />
								<span>
									{isSpO2Safe
										? "Пульсоксиметрия в пределах возрастной нормы (SpO2 >= 95%)"
										: "Внимание: снижение сатурации ниже 95% — усилить подачу 100% O2"}
								</span>
							</div>
						</div>
					</div>

					{/* Время экспозиции и продувка 100% O2 */}
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] p-2 rounded-lg border border-[var(--line,#e2e8f0)]">
						<div className="flex items-center gap-1.5">
							<Timer className="h-4 w-4 text-cyan-600 shrink-0" />
							<span>Длительность подачи смеси:</span>
							<span className="font-mono font-bold">{sedation.durationMinutes} мин</span>
						</div>
						<div className="flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
							<Check className="h-3.5 w-3.5" />
							<span>Денитрогенизация: 100% O2 ({sedation.postOxygenationMinutes} мин)</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
