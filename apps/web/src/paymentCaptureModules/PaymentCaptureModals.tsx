import { kopecksToRub, type PaymentMethod, type SberPosTransactionResponse } from "@dental/shared";
import React from "react";
import { money } from "../AppHelpers";
import { PaymentModal } from "../components/finance/PaymentModal";
import { showToast } from "../components/GlobalToast";
import { normalizeRubAmountInput } from "../rubAmountInput";
import { PaymentCaptureCardTerminalModal } from "./PaymentCaptureCardTerminalModal";

export type PaymentCaptureModalsProps = {
	patientId?: string | null | undefined;
	patientName: string;
	amount: string;
	remainingDebt?: number | undefined;
	method: PaymentMethod;
	fiscalCashierName: string;
	isCardTerminalModalOpen: boolean;
	onCloseCardTerminalModal: () => void;
	isSplitModalOpen: boolean;
	isSplit5050Mode: boolean;
	onCloseSplitModal: () => void;
	onAmountChange: (amount: string) => void;
	onMethodChange: (method: PaymentMethod) => void;
	onFiscalFdChange: (fd: string) => void;
	onFiscalFpdChange: (fpd: string) => void;
};

export function PaymentCaptureModals({
	patientId,
	patientName,
	amount,
	remainingDebt,
	method,
	fiscalCashierName,
	isCardTerminalModalOpen,
	onCloseCardTerminalModal,
	isSplitModalOpen,
	isSplit5050Mode,
	onCloseSplitModal,
	onAmountChange,
	onMethodChange,
	onFiscalFdChange,
	onFiscalFpdChange,
}: PaymentCaptureModalsProps) {
	const effectiveRub = normalizeRubAmountInput(amount) ?? (remainingDebt && remainingDebt > 0 ? remainingDebt : 0);

	const handleTerminalSuccess = (res: SberPosTransactionResponse) => {
		onCloseCardTerminalModal();
		onAmountChange("");
		if (res.rrn) onFiscalFdChange(res.rrn);
		if (res.authCode) onFiscalFpdChange(res.authCode);
		showToast(`Оплата ${money(kopecksToRub(res.amountKop))} успешно авторизована. RRN: ${res.rrn}`, "success");
	};

	return (
		<>
			{patientId && (
				<PaymentCaptureCardTerminalModal
					isOpen={isCardTerminalModalOpen}
					onClose={onCloseCardTerminalModal}
					patientId={patientId}
					patientName={patientName}
					amountRub={effectiveRub}
					orderId={`POS-${Date.now().toString().slice(-8)}`}
					onSuccess={handleTerminalSuccess}
					onSelectAlternativeMethod={(alt) =>
						onMethodChange(alt === "deposit" ? "family_wallet" : alt === "sbp" ? "online" : alt)
					}
				/>
			)}

			<PaymentModal
				isOpen={isSplitModalOpen}
				onClose={onCloseSplitModal}
				patientId={patientId || undefined}
				patientName={patientName || undefined}
				amountRub={normalizeRubAmountInput(amount) ?? (remainingDebt && remainingDebt > 0 ? remainingDebt : undefined)}
				patientDebtRub={remainingDebt && remainingDebt > 0 ? remainingDebt : undefined}
				cashierName={fiscalCashierName || undefined}
				defaultMethod="split"
				initialSplit5050={isSplit5050Mode}
				onSuccess={(paymentData) => {
					onCloseSplitModal();
					onAmountChange("");
					const formatted = paymentData.amountKopecks ? money(kopecksToRub(paymentData.amountKopecks)) : "";
					showToast(`Комбинированная оплата ${formatted} успешно проведена.`, "success", 4000);
				}}
			/>
		</>
	);
}
