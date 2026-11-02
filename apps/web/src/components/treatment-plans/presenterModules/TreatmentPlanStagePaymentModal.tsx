/**
 * TreatmentPlanStagePaymentModal.tsx — Lazy checkout/fiscal modal for stage payment.
 * Mandate 8b: <= 120 lines.
 */
import React from "react";
import { showToast } from "../../GlobalToast";
import type { TreatmentPlanStage } from "../types";

const CashReceiptModal = React.lazy(() =>
	import("../../finance/CashReceiptModal.js").then((m) => ({
		default: m.CashReceiptModal,
	})),
);

interface TreatmentPlanStagePaymentModalProps {
	readonly stage: TreatmentPlanStage | null;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly onClose: () => void;
}

export const TreatmentPlanStagePaymentModal: React.FC<
	TreatmentPlanStagePaymentModalProps
> = ({
	stage,
	patientId,
	patientName,
	patientPhone,
	doctorFullName,
	clinicName,
	onClose,
}) => {
	if (!stage) return null;

	return (
		<React.Suspense fallback={null}>
			<CashReceiptModal
				isOpen={true}
				items={stage.items}
				patientId={patientId}
				patientName={patientName}
				patientPhone={patientPhone}
				cashierFullName={doctorFullName || "Лечащий врач"}
				clinicName={clinicName}
				onClose={onClose}
				onReceiptFiscalized={() => {
					onClose();
					showToast("Оплата этапа успешно фискализирована", "success");
				}}
			/>
		</React.Suspense>
	);
};
