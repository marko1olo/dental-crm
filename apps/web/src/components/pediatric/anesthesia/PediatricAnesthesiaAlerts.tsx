import React from "react";
import { AlertOctagon, AlertTriangle, Check, ShieldAlert } from "lucide-react";
import type { PediatricAnesthesiaCalculationResult } from "./pediatricAnesthesiaSpecs";

interface PediatricAnesthesiaAlertsProps {
	readonly calculation: PediatricAnesthesiaCalculationResult;
	readonly onSetMaxSafeDose: () => void;
	readonly onApplyAnesthesia: () => void;
}

export const PediatricAnesthesiaAlerts: React.FC<PediatricAnesthesiaAlertsProps> = ({
	calculation,
	onSetMaxSafeDose,
	onApplyAnesthesia,
}) => {
	const { drug } = calculation;

	return (
		<>
			{calculation.isContraindicated && (
				<div
					className="mb-3 p-3 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
					data-testid="anesthesia-contraindication-banner"
				>
					<ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
					<span>{calculation.contraindicationReasonRu}</span>
				</div>
			)}

			{calculation.isOverdose && (
				<div
					className="mb-3 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 p-3 text-rose-950 dark:text-rose-100 shadow-md animate-in fade-in duration-200"
					data-testid="anesthesia-toxic-overdose-alert"
				>
					<div className="flex flex-col sm:flex-row items-start justify-between gap-2.5">
						<div className="flex items-start gap-2.5 min-w-0">
							<AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
							<div className="space-y-1 min-w-0">
								<div className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
									ВНИМАНИЕ: ПРЕВЫШЕНИЕ РАСЧЕТНОЙ ДОЗЫ АНЕСТЕТИКА (МРД)!
								</div>
								<p className="text-xs leading-relaxed font-semibold">
									Введено <span className="underline font-mono">{calculation.totalDoseAdministeredMg} мг</span> ({calculation.carpulesAdministered} карп.) при максимально допустимой дозе <span className="font-mono">{calculation.maxAllowedTotalDoseMg} мг</span>.
								</p>
								<div className="text-[11px] font-bold bg-rose-200/60 dark:bg-rose-900/60 px-2 py-1 rounded inline-block">
									Безопасный расчет для этого ребенка: до {calculation.maxSafeCarpulesCount} карпул(ы)
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={onSetMaxSafeDose}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition cursor-pointer self-stretch sm:self-auto flex items-center justify-center gap-1 shadow-xs"
							data-testid="btn-reduce-to-safe-dose"
						>
							<span>Снизить до {calculation.maxSafeCarpulesCount} карп.</span>
						</button>
					</div>
				</div>
			)}

			{calculation.isUnderAge && !calculation.isOverdose && (
				<div
					className="mb-3 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2"
					data-testid="anesthesia-underage-alert"
				>
					<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Внимание: препарат противопоказан детям в возрасте до {drug.minAgeYears} лет.</span>
				</div>
			)}

			<div className="mb-3">
				<div className="flex items-center justify-between text-xs mb-1">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)]">Расход допустимой дозы (MRD):</span>
					<span className="font-mono font-extrabold text-xs">
						{calculation.totalDoseAdministeredMg} / {calculation.maxAllowedTotalDoseMg} мг ({calculation.doseUtilizationPercent}%)
					</span>
				</div>
				<div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
					<div
						className={`h-full transition-all duration-300 ${
							calculation.isOverdose ? "bg-rose-600" : calculation.doseUtilizationPercent > 80 ? "bg-amber-500" : "bg-emerald-500"
						}`}
						style={{ width: `${Math.min(100, calculation.doseUtilizationPercent)}%` }}
						data-testid="anesthesia-utilization-bar"
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="text-[11px] text-[var(--muted,#64748b)] min-w-0">
					MRD {drug.shortLabelRu}: макс. {calculation.maxSafeCarpulesCount} карп. ({calculation.maxAllowedTotalDoseMg} мг)
				</div>
				<button
					type="button"
					onClick={onApplyAnesthesia}
					className={`min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer select-none shadow-xs active:scale-95 touch-manipulation ${
						calculation.isContraindicated
							? "bg-rose-600 hover:bg-rose-700 text-white"
							: calculation.isOverdose
								? "bg-amber-600 hover:bg-amber-700 text-white"
								: "bg-teal-600 hover:bg-teal-700 text-white"
					}`}
					data-testid="btn-apply-anesthesia-protocol"
				>
					{calculation.isContraindicated ? (
						<>
							<ShieldAlert className="h-4 w-4 text-white shrink-0" />
							<span>Внести с риском (выбор врача)</span>
						</>
					) : calculation.isOverdose ? (
						<>
							<AlertTriangle className="h-4 w-4 text-white shrink-0" />
							<span>Внести с превышением МРД</span>
						</>
					) : (
						<>
							<Check className="h-4 w-4 text-white shrink-0" />
							<span>Внести в дневник визита</span>
						</>
					)}
				</button>
			</div>
		</>
	);
};
