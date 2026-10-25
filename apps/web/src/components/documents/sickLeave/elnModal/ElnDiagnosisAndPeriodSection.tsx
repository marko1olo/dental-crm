import React from "react";
import { DiagnosisParametersFields } from "./DiagnosisParametersFields";
import { IncapacityPeriodsTable } from "./IncapacityPeriodsTable";
import { ClosingStatusFields } from "./ClosingStatusFields";
import type { ElnDiagnosisAndPeriodSectionProps } from "./types";

export function ElnDiagnosisAndPeriodSection({
	formState,
	setFormState,
	handleAddPeriod,
	handleRemovePeriod,
	handlePeriodDateChange,
	onQuickSetDays
}: ElnDiagnosisAndPeriodSectionProps) {
	return (
		<div className="flex flex-col gap-3">
			<DiagnosisParametersFields formState={formState} setFormState={setFormState} />
			<IncapacityPeriodsTable
				formState={formState}
				setFormState={setFormState}
				handleAddPeriod={handleAddPeriod}
				handleRemovePeriod={handleRemovePeriod}
				handlePeriodDateChange={handlePeriodDateChange}
				onQuickSetDays={onQuickSetDays}
			/>
			<ClosingStatusFields formState={formState} setFormState={setFormState} />
		</div>
	);
}
