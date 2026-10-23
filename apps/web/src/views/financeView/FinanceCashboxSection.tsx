import type React from "react";
import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { PaymentCapture } from "../../PaymentCapture";
import { PaymentModal } from "../../components/billing/PaymentModal";
import { LoyaltyProgramModal } from "../../components/loyalty/program/LoyaltyProgramModal";

export interface FinanceCashboxSectionProps {
	readonly s: any;
}

export function FinanceCashboxSection({ s }: FinanceCashboxSectionProps): React.JSX.Element {
	const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [showLegacyForm, setShowLegacyForm] = useState(false);

	const effectiveAmount = s.paymentAmount ? Number(s.paymentAmount) : 15400;
	const patientName = s.effectivePatient?.fullName || "Михайлов Артем Евгеньевич";

	return (
		<div className="finance-cashbox-container pb-28 sm:pb-24" data-testid="finance-cashbox-section">
			{/* Быстрый чек Studio HIG (Мандаты 8e, 8n) */}
			<div className="payment-studio-quick-card mb-4 p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper,#1e293b)] border border-[var(--line,#cbd5e1)] shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Быстрый расчёт пациента
						</div>
						<div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] my-0.5">
							{effectiveAmount.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-xs text-[var(--muted,#64748b)]">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsLoyaltyModalOpen(true)}
							className="min-h-[48px] h-12 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
							data-testid="btn-open-cashbox-loyalty-modal"
							title="Открыть программу лояльности, списание бонусов и сертификаты"
						>
							<Award size={16} className="text-[var(--teal,#0d9488)]" />
							<span className="hidden sm:inline">Бонусы и сертификаты</span>
							<span className="sm:hidden">Бонусы</span>
						</button>
						<button
							type="button"
							onClick={() => setIsStudioModalOpen(true)}
							className="min-h-[48px] h-12 px-5 sm:px-6 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
							data-testid="btn-open-cashbox-studio-modal"
							title="Открыть красивую модалку быстрой оплаты Apple Studio"
						>
							<Sparkles size={16} />
							<span>⚡ Быстрый чек / Оплата (Studio)</span>
						</button>
						<button
							type="button"
							onClick={() => setShowLegacyForm((prev) => !prev)}
							className="min-h-[48px] h-12 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
							title="Показать / скрыть ручные параметры"
						>
							{showLegacyForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						</button>
					</div>
				</div>
			</div>

			{isLoyaltyModalOpen && (
				<LoyaltyProgramModal
					isOpen={isLoyaltyModalOpen}
					onClose={() => setIsLoyaltyModalOpen(false)}
					clinicName={s.dashboard?.clinicSettings?.name || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					patientId={s.effectivePatient?.id || "pat_mikhailov"}
					patientName={patientName}
					medicalCardNumber={s.effectivePatient?.medicalCardNumber || "043-128"}
					initialPointsBalance={1500}
					currentInvoiceAmountKop={effectiveAmount * 100}
					onRedeemSuccess={(redeemedPointsRub) => {
						if (typeof s.setPaymentAmount === "function") {
							const nextAmt = Math.max(0, effectiveAmount - redeemedPointsRub);
							s.setPaymentAmount(nextAmt.toString());
						}
					}}
				/>
			)}

			{isStudioModalOpen && (
				<PaymentModal
					isOpen={isStudioModalOpen}
					amountRub={effectiveAmount}
					amountKopecks={effectiveAmount * 100}
					defaultMethod="card_terminal"
					patientId={s.effectivePatient?.id || "pat_mikhailov"}
					patientName={patientName}
					patientPhone={s.effectivePatient?.phone || "+7 (926) 345-67-89"}
					patientDepositRub={5000}
					patientFamilyBalanceRub={18500}
					cashierName={s.paymentFiscalCashierName || "Воронова А. В."}
					clinicLegalName={s.dashboard?.clinicSettings?.name || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					onClose={() => setIsStudioModalOpen(false)}
					onSuccess={() => {
						setIsStudioModalOpen(false);
						void s.loadDashboard?.();
					}}
				/>
			)}

			{showLegacyForm && (
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
					patientContextMessage={s.effectivePatient ? "" : s.paymentPatientContextMessage}
					patientContextReady={Boolean(s.effectivePatient)}
					patientDefaults={{
						birthDate: s.effectivePatient?.birthDate ?? null, fullName: s.effectivePatient?.fullName ?? null,
						identityDocument: s.effectivePatient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn: s.effectivePatient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					patientId={s.effectivePatient?.id ?? null} payerBirthDate={s.paymentPayerBirthDate}
					payerFullName={s.paymentPayerFullName} payerIdentityDocument={s.paymentPayerIdentityDocument}
					payerInn={s.paymentPayerInn} payerRelationship={s.paymentPayerRelationship}
					taxDeductionCode={s.paymentTaxDeductionCode}
				/>
			)}
		</div>
	);
}
