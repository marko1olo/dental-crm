/**
 * FiscalReceipt54FzModal.tsx — Интерактивное модальное окно фискализации 54-ФЗ (ФФД 1.2),
 * раздельной оплаты, чеков возврата прихода, коррекционных чеков и справок для налогового вычета (КНД 1151156).
 *
 * Safe AST Monolith Decomposition: Clean orchestrator (<220 lines).
 */

import React from "react";
import { FiscalHeaderAndTabs } from "./modal/fiscal/FiscalHeaderAndTabs";
import { FiscalPaymentTab } from "./modal/fiscal/FiscalPaymentTab";
import { FiscalRefundTab } from "./modal/fiscal/FiscalRefundTab";
import { FiscalCorrectionTab } from "./modal/fiscal/FiscalCorrectionTab";
import { FiscalOneCTab } from "./modal/fiscal/FiscalOneCTab";
import { FiscalActTab } from "./modal/fiscal/FiscalActTab";
import { FiscalCertificateTab } from "./modal/fiscal/FiscalCertificateTab";
import { FiscalPreviewTab } from "./modal/fiscal/FiscalPreviewTab";
import { FiscalReceiptFooter } from "./modal/fiscal/FiscalReceiptFooter";
import { RetailProductsModal } from "../billing/RetailProductsModal";
import { useFiscalReceipt54FzLogic } from "./modal/fiscal/useFiscalReceipt54FzLogic";
import type { FiscalReceipt54FzModalProps } from "./modal/fiscal/fiscalModalTypes";

export * from "./modal/fiscal/fiscalModalTypes";
export * from "./modal/fiscal/fiscalModalRefundLogic";

