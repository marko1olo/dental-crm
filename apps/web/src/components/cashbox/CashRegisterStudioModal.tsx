/**
 * apps/web/src/components/cashbox/CashRegisterStudioModal.tsx
 *
 * Canonical Unified SSOT Cash Register Studio & 54-FZ Fiscal Terminal Modal.
 * Consolidates checkout, shift management, Z-report, and thermal receipt tape.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons on primary CTA actions).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN, 1-click presets).
 * - Mandate 8am: Exactly ONE Primary CTA button (#0d9488 / var(--teal)) per visible view.
 * - Mandate 8x & 8ap: Plain clinical Russian without raw FFD/FZ-54 codes in client UI.
 * - Mandate 8b & 8zi: Clean modular architecture (decomposed into studioModules subcomponents).
 * - Apple HIG: Native Mobile Bottom Sheet (rounded-t-[24px], Drag Handle 36x5px, Natural Thumb Zone).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CashboxTenderType, CashRegisterStudioTab } from "./cashRegisterCatalogData.js";
import {
	useCashRegisterStudioState,
	CashRegisterStudioHeader,
	CashRegisterCheckoutSection,
	CashRegisterShiftSection,
	CashRegisterTapeSection,
	CashRegisterStudioFooter,
} from "./studioModules/index.js";

export interface CashRegisterStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: CashRegisterStudioTab | "reconciliation" | "drawer" | "history" | undefined;
	readonly mode?: "checkout" | "shift" | "studio" | undefined;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly isShiftOpen?: boolean | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly netRevenueRub?: number | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly onOpenShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onOpenShift?: (() => Promise<void> | void) | undefined;
	readonly onCloseShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onCloseShift?: ((zReportSummary?: any) => Promise<void> | void) | undefined;
	readonly onPrintXReportAction?: (() => Promise<void> | void) | undefined;
	readonly onPrintXReport?: (() => Promise<void> | void) | undefined;
	readonly totalDueRub?: number | undefined;
	readonly totalDueKopecks?: bigint | number | undefined;
	readonly amountRub?: number | undefined;
	readonly amountKopecks?: bigint | number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAllergies?: unknown;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly defaultMethod?: CashboxTenderType | undefined;
	readonly printFormat?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onSuccess?: ((result?: unknown) => void) | undefined;
	readonly onPaymentComplete?: (() => void) | undefined;
	readonly onConfirmPayment?: ((details?: unknown) => void) | undefined;
	readonly containerTestId?: string | undefined;
	readonly submitButtonTestId?: string | undefined;
	readonly title?: string | undefined;
}

export const CashRegisterStudioModal: React.FC<CashRegisterStudioModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		shiftNumber = 104,
		cashierFullName = "Администратор / Кассир",
		kktRegNumber = "0004829104058291",
		ofdName = "АО «ПЕРВЫЙ ОФД»",
		cashInDrawerRub = 15000,
		cardSumRub = 35000,
		sbpSumRub = 7000,
		advanceOffsetRub = 2000,
		patientName = "Иванов Иван Иванович",
		patientPhone = "+7 (999) 111-22-33",
		patientAllergies,
		doctorFullName = "Д-р Смирнов А. В.",
		serviceTitle = "Лечение пульпита и реставрация",
		patientDepositRub = 3000,
		patientFamilyBalanceRub = 5000,
		containerTestId = "cash-register-studio-modal",
		submitButtonTestId = "btn-confirm-checkout-payment",
		title = "Касса и чеки · Студия расчётов",
	} = props;

	const modalTitleId = useId();
	const state = useCashRegisterStudioState(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip max-w-[100vw] animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
			data-testid={containerTestId}
		>
			<div className="w-full max-w-full md:max-w-4xl lg:max-w-5xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Top Header */}
				<CashRegisterStudioHeader
					modalTitleId={modalTitleId}
					title={title}
					isShiftActive={state.isShiftActive}
					shiftNumber={shiftNumber}
					cashierFullName={cashierFullName}
					activeTab={state.activeTab}
					onTabChange={state.setActiveTab}
					onClose={onClose}
				/>

				{/* Scrollable Body */}
				<div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[var(--paper)]">
					{state.errorMessage && (
						<div
							className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150"
							role="alert"
							data-testid="cashbox-payment-error-alert"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="font-bold shrink-0">⚠️ Ошибка кассы:</span>
								<span className="truncate">{state.errorMessage}</span>
							</div>
							<button
								type="button"
								onClick={() => state.setErrorMessage(null)}
								className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors shrink-0 cursor-pointer"
								aria-label="Закрыть ошибку"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					)}

					{state.activeTab === "checkout" && (
						<CashRegisterCheckoutSection
							patientName={patientName}
							patientPhone={patientPhone}
							patientAllergies={patientAllergies}
							doctorFullName={doctorFullName}
							serviceTitle={serviceTitle}
							patientDepositRub={patientDepositRub}
							patientFamilyBalanceRub={patientFamilyBalanceRub}
							effectiveTotalRub={state.effectiveTotalRub}
							isWarranty={state.isWarranty}
							setIsWarranty={state.setIsWarranty}
							discountPercent={state.discountPercent}
							setDiscountPercent={state.setDiscountPercent}
							payerType={state.payerType}
							setPayerType={state.setPayerType}
							buyerInn={state.buyerInn}
							setBuyerInn={state.setBuyerInn}
							method={state.method}
							setMethod={state.setMethod}
							baseDueRub={state.baseDueRub}
							onOpenSplitPayment={props.onOpenSplitPayment}
							cashReceivedRub={state.cashReceivedRub}
							setCashReceivedRub={state.setCashReceivedRub}
							changeResult={state.changeResult}
							isSplitBalanced={state.isSplitBalanced}
							splitDiffKop={state.splitDiffKop}
							effectiveTotalKop={state.effectiveTotalKop}
							splitCardRub={state.splitCardRub}
							setSplitCardRub={state.setSplitCardRub}
							splitCashRub={state.splitCashRub}
							setSplitCashRub={state.setSplitCashRub}
							splitSbpRub={state.splitSbpRub}
							setSplitSbpRub={state.setSplitSbpRub}
							splitDepositRub={state.splitDepositRub}
							setSplitDepositRub={state.setSplitDepositRub}
							splitCashReceivedRub={state.splitCashReceivedRub}
							setSplitCashReceivedRub={state.setSplitCashReceivedRub}
							splitCashChange={state.splitCashChange}
							handleBalanceSplit={state.handleBalanceSplit}
							installmentMonths={state.installmentMonths}
							setInstallmentMonths={state.setInstallmentMonths}
							fiscalize={state.fiscalize}
							setFiscalize={state.setFiscalize}
							printFormat={state.printFormat}
							setPrintFormat={state.setPrintFormat}
							onExecutePayment={state.handleExecutePayment}
						/>
					)}

					{state.activeTab === "shift" && (
						<CashRegisterShiftSection
							shiftNumber={shiftNumber}
							kktRegNumber={kktRegNumber}
							ofdName={ofdName}
							cashierFullName={cashierFullName}
							isShiftActive={state.isShiftActive}
							isSubmitting={state.isSubmitting}
							calculatedNetRevenue={state.calculatedNetRevenue}
							initialCashDrawer={cashInDrawerRub}
							initialCardSum={cardSumRub}
							initialSbpSum={sbpSumRub}
							initialAdvanceSum={advanceOffsetRub}
							countedCashInput={state.countedCashInput}
							setCountedCashInput={state.setCountedCashInput}
							onToggleShift={state.handleToggleShift}
						/>
					)}

					{state.activeTab === "tape" && (
						<CashRegisterTapeSection
							tapeText={state.tapeText}
							isCopied={state.isCopied}
							onCopyTape={state.handleCopyTape}
						/>
					)}
				</div>

				{/* Sticky Bottom Bar */}
				<CashRegisterStudioFooter
					activeTab={state.activeTab}
					isShiftActive={state.isShiftActive}
					isSubmitting={state.isSubmitting}
					effectiveTotalRub={state.effectiveTotalRub}
					calculatedNetRevenue={state.calculatedNetRevenue}
					shiftNumber={shiftNumber}
					isWarranty={state.isWarranty}
					submitButtonTestId={submitButtonTestId}
					onClose={onClose}
					onExecutePayment={state.handleExecutePayment}
					onToggleShift={state.handleToggleShift}
					onPrintXReport={state.handlePrintXReport}
					onCopyTape={state.handleCopyTape}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterStudioModal;
