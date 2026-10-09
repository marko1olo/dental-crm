import React from "react";
import { Check, Circle } from "lucide-react";
import { DEFAULT_EMK_PROTOCOL_STEPS } from "./constants";
import type { EmkProtocolStep, EmkProtocolStepId } from "./types";

export interface EmkProtocolStepperProps {
	readonly steps?: readonly EmkProtocolStep[];
	readonly activeStepId?: EmkProtocolStepId;
	readonly onSelectStep?: (stepId: EmkProtocolStepId) => void;
	readonly className?: string;
}

export function EmkProtocolStepper({
	steps = DEFAULT_EMK_PROTOCOL_STEPS,
	activeStepId = "complaints",
	onSelectStep,
	className,
}: EmkProtocolStepperProps) {
	return (
		<div
			className={className}
			style={{
				display: "flex",
				alignItems: "center",
				gap: "4px",
				overflowX: "auto",
				padding: "4px 0",
				width: "100%",
			}}
		>
			{steps.map((step, idx) => {
				const isActive = step.id === activeStepId;
				const isCompleted = step.isCompleted || step.completionPercent >= 100;

				return (
					<button
						key={step.id}
						type="button"
						onClick={() => onSelectStep?.(step.id)}
						disabled={!onSelectStep}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							padding: "6px 12px",
							borderRadius: "8px",
							fontSize: "12px",
							fontWeight: isActive ? 700 : 500,
							border: isActive
								? "1px solid var(--teal, #0d9488)"
								: "1px solid var(--line, #e2e8f0)",
							background: isActive
								? "rgba(13, 148, 136, 0.1)"
								: isCompleted
									? "rgba(16, 185, 129, 0.06)"
									: "var(--paper, #ffffff)",
							color: isActive
								? "var(--teal-dark, #0f766e)"
								: isCompleted
									? "var(--good, #10b981)"
									: "var(--ink-2, #64748b)",
							cursor: onSelectStep ? "pointer" : "default",
							whiteSpace: "nowrap",
							flexShrink: 0,
							transition: "all 0.15s ease",
						}}
					>
						<span
							style={{
								width: "16px",
								height: "16px",
								borderRadius: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "10px",
								fontWeight: 700,
								background: isCompleted
									? "var(--good, #10b981)"
									: isActive
										? "var(--teal, #0d9488)"
										: "var(--paper-strong, #e2e8f0)",
								color: isCompleted || isActive ? "#ffffff" : "var(--ink-2, #64748b)",
							}}
						>
							{isCompleted ? <Check size={10} strokeWidth={3} /> : idx + 1}
						</span>
						<span>{step.shortTitleRu}</span>
					</button>
				);
			})}
		</div>
	);
}
