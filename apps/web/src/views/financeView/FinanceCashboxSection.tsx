import type React from "react";
import { useState } from "react";
import { PaymentCapture } from "../../PaymentCapture";
import { PaymentModal } from "../../components/billing/PaymentModal";
import { LoyaltyProgramModal } from "../../components/loyalty/program/LoyaltyProgramModal";
import { showToast } from "../../components/GlobalToast";
import { CashboxQuickCard } from "./CashboxQuickCard";

export interface FinanceCashboxSectionProps {
	readonly s: any;
}

export function FinanceCashboxSection({ s }: FinanceCashboxSectionProps): React.JSX.Element {
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [showManualForm, setShowManualForm] = useState(false);

	const patient = s.effectivePatient ?? null;
	const summaryAmount = Number(s.paymentAmount) > 0 ? Number(s.paymentAmount) : (s.effectiveBillingSummary?.totalDueRub ?? 0);
	const patientName: string | null = patient?.fullName ?? null;

	const openPaymentModal = () => {
		if (!patient?.id) {
			showToast("Выберите пациента в картотеке — оплата проводится на конкретного пациента.", "warning");
			return;
		}
		if (!(summaryAmount > 0)) {
			showToast("Укажите сумму к оплате в форме ниже.", "info");
			setShowManualForm(true);
			s.focusPaymentCapture?.();
			return;
		}
		setIsPaymentModalOpen(true);
	};

	return (
		<div className="finance-cashbox-container pb-28 sm:pb-24" data-testid="finance-cashbox-section">
			<CashboxQuickCard
				summaryAmount={summaryAmount}
				patientName={patientName}
				hasPatient={Boolean(patient?.id)}
				showManualForm={showManualForm}
				onOpenLoyaltyModal={() => {
					if (!patient?.id) {
						showToast("Бонусы и сертификаты доступны для выбранного пациента.", "info");
						return;
					}
					setIsLoyaltyModalOpen(true);
				}}
				onOpenPaymentModal={openPaymentModal}
				onToggleManualForm={() => setShowManualForm((prev) => !prev)}
			/>

			{isLoyaltyModalOpen && patient?.id && (
				<LoyaltyProgramModal
					isOpen={isLoyaltyModalOpen}
					onClose={() => setIsLoyaltyModalOpen(false)}
					clinicName={s.dashboard?.clinicSettings?.name}
					patientId={patient.id}
					patientName={patientName ?? ""}
					initialPointsBalance={patient.loyaltyPointsBalance}
					currentInvoiceAmountKop={Math.round(summaryAmount * 100)}
					onRedeemSuccess={(redeemedPointsRub: number) => {
						if (typeof s.setPaymentAmount === "function" && summaryAmount > 0) {
							const nextAmt = Math.max(0, summaryAmount - redeemedPointsRub);
							s.setPaymentAmount(nextAmt.toString());
						}
					}}
				/>
			)}

			{isPaymentModalOpen && patient?.id && (
				<PaymentModal
					isOpen={isPaymentModalOpen}
					amountRub={summaryAmount}
					amountKopecks={Math.round(summaryAmount * 100)}
					defaultMethod="card_terminal"
					patientId={patient.id}
					patientName={patientName ?? ""}
					patientPhone={patient.phone || undefined}
					patientDepositRub={patient.depositRub ?? 0}
					patientFamilyBalanceRub={patient.familyBalanceRub ?? 0}
					cashierName={s.paymentFiscalCashierName || undefined}
					clinicLegalName={s.dashboard?.clinicSettings?.name || undefined}
					onClose={() => setIsPaymentModalOpen(false)}
					onSuccess={() => { setIsPaymentModalOpen(false); void s.loadDashboard?.(); }}
				/>
			)}

			{showManualForm && (
				<PaymentCapture
					{...s.remainingDebtProp} amount={s.paymentAmount} feedback={s.paymentFeedback}
					fiscalCashierName={s.paymentFiscalCashierName} fiscalFd={s.paymentFiscalFd} fiscalFn={s.paymentFiscalFn}
					fiscalFpd={s.paymentFiscalFpd} fiscalReceiptIssuedAt={s.paymentFiscalReceiptIssuedAt}
					fiscalReceiptNumber={s.paymentFiscalReceiptNumber} fiscalReceiptUrl={s.paymentFiscalReceiptUrl}
					isSaving={s.isPaymentSaving} method={s.paymentMethod} methodLabels={s.paymentMethodLabels}
					onAmountChange={s.setPaymentAmount} onFiscalCashierNameChange={s.setPaymentFiscalCashierName}
					onFiscalFdChange={s.setPaymentFiscalFd} onFiscalFnChange={s.setPaymentFiscalFn}
					onFiscalFpdChange={s.setPaymentFiscalFpd} onFiscalReceiptIssuedAtChange={s.setPaymentFiscalReceiptIssuedAt}
					onFiscalReceiptNumberChange={s.setPaymentFiscalReceiptNumber} onFiscalReceiptUrlChange={s.setPaymentFiscalReceiptUrl}
					onMethodChange={s.setPaymentMethod} onPayerBirthDateChange={s.setPaymentPayerBirthDate}
					onPayerFullNameChange={s.setPaymentPayerFullName} onPayerIdentityDocumentChange={s.setPaymentPayerIdentityDocument}
					onPayerInnChange={s.setPaymentPayerInn} onPayerRelationshipChange={s.setPaymentPayerRelationship}
					onSubmit={s.onRecordPayment} onTaxDeductionCodeChange={s.setPaymentTaxDeductionCode}
					patientContextMessage={patient ? "" : s.paymentPatientContextMessage}
					patientContextReady={Boolean(patient)}
					patientDefaults={{
						birthDate: patient?.birthDate ?? null, fullName: patientName ?? null,
						identityDocument: patient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn: patient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					patientId={patient?.id ?? null} payerBirthDate={s.paymentPayerBirthDate}
					payerFullName={s.paymentPayerFullName} payerIdentityDocument={s.paymentPayerIdentityDocument}
					payerInn={s.paymentPayerInn} payerRelationship={s.paymentPayerRelationship}
					taxDeductionCode={s.paymentTaxDeductionCode}
				/>
			)}
		</div>
	);
}