export const FiscalReceipt54FzModal: React.FC<FiscalReceipt54FzModalProps> = (props) => {
	const { isOpen, onClose, patientName = "Пациент" } = props;

	const logic = useFiscalReceipt54FzLogic(props);
	const { itemsHook, tenderHook, auxHook } = logic;

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="fiscal-receipt-modal-title"
		>
			<div className="bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
				{/* Header & Tabs */}
				<FiscalHeaderAndTabs
					activeTab={logic.activeTab}
					setActiveTab={logic.setActiveTab}
					onClose={onClose}
					patientDebtRub={props.patientDebtRub || 0}
					patientDepositRub={logic.patientDepositRub}
					totalSumRub={itemsHook.totalSumRub}
					refundTotalRub={auxHook.refundFiscalData.totalRub}
					interruptedFiscalState={logic.interruptedFiscalState}
					setInterruptedFiscalState={logic.setInterruptedFiscalState}
					isFiscalizing={logic.isFiscalizing}
					isSubmittingManualCard={logic.isSubmittingManualCard}
					handleRetryFiscalizationWithoutBalanceImpact={logic.handleRetryFiscalizationWithoutBalanceImpact}
					handleManualCardTerminalConfirm={logic.handleManualCardTerminalConfirm}
					patientName={patientName}
				/>

				{/* Scrollable Body */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{logic.activeTab === "payment" && (
						<FiscalPaymentTab
							itemsHook={itemsHook}
							tenderHook={tenderHook}
							handlePrintSalesSlip={auxHook.handlePrintSalesSlip}
							handleManualCardTerminalConfirm={logic.handleManualCardTerminalConfirm}
							isSubmittingManualCard={logic.isSubmittingManualCard}
							handleRetryFiscalizationWithoutBalanceImpact={logic.handleRetryFiscalizationWithoutBalanceImpact}
							isFiscalizing={logic.isFiscalizing}
							handleCopyActData={auxHook.handleCopyActData}
							handleCopyCertData={auxHook.handleCopyCertData}
							patientDepositRub={logic.patientDepositRub}
						/>
					)}

					{logic.activeTab === "refund" && (
						<FiscalRefundTab
							activeItems={itemsHook.activeItems}
							patientDepositRub={logic.patientDepositRub}
							refundMode={auxHook.refundMode}
							setRefundMode={auxHook.setRefundMode}
							selectedCashBoxType={tenderHook.selectedCashBoxType}
							setSelectedCashBoxType={tenderHook.setSelectedCashBoxType}
							selectedExpenseAlias={auxHook.selectedExpenseAlias}
							setSelectedExpenseAlias={auxHook.setSelectedExpenseAlias}
							isAdvanceRefund={auxHook.isAdvanceRefund}
							refundAdvanceAmountRub={auxHook.refundAdvanceAmountRub}
							setRefundAdvanceAmountRub={auxHook.setRefundAdvanceAmountRub}
							refundAdvancePurpose={auxHook.refundAdvancePurpose}
							setRefundAdvancePurpose={auxHook.setRefundAdvancePurpose}
							handleSelectAllRefundItems={auxHook.handleSelectAllRefundItems}
							handleDeselectAllRefundItems={auxHook.handleDeselectAllRefundItems}
							refundItemSelection={auxHook.refundItemSelection}
							setRefundItemSelection={auxHook.setRefundItemSelection}
							originalReceiptNumberForRefund={auxHook.originalReceiptNumberForRefund}
							setOriginalReceiptNumberForRefund={auxHook.setOriginalReceiptNumberForRefund}
							refundReason={auxHook.refundReason}
							setRefundReason={auxHook.setRefundReason}
							handleExecuteFiscalization={logic.handleExecuteFiscalization}
							isFiscalizing={logic.isFiscalizing}
							refundFiscalData={auxHook.refundFiscalData}
						/>
					)}

					{logic.activeTab === "correction" && (
						<FiscalCorrectionTab
							correctionType={auxHook.correctionType}
							setCorrectionType={auxHook.setCorrectionType}
							correctionDocDate={auxHook.correctionDocDate}
							setCorrectionDocDate={auxHook.setCorrectionDocDate}
							correctionDocNumber={auxHook.correctionDocNumber}
							setCorrectionDocNumber={auxHook.setCorrectionDocNumber}
							correctionReason={auxHook.correctionReason}
							setCorrectionReason={auxHook.setCorrectionReason}
							handleExecuteFiscalization={logic.handleExecuteFiscalization}
							isFiscalizing={logic.isFiscalizing}
							totalSumRub={itemsHook.totalSumRub}
						/>
					)}

					{logic.activeTab === "oneC" && (
						<FiscalOneCTab
							oneCDocType={auxHook.oneCDocType}
							setOneCDocType={auxHook.setOneCDocType}
							actNumber={auxHook.actNumber}
							setActNumber={auxHook.setActNumber}
							oneCDocDate={auxHook.oneCDocDate}
							setOneCDocDate={auxHook.setOneCDocDate}
							contractNumber={auxHook.contractNumber}
							setContractNumber={auxHook.setContractNumber}
							oneCClinicInn={auxHook.oneCClinicInn}
							setOneCClinicInn={auxHook.setOneCClinicInn}
							oneCClinicKpp={auxHook.oneCClinicKpp}
							setOneCClinicKpp={auxHook.setOneCClinicKpp}
							oneCPatientInn={auxHook.oneCPatientInn}
							setOneCPatientInn={auxHook.setOneCPatientInn}
							oneCPatientAddress={auxHook.oneCPatientAddress}
							setOneCPatientAddress={auxHook.setOneCPatientAddress}
							cashierFullName={props.cashierFullName || "Кассир"}
							activeItems={itemsHook.activeItems}
							totalSumRub={itemsHook.totalSumRub}
							totalKopecks={itemsHook.totalKopecks}
							oneCXmlPreview={auxHook.oneCXmlPreview}
						/>
					)}

					{logic.activeTab === "act" && (
						<FiscalActTab
							actNumber={auxHook.actNumber}
							setActNumber={auxHook.setActNumber}
							contractNumber={auxHook.contractNumber}
							setContractNumber={auxHook.setContractNumber}
							cashierFullName={props.cashierFullName || "Кассир"}
							clinicName={props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
							patientName={patientName}
							customerContact={tenderHook.customerContact.trim() || props.patientPhone || patientName}
							activeItems={itemsHook.activeItems}
							totalSumRub={itemsHook.totalSumRub}
							handleCopyActData={auxHook.handleCopyActData}
							handlePrintAct={auxHook.handlePrintAct}
						/>
					)}

					{logic.activeTab === "certificate" && (
						<FiscalCertificateTab
							taxDeductionBreakdown={auxHook.taxDeductionBreakdown}
							payerFullName={auxHook.payerFullName}
							setPayerFullName={auxHook.setPayerFullName}
							payerInn={auxHook.payerInn}
							setPayerInn={auxHook.setPayerInn}
							payerRelationship={auxHook.payerRelationship}
							setPayerRelationship={auxHook.setPayerRelationship}
							taxYear={auxHook.taxYear}
							setTaxYear={auxHook.setTaxYear}
							handleCopyCertData={auxHook.handleCopyCertData}
							handlePrintCertificate={auxHook.handlePrintTaxCertificate}
						/>
					)}

					{logic.activeTab === "preview" && (
						<FiscalPreviewTab fiscalReceipt={auxHook.fiscalReceipt} />
					)}
				</div>

				{/* Footer */}
				<FiscalReceiptFooter
					activeTab={logic.activeTab}
					totalSumRub={itemsHook.totalSumRub}
					remainingRub={tenderHook.remainingRub}
					allocation={tenderHook.allocation}
					isFiscalizing={logic.isFiscalizing}
					onClose={onClose}
					handlePrintSalesSlip={auxHook.handlePrintSalesSlip}
					handleExecuteFiscalization={logic.handleExecuteFiscalization}
					oneCXmlPreview={auxHook.oneCXmlPreview}
					oneCDocType={auxHook.oneCDocType}
					actNumber={auxHook.actNumber}
					oneCDocDate={auxHook.oneCDocDate}
					clinicName={props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					oneCClinicInn={auxHook.oneCClinicInn}
					oneCClinicKpp={auxHook.oneCClinicKpp}
					patientName={patientName}
					contractNumber={auxHook.contractNumber}
					activeItems={itemsHook.activeItems}
					patientId={props.patientId}
					customerContact={tenderHook.customerContact}
					patientPhone={props.patientPhone}
					oneCPatientAddress={auxHook.oneCPatientAddress}
					cashierFullName={props.cashierFullName || "Кассир"}
					handleCopyActData={auxHook.handleCopyActData}
					handleCopyCertData={auxHook.handleCopyCertData}
					handlePrintAct={auxHook.handlePrintAct}
					handlePrintCertificate={auxHook.handlePrintTaxCertificate}
					refundFiscalData={auxHook.refundFiscalData}
					fiscalReceipt={auxHook.fiscalReceipt}
				/>
			</div>

			{/* Reception Retail Showcase Modal */}
			<RetailProductsModal
				isOpen={itemsHook.isRetailModalOpen}
				onClose={() => itemsHook.setIsRetailModalOpen(false)}
				onAddProduct={itemsHook.handleAddRetailProduct}
				patientName={patientName}
			/>
		</div>
	);
};

export { FiscalReceipt54FzModal as FiscalReceiptModal };
export default FiscalReceipt54FzModal;
