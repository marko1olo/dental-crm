import React from "react";
import { useFiscalOperations } from "./hooks/useFiscalOperations";
import { PaymentCheckoutBar } from "./PaymentCheckoutBar";
import { PaymentDiscountsAndSplitSection } from "./PaymentDiscountsAndSplitSection";
import { PaymentFiscalCashierBar } from "./PaymentFiscalCashierBar";
import { PaymentQuickTenderGrid } from "./PaymentQuickTenderGrid";
import { TaxPayerDetails } from "./PaymentTaxPayerDetails";
import {
	computePaymentValidation, PaymentCaptureMethodTabs, PaymentCaptureModals,
	type PaymentCaptureProps, PaymentCaptureVoiceAiBar, type TaxDeductionCode,
	usePaymentCaptureState,
} from "./paymentCaptureModules/index";

export type { PaymentCaptureProps, TaxDeductionCode };

export function PaymentCapture(props: PaymentCaptureProps) {
	const { isOnline, pendingCount, syncQueue, isSyncing } = useFiscalOperations();
	const state = usePaymentCaptureState(props);
	const validations = computePaymentValidation({ ...props, selectedDoctorDiscount: state.selectedDoctorDiscount });
	const paymentMissingId = "payment-capture-missing";
	const taxDefaultsGuidanceId = "payment-tax-defaults-guidance";
	const effectivePatientName = props.patientDefaults?.fullName || props.payerFullName || "Пациент";

	return (
		<div className="payment-capture bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] rounded-xl p-2 sm:p-3 mb-4 pb-28 sm:pb-24" id="payment-capture">
			<PaymentFiscalCashierBar
				isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing}
				onSyncQueue={() => void syncQueue(async () => true)} fiscalCashierName={props.fiscalCashierName}
				fiscalDetailsOpen={validations.fiscalDetailsOpen} fiscalFd={props.fiscalFd} fiscalFn={props.fiscalFn}
				fiscalFpd={props.fiscalFpd} fiscalReceiptIssuedAt={props.fiscalReceiptIssuedAt}
				fiscalReceiptNumber={props.fiscalReceiptNumber} fiscalReceiptUrl={props.fiscalReceiptUrl}
				fiscalReceiptUrlInvalid={validations.fiscalReceiptUrlInvalid}
				onFiscalCashierNameChange={props.onFiscalCashierNameChange} onFiscalFdChange={props.onFiscalFdChange}
				onFiscalFnChange={props.onFiscalFnChange} onFiscalFpdChange={props.onFiscalFpdChange}
				onFiscalReceiptIssuedAtChange={props.onFiscalReceiptIssuedAtChange}
				onFiscalReceiptNumberChange={props.onFiscalReceiptNumberChange}
				onFiscalReceiptUrlChange={props.onFiscalReceiptUrlChange} paymentMissingId={paymentMissingId}
			/>

			{props.feedback ? (
				<div className="payment-capture-feedback" role="status" aria-live="polite">{props.feedback}</div>
			) : (
				<PaymentCaptureVoiceAiBar
					smartInputText={state.smartInputText} setSmartInputText={state.setSmartInputText}
					showHints={state.showHints} setShowHints={state.setShowHints}
					showSmartPreview={state.showSmartPreview} setShowSmartPreview={state.setShowSmartPreview}
					smartParsedData={state.smartParsedData} handleSmartDictation={state.handleSmartDictation}
				/>
			)}

			<PaymentQuickTenderGrid
				amount={props.amount} onAmountChange={props.onAmountChange} remainingDebt={props.remainingDebt}
				method={props.method} paymentAmountInvalid={validations.paymentAmountInvalid}
				paymentMissingId={paymentMissingId} receivedCash={state.receivedCash}
				onReceivedCashChange={state.setReceivedCash}
			/>

			<PaymentCaptureMethodTabs method={props.method} methodLabels={props.methodLabels} onMethodChange={props.onMethodChange} />

			<PaymentDiscountsAndSplitSection
				amount={props.amount} selectedDoctorDiscount={state.selectedDoctorDiscount}
				onApplyDoctorDiscount={state.applyDoctorDiscount} onApplySplit5050={state.applySplit5050Preset}
				onApplyThreeWaySplit={() => state.setIsSplitModalOpen(true)}
				onApplyDepositPlusCard={() => state.setIsSplitModalOpen(true)}
			/>

			<TaxPayerDetails
				applyPatientTaxDefaults={state.applyPatientTaxDefaults} onPayerBirthDateChange={props.onPayerBirthDateChange}
				onPayerFullNameChange={props.onPayerFullNameChange} onPayerIdentityDocumentChange={props.onPayerIdentityDocumentChange}
				onPayerInnChange={props.onPayerInnChange} onPayerRelationshipChange={props.onPayerRelationshipChange}
				onTaxDeductionCodeChange={props.onTaxDeductionCodeChange} patientDefaults={props.patientDefaults}
				patientTaxDefaultsAvailable={validations.patientTaxDefaultsAvailable} payerBirthDate={props.payerBirthDate}
				payerFullName={props.payerFullName} payerIdentityDocument={props.payerIdentityDocument}
				payerInn={props.payerInn} payerInnInvalid={validations.payerInnInvalid}
				payerRelationship={props.payerRelationship} paymentMissingId={paymentMissingId}
				taxDeductionCode={props.taxDeductionCode} taxDefaultsGuidanceId={taxDefaultsGuidanceId}
				taxPayerDetailsOpen={validations.taxPayerDetailsOpen}
			/>

			{!validations.paymentReadyToSubmit ? (
				<div className="payment-capture-missing" id={paymentMissingId} role="status" aria-live="polite">
					<strong>Чтобы принять оплату, осталось:</strong>
					<ul>{validations.paymentMissingSteps.map((step) => <li key={step}>{step}</li>)}</ul>
				</div>
			) : validations.isTaxDeductionDraft ? (
				<div className="payment-capture-tax-draft-hint px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs font-medium my-2" role="status" data-testid="payment-tax-draft-hint">
					<span className="font-bold">Налоговый вычет (черновик): </span>
					<span>Оплата не блокируется. Для формирования справки ФНС не хватает: {validations.taxDeductionMissingSteps.join(", ")} (можно заполнить позже в карточке пациента).</span>
				</div>
			) : null}

			<p className="payment-capture-safeguard text-[10px] text-[var(--muted)] my-1 block">
				Каждая оплата добавляет новую строку в историю. Ошибку закрывайте возвратом или коррекцией, не повторной записью.
			</p>

			<PaymentCheckoutBar
				amount={props.amount} remainingDebt={props.remainingDebt} paymentReadyToSubmit={validations.paymentReadyToSubmit}
				paymentMissingId={paymentMissingId} isSaving={props.isSaving} isZeroAmount={validations.isZeroAmount}
				isMoreActionsOpen={state.isMoreActionsOpen} onToggleMoreActions={() => state.setIsMoreActionsOpen((prev) => !prev)}
				onCloseMoreActions={() => state.setIsMoreActionsOpen(false)} onPrimarySubmit={() => state.handlePrimarySubmit(validations)}
				onSberPosClick={state.handleSberPosClick} onOpenSplitModal={() => state.setIsSplitModalOpen(true)}
				onManualCardTerminalSubmit={state.handleManualCardTerminalSubmit}
			/>

			<PaymentCaptureModals
				patientId={props.patientId ?? undefined} patientName={effectivePatientName} amount={props.amount}
				remainingDebt={props.remainingDebt} method={props.method} fiscalCashierName={props.fiscalCashierName}
				isCardTerminalModalOpen={state.isSberPosModalOpen} onCloseCardTerminalModal={() => state.setIsSberPosModalOpen(false)}
				isSplitModalOpen={state.isSplitModalOpen} isSplit5050Mode={state.isSplit5050Mode}
				onCloseSplitModal={() => { state.setIsSplitModalOpen(false); state.setIsSplit5050Mode(false); }}
				onAmountChange={props.onAmountChange} onMethodChange={props.onMethodChange}
				onFiscalFdChange={props.onFiscalFdChange} onFiscalFpdChange={props.onFiscalFpdChange}
			/>
		</div>
	);
}
