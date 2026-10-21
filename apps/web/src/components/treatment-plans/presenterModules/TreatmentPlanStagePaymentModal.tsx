/**
 * TreatmentPlanStagePaymentModal.tsx — Lazy checkout/fiscal modal for stage payment.
 * Mandate 8b: <= 120 lines.
 */
import React from "react";
import { showToast } from "../../GlobalToast";
import type { TreatmentPlanStage } from "../types";

const FiscalReceipt54FzModal = React.lazy(() =>
	import("../../finance/FiscalReceipt54FzModal").then((m) => ({
		default: m.FiscalReceipt54FzModal,
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
			<FiscalReceipt54FzModal
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
