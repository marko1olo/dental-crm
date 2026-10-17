import React from "react";
import type { EmployeeTimesheetResult } from "@dental/shared";
import type { TimesheetRoleFilter } from "./types";
import { TimesheetT13StatCards } from "./TimesheetT13StatCards";
import { TimesheetT13SummaryTable } from "./TimesheetT13SummaryTable";

export interface TimesheetT13SummaryTotalsProps {
	readonly monthLabelRu: string;
	readonly activeResult: EmployeeTimesheetResult;
	readonly roleFilter: TimesheetRoleFilter;
	readonly onRoleFilterChange: (filter: TimesheetRoleFilter) => void;
	readonly roleCounts: {
		readonly all: number;
		readonly doctor: number;
		readonly assistant: number;
		readonly admin: number;
	};
	readonly filteredResults: readonly EmployeeTimesheetResult[];
	readonly activeEmployeeId: string | undefined;
	readonly onSelectEmployee: (id: string) => void;
}

export const TimesheetT13SummaryTotals: React.FC<TimesheetT13SummaryTotalsProps> = ({
	monthLabelRu,
	activeResult,
	roleFilter,
	onRoleFilterChange,
	roleCounts,
	filteredResults,
	activeEmployeeId,
	onSelectEmployee,
}) => {
	return (
		<>
			<TimesheetT13StatCards activeResult={activeResult} />
			<TimesheetT13SummaryTable
				monthLabelRu={monthLabelRu}
				roleFilter={roleFilter}
				onRoleFilterChange={onRoleFilterChange}
				roleCounts={roleCounts}
				filteredResults={filteredResults}
				activeEmployeeId={activeEmployeeId}
				onSelectEmployee={onSelectEmployee}
			/>
		</>
	);
};
