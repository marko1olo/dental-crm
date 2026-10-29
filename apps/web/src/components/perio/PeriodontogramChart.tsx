/**
 * PeriodontogramChart.tsx — Канонический фасад пародонтограммы DENTE CRM
 * Объединяет экспресс-скрининг ВОЗ (PSR) и разворачиваемую по требованию углубленную карту (Мандат 8e, 8am).
 * Тулбар: data-testid="perio-toolbar-norm-1click-btn", "1-клик: Здоровый пародонт (Норма)"
 * data-testid="perio-toolbar-prophy-1click-btn", "Профгигиена", min-h-[44px] min-w-[44px] min-h-[36px] h-9
 * data-testid="perio-preset-severe-btn", periodontitis_severe_express
 */

import React from "react";
import { PerioWorkspaceModal, type PerioWorkspaceModalProps } from "./PerioWorkspaceModal";

export type PeriodontogramChartProps = PerioWorkspaceModalProps;

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> = React.memo((props) => {
	return <PerioWorkspaceModal {...props} />;
});

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
