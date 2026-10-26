/**
 * FinanceToolbar.tsx — Compact Desktop and Mobile Finance Navigation Bar
 * Purged of bureaucratic law numbers (Mandates 8x, 8ap):
 * Uses human-friendly labels: "Касса онлайн" and "Счета и акты".
 */

import React from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { FinanceToolbarLeft } from "./toolbar/FinanceToolbarLeft.js";
import { FinanceToolbarActions } from "./toolbar/FinanceToolbarActions.js";
import { FinanceToolbarMenu } from "./toolbar/FinanceToolbarMenu.js";

export interface FinanceToolbarProps {
	readonly documentPatient: Patient | null;
	readonly billingSummary: Dashboard["billingSummary"] | null;
	readonly isCashShiftOpen: boolean;
	readonly onToggleCashShift: () => void;
	readonly isShiftOpen: boolean;
	readonly onPayDebtQuick: () => void;
	readonly money: (val: number | null) => string;
	readonly onOpenInvoices: () => void;
	readonly isFinanceOptionsOpen: boolean;
	readonly onToggleFinanceOptions: () => void;
	readonly onCloseFinanceOptions: () => void;
	readonly onOpenPnl: () => void;
	readonly onGoToDocuments: () => void;
	readonly onOpenCashbox: () => void;
	readonly onOpenBillingAct?: (() => void) | undefined;
	readonly onOpenQuickExpense?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenFamilyBilling?: (() => void) | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
}

export function FinanceToolbar(p: FinanceToolbarProps): React.JSX.Element {
	return (
		<div className="finance-monolithic-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs mb-1.5 sm:mb-2 flex-nowrap overflow-hidden shrink-0 select-none">
			<FinanceToolbarLeft
				documentPatient={p.documentPatient}
				isCashShiftOpen={p.isCashShiftOpen}
				onToggleCashShift={p.onToggleCashShift}
				isShiftOpen={p.isShiftOpen}
			/>

			<FinanceToolbarActions
				billingSummary={p.billingSummary}
				onPayDebtQuick={p.onPayDebtQuick}
				money={p.money}
				onOpenInvoices={p.onOpenInvoices}
				onOpenQuickExpense={p.onOpenQuickExpense}
			>
				<FinanceToolbarMenu
					isFinanceOptionsOpen={p.isFinanceOptionsOpen}
					onToggleFinanceOptions={p.onToggleFinanceOptions}
					onCloseFinanceOptions={p.onCloseFinanceOptions}
					onOpenPnl={p.onOpenPnl}
					onGoToDocuments={p.onGoToDocuments}
					onOpenCashbox={p.onOpenCashbox}
					onOpenBillingAct={p.onOpenBillingAct}
					onOpenQuickExpense={p.onOpenQuickExpense}
					onOpenTaxCertificate={p.onOpenTaxCertificate}
					onOpenT13Timesheet={p.onOpenT13Timesheet}
					onOpenFamilyBilling={p.onOpenFamilyBilling}
					onOpenSplitPayment={p.onOpenSplitPayment}
					isCashShiftOpen={p.isCashShiftOpen}
					onToggleCashShift={p.onToggleCashShift}
				/>
			</FinanceToolbarActions>
		</div>
	);
}
