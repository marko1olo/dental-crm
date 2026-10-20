import React from "react";
import { PaymentCapture } from "../../PaymentCapture";

export interface FinanceCashboxSectionProps {
	readonly s: any;
}

export function FinanceCashboxSection({ s }: FinanceCashboxSectionProps): React.JSX.Element {
	return (
		<div className="finance-cashbox-container pb-28 sm:pb-24">
			<PaymentCapture
				{...s.remainingDebtProp}
				amount={s.paymentAmount}
				feedback={s.paymentFeedback}
				fiscalCashierName={s.paymentFiscalCashierName}
				fiscalFd={s.paymentFiscalFd}
				fiscalFn={s.paymentFiscalFn}
				fiscalFpd={s.paymentFiscalFpd}
				fiscalReceiptIssuedAt={s.paymentFiscalReceiptIssuedAt}
				fiscalReceiptNumber={s.paymentFiscalReceiptNumber}
				fiscalReceiptUrl={s.paymentFiscalReceiptUrl}
				isSaving={s.isPaymentSaving}
				method={s.paymentMethod}
				methodLabels={s.paymentMethodLabels}
				onAmountChange={s.setPaymentAmount}
				onFiscalCashierNameChange={s.setPaymentFiscalCashierName}
				onFiscalFdChange={s.setPaymentFiscalFd}
				onFiscalFnChange={s.setPaymentFiscalFn}
				onFiscalFpdChange={s.setPaymentFiscalFpd}
				onFiscalReceiptIssuedAtChange={s.setPaymentFiscalReceiptIssuedAt}
				onFiscalReceiptNumberChange={s.setPaymentFiscalReceiptNumber}
				onFiscalReceiptUrlChange={s.setPaymentFiscalReceiptUrl}
				onMethodChange={s.setPaymentMethod}
				onPayerBirthDateChange={s.setPaymentPayerBirthDate}
				onPayerFullNameChange={s.setPaymentPayerFullName}
				onPayerIdentityDocumentChange={s.setPaymentPayerIdentityDocument}
				onPayerInnChange={s.setPaymentPayerInn}
				onPayerRelationshipChange={s.setPaymentPayerRelationship}
				onSubmit={s.onRecordPayment}
				onTaxDeductionCodeChange={s.setPaymentTaxDeductionCode}
				patientContextMessage={s.effectivePatient ? "" : s.paymentPatientContextMessage}
				patientContextReady={Boolean(s.effectivePatient)}
				patientDefaults={{
					birthDate: s.effectivePatient?.birthDate ?? null,
					fullName: s.effectivePatient?.fullName ?? null,
					identityDocument: s.effectivePatient?.administrativeProfile?.identityDocument ?? null,
					taxpayerInn: s.effectivePatient?.administrativeProfile?.taxpayerInn ?? null,
				}}
				patientId={s.effectivePatient?.id ?? null}
				payerBirthDate={s.paymentPayerBirthDate}
				payerFullName={s.paymentPayerFullName}
				payerIdentityDocument={s.paymentPayerIdentityDocument}
				payerInn={s.paymentPayerInn}
				payerRelationship={s.paymentPayerRelationship}
				taxDeductionCode={s.paymentTaxDeductionCode}
			/>
		</div>
	);
}
