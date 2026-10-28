import type React from "react";
import type { PaymentLogicResult, PaymentModalProps } from "./types.js";
import { PaymentActiveMethodCockpit } from "./PaymentActiveMethodCockpit.js";
import { PaymentBanners } from "./PaymentBanners.js";
import { PaymentDiscountsPresets } from "./PaymentDiscountsPresets.js";
import { PaymentFiscalPreview } from "./PaymentFiscalPreview.js";
import { PaymentMethodSelector } from "./PaymentMethodSelector.js";

export interface PaymentModalBodyProps {
	readonly props: PaymentModalProps;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly patientDebtRub: number;
	readonly clinicLegalName: string;
	readonly rawTotalDueRub: number;
	readonly effectiveCashier: string;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly execHook: PaymentLogicResult["execHook"];
	readonly showReceiptSidePanel: boolean;
	readonly mobileTab: "checkout" | "receipt";
	readonly onClose: () => void;
	readonly onSuccess: (receipt: any) => void;
}

/**
 * Body columns for PaymentModal (checkout cockpit + thermal receipt preview).
 * Mandate 8b: <= 120 lines.
 */
export const PaymentModalBody: React.FC<PaymentModalBodyProps> = (p) => {
	const { props, patientId, patientName, patientPhone, patientDepositRub, patientFamilyBalanceRub, patientDebtRub, clinicLegalName, rawTotalDueRub, effectiveCashier, discountsHook, tendersHook, execHook, showReceiptSidePanel, mobileTab, onClose, onSuccess } = p;

	return (
		<div className="flex-1 min-h-0 overflow-y-auto lg:overflow-y-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--line,#cbd5e1)]">
			<div className={`flex-1 min-h-0 p-2.5 sm:p-3 pb-[calc(96px+env(safe-area-inset-bottom,0px))] sm:pb-10 space-y-2.5 overflow-y-auto ${mobileTab === "receipt" ? "hidden md:block" : "block"}`}>
				<PaymentBanners
					totalDueRub={discountsHook.totalDueRub} rawTotalDueRub={rawTotalDueRub}
					patientDebtRub={patientDebtRub} patientDepositRub={patientDepositRub}
					discountsHook={discountsHook} execHook={execHook} tendersHook={tendersHook}
					onClose={onClose} onSuccess={onSuccess}
				/>
				<PaymentMethodSelector
					activeMethod={tendersHook.activeMethod} setActiveMethod={tendersHook.setActiveMethod}
					patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub}
					onOpenSplitPayment={props.onOpenSplitPayment}
				/>
				<PaymentActiveMethodCockpit
					props={props} patientId={patientId} patientName={patientName}
					patientDepositRub={patientDepositRub} patientFamilyBalanceRub={patientFamilyBalanceRub}
					discountsHook={discountsHook} tendersHook={tendersHook} execHook={execHook}
				/>
				<PaymentDiscountsPresets
					discountsHook={discountsHook} tendersHook={tendersHook} patientDepositRub={patientDepositRub}
				/>
			</div>
			<PaymentFiscalPreview
				clinicLegalName={clinicLegalName} totalDueRub={discountsHook.totalDueRub}
				patientName={patientName} patientPhone={patientPhone} patientEmail={props.patientEmail}
				effectiveCashier={effectiveCashier} isWarranty100={discountsHook.isWarranty100}
				tendersHook={tendersHook} discountsHook={discountsHook}
				showReceiptSidePanel={showReceiptSidePanel} mobileTab={mobileTab}
				items={props.items} toothNumber={props.toothNumber}
			/>
		</div>
	);
};