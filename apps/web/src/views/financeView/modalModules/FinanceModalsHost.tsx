import React, { lazy, Suspense } from "react";
import { FinanceInvoicesModal } from "../../../components/finance/FinanceInvoicesModal";
import { FinanceCashboxModal } from "../../../components/finance/FinanceCashboxModal";
import { PatientBillingModal } from "../../../components/finance/PatientBillingModal";
import { QuickExpenseModal } from "../../../components/finance/QuickExpenseModal";
import { TaxDeductionCertificateModal } from "../../../components/finance/TaxDeductionCertificateModal";
import { FamilyCombinedBillingModal } from "../../../components/finance/FamilyCombinedBillingModal";
import { FastCheckoutModal } from "../../../components/finance/FastCheckoutModal";
import { DoctorPayrollModal } from "../../../components/payroll/DoctorPayrollModal";

const ManagerialPnlDashboardModal = lazy(() =>
	import("../../../components/finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);

export interface FinanceModalsHostProps {
	readonly s: any;
	readonly isDoctorPayrollOpen?: boolean;
	readonly onCloseDoctorPayroll?: () => void;
}

export function FinanceModalsHost({ s, isDoctorPayrollOpen, onCloseDoctorPayroll }: FinanceModalsHostProps): React.JSX.Element {
	return (
		<>
			{s.isPnlOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal isOpen={s.isPnlOpen} onClose={() => s.setIsPnlOpen(false)} />
				</Suspense>
			)}

			<FinanceInvoicesModal
				isOpen={s.isInvoicesOpen}
				onClose={() => {
					s.setIsInvoicesOpen(false);
					if (typeof window !== "undefined" && window.location.hash.toLowerCase().includes("invoices")) {
						window.location.hash = "finance";
					}
				}}
				patientId={s.documentPatient?.id}
				patientName={s.documentPatient?.fullName}
			/>

			<FinanceCashboxModal
				isOpen={s.isCashboxOpen}
				onClose={() => s.setIsCashboxOpen(false)}
				isShiftOpen={s.isShiftOpen}
				cashierName={s.paymentFiscalCashierName || "Врач-стоматолог / Кассир"}
				clinicName={s.dashboard?.clinicSettings?.name || "Стоматология ДЕНТЕ Премиум"}
				clinicInn={s.dashboard?.clinicSettings?.inn}
				patientId={s.documentPatient?.id}
				patientName={s.documentPatient?.fullName}
				patientPhone={s.documentPatient?.phone ?? undefined}
				patientDepositRub={s.documentPatient && typeof s.documentPatient.balanceRub === "number" && s.documentPatient.balanceRub > 0 ? s.documentPatient.balanceRub : 0}
				onPaymentComplete={() => { void s.loadDashboard?.(); s.setIsCashboxOpen(false); }}
			/>

			{s.isBillingActOpen && (
				<PatientBillingModal
					isOpen={s.isBillingActOpen}
					onClose={() => s.setIsBillingActOpen(false)}
					patient={s.documentPatient ? {
						id: s.documentPatient.id, fullName: s.documentPatient.fullName, birthDate: s.documentPatient.birthDate,
						phone: s.documentPatient.phone, address: s.documentPatient.address, medicalCardNumber: s.documentPatient.medicalCardNumber,
						depositRub: s.documentPatient.depositRub, familyBalanceRub: s.documentPatient.familyBalanceRub,
					} : null}
					patientDepositRub={s.documentPatient?.depositRub ?? 0}
					patientFamilyBalanceRub={s.documentPatient?.familyBalanceRub ?? 0}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
				/>
			)}

			{s.isQuickExpenseOpen && (
				<QuickExpenseModal isOpen={s.isQuickExpenseOpen} onClose={() => s.setIsQuickExpenseOpen(false)} onSuccess={() => void s.loadDashboard?.()} />
			)}

			{s.isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={s.isTaxModalOpen}
					onClose={() => s.setIsTaxModalOpen(false)}
					patientName={s.activePatient?.fullName || s.documentPatient?.fullName || ""}
					patientBirthDate={s.activePatient?.birthDate || s.documentPatient?.birthDate || undefined}
					patientInn={s.activePatient?.inn || s.documentPatient?.inn || ""}
					patientSnils={s.activePatient?.snils || s.documentPatient?.snils || ""}
					patientId={s.activePatient?.id || s.documentPatient?.id}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
					payments={s.taxDeductionPayments}
				/>
			)}

			{s.isTimesheetT13Open && (
				<DoctorPayrollModal isOpen={s.isTimesheetT13Open} onClose={() => s.setIsTimesheetT13Open(false)} clinicName={s.dashboard?.clinicSettings?.name || s.dashboard?.clinicName} />
			)}

			{s.isFamilyBillingOpen && (
				<FamilyCombinedBillingModal
					isOpen={s.isFamilyBillingOpen}
					onClose={() => s.setIsFamilyBillingOpen(false)}
					familyGroupId={s.documentPatient?.familyGroupId}
					familyGroupName={s.documentPatient?.familyGroupName || "Семейная группа"}
					availableFamilyWalletRub={s.documentPatient?.familyBalanceRub ?? 0}
					initialPayer={{ payerId: s.documentPatient?.id || "", payerFullName: s.documentPatient?.fullName || "Ответственный плательщик" }}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
					onCheckoutComplete={() => { void s.loadDashboard?.(); s.setIsFamilyBillingOpen(false); }}
				/>
			)}

			{s.isSplitPaymentOpen && (
				<FastCheckoutModal
					isOpen={s.isSplitPaymentOpen}
					onClose={() => s.setIsSplitPaymentOpen(false)}
					totalBillRub={(s.effectiveBillingSummary?.totalDueRub ?? 0) > 0 ? s.effectiveBillingSummary!.totalDueRub : Number(s.paymentAmount) > 0 ? Number(s.paymentAmount) : 4500}
					patientId={s.effectivePatient?.id}
					patientName={s.effectivePatient?.fullName}
					patientPhone={s.effectivePatient?.phone ?? undefined}
					patientDepositRub={s.effectivePatient && typeof s.effectivePatient.depositRub === "number" ? s.effectivePatient.depositRub : 0}
					patientFamilyBalanceRub={s.effectivePatient?.familyBalanceRub ?? 0}
					cashierFullName={s.paymentFiscalCashierName || undefined}
					initialSimpleCashierMode={false}
					onPaymentComplete={() => { void s.loadDashboard?.(); s.setIsSplitPaymentOpen(false); }}
				/>
			)}

			{isDoctorPayrollOpen && onCloseDoctorPayroll && (
				<DoctorPayrollModal
					isOpen={isDoctorPayrollOpen}
					onClose={onCloseDoctorPayroll}
					clinicName={s.dashboard?.clinicSettings?.name}
				/>
			)}
		</>
	);
}
