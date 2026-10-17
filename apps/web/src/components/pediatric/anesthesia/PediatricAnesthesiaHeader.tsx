import React from "react";
import { AlertOctagon, Droplets, ShieldAlert, ShieldCheck } from "lucide-react";
import type { PediatricAnesthesiaCalculationResult } from "./pediatricAnesthesiaCalculation";

interface PediatricAnesthesiaHeaderProps {
	readonly calculation: PediatricAnesthesiaCalculationResult;
}

export const PediatricAnesthesiaHeader: React.FC<PediatricAnesthesiaHeaderProps> = ({ calculation }) => {
	return (
		<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
			<div className="flex items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<Droplets className="h-4 w-4" />
				</div>
				<div>
					<h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Калькулятор безопасности анестетика по весу ребенка
					</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)] font-medium">
						Артикаин 4% (макс 5 мг/кг) &bull; Мепивакаин 3% (макс 4.4 мг/кг) &bull; Защита от передозировки
					</p>
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				{calculation.isContraindicated ? (
					<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs animate-pulse shadow-sm" data-testid="anesthesia-contraindicated-badge">
						<ShieldAlert className="h-4 w-4" />
						<span>ПРОТИВОПОКАЗАНО</span>
					</div>
				) : calculation.isOverdose ? (
					<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs animate-pulse shadow-sm" data-testid="anesthesia-overdose-badge">
						<AlertOctagon className="h-4 w-4" />
						<span>ТОКСИЧЕСКАЯ ДОЗА</span>
					</div>
				) : (
					<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/30 font-extrabold text-xs" data-testid="anesthesia-safe-badge">
						<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
						<span>Безопасная доза ({calculation.doseUtilizationPercent}%)</span>
					</div>
				)}
			</div>
		</div>
	);
};
