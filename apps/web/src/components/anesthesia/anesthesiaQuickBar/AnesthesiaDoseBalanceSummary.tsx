import React from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import type { AnesthesiaCalculationResult } from '../anesthesiaEngine';

export interface AnesthesiaDoseBalanceSummaryProps {
	patientWeightKg: number;
	maxSafeCarpules: number;
	sessionInjectedCarpules: number;
	singleCarpuleResult: AnesthesiaCalculationResult;
}

export function AnesthesiaDoseBalanceSummary({
	patientWeightKg,
	maxSafeCarpules,
	sessionInjectedCarpules,
	singleCarpuleResult,
}: AnesthesiaDoseBalanceSummaryProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)] font-medium shrink-0">
			<Activity size={14} className="text-[var(--teal)]" />
			<span data-testid="anesthesia-dose-summary">
				{sessionInjectedCarpules > 0 ? (
					<>
						{`Введено: ${(sessionInjectedCarpules * 1.7).toFixed(1)} мл (${sessionInjectedCarpules} карп.) · `}
						<strong className="text-[var(--ink)] font-bold">
							{`Безопасный остаток: ${Math.max(0, Math.floor((maxSafeCarpules - sessionInjectedCarpules) * 10) / 10)} карп. (из ${maxSafeCarpules})`}
						</strong>
					</>
				) : (
					<>
						{`Предельная доза для ${patientWeightKg} кг: `}
						<strong className="text-[var(--ink)] font-bold">
							до {maxSafeCarpules} карп. ({(maxSafeCarpules * 1.7).toFixed(1)} мл)
						</strong>
						{` · Безопасный остаток: ${singleCarpuleResult.remainingSafeCarpulesCount ?? Math.max(0, Math.floor((maxSafeCarpules - 1.0) * 10) / 10)} карп.`}
					</>
				)}
			</span>
			<span
				data-testid="anesthesia-mrd-safety-badge"
				className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
					singleCarpuleResult.safetyZone === 'safe'
						? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-500/50'
						: singleCarpuleResult.safetyZone === 'caution'
							? 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-500/50'
							: 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border-rose-500/50'
				}`}
				title={`Расчет 1 карпулы (1.7 мл): ${singleCarpuleResult.percentOfMaxDose}% от предельной суточной дозы`}
			>
				<CheckCircle2
					size={12}
					className={singleCarpuleResult.safetyZone === 'safe' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}
				/>
				<span>
					{singleCarpuleResult.percentOfMaxDose}% от макс. дозы —{' '}
					{singleCarpuleResult.safetyZone === 'safe'
						? 'безопасно'
						: singleCarpuleResult.safetyZone === 'caution'
							? 'внимание'
							: 'опасно'}
				</span>
			</span>
		</div>
	);
}
