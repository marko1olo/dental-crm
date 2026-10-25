import { AlertOctagon } from "lucide-react";
import React from "react";
import type { PatientSafetyEvaluationResult } from "../safetyMath";
import type { PatientCardActiveTab } from "./patientCardTypes";

interface PatientHeaderSafetyAlertProps {
	readonly safetyEvaluation: PatientSafetyEvaluationResult;
	readonly onSelectTab: (tab: PatientCardActiveTab) => void;
}

export function PatientHeaderSafetyAlert({ safetyEvaluation, onSelectTab }: PatientHeaderSafetyAlertProps) {
	if (safetyEvaluation.activeFlags.length === 0) return null;

	return (
		<div
			className={`p-3 rounded-xl flex items-center justify-between gap-2.5 border text-xs ${
				safetyEvaluation.hasCriticalStopFlags
					? "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100"
					: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
			}`}
			role="alert"
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<AlertOctagon
					className={`w-4 h-4 shrink-0 ${
						safetyEvaluation.hasCriticalStopFlags ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-amber-600 dark:text-amber-400"
					}`}
				/>
				<div className="flex items-center gap-1.5 flex-wrap">
					<strong className="text-[11px] uppercase tracking-wider">
						{safetyEvaluation.hasCriticalStopFlags ? "Критический стоп-фактор:" : "Клиническое предупреждение:"}
					</strong>
					{safetyEvaluation.activeFlags.map((flag) => (
						<span key={flag.id} className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-white/40 dark:bg-black/30 border border-current">
							{flag.shortBadge || flag.titleRu}
						</span>
					))}
				</div>
			</div>
			<button
				type="button"
				onClick={() => onSelectTab("anamnesis")}
				className="text-xs font-bold underline cursor-pointer shrink-0"
			>
				Детали
			</button>
		</div>
	);
}
