import type React from "react";
import { useState } from "react";
import { rublesToKopecks } from "@dental/shared";
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

	const patient = s.effectivePatient ?? s.documentPatient ?? s.activePatient ?? null;
	const patientRecord = patient as Record<string, unknown> | null;
	const patientDepositRub = typeof patientRecord?.depositRub === "number" ? patientRecord.depositRub : 0;
	const patientFamilyBalanceRub = typeof patientRecord?.familyBalanceRub === "number" ? patientRecord.familyBalanceRub : 0;
	const patientLoyaltyPoints = typeof patientRecord?.loyaltyPointsBalance === "number" ? patientRecord.loyaltyPointsBalance : 0;
	const summaryAmount = Number(s.paymentAmount) > 0 ? Number(s.paymentAmount) : (s.effectiveBillingSummary?.totalDueRub ?? 0);
	const patientName: string | null = patient?.fullName ?? null;

	const openPaymentModal = () => {
		setIsPaymentModalOpen(true);
	};

	return (
		<div className="finance-cashbox-container pb-2" data-testid="cash-shift-panel-container">
			<CashboxQuickCard
				summaryAmount={summaryAmount}
				patientName={patientName}
				hasPatient={Boolean(patient?.id)}
				onOpenLoyaltyModal={() => {
					if (!patient?.id) {
						showToast("Бонусы и сертификаты доступны для выбранного пациента.", "info");
						return;
					}
					setIsLoyaltyModalOpen(true);
				}}
				onOpenPaymentModal={openPaymentModal}
			/>

			{isLoyaltyModalOpen && patient?.id && (
				<LoyaltyStudioModal
					key={patient.id}
					isOpen={isLoyaltyModalOpen}
					onClose={() => setIsLoyaltyModalOpen(false)}
					clinicName={s.dashboard?.clinicSettings?.profile?.clinicName ?? s.dashboard?.clinicName}
					patientId={patient.id}
					patientName={patientName ?? ""}
					initialPointsBalance={patientLoyaltyPoints}
					currentInvoiceAmountKop={rublesToKopecks(summaryAmount)}
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
					key={patient?.id || "cashbox-section"}
					isOpen={isPaymentModalOpen}
					mode="checkout"
					initialTab="checkout"
					containerTestId="cash-register-checkout-modal"
					submitButtonTestId="btn-confirm-checkout-payment"
					title="Касса · Оплата приёма"
					totalDueRub={summaryAmount}
					amountRub={summaryAmount}
					amountKopecks={rublesToKopecks(summaryAmount)}
					defaultMethod="card"
					patientId={patient?.id || undefined}
					patientName={patientName || undefined}
					patientPhone={patient?.phone || undefined}
					patientDepositRub={patientDepositRub}
					patientFamilyBalanceRub={patientFamilyBalanceRub}
					cashierFullName={s.paymentFiscalCashierName || undefined}
					clinicLegalName={s.dashboard?.clinicSettings?.profile?.legalName ?? s.dashboard?.clinicSettings?.profile?.clinicName ?? s.dashboard?.clinicName ?? undefined}
					onClose={() => setIsPaymentModalOpen(false)}
					onSuccess={() => { setIsPaymentModalOpen(false); void s.loadDashboard?.(); }}
					onPaymentComplete={() => { setIsPaymentModalOpen(false); void s.loadDashboard?.(); }}
				/>
			)}
		</div>
	);
}
