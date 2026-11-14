import type React from "react";
import { useState } from "react";
import { CashRegisterStudioModal } from "../../components/cashbox/CashRegisterStudioModal";
import { LoyaltyStudioModal } from "../../components/loyalty/LoyaltyStudioModal";
import { showToast } from "../../components/GlobalToast";
import { CashboxQuickCard } from "./CashboxQuickCard";
import type { FinanceViewState } from "./useFinanceView";

export interface FinanceCashboxSectionProps {
	readonly s: FinanceViewState;
}

export function FinanceCashboxSection({ s }: FinanceCashboxSectionProps): React.JSX.Element {
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [showManualForm, setShowManualForm] = useState(false);

	const patient = s.effectivePatient ?? s.documentPatient ?? s.activePatient ?? s.dashboard?.patients?.[0] ?? null;
	const summaryAmount = Number(s.paymentAmount) > 0 ? Number(s.paymentAmount) : (s.effectiveBillingSummary?.totalDueRub ?? 0);
	const patientName: string | null = patient?.fullName ?? null;

	const openPaymentModal = () => {
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
				<LoyaltyStudioModal
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

			{isPaymentModalOpen && (
				<CashRegisterStudioModal
					isOpen={isPaymentModalOpen}
					mode="checkout"
					initialTab="checkout"
					containerTestId="cash-register-checkout-modal"
					submitButtonTestId="btn-confirm-checkout-payment"
					title="Касса · Оплата приёма"
					totalDueRub={summaryAmount}
					amountRub={summaryAmount}
					amountKopecks={Math.round(summaryAmount * 100)}
					defaultMethod="card"
					patientId={patient?.id || undefined}
					patientName={patientName || undefined}
					patientPhone={patient?.phone || undefined}
					patientDepositRub={patient?.depositRub ?? 0}
					patientFamilyBalanceRub={patient?.familyBalanceRub ?? 0}
					cashierFullName={s.paymentFiscalCashierName || undefined}
					clinicLegalName={s.dashboard?.clinicSettings?.name || undefined}
					onClose={() => setIsPaymentModalOpen(false)}
					onSuccess={() => { setIsPaymentModalOpen(false); void s.loadDashboard?.(); }}
					onPaymentComplete={() => { setIsPaymentModalOpen(false); void s.loadDashboard?.(); }}
				/>
			)}
		</div>
	);
}
