/**
 * apps/web/src/components/billing/DepositTopupModal.tsx
 *
 * DENTE Dental CRM — Patient Personal & Family Deposit Topup Modal (54-FZ Advance).
 * Decomposed facade delegating to ./depositModal/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React from "react";
import type { DepositTopupModalProps } from "./depositModal/depositModalTypes.js";
import { useDepositTopupLogic } from "./depositModal/useDepositTopupLogic.js";
import { DepositTopupHeader } from "./depositModal/DepositTopupHeader.js";
import { DepositAmountSection } from "./depositModal/DepositAmountSection.js";
import { DepositMethodAndOptionsSection } from "./depositModal/DepositMethodAndOptionsSection.js";
import { DepositFooterActions } from "./depositModal/DepositFooterActions.js";
import "./paymentModalStudio.css";

export type { DepositTopupModalProps };

export const DepositTopupModal: React.FC<DepositTopupModalProps> = (props) => {
	const { isOpen, onClose, patientName, currentDepositRub = 0 } = props;
	const {
		amountRub, setAmountRub, paymentMethod, setPaymentMethod,
		deliveryMode, setDeliveryMode, isFamilyWallet, setIsFamilyWallet,
		isSubmitting, isCompleted, handleExecuteTopup,
	} = useDepositTopupLogic(props);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center bg-black/65 backdrop-blur-xs p-0 md:p-4 payment-modal-backdrop animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="deposit-modal-title"
			data-testid="deposit-topup-modal"
		>
			<div className="payment-modal w-full max-w-full md:max-w-3xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border-t md:border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] md:max-h-[92vh] min-h-0">
				<DepositTopupHeader
					patientName={patientName}
					currentDepositRub={currentDepositRub}
					onClose={onClose}
				/>

				<div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-h-0">
					<DepositAmountSection
						amountRub={amountRub}
						setAmountRub={setAmountRub}
						currentDepositRub={currentDepositRub}
					/>
					<DepositMethodAndOptionsSection
						paymentMethod={paymentMethod}
						setPaymentMethod={setPaymentMethod}
						isFamilyWallet={isFamilyWallet}
						setIsFamilyWallet={setIsFamilyWallet}
						deliveryMode={deliveryMode}
						setDeliveryMode={setDeliveryMode}
					/>
				</div>

				<DepositFooterActions
					amountRub={amountRub}
					isSubmitting={isSubmitting}
					isCompleted={isCompleted}
					onClose={onClose}
					onExecute={handleExecuteTopup}
				/>
			</div>
		</div>
	);
};

export default DepositTopupModal;
