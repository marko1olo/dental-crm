/**
 * Разрезы по врачам и занятости кресел в отчётах управляющего.
 * Декомпозирован на ManagerReportsDoctorsTable и ManagerReportsChairsTable (Мандат 8b).
 */

import React from "react";
import { ManagerReportsChairsTable } from "./ManagerReportsChairsTable";
import { ManagerReportsDoctorsTable } from "./ManagerReportsDoctorsTable";
import type { ReportsSummary } from "./ManagerReportsTypes";

export interface ManagerReportsStaffAndChairsSectionProps {
	readonly summary: ReportsSummary;
	readonly showDoctorBreakdown: boolean;
	readonly showChairUtilisation: boolean;
}

export function ManagerReportsStaffAndChairsSection({
	summary,
	showDoctorBreakdown,
	showChairUtilisation,
}: ManagerReportsStaffAndChairsSectionProps) {
	return (
		<>
			{showDoctorBreakdown && <ManagerReportsDoctorsTable summary={summary} />}
			{showChairUtilisation && <ManagerReportsChairsTable summary={summary} />}
		</>
	);
}
