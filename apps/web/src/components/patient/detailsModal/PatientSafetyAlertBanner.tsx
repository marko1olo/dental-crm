import { AlertOctagon } from "lucide-react";
import React from "react";
import type { PatientSafetyEvaluationResult } from "../../patients/safetyMath";

export interface PatientSafetyAlertBannerProps {
	readonly evaluation: PatientSafetyEvaluationResult;
	readonly onGoToAnamnesis: () => void;
}

export const PatientSafetyAlertBanner: React.FC<PatientSafetyAlertBannerProps> = ({
	evaluation,
	onGoToAnamnesis,
}) => {
	if (evaluation.activeFlags.length === 0) return null;

	return (
		<div
			className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 text-xs ${
				evaluation.hasCriticalStopFlags
					? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
					: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
			}`}
		>
			<div className="flex items-center gap-2 min-w-0">
				<AlertOctagon className="w-4 h-4 shrink-0" />
				<span className="font-bold uppercase tracking-wider text-[11px]">
					Внимание: обнаружены клинические риски/аллергии
				</span>
			</div>
			<button
				type="button"
				onClick={onGoToAnamnesis}
				className="underline font-semibold cursor-pointer shrink-0 hover:opacity-80"
			>
				Посмотреть в анамнезе
			</button>
		</div>
	);
};
