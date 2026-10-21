/**
 * FiscalReceiptModal.tsx — Каноническое модальное окно кассы, фискализации и чеков.
 * Clean Orchestrator Facade (<100 lines) in strict compliance with Mandate 8b.
 */

import type React from "react";
import { RetailProductsModal } from "../billing/RetailProductsModal";
import { FiscalBodyTabs } from "./modal/fiscal/FiscalBodyTabs";
import { FiscalHeaderAndTabs } from "./modal/fiscal/FiscalHeaderAndTabs";
import { FiscalReceiptFooter } from "./modal/fiscal/FiscalReceiptFooter";
import type { FiscalReceiptModalProps } from "./modal/fiscal/fiscalModalTypes";
import { useFiscalReceipt54FzLogic } from "./modal/fiscal/useFiscalReceipt54FzLogic";

export * from "./modal/fiscal/fiscalModalRefundLogic";
export * from "./modal/fiscal/fiscalModalTypes";

export const FiscalReceiptModal: React.FC<FiscalReceiptModalProps> = (
	props,
) => {
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
			data-testid="fiscal-receipt-modal"
		>
			<div className="bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
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
					handleRetryFiscalizationWithoutBalanceImpact={
						logic.handleRetryFiscalizationWithoutBalanceImpact
					}
					handleManualCardTerminalConfirm={
						logic.handleManualCardTerminalConfirm
					}
					patientName={patientName}
				/>

				<FiscalBodyTabs logic={logic} props={props} patientName={patientName} />

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

			<RetailProductsModal
				isOpen={itemsHook.isRetailModalOpen}
				onClose={() => itemsHook.setIsRetailModalOpen(false)}
				onAddProduct={itemsHook.handleAddRetailProduct}
				patientName={patientName}
			/>
		</div>
	);
};

export { FiscalReceiptModal as FiscalReceipt54FzModal };
export default FiscalReceiptModal;
