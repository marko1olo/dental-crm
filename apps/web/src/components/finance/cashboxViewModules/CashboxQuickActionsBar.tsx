import React from "react";
import { Banknote, ShieldCheck } from "lucide-react";
import type { PaymentMethodTab } from "../PaymentModal.js";
import type {
	PayerLegalType,
	TenderAllocationTarget,
	InnValidationResult,
	CheckoutResult,
} from "./types.js";
import { CASHBOX_54FZ_STATUS_BADGE } from "./cashboxConstants.js";
import { CashboxAmountRow } from "./quickActions/CashboxAmountRow.js";
import { CashboxDoctorDiscountsRow } from "./quickActions/CashboxDoctorDiscountsRow.js";
import { CashboxPayerTypeRow } from "./quickActions/CashboxPayerTypeRow.js";
import { CashboxTendersGrid } from "./quickActions/CashboxTendersGrid.js";

export interface CashboxQuickActionsBarProps {
	readonly grossAmountRub: number;
	readonly setGrossAmountRub: (amount: number) => void;
	readonly onAddAmountPreset: (rub: number) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (warranty: boolean) => void;
	readonly isStaffColleague: boolean;
	readonly setIsStaffColleague: (staff: boolean) => void;
	readonly onResetDiscount: () => void;
	readonly onOpenRetailModal: () => void;
	readonly payerType: PayerLegalType;
	readonly setPayerType: (type: PayerLegalType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (inn: string) => void;
	readonly innValidation: InnValidationResult;
	readonly checkoutResult: CheckoutResult;
	readonly isSubmittingZeroReceipt: boolean;
	readonly onProcessZeroDiscountCheckout: () => Promise<void>;
	readonly onAllocateAll: (target: TenderAllocationTarget) => void;
	readonly onOpenPaymentWithMethod: (method: PaymentMethodTab) => void;
}

export function CashboxQuickActionsBar({
	grossAmountRub,
	setGrossAmountRub,
	onAddAmountPreset,
	discountPercent,
	setDiscountPercent,
	isWarranty,
	setIsWarranty,
	isStaffColleague,
	setIsStaffColleague,
	onResetDiscount,
	onOpenRetailModal,
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
	innValidation,
	checkoutResult,
	isSubmittingZeroReceipt,
	onProcessZeroDiscountCheckout,
	onAllocateAll,
	onOpenPaymentWithMethod,
}: CashboxQuickActionsBarProps): React.JSX.Element {
	return (
		<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
			{/* 1-Row Compact Toolbar (32-36px, Mandates 8c, 8d, 8p) */}
			<div className="cashbox-toolbar min-h-[36px] h-9 max-h-9 flex items-center justify-between gap-2 px-1 pb-2 border-b border-[var(--line)] mb-3 flex-nowrap overflow-hidden select-none">
				<div className="flex items-center gap-2 min-w-0">
					<Banknote className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<h2 className="text-sm font-bold text-[var(--ink)] truncate m-0">Касса и чеки</h2>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span
						className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))] whitespace-nowrap"
						title={CASHBOX_54FZ_STATUS_BADGE.tooltip}
					>
						<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
						<span>{CASHBOX_54FZ_STATUS_BADGE.text}</span>
					</span>
				</div>
			</div>

			<CashboxAmountRow
				grossAmountRub={grossAmountRub}
				setGrossAmountRub={setGrossAmountRub}
				onAddAmountPreset={onAddAmountPreset}
			/>

			<CashboxDoctorDiscountsRow
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				isWarranty={isWarranty}
				setIsWarranty={setIsWarranty}
				isStaffColleague={isStaffColleague}
				setIsStaffColleague={setIsStaffColleague}
				onResetDiscount={onResetDiscount}
				onOpenRetailModal={onOpenRetailModal}
			/>

			<CashboxPayerTypeRow
				payerType={payerType}
				setPayerType={setPayerType}
				buyerInn={buyerInn}
				setBuyerInn={setBuyerInn}
				innValidation={innValidation}
			/>

			<CashboxTendersGrid
				checkoutResult={checkoutResult}
				isSubmittingZeroReceipt={isSubmittingZeroReceipt}
				onProcessZeroDiscountCheckout={onProcessZeroDiscountCheckout}
				onAllocateAll={onAllocateAll}
				onOpenPaymentWithMethod={onOpenPaymentWithMethod}
			/>
		</div>
	);
}
