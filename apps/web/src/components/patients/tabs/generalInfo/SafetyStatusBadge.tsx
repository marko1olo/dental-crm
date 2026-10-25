import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PatientSafetyEvaluation } from "../../safetyMath";

interface SafetyStatusBadgeProps {
	evaluation: PatientSafetyEvaluation;
}

export const SafetyStatusBadge: React.FC<SafetyStatusBadgeProps> = ({ evaluation }) => {
	const { hasCriticalStopFlags, hasHighRiskFlags } = evaluation;

	return (
		<span
			data-testid="somatic-status-badge"
			className={`text-xs px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 border border-[var(--glass-border)] bg-[var(--paper-strong)] ${
				hasCriticalStopFlags
					? "text-rose-600 dark:text-rose-400 border-rose-500/30"
					: hasHighRiskFlags
						? "text-amber-600 dark:text-amber-400 border-amber-500/30"
						: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
			}`}
		>
			{hasCriticalStopFlags ? (
				<>
					<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
					<span>Стоп-факторы</span>
				</>
			) : hasHighRiskFlags ? (
				<>
					<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
					<span>Повышенный риск</span>
				</>
			) : (
				<>
					<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
					<span>Физиологическая норма</span>
				</>
			)}
		</span>
	);
};
