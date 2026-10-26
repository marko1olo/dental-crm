/**
 * Качество приёмов и эффект напоминаний в отчётах управляющего.
 * Декомпозирован на ManagerReportsAppointmentsQuality и ManagerReportsReminderEffect (Мандат 8b).
 */

import React from "react";
import { ManagerReportsAppointmentsQuality } from "./ManagerReportsAppointmentsQuality";
import { ManagerReportsReminderEffect } from "./ManagerReportsReminderEffect";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsQualitySectionProps {
	readonly summary: ReportsSummary;
}

export function ManagerReportsQualitySection({
	summary,
}: ManagerReportsQualitySectionProps) {
	return (
		<>
			<ManagerReportsAppointmentsQuality summary={summary} />
			<ManagerReportsReminderEffect summary={summary} />
		</>
	);
}
