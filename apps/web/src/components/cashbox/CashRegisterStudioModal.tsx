/**
 * apps/web/src/components/cashbox/CashRegisterStudioModal.tsx
 *
 * Canonical Unified SSOT Cash Register Studio & Fiscal Terminal Modal.
 * Integer Kopeck Math (BigInt amountKopecks), live clinic KKT/OFD settings,
 * native Mobile Bottom Sheet Apple HIG, single Primary CTA var(--primary).
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import type { CashboxTenderType, CashRegisterStudioTab } from "./cashRegisterCatalogData.js";
import {
	useCashRegisterStudioState,
	CashRegisterStudioHeader,
	CashRegisterCheckoutSection,
	CashRegisterShiftSection,
	CashRegisterTapeSection,
	CashRegisterStudioFooter,
} from "./studioModules/index.js";

export interface ZReportSummaryPayload {
	readonly shiftNumber?: number | undefined;
	readonly zReportNumber?: string | undefined;
	readonly incomeTotalKopecks?: bigint | number | undefined;
	readonly cashInDrawerKopecks?: bigint | number | undefined;
	/** @deprecated Legacy ruble fallback */
	readonly incomeTotalRub?: number | undefined;
	/** @deprecated Legacy ruble fallback */
	readonly cashInDrawerRub?: number | undefined;
	readonly closedAt?: string | undefined;
	readonly [key: string]: unknown;
}

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
	readonly initialChangeFundKopecks?: bigint | number | undefined;
	readonly netRevenueKopecks?: bigint | number | undefined;
	readonly cashInDrawerKopecks?: bigint | number | undefined;
	readonly cardSumKopecks?: bigint | number | undefined;
	readonly sbpSumKopecks?: bigint | number | undefined;
	readonly advanceOffsetKopecks?: bigint | number | undefined;
	readonly totalDueKopecks?: bigint | number | undefined;
	readonly amountKopecks?: bigint | number | undefined;
	readonly patientDepositKopecks?: bigint | number | undefined;
	readonly patientFamilyBalanceKopecks?: bigint | number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly initialChangeFundRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly netRevenueRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly cashInDrawerRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly cardSumRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly sbpSumRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly advanceOffsetRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly totalDueRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly amountRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly patientDepositRub?: number | undefined;
	/** @deprecated Legacy ruble bridge for out-of-scope callers — prefer *Kopecks */
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onOpenShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onOpenShift?: (() => Promise<void> | void) | undefined;
	readonly onCloseShiftAction?: (() => Promise<void> | void) | undefined;
	readonly onCloseShift?: ((zReportSummary?: ZReportSummaryPayload) => Promise<void> | void) | undefined;
	readonly onPrintXReportAction?: (() => Promise<void> | void) | undefined;
	readonly onPrintXReport?: (() => Promise<void> | void) | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly invoiceId?: string | undefined;
	readonly orderId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAllergies?: unknown;
	readonly patientBonusPoints?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly defaultMethod?: CashboxTenderType | undefined;
	readonly initialPaymentMethod?: CashboxTenderType | undefined;
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
		shiftNumber = 1,
		cashierFullName = "Кассир",
		patientName,
		patientPhone,
		patientAllergies,
		doctorFullName,
		serviceTitle,
		containerTestId = "cash-register-studio-modal",
		submitButtonTestId = "btn-confirm-checkout-payment",
		title = "Студия кассы и чеков",
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
			onClick={(e) => {
				if (e.target === e.currentTarget) state.handleClose();
			}}
		>
			<div className="w-full max-w-full md:max-w-4xl lg:max-w-5xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper)] border-t md:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				<CashRegisterStudioHeader
					modalTitleId={modalTitleId}
					title={title}
					isShiftActive={state.isShiftActive}
					shiftNumber={shiftNumber}
					cashierFullName={cashierFullName}
					activeTab={state.activeTab}
					onTabChange={state.setActiveTab}
					onClose={state.handleClose}
				/>

				<div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[var(--paper)]">
					{state.errorMessage && (
						<div
							className="p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150"
							style={{
								backgroundColor: "var(--danger-soft, rgba(239, 68, 68, 0.1))",
								borderColor: "var(--danger, #ef4444)",
								color: "var(--danger, #ef4444)",
							}}
							role="alert"
							data-testid="cashbox-payment-error-alert"
						>
							<div className="flex items-center gap-2 min-w-0">
								<AlertTriangle className="w-4 h-4 shrink-0 text-[var(--danger,#ef4444)]" />
								<span className="font-bold shrink-0">Ошибка кассы:</span>
								<span className="truncate">{state.errorMessage}</span>
							</div>
							<button
								type="button"
								onClick={() => state.setErrorMessage(null)}
								className="p-1 rounded-lg hover:opacity-80 transition-opacity shrink-0 cursor-pointer text-[var(--danger,#ef4444)]"
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
							patientDepositKopecks={state.patientDepositKopecks}
							patientFamilyBalanceKopecks={state.patientFamilyBalanceKopecks}
							effectiveTotalKopecks={state.effectiveTotalKopecks}
							baseDueKopecks={state.baseDueKopecks}
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
							onOpenSplitPayment={props.onOpenSplitPayment}
							cashReceivedKopecks={state.cashReceivedKopecks}
							setCashReceivedKopecks={state.setCashReceivedKopecks}
							changeResult={state.changeResult}
							isSplitBalanced={state.isSplitBalanced}
							splitDiffKopecks={state.splitDiffKopecks}
							splitCardKopecks={state.splitCardKopecks}
							setSplitCardKopecks={state.setSplitCardKopecks}
							splitCashKopecks={state.splitCashKopecks}
							setSplitCashKopecks={state.setSplitCashKopecks}
							splitSbpKopecks={state.splitSbpKopecks}
							setSplitSbpKopecks={state.setSplitSbpKopecks}
							splitDepositKopecks={state.splitDepositKopecks}
							setSplitDepositKopecks={state.setSplitDepositKopecks}
							splitBonusKopecks={state.splitBonusKopecks}
							setSplitBonusKopecks={state.setSplitBonusKopecks}
							splitCertKopecks={state.splitCertKopecks}
							setSplitCertKopecks={state.setSplitCertKopecks}
							patientBonusPoints={props.patientBonusPoints}
							splitCashReceivedKopecks={state.splitCashReceivedKopecks}
							setSplitCashReceivedKopecks={state.setSplitCashReceivedKopecks}
							splitCashChange={state.splitCashChange}
							handleBalanceSplit={state.handleBalanceSplit}
							installmentMonths={state.installmentMonths}
							setInstallmentMonths={state.setInstallmentMonths}
							fiscalize={state.fiscalize}
							setFiscalize={state.setFiscalize}
							printFormat={state.printFormat}
							setPrintFormat={state.setPrintFormat}
							certificateNumber={state.certificateNumber}
							setCertificateNumber={state.setCertificateNumber}
							onExecutePayment={state.handleExecutePayment}
							appliedDmsSplit={state.appliedDmsSplit}
							invoiceId={props.invoiceId}
							orderId={props.orderId}
						/>
					)}

					{state.activeTab === "shift" && (
						<CashRegisterShiftSection
							shiftNumber={shiftNumber}
							kktRegNumber={state.effectiveKktRegNumber}
							ofdName={state.effectiveOfdName}
							cashierFullName={cashierFullName}
							isShiftActive={state.isShiftActive}
							isSubmitting={state.isSubmitting}
							calculatedNetRevenueKopecks={state.calculatedNetRevenueKopecks}
							initialCashDrawerKopecks={state.initialCashDrawerKopecks}
							initialCardSumKopecks={state.initialCardSumKopecks}
							initialSbpSumKopecks={state.initialSbpSumKopecks}
							initialAdvanceSumKopecks={state.initialAdvanceSumKopecks}
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

				<CashRegisterStudioFooter
					activeTab={state.activeTab}
					isShiftActive={state.isShiftActive}
					isSubmitting={state.isSubmitting}
					effectiveTotalKopecks={state.effectiveTotalKopecks}
					calculatedNetRevenueKopecks={state.calculatedNetRevenueKopecks}
					shiftNumber={shiftNumber}
					isWarranty={state.isWarranty}
					submitButtonTestId={submitButtonTestId}
					onClose={state.handleClose}
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
