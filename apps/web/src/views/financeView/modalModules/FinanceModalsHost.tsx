import type React from "react";
import { lazy, Suspense } from "react";
import { FinanceCashboxModal } from "../../../components/finance/FinanceCashboxModal";
import { FinanceInvoicesModal } from "../../../components/finance/FinanceInvoicesModal";
import { PaymentModal } from "../../../components/finance/PaymentModal";
import { QuickExpenseModal } from "../../../components/finance/QuickExpenseModal";
import { FinancePatientModalsSubhost } from "./FinancePatientModalsSubhost";

const ManagerialPnlDashboardModal = lazy(() =>
	import("../../../components/finance/pnl/ManagerialPnlDashboardModal").then(
		(m) => ({ default: m.ManagerialPnlDashboardModal }),
	),
);

export interface FinanceModalsHostProps {
	readonly s: any;
	readonly isDoctorPayrollOpen?: boolean;
	readonly onCloseDoctorPayroll?: () => void;
}

export function FinanceModalsHost({
	s,
	isDoctorPayrollOpen,
	onCloseDoctorPayroll,
}: FinanceModalsHostProps): React.JSX.Element {
	const totalBill =
		(s.effectiveBillingSummary?.totalDueRub ?? 0) > 0
			? (s.effectiveBillingSummary?.totalDueRub ?? 0)
			: Number(s.paymentAmount) > 0
				? Number(s.paymentAmount)
				: 4500;
	const docPat = s.documentPatient;
	const effPat = s.effectivePatient;
	const clinic = s.dashboard?.clinicSettings;
	const clinicName = clinic?.name || "Стоматология ДЕНТЕ Премиум";
	const depositRub =
		docPat?.balanceRub && docPat.balanceRub > 0 ? docPat.balanceRub : 0;
	const effDepositRub =
		typeof effPat?.depositRub === "number" ? effPat.depositRub : 0;

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
					if (
						typeof window !== "undefined" &&
						window.location.hash.toLowerCase().includes("invoices")
					) {
						window.location.hash = "finance";
					}
				}}
				patientId={docPat?.id}
				patientName={docPat?.fullName}
			/>

			<FinanceCashboxModal
				isOpen={s.isCashboxOpen}
				onClose={() => s.setIsCashboxOpen(false)}
				isShiftOpen={s.isShiftOpen}
				cashierName={s.paymentFiscalCashierName || "Врач-стоматолог / Кассир"}
				clinicName={clinicName}
				clinicInn={clinic?.inn}
				patientId={docPat?.id}
				patientName={docPat?.fullName}
				patientPhone={docPat?.phone ?? undefined}
				patientDepositRub={depositRub}
				onPaymentComplete={() => {
					void s.loadDashboard?.();
					s.setIsCashboxOpen(false);
				}}
			/>

			{s.isQuickExpenseOpen && (
				<QuickExpenseModal
					isOpen={s.isQuickExpenseOpen}
					onClose={() => s.setIsQuickExpenseOpen(false)}
					onSuccess={() => void s.loadDashboard?.()}
				/>
			)}

			{s.isSplitPaymentOpen && (
				<PaymentModal
					isOpen={s.isSplitPaymentOpen}
					onClose={() => s.setIsSplitPaymentOpen(false)}
					amountRub={totalBill}
					patientId={effPat?.id}
					patientName={effPat?.fullName}
					patientPhone={effPat?.phone ?? undefined}
					patientDepositRub={effDepositRub}
					patientFamilyBalanceRub={effPat?.familyBalanceRub ?? 0}
					cashierName={s.paymentFiscalCashierName || undefined}
					defaultMethod="split"
					onSuccess={() => {
						void s.loadDashboard?.();
						s.setIsSplitPaymentOpen(false);
					}}
				/>
			)}

			<FinancePatientModalsSubhost
				s={s}
				isDoctorPayrollOpen={isDoctorPayrollOpen}
				onCloseDoctorPayroll={onCloseDoctorPayroll}
			/>
		</>
	);
}

export default FinanceModalsHost;
