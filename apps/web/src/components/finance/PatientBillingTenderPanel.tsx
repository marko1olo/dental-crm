import React from "react";
import { type PatientBillingPaymentMethod } from "./PatientBillingTypes";
import { PatientBillingDirectCustomPayment } from "./patientBilling/PatientBillingDirectCustomPayment";
import { PatientBillingExpressBar } from "./patientBilling/PatientBillingExpressBar";
import { PatientBillingTenderButtons } from "./patientBilling/PatientBillingTenderButtons";
import { PatientBillingTenderContext } from "./patientBilling/PatientBillingTenderContext";

export interface PatientBillingTenderPanelProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly onFiscalizeAction: () => void;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
	readonly cashChangeResult: {
		readonly changeRub: number;
		readonly isShortage: boolean;
		readonly shortageRub: number;
	};
	readonly primaryInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	readonly onInputEnterKeyDown?: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly installmentSchedule: {
		readonly stage1Rub: number;
		readonly stage2Rub: number;
		readonly stage3Rub: number;
		readonly stage4Rub: number;
	};
	readonly effectiveDeposit: number;
	readonly effectiveFamilyBalance: number;
	readonly initialServicesCount: number;
	readonly customServiceName: string;
	readonly onSetCustomServiceName: (name: string) => void;
	readonly customAmountRub: number;
	readonly onSetCustomAmountRub: (rub: number) => void;
}

export const PatientBillingTenderPanel: React.FC<PatientBillingTenderPanelProps> = (p) => {
	return (
		<div className="space-y-4">
			<PatientBillingExpressBar
				totalNetRub={p.totalNetRub}
				onSelectTender={p.onSelectTender}
				onSetReceivedCashRub={p.onSetReceivedCashRub}
				onFiscalizeAction={p.onFiscalizeAction}
			/>

			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3.5" data-testid="patient-billing-payment-panel">
				<PatientBillingTenderButtons
					selectedTender={p.selectedTender}
					onSelectTender={p.onSelectTender}
					totalNetRub={p.totalNetRub}
					receivedCashRub={p.receivedCashRub}
					onSetReceivedCashRub={p.onSetReceivedCashRub}
				/>

				<PatientBillingTenderContext
					selectedTender={p.selectedTender}
					totalNetRub={p.totalNetRub}
					receivedCashRub={p.receivedCashRub}
					onSetReceivedCashRub={p.onSetReceivedCashRub}
					cashChangeResult={p.cashChangeResult}
					primaryInputRef={p.primaryInputRef}
					onInputEnterKeyDown={p.onInputEnterKeyDown}
					installmentSchedule={p.installmentSchedule}
					effectiveDeposit={p.effectiveDeposit}
					effectiveFamilyBalance={p.effectiveFamilyBalance}
				/>
			</div>

			<PatientBillingDirectCustomPayment
				initialServicesCount={p.initialServicesCount}
				customServiceName={p.customServiceName}
				onSetCustomServiceName={p.onSetCustomServiceName}
				customAmountRub={p.customAmountRub}
				onSetCustomAmountRub={p.onSetCustomAmountRub}
			/>
		</div>
	);
};
