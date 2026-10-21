/**
 * DENTE Dental CRM — Column Focus Telemetry Metrics Hook
 * Mandate 8b (<= 120 lines)
 */

import { useMemo } from "react";
import type { Lead } from "../../../store/leadsStore";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import type { ColumnMetrics } from "./types";

export function useColumnFocusMetrics(columnLeads: Lead[]): ColumnMetrics {
	return useMemo(() => {
		const totalRevenue = columnLeads.reduce(
			(acc, l) => acc + (Number(l.expectedRevenue) || 0),
			0,
		);
		let breachedCount = 0;
		let warningCount = 0;
		let freshCount = 0;
		let totalMinutes = 0;

		columnLeads.forEach((lead) => {
			const sla = getLeadSlaStatus(lead);
			totalMinutes += sla.minutesElapsed;
			if (sla.urgency === "breached") breachedCount++;
			else if (sla.urgency === "warning") warningCount++;
			else freshCount++;
		});

		const avgWaitMinutes =
			columnLeads.length > 0
				? Math.round(totalMinutes / columnLeads.length)
				: 0;

		return {
			totalCount: columnLeads.length,
			totalRevenue,
			breachedCount,
			warningCount,
			freshCount,
			avgWaitMinutes,
		};
	}, [columnLeads]);
}
