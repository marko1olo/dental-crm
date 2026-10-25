import React from "react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	LAB_TECHNOLOGICAL_STAGES,
	type LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";
import { DentalLabOrderTechStageButton } from "./DentalLabOrderTechStageButton";

export interface DentalLabOrderTechStagesGridProps {
	readonly order: DentalLabWorkflowOrder;
	readonly onAdvanceTechStage: (
		order: DentalLabWorkflowOrder,
		targetTechStage?: LabTechnologicalStageId,
	) => void;
}

export function DentalLabOrderTechStagesGrid({
	order,
	onAdvanceTechStage,
}: DentalLabOrderTechStagesGridProps) {
	const currentStep =
		LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]
			?.stepNumber ?? 1;

	return (
		<div
			style={{
				background: "var(--paper-strong, #f8fafc)",
				padding: "10px",
				borderRadius: "6px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "8px",
				}}
			>
				<h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>
					Маршрутный лист клинических этапов:
				</h4>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						color: "var(--teal, #0d9488)",
					}}
				>
					Текущий:{" "}
					{LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]
						?.shortTitleRu || order.techStage}
				</span>
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, 1fr)",
					gap: "6px",
				}}
			>
				{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => (
					<DentalLabOrderTechStageButton
						key={stageKey}
						stageKey={stageKey}
						currentStep={currentStep}
						order={order}
						onAdvanceTechStage={onAdvanceTechStage}
					/>
				))}
			</div>
		</div>
	);
}
