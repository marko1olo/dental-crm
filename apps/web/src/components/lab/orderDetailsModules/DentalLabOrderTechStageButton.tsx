import { CheckCircle2 } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGES,
	type LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";

export interface DentalLabOrderTechStageButtonProps {
	readonly stageKey: LabTechnologicalStageId;
	readonly currentStep: number;
	readonly order: DentalLabWorkflowOrder;
	readonly onAdvanceTechStage: (
		order: DentalLabWorkflowOrder,
		targetTechStage?: LabTechnologicalStageId,
	) => void;
}

export function DentalLabOrderTechStageButton({
	stageKey,
	currentStep,
	order,
	onAdvanceTechStage,
}: DentalLabOrderTechStageButtonProps) {
	const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
	const isDone = sDef.stepNumber < currentStep;
	const isCurrent = sDef.stepNumber === currentStep;

	return (
		<button
			type="button"
			onClick={() => onAdvanceTechStage(order, stageKey)}
			style={{
				padding: "6px",
				borderRadius: "6px",
				border: isCurrent
					? "2px solid var(--teal, #0d9488)"
					: "1px solid var(--line, #e2e8f0)",
				background: isCurrent
					? "var(--teal-surface, #f0fdfa)"
					: isDone
						? "var(--paper-soft, #f8fafc)"
						: "var(--paper, #ffffff)",
				color: isCurrent
					? "var(--teal, #0f766e)"
					: isDone
						? "var(--muted, #64748b)"
						: "var(--ink, #0f172a)",
				textAlign: "left",
				cursor: "pointer",
				fontSize: "10.5px",
			}}
			title={`${sDef.nameRu}\nЦех: ${sDef.departmentRu}\n${sDef.descriptionRu}`}
		>
			<div
				style={{
					fontWeight: 700,
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<span>№{sDef.stepNumber}</span>
				<span
					style={{
						fontSize: "9.5px",
						display: "inline-flex",
						alignItems: "center",
						gap: "2px",
						color: isDone
							? "var(--teal, #059669)"
							: isCurrent
								? "var(--teal, #0d9488)"
								: "var(--muted, #94a3b8)",
					}}
				>
					{isDone ? (
						<CheckCircle2
							size={10}
							className="text-emerald-600 dark:text-emerald-400"
						/>
					) : isCurrent ? (
						"В РАБОТЕ"
					) : (
						"ОЖИДАНИЕ"
					)}
				</span>
			</div>
			<div
				style={{ marginTop: "2px", fontWeight: isCurrent ? 700 : 500 }}
				className="truncate"
			>
				{sDef.shortTitleRu}
			</div>
		</button>
	);
}
