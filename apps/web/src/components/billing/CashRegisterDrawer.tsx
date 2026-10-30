/**
 * CashRegisterDrawer.tsx — Solo Doctor & Small Clinic Cash Register Drawer & Shift Telemetry.
 * Decomposed into ./cashRegisterDrawer/ in strict compliance with Mandate 8b (<= 120 lines facade).
 * Mandates 8e, 8n, 8d (WCAG AAA contrast, zero emojis, compact desktop density).
 */

import React, { useState, useEffect } from "react";
import { ReceiptPreview } from "./ReceiptPreview.js";
import { CashRegisterPaymentPane } from "./CashRegisterPaymentPane.js";
import { type ShiftReceiptEntry } from "./cashRegisterDrawerData.js";
import {
	useCashRegisterDrawerState, DrawerHeader, DrawerTabs, DrawerShiftTelemetryTab,
	DrawerReceiptsTab, DrawerCashOperationsTab, DrawerFooter,
} from "./cashRegisterDrawer/index.js";
if (typeof window !== "undefined") {
	void import("./paymentModalStudio.css");
}

export type { ShiftReceiptEntry };

export interface CashRegisterDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onOpenPaymentModal?: () => void;
	readonly invoices?: readonly any[] | undefined;
	readonly activeInvoice?: any | undefined;
	readonly onPaymentSuccess?: ((invoice: any, receipt: any) => void) | undefined;
	readonly initialMethod?: any | undefined;
}

export const CashRegisterDrawer: React.FC<CashRegisterDrawerProps> = ({
	isOpen, onClose, cashierFullName = "Врач-стоматолог / Кассир",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", onOpenPaymentModal,
	invoices, activeInvoice, onPaymentSuccess, initialMethod,
}) => {
	const state = useCashRegisterDrawerState(isOpen, cashierFullName, invoices);
	const [selectedInvoice, setSelectedInvoice] = useState<any>(
		activeInvoice || (invoices && invoices.length > 0 ? invoices[0] : null),
	);

	useEffect(() => {
		if (activeInvoice) setSelectedInvoice(activeInvoice);
		else if (invoices && invoices.length > 0) setSelectedInvoice(invoices[0]);
	}, [activeInvoice, invoices]);

	if (!isOpen) return null;

	const handleDrawerPayment = (newReceipt: ShiftReceiptEntry) => {
		state.setRecentReceipts((prev) => [newReceipt, ...prev]);
		state.setReceiptsCount((prev) => prev + 1);
		state.setGrandTotalRub((prev) => prev + newReceipt.totalRub);
		if (newReceipt.method === "sbp") state.setSbpTotalRub((prev) => prev + newReceipt.totalRub);
		else if (newReceipt.method === "card") state.setCardTotalRub((prev) => prev + newReceipt.totalRub);
		else if (newReceipt.method === "cash") {
			state.setCashTotalRub((prev) => prev + newReceipt.totalRub);
			state.setCashInDrawerRub((prev) => prev + newReceipt.totalRub);
		}
		state.setSelectedReceipt(newReceipt);
		onPaymentSuccess?.(selectedInvoice, newReceipt);
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-end md:flex-row bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="cash-register-drawer-title" data-testid="cash-register-drawer">
			<div className="bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-t md:border-t-0 md:border-l border-[var(--line,#cbd5e1)] w-full max-w-full md:max-w-xl rounded-t-[24px] md:rounded-none max-h-[92dvh] md:max-h-full h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
				<DrawerHeader shiftNumber={state.shiftNumber} isShiftOpen={state.isShiftOpen} cashierFullName={cashierFullName} clinicLegalName={clinicLegalName} onClose={onClose} />
				<DrawerTabs activeTab={state.activeTab} setActiveTab={state.setActiveTab} hasSelectedReceipt={!!state.selectedReceipt} setSelectedReceipt={state.setSelectedReceipt} receiptsCount={state.recentReceipts.length} />

				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{state.selectedReceipt ? (
						<div className="space-y-3">
							<button type="button" onClick={() => state.setSelectedReceipt(null)} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer" data-testid="btn-back-to-receipts-list">
								← Назад к списку чеков
							</button>
							<ReceiptPreview
								receiptNumber={state.selectedReceipt.number} totalDueRub={state.selectedReceipt.totalRub}
								patientName={state.selectedReceipt.patientName} items={state.selectedReceipt.items}
								payments={{
									cardRub: state.selectedReceipt.method === "card" ? state.selectedReceipt.totalRub : 0,
									sbpRub: state.selectedReceipt.method === "sbp" ? state.selectedReceipt.totalRub : 0,
									cashRub: state.selectedReceipt.method === "cash" ? state.selectedReceipt.totalRub : 0,
								}}
							/>
						</div>
					) : state.activeTab === "payment" || state.activeTab === "shift" ? (
						<>
							<div hidden={state.activeTab !== "payment"} style={{ display: state.activeTab === "payment" ? undefined : "none" }}>
								<CashRegisterPaymentPane
									defaultAmountRub={selectedInvoice?.totalAmountRub ?? selectedInvoice?.amountRub ?? 0}
									cashierFullName={cashierFullName} clinicLegalName={clinicLegalName} activeInvoice={selectedInvoice} invoices={invoices} onSelectInvoice={setSelectedInvoice} initialMethod={initialMethod}
									patientDepositRub={selectedInvoice?.patientDepositRub ?? 0} patientFamilyBalanceRub={selectedInvoice?.patientFamilyBalanceRub ?? 0}
									onPaymentCompleted={handleDrawerPayment} onOpenFullSplitModal={onOpenPaymentModal}
								/>
							</div>
							<div hidden={state.activeTab !== "shift"} style={{ display: state.activeTab === "shift" ? undefined : "none" }}>
								<DrawerShiftTelemetryTab
									grandTotalRub={state.grandTotalRub} cardTotalRub={state.cardTotalRub} sbpTotalRub={state.sbpTotalRub}
									cashTotalRub={state.cashTotalRub} cashInDrawerRub={state.cashInDrawerRub} recentReceipts={state.recentReceipts}
									onSelectReceipt={state.setSelectedReceipt} onGoToAllReceipts={() => state.setActiveTab("receipts")}
									onXReport={state.handleXReport} onZReport={state.handleZReport}
								/>
							</div>
						</>
					) : state.activeTab === "receipts" ? (
						<DrawerReceiptsTab recentReceipts={state.recentReceipts} onSelectReceipt={state.setSelectedReceipt} />
					) : (
						<DrawerCashOperationsTab cashInDrawerRub={state.cashInDrawerRub} onCashDeposit={state.handleCashDeposit} onCashEncashment={state.handleCashEncashment} />
					)}
				</div>

				<DrawerFooter onClose={onClose} onNewPayment={() => { state.setActiveTab("payment"); state.setSelectedReceipt(null); }} />
			</div>
		</div>
	);
};

export default CashRegisterDrawer;
