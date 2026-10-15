/**
 * apps/web/src/components/billing/paymentModalModules/PaymentActiveMethodCockpit.tsx
 *
 * Layer 4: Active Method Cockpit Renderer (Terminal, SBP QR, Cash Calculator, Split, Family Deposit).
 * Governed by Mandates 8b (<800 lines), 8d (Studio Clinical HIG), 8e (Doctor Autonomy).
 */

import React from "react";
import { PaymentTerminalView } from "../../finance/modal/payment/PaymentTerminalView.js";
import { PaymentSbpView } from "../../finance/modal/payment/PaymentSbpView.js";
import { PaymentSplitView } from "../../finance/modal/payment/PaymentSplitView.js";
import { PaymentFamilyDepositView } from "../../finance/modal/payment/PaymentFamilyDepositView.js";
import { PaymentCashCalculator } from "./PaymentCashCalculator.js";
import type { PaymentLogicResult, PaymentModalProps } from "./types.js";

export interface PaymentActiveMethodCockpitProps {
	readonly props: PaymentModalProps;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly execHook: PaymentLogicResult["execHook"];
}

export const PaymentActiveMethodCockpit: React.FC<PaymentActiveMethodCockpitProps> = ({
	props,
	patientId,
	patientName,
	patientDepositRub,
	patientFamilyBalanceRub,
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

	if (tendersHook.activeMethod === "cash") {
		return (
			<PaymentCashCalculator
				totalDueRub={discountsHook.totalDueRub}
				receivedCashRub={tendersHook.receivedCashRub}
				setReceivedCashRub={tendersHook.setReceivedCashRub}
				cashChange={tendersHook.cashChange}
				handleCashSubmit={execHook.handleCashSubmit}
				isSubmittingCash={execHook.isSubmittingCash}
			/>
		);
	}

	if (tendersHook.activeMethod === "split") {
		return (
			<PaymentSplitView
				totalDueRub={discountsHook.totalDueRub}
				splitCardRub={tendersHook.splitCardRub}
				setSplitCardRub={tendersHook.setSplitCardRub}
				splitCashRub={tendersHook.splitCashRub}
				setSplitCashRub={tendersHook.setSplitCashRub}
				splitSbpRub={tendersHook.splitSbpRub}
				setSplitSbpRub={tendersHook.setSplitSbpRub}
				splitDepositRub={tendersHook.splitDepositRub}
				setSplitDepositRub={tendersHook.setSplitDepositRub}
				splitCertificateRub={tendersHook.splitCertificateRub}
				setSplitCertificateRub={tendersHook.setSplitCertificateRub}
				splitBonusRub={tendersHook.splitBonusRub}
				setSplitBonusRub={tendersHook.setSplitBonusRub}
				splitDmsRub={tendersHook.splitDmsRub}
				setSplitDmsRub={tendersHook.setSplitDmsRub}
				availableDmsCoverageRub={props.availableDmsCoverageRub}
				dmsGuaranteeLetterNumber={props.dmsGuaranteeLetterNumber}
				dmsInsurerName={props.dmsInsurerName}
				patientDepositRub={patientDepositRub}
				patientFamilyBalanceRub={patientFamilyBalanceRub}
				applySplitRemainder={tendersHook.applySplitRemainder}
				totalAllocatedRub={tendersHook.totalAllocatedRub}
				isBalanced={tendersHook.isBalanced}
				sbpStatus={tendersHook.sbpStatus}
				sbpQrData={tendersHook.sbpQrData}
				sbpCheckMessage={tendersHook.sbpCheckMessage}
				handleCheckSbpStatus={execHook.handleCheckSbpStatus}
				handleConfirmSbpManual={execHook.handleConfirmSbpManual}
				isCheckingSbp={tendersHook.isCheckingSbp}
			/>
		);
	}

	return (
		<PaymentFamilyDepositView
			patientDepositRub={patientDepositRub}
			patientFamilyBalanceRub={patientFamilyBalanceRub}
			totalDueRub={discountsHook.totalDueRub}
			amountRub={discountsHook.totalDueRub.toFixed(2)}
			isSubmittingDeposit={execHook.isSubmittingDeposit}
			handleDepositOrPartialCombo={execHook.handleDepositOrPartialCombo}
			setSplitDepositRub={tendersHook.setSplitDepositRub}
			setSplitCardRub={tendersHook.setSplitCardRub}
			setSplitCashRub={tendersHook.setSplitCashRub}
			setSplitSbpRub={tendersHook.setSplitSbpRub}
			setActiveMethod={tendersHook.setActiveMethod}
		/>
	);
};
