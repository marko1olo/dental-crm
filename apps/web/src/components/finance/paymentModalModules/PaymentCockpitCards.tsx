import React from "react";
import { PaymentTerminalView } from "../modal/payment/PaymentTerminalView.js";
import { PaymentSbpView } from "../modal/payment/PaymentSbpView.js";
import type { PaymentLogicResult, PaymentModalProps } from "./types.js";

export interface PaymentCockpitCardsProps {
	readonly props: PaymentModalProps;
	readonly patientId: string;
	readonly patientName: string;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly execHook: PaymentLogicResult["execHook"];
}

export const PaymentCockpitCards: React.FC<PaymentCockpitCardsProps> = ({
	props,
	patientId,
	patientName,
	discountsHook,
	tendersHook,
	execHook,
}) => {
	const { invoiceId, visitId, documentId } = props;

	if (
		tendersHook.activeMethod === "card_terminal" ||
		tendersHook.activeMethod === "sberpay_qr" ||
		tendersHook.activeMethod === "biometry"
	) {
		return (
			<PaymentTerminalView
				patientId={patientId}
				patientName={patientName}
				totalDueKopecks={discountsHook.discountCalc.totalDueKopecks}
				invoiceId={invoiceId}
				visitId={visitId}
				documentId={documentId}
				handleSberSuccess={execHook.handleSberSuccess}
				setActiveMethod={tendersHook.setActiveMethod}
				handleManualCardTerminalConfirm={execHook.handleManualCardTerminalConfirm}
				isSubmittingManualCard={execHook.isSubmittingManualCard}
			/>
		);
	}

	if (tendersHook.activeMethod === "sbp_qr") {
		return (
			<PaymentSbpView
				sbpStatus={tendersHook.sbpStatus}
				totalDueRub={discountsHook.totalDueRub}
				sbpQrData={tendersHook.sbpQrData}
				sbpCheckMessage={tendersHook.sbpCheckMessage}
				handleCheckSbpStatus={execHook.handleCheckSbpStatus}
				isCheckingSbp={tendersHook.isCheckingSbp}
				handleConfirmSbpManual={execHook.handleConfirmSbpManual}
			/>
		);
	}

	return null;
};
