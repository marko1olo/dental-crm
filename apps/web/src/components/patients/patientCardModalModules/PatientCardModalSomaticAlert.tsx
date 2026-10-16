import React from "react";
import { AlertOctagon } from "lucide-react";
import type { PatientSafetyEvaluationResult } from "../safetyMath";

interface PatientCardModalSomaticAlertProps {
	readonly safetyEvaluation: PatientSafetyEvaluationResult;
	readonly onOpenAnamnesis: () => void;
}

export const PatientCardModalSomaticAlert: React.FC<PatientCardModalSomaticAlertProps> = ({
	safetyEvaluation,
	onOpenAnamnesis,
}) => {
	if (safetyEvaluation.activeFlags.length === 0) return null;

	const isCritical = safetyEvaluation.hasCriticalStopFlags;
	return (
		<div
			className={`px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b shrink-0 flex-wrap sm:flex-nowrap print:hidden ${
				isCritical
					? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
					: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
			}`}
			role="alert"
			data-testid="patient-card-modal-somatic-banner"
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<AlertOctagon
					className={`w-4 h-4 shrink-0 ${
						isCritical ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-amber-600 dark:text-amber-400"
					}`}
				/>
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<span className="text-[10px] font-black uppercase tracking-wider shrink-0">
						{isCritical ? "КРИТИЧЕСКИЙ СТОП-ФАКТОР:" : "КЛИНИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ:"}
					</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						{safetyEvaluation.activeFlags.map((flag) => (
							<span
								key={flag.id}
								className={`px-1.5 py-0.2 rounded-md text-[11px] font-extrabold border ${
									flag.severity === "critical"
										? "bg-rose-600 text-white border-rose-700"
										: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40"
								}`}
								title={flag.description}
							>
								{flag.shortBadge || flag.titleRu}
							</span>
						))}
					</div>
				</div>
			</div>
			<button
				type="button"
				onClick={onOpenAnamnesis}
				className="text-xs font-bold underline hover:opacity-80 cursor-pointer shrink-0 transition-opacity"
			>
				Открыть статус
			</button>
		</div>
	);
};
