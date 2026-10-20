import type { Dashboard, Patient } from "@dental/shared";
import { CashShiftWidget } from "../../components/finance/CashShiftWidget";
import { FinanceToolbar } from "../../components/finance/FinanceToolbar";
import type { PendingCheckout } from "./types.js";
import { PendingCheckoutBanner } from "./PendingCheckoutBanner.js";

export interface FinanceOperationsToolbarProps {
	pendingCheckout: PendingCheckout | null;
	onResetPendingCheckout: () => void;
	effectivePatient: Patient | null;
	effectiveBillingSummary: Dashboard["billingSummary"] | null;
	isCashShiftOpen: boolean;
	onToggleCashShift: () => void;
	isShiftOpen: boolean;
	onPayDebtQuick: () => void;
	money: (value: number | null) => string;
	onOpenInvoices: () => void;
	isFinanceOptionsOpen: boolean;
	onToggleFinanceOptions: () => void;
	onCloseFinanceOptions: () => void;
	onOpenPnl: () => void;
	onGoToDocuments: () => void;
	onOpenCashbox: () => void;
	onOpenBillingAct: () => void;
	onOpenQuickExpense: () => void;
	onOpenTaxCertificate: () => void;
	onOpenT13Timesheet?: (() => void) | undefined;
	onOpenFamilyBilling?: (() => void) | undefined;
	onOpenSplitPayment?: (() => void) | undefined;
	onOpenDoctorPayroll?: (() => void) | undefined;
	shiftNumber: number;
	paymentFiscalCashierName: string;
	cashInDrawerRub: number;
	cardSumRub: number;
	sbpSumRub: number;
	advanceOffsetRub: number;
	onOpenShift: () => Promise<void>;
	onCloseShift: () => Promise<void>;
	onCashIn: (amountRub: number, basis: string, typeAlias?: string) => Promise<void>;
	onCashOut: (amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => Promise<void>;
	onPrintXReport: () => Promise<void>;
}

export function FinanceOperationsToolbar(props: FinanceOperationsToolbarProps) {
	const {
		pendingCheckout, onResetPendingCheckout, effectivePatient, effectiveBillingSummary,
		isCashShiftOpen, onToggleCashShift, isShiftOpen, onPayDebtQuick, money,
		onOpenInvoices, isFinanceOptionsOpen, onToggleFinanceOptions, onCloseFinanceOptions,
		onOpenPnl, onGoToDocuments, onOpenCashbox, onOpenBillingAct, onOpenQuickExpense,
		onOpenTaxCertificate, onOpenT13Timesheet, onOpenFamilyBilling, onOpenSplitPayment,
		shiftNumber, paymentFiscalCashierName, cashInDrawerRub, cardSumRub, sbpSumRub,
		advanceOffsetRub, onOpenShift, onCloseShift, onCashIn, onCashOut, onPrintXReport,
	} = props;

	return (
		<>
			{pendingCheckout && (
				<PendingCheckoutBanner
					pendingCheckout={pendingCheckout}
					onResetPendingCheckout={onResetPendingCheckout}
					onOpenSplitPayment={onOpenSplitPayment}
					money={money}
				/>
			)}

			<FinanceToolbar
				documentPatient={effectivePatient}
				billingSummary={effectiveBillingSummary}
				isCashShiftOpen={isCashShiftOpen}
				onToggleCashShift={onToggleCashShift}
				isShiftOpen={isShiftOpen}
				onPayDebtQuick={onPayDebtQuick}
				money={money}
				onOpenInvoices={onOpenInvoices}
				isFinanceOptionsOpen={isFinanceOptionsOpen}
				onToggleFinanceOptions={onToggleFinanceOptions}
				onCloseFinanceOptions={onCloseFinanceOptions}
				onOpenPnl={onOpenPnl}
				onGoToDocuments={onGoToDocuments}
				onOpenCashbox={onOpenCashbox}
				onOpenBillingAct={onOpenBillingAct}
				onOpenQuickExpense={onOpenQuickExpense}
				onOpenTaxCertificate={onOpenTaxCertificate}
				onOpenT13Timesheet={onOpenT13Timesheet}
				onOpenFamilyBilling={onOpenFamilyBilling}
				onOpenSplitPayment={onOpenSplitPayment}
			/>

			{isCashShiftOpen && (
				<div className="relative mb-3 animate-in fade-in duration-150" data-testid="cash-shift-panel-container">
					<CashShiftWidget
						compact={true}
						initialIsOpen={isShiftOpen}
						shiftNumber={shiftNumber}
						cashierName={paymentFiscalCashierName || undefined}
						cashInDrawerRub={cashInDrawerRub}
						cardSumRub={cardSumRub}
						sbpSumRub={sbpSumRub}
						advanceOffsetRub={advanceOffsetRub}
						onOpenShift={onOpenShift}
						onCloseShift={onCloseShift}
						onCashIn={onCashIn}
						onCashOut={onCashOut}
						onPrintXReport={onPrintXReport}
					/>
				</div>
			)}
		</>
	);
}
