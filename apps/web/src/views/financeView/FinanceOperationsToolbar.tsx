import type { Dashboard, Patient } from "@dental/shared";
import { CashShiftWidget } from "../../components/finance/CashShiftWidget";
import { FinanceToolbar } from "../../components/finance/FinanceToolbar";
import type { PendingCheckout } from "./types.js";

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

export function FinanceOperationsToolbar({
	pendingCheckout,
	onResetPendingCheckout,
	effectivePatient,
	effectiveBillingSummary,
	isCashShiftOpen,
	onToggleCashShift,
	isShiftOpen,
	onPayDebtQuick,
	money,
	onOpenInvoices,
	isFinanceOptionsOpen,
	onToggleFinanceOptions,
	onCloseFinanceOptions,
	onOpenPnl,
	onGoToDocuments,
	onOpenCashbox,
	onOpenBillingAct,
	onOpenQuickExpense,
	onOpenTaxCertificate,
	onOpenT13Timesheet,
	onOpenFamilyBilling,
	onOpenSplitPayment,
	shiftNumber,
	paymentFiscalCashierName,
	cashInDrawerRub,
	cardSumRub,
	sbpSumRub,
	advanceOffsetRub,
	onOpenShift,
	onCloseShift,
	onCashIn,
	onCashOut,
	onPrintXReport,
}: FinanceOperationsToolbarProps) {
	return (
		<>
			{pendingCheckout && (
				<div
					className="clinical-checkout-handoff-banner rounded-xl border border-teal-500/40 bg-teal-50/80 dark:bg-teal-950/40 p-2.5 text-xs flex items-center justify-between gap-2 mb-2 sm:mb-3 shadow-xs animate-in fade-in"
					data-testid="clinical-checkout-handoff-banner"
				>
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
						<div className="flex items-center gap-1.5 min-w-0">
							<span className="font-bold text-teal-900 dark:text-teal-100 shrink-0">
								Счёт по приёму ({pendingCheckout.patientName}):
							</span>
							<span className="text-[var(--ink)] font-medium truncate">
								{(() => {
									const list = (pendingCheckout.services || []).map((s: any) => s.name || s.title).filter(Boolean);
									if (list.length === 0) return "Консультация и обследование";
									if (list.length === 1) return list[0];
									const count = list.length;
									const word = count === 1 ? "услуга" : (count >= 2 && count <= 4 ? "услуги" : "услуг");
									return `${count} ${word}`;
								})()}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<span className="font-mono font-extrabold text-teal-800 dark:text-teal-200 text-sm">
							{money(pendingCheckout.totalDueRub)}
						</span>
						<button
							type="button"
							onClick={onResetPendingCheckout}
							className="text-[11px] text-[var(--muted)] hover:text-rose-500 underline ml-1 cursor-pointer"
						>
							Сбросить
						</button>
					</div>
				</div>
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
