import React from "react";
import { Check, Loader2, Minus, X } from "lucide-react";
import { type FlowStepItem, getStatusColor } from "./visitFlowProgressHelpers";

export interface VisitFlowProgressStepsProps {
	readonly steps: readonly FlowStepItem[];
}

export function VisitFlowProgressSteps({ steps }: VisitFlowProgressStepsProps) {
	return (
		<div className="vfp-steps">
			{steps.map((step, idx) => (
				<div key={step.key} className="vfp-step">
					<span
						className={`vfp-dot pulse-${step.status}`}
						style={{ background: getStatusColor(step.status) }}
					/>
					<span className="vfp-step-label">
						{idx + 1}. {step.label}
					</span>
					{step.status === "running" && (
						<span className="vfp-step-status" title="Шаг выполняется">
							<Loader2 size={13} className="text-teal-600 animate-spin shrink-0" aria-label="Шаг выполняется" />
						</span>
					)}
					{step.status === "success" && (
						<span className="vfp-step-status" title="Шаг успешно выполнен">
							<Check size={13} className="text-emerald-600 shrink-0" aria-label="Шаг выполнен" />
						</span>
					)}
					{step.status === "error" && (
						<span className="vfp-step-status" title="Шаг не выполнен">
							<X size={13} className="text-rose-500 shrink-0" aria-label="Шаг не выполнен" />
						</span>
					)}
					{step.status === "skipped" && (
						<span className="vfp-step-status" title="Шаг пропущен">
							<Minus size={13} className="text-amber-500 shrink-0" aria-label="Шаг пропущен" />
						</span>
					)}
				</div>
			))}
		</div>
	);
}
