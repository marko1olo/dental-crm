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
	readonly onOpenAnamnesis: (tab: PatientCardTab) => void;
}

export const PatientCardSomaticAlert: React.FC<PatientCardSomaticAlertProps> = React.memo(
	function PatientCardSomaticAlert({
		safetyEvaluation,
		onOpenAnamnesis,
	}) {
		if (safetyEvaluation.activeFlags.length === 0) return null;

		return (
			<div
				className={`px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2.5 border-b shrink-0 flex-wrap sm:flex-nowrap print:hidden ${
					safetyEvaluation.hasCriticalStopFlags
						? "bg-[var(--danger-soft)] border-[var(--danger-line)] text-[var(--danger-ink)]"
						: "bg-[var(--warning-soft)] border-[var(--warning-line)] text-[var(--warning-ink)]"
				}`}
				role="alert"
				data-testid="patient-card-modal-somatic-banner"
			>
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<AlertTriangle
						className={`w-4 h-4 shrink-0 ${
							safetyEvaluation.hasCriticalStopFlags ? "text-[var(--danger)]" : "text-[var(--warning)]"
						}`}
						aria-hidden="true"
					/>
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
											? "bg-[var(--danger-soft)] text-[var(--danger-ink)] border-[var(--danger-line)]"
											: "bg-[var(--warning-soft)] text-[var(--warning-ink)] border-[var(--warning-line)]"
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
