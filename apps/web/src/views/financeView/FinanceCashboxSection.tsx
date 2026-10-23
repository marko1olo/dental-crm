import type React from "react";
import { useState } from "react";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { PaymentCapture } from "../../PaymentCapture";
import { PaymentModal } from "../../components/billing/PaymentModal";
import { LoyaltyProgramModal } from "../../components/loyalty/program/LoyaltyProgramModal";
import { showToast } from "../../components/GlobalToast";

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
			<div className="payment-quick-card mb-4 p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="min-w-0">
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
							Быстрый расчёт пациента
						</div>
						<div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--ink)] my-0.5">
							{summaryAmount.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-xs text-[var(--muted)] truncate">
							{patientName ? (
								<>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></>
							) : (
								"Пациент не выбран — выберите карточку в картотеке"
							)}
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0 flex-nowrap">
						<button
							type="button"
							onClick={() => {
								if (!patient?.id) {
									showToast("Бонусы и сертификаты доступны для выбранного пациента.", "info");
									return;
								}
								setIsLoyaltyModalOpen(true);
							}}
							className="min-h-[44px] h-11 px-3 sm:px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
							data-testid="btn-open-cashbox-loyalty-modal"
							title="Списание бонусов и сертификаты пациента"
						>
							<Award size={16} className="text-[var(--teal)]" />
							<span className="hidden md:inline">Бонусы и сертификаты</span>
							<span className="md:hidden">Бонусы</span>
						</button>
						<button
							type="button"
							onClick={openPaymentModal}
							className="primary-button min-h-[44px] h-11 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center flex items-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
							data-testid="btn-open-cashbox-payment-modal"
							title="Принять оплату от пациента"
						>
							<span>Принять оплату</span>
						</button>
						<button
							type="button"
							onClick={() => setShowManualForm((prev) => !prev)}
							className="min-h-[44px] h-11 w-11 px-0 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
							title="Показать / скрыть ручные параметры"
						>
							{showManualForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						</button>
					</div>
				</div>
			</div>

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
					onSuccess={() => {
						setIsPaymentModalOpen(false);
						void s.loadDashboard?.();
					}}
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
