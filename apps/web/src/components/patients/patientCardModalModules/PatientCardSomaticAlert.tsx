/**
 * apps/web/src/components/patients/patientCardModalModules/PatientCardSomaticAlert.tsx
 * Passive safety somatic status and allergy alert banner (Mandate 8y).
 * Sentence case, non-blocking, quick navigation to anamnesis tab.
 */

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { PatientSafetyEvaluationResult } from "../safetyMath";
import type { PatientCardTab } from "./patientCardModalTypes";

export interface PatientCardSomaticAlertProps {
	readonly safetyEvaluation: PatientSafetyEvaluationResult;
	readonly isAnySubModalOpen: boolean;
	readonly onOpenAnamnesis: (tab: PatientCardTab) => void;
}

export const PatientCardSomaticAlert: React.FC<PatientCardSomaticAlertProps> = React.memo(
	function PatientCardSomaticAlert({
		safetyEvaluation,
		isAnySubModalOpen,
		onOpenAnamnesis,
	}) {
		if (safetyEvaluation.activeFlags.length === 0) return null;

		return (
			<div
				className={`px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b shrink-0 flex-wrap sm:flex-nowrap print:hidden ${
					safetyEvaluation.hasCriticalStopFlags
						? "bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-100"
						: "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100"
				} ${isAnySubModalOpen ? "max-sm:hidden" : ""}`}
				role="alert"
				data-testid="patient-card-modal-somatic-banner"
			>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
					<div className="flex items-center gap-1.5 flex-wrap min-w-0">
						<span className="text-[11px] font-bold shrink-0 tracking-wide">
							<span className="sr-only">
								{safetyEvaluation.hasCriticalStopFlags
									? "Критический стоп-фактор: "
									: "Клиническое предупреждение: "}
							</span>
							Аллергический статус / особенности:
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{safetyEvaluation.activeFlags.map((flag) => (
								<span
									key={flag.id}
									className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold border ${
										flag.severity === "critical"
											? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30"
											: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30"
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
					onClick={() => onOpenAnamnesis("anamnesis")}
					className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer shrink-0 transition-opacity"
				>
					Открыть статус
				</button>
			</div>
		);
	},
);
