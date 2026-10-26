/**
 * Главные числа и динамика выручки в отчётах управляющего.
 * Декомпозирован на ManagerReportsKpiCards и ManagerReportsRevenueBars (Мандат 8b).
 */

import React from "react";
import { ManagerReportsKpiCards } from "./ManagerReportsKpiCards";
import { ManagerReportsRevenueBars } from "./ManagerReportsRevenueBars";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsKpisSectionProps {
	readonly summary: ReportsSummary;
	readonly maxRevenue: number;
}

export function ManagerReportsKpisSection({
	summary,
	maxRevenue,
}: ManagerReportsKpisSectionProps) {
	return (
		<>
			<ManagerReportsKpiCards summary={summary} />
			<ManagerReportsRevenueBars summary={summary} maxRevenue={maxRevenue} />
		</>
	);
}
