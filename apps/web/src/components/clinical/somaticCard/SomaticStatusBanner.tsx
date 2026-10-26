import { AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";
import type { PatientSafetyEvaluationResult } from "../../patients/safetyMath";

export interface SomaticStatusBannerProps {
	readonly isNorm: boolean;
	readonly evaluation: PatientSafetyEvaluationResult;
}

export const SomaticStatusBanner: React.FC<SomaticStatusBannerProps> = ({
	isNorm,
	evaluation,
}) => {
	if (isNorm) {
		return (
			<div
				className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold"
				data-testid="somatic-status-norm-banner"
			>
				<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>
					Физиологическая норма: соматически здоров / без отягощенного анамнеза. Ограничений к местной анестезии нет.
				</span>
			</div>
		);
	}

	const bannerClasses = evaluation.hasCriticalStopFlags
		? "bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-200 shadow-xs"
		: "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200";

	const iconClasses = evaluation.hasCriticalStopFlags
		? "text-[#ef4444]"
		: "text-amber-600 dark:text-amber-400";

	return (
		<div
			className={`flex flex-col gap-1.5 p-3 rounded-xl border text-xs ${bannerClasses}`}
			data-testid="somatic-status-alert-banner"
		>
			<div className="flex items-center gap-2 font-bold">
				<AlertTriangle className={`w-4 h-4 shrink-0 ${iconClasses}`} />
				<span>Обнаружено клинических факторов риска: {evaluation.activeFlags.length}</span>
			</div>
			<div className="flex flex-wrap gap-1.5 min-w-0">
				{evaluation.activeFlags.map((flag) => {
					const chipClasses =
						flag.severity === "critical"
							? "bg-[#ef4444] text-white border-[#ef4444]"
							: "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700";
					return (
						<span
							key={flag.id}
							className={`text-[11px] font-bold px-2 py-0.5 rounded-md border truncate max-w-full ${chipClasses}`}
							title={flag.titleRu}
						>
							{flag.titleRu}
						</span>
					);
				})}
			</div>
		</div>
	);
};
