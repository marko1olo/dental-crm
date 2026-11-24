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
				className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--success)]/30 text-[var(--ink)] text-xs font-medium"
				data-testid="somatic-status-norm-banner"
			>
				<CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
				<span>
					Физиологическая норма: соматически здоров / без отягощенного анамнеза. Ограничений к местной анестезии нет.
				</span>
			</div>
		);
	}

	const bannerClasses = evaluation.hasCriticalStopFlags
		? "bg-[var(--danger-soft)] border-2 border-[var(--danger)] text-[var(--ink)] shadow-xs"
		: "bg-[var(--warning-soft)] border border-[var(--warning)]/30 text-[var(--ink)]";

	const iconClasses = evaluation.hasCriticalStopFlags
		? "text-[var(--danger)]"
		: "text-[var(--warning)]";

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
							? "bg-[var(--danger)] text-white border-[var(--danger)]"
							: "bg-[var(--warning-soft)] text-[var(--ink)] border border-[var(--warning)]/30";
					return (
						<span
							key={flag.id}
							className={`text-[11px] font-medium px-2 py-0.5 rounded-md border truncate max-w-full ${chipClasses}`}
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
