import type React from "react";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { FiscalReceipt54FzModal } from "../../finance/FiscalReceipt54FzModal";
import { showToast } from "../../GlobalToast.js";
import { TreatmentEstimatorSignModal } from "../TreatmentEstimatorSignModal";
import { PAPER_SIGNATURE_DATA_URL } from "./estimatorUiConstants";

export interface TreatmentEstimatorModalsProps {
	readonly isFiscalModalOpen: boolean;
	readonly setIsFiscalModalOpen: (v: boolean) => void;
	readonly cashierItems: readonly TreatmentPlanItem[];
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub: number;
	readonly showSignModal: boolean;
	readonly setShowSignModal: (v: boolean) => void;
	readonly setSignatureUrl: (url: string) => void;
}

export const TreatmentEstimatorModals: React.FC<TreatmentEstimatorModalsProps> = ({
	isFiscalModalOpen,
	setIsFiscalModalOpen,
	cashierItems,
	patientId,
	patientName,
	patientPhone,
	patientDepositRub,
	showSignModal,
	setShowSignModal,
	setSignatureUrl,
}) => {
	return (
		<>
			{isFiscalModalOpen && (
				<FiscalReceipt54FzModal
					isOpen={isFiscalModalOpen}
					items={cashierItems}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					patientDepositRub={patientDepositRub}
					onClose={() => setIsFiscalModalOpen(false)}
					onReceiptFiscalized={(n) => {
						showToast(`Чек №${n} успешно фискализирован`, "success", 4000);
						setIsFiscalModalOpen(false);
					}}
				/>
			)}
			<TreatmentEstimatorSignModal
				isOpen={showSignModal}
				onClose={() => setShowSignModal(false)}
				onConfirmPaper={() => {
					setSignatureUrl(PAPER_SIGNATURE_DATA_URL);
					setShowSignModal(false);
					showToast("План лечения и смета подтверждены на бумаге", "success");
				}}
				onPrint={() => window.print()}
			/>
		</>
	);
};
