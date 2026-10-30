import React from "react";
import { LabWorkOrderModal } from "../../../lab/orders/LabWorkOrderModal.js";
import type { TreatmentPlanValidationPayload } from "../planPriceValidationPresets.js";

export interface PriceValidatorLabOrderWrapperProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly planPayload?: TreatmentPlanValidationPayload;
	readonly labTeeth: readonly number[];
}

export const PriceValidatorLabOrderWrapper: React.FC<PriceValidatorLabOrderWrapperProps> = ({
	isOpen,
	onClose,
	planPayload,
	labTeeth,
}) => {
	return (
		<LabWorkOrderModal
			isOpen={isOpen}
			onClose={onClose}
			patientId={planPayload?.patientId || undefined}
			patientName={planPayload?.patientName || "Пациент не указан"}
			patientChartNumber={
				planPayload?.planNumber ||
				(planPayload?.patientId ? `К-${planPayload.patientId.slice(0, 5)}` : undefined)
			}
			doctorId={planPayload?.doctorId || undefined}
			doctorName={planPayload?.doctorFullName || undefined}
			initialTeeth={labTeeth}
		/>
	);
};
