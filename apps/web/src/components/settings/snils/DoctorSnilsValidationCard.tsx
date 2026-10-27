import type React from "react";
import { DoctorSnilsInputForm } from "./DoctorSnilsInputForm";
import { DoctorSnilsResultBadge } from "./DoctorSnilsResultBadge";
import type { DoctorSnilsValidationWidgetProps } from "./doctorSnilsTypes";
import { useDoctorSnilsValidation } from "./useDoctorSnilsValidation";

export const DoctorSnilsValidationCard: React.FC<DoctorSnilsValidationWidgetProps> = ({
	initialSnils = "",
	onValidSnils,
}) => {
	const { snils, setSnils, isValidating, validationResult, handleValidate } =
		useDoctorSnilsValidation(initialSnils, onValidSnils);

	return (
		<div className="rounded-xl border border-[var(--line)] p-3 bg-[var(--paper-soft)] space-y-2">
			<DoctorSnilsInputForm
				snils={snils}
				setSnils={setSnils}
				isValidating={isValidating}
				onValidate={handleValidate}
			/>
			{validationResult && <DoctorSnilsResultBadge result={validationResult} />}
		</div>
	);
};
