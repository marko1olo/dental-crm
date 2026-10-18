import React from "react";
import type { ExecutiveFunnelStageItem } from "@dental/shared";
import { CheckCircle2 } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface ExecutiveFunnelStepDetailsProps {
	readonly stage: ExecutiveFunnelStageItem;
}

export function ExecutiveFunnelStepDetails({ stage }: ExecutiveFunnelStepDetailsProps) {
	return (
		<div
			style={{
				marginTop: "0.75rem",
				paddingTop: "0.75rem",
				borderTop: "1px dashed var(--line, #e2e8f0)",
				fontSize: "0.8125rem",
				color: "var(--ink, #334155)",
				display: "flex",
				flexDirection: "column",
				gap: "0.375rem",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<span>Стоимость единицы этапа (Unit Cost):</span>
				<strong>{formatRublesClean(stage.unitCostFormatted)}</strong>
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<span>Доля от исходных обращений:</span>
				<strong>{stage.conversionFromLeadPercent}%</strong>
			</div>
			{stage.isAiAssisted && (
				<div style={{ color: "var(--teal, #0d9488)", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }}>
					<CheckCircle2 size={14} />
					Интегрировано с модулем ИИ-рентгенологии КЛКТ
				</div>
			)}
		</div>
	);
}
