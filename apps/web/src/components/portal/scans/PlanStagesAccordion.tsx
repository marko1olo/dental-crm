/**
 * DENTE CRM — Patient Portal Treatment Stages Accordion
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Encapsulates the treatment stages list with Order 804n dual-service presentation,
 * progress/completion badges, and 1-click SBP triggers.
 */

import React from "react";
import type { TreatmentPlanStage } from "../patientCabinet/patientCabinetEngine.js";
import { PatientPortalTreatmentStageCard } from "../PatientPortalTreatmentStageCard.js";

export interface PlanStagesAccordionProps {
	readonly stages: readonly TreatmentPlanStage[];
	readonly onPayStageSbp?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const PlanStagesAccordion: React.FC<PlanStagesAccordionProps> = ({
	stages,
	onPayStageSbp,
}) => {
	return (
		<div
			className="plan-stages-accordion-section"
			data-testid="plan-stages-accordion"
			style={{ display: "flex", flexDirection: "column", gap: "12px" }}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<h4
					style={{
						margin: 0,
						fontSize: "16px",
						fontWeight: 800,
						color: "var(--pc-text-main, var(--ink, #0f172a))",
					}}
				>
					Этапы лечения и онлайн-оплата ({stages.length})
				</h4>
				<span
					style={{
						fontSize: "12px",
						color: "var(--pc-text-muted, #94a3b8)",
						backgroundColor: "rgba(13, 148, 136, 0.1)",
						padding: "2px 8px",
						borderRadius: "6px",
						fontWeight: 600,
					}}
				>
					СБП 0% комиссии
				</span>
			</div>

			{stages.length === 0 ? (
				<div
					data-testid="plan-stages-empty"
					style={{
						padding: "24px 16px",
						textAlign: "center",
						backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
						border: "1px dashed var(--pc-border, #334155)",
						borderRadius: "10px",
						color: "var(--pc-text-muted, #94a3b8)",
						fontSize: "13px",
					}}
				>
					Этапы лечения еще формируются лечащим врачом.
				</div>
			) : (
				stages.map((stage) => (
					<PatientPortalTreatmentStageCard
						key={stage.id}
						stage={stage}
						onPaySbp={onPayStageSbp ? () => onPayStageSbp(stage) : undefined}
					/>
				))
			)}
		</div>
	);
};

export const PatientPlanStagesAccordion = PlanStagesAccordion;
export default PlanStagesAccordion;
