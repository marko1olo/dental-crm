import type React from "react";
import { lazy, Suspense } from "react";
import { rublesToKopecks } from "@dental/shared";
import { CashRegisterStudioModal } from "../../../components/cashbox/CashRegisterStudioModal";
import { FinanceInvoicesModal } from "../../../components/finance/FinanceInvoicesModal";
import { QuickExpenseModal } from "../../../components/finance/QuickExpenseModal";
import { FinancePatientModalsSubhost } from "./FinancePatientModalsSubhost";
import type { FinanceViewState } from "../useFinanceView";

function resolvePatientDepositRub(patient: unknown): number {
	if (!patient || typeof patient !== "object") return 0;
	if ("depositRub" in patient && typeof (patient as { depositRub?: unknown }).depositRub === "number") {
		return (patient as { depositRub: number }).depositRub;
	}
	if ("balanceRub" in patient && typeof (patient as { balanceRub?: unknown }).balanceRub === "number") {
		const bal = (patient as { balanceRub: number }).balanceRub;
		return bal > 0 ? bal : 0;
	}
	return 0;
}

function resolvePatientFamilyBalanceRub(patient: unknown): number {
	if (!patient || typeof patient !== "object") return 0;
	if ("familyBalanceRub" in patient && typeof (patient as { familyBalanceRub?: unknown }).familyBalanceRub === "number") {
		return (patient as { familyBalanceRub: number }).familyBalanceRub;
	}
	return 0;
}

const ManagerialPnlDashboardModal = lazy(() =>
	import("../../../components/finance/pnl/ManagerialPnlDashboardModal").then(
		(m) => ({ default: m.ManagerialPnlDashboardModal }),
	),
);

const Billing1CExportModal = lazy(() =>
	import("../../../components/finance/Billing1CExportModal").then((m) => ({
		default: m.Billing1CExportModal,
	})),
);

export interface FinanceModalsHostProps {
	readonly s: FinanceViewState;
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
	const clinicSettings = s.dashboard?.clinicSettings;
	const profile = clinicSettings?.profile;
	const clinicName = profile?.clinicName || s.dashboard?.clinicName || "Стоматология ДЕНТЕ Премиум";
	const clinicLegalName = profile?.legalName || clinicName;
	const clinicInn = profile?.inn || "";
	const clinicKpp = profile?.kpp || "770101001";
	const depositRub = resolvePatientDepositRub(docPat);
	const effDepositRub = resolvePatientDepositRub(effPat);

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

			<CashRegisterStudioModal
				isOpen={s.isCashboxOpen}
				onClose={() => s.setIsCashboxOpen(false)}
				mode="studio"
				isShiftOpen={s.isShiftOpen}
				cashierFullName={s.paymentFiscalCashierName || "Врач-стоматолог / Кассир"}
				clinicName={clinicName}
				clinicLegalName={clinicLegalName}
				cashierInn={profile?.inn ?? undefined}
				onCloseShiftAction={s.handleCloseShift}
				totalDueRub={totalBill}
				amountRub={totalBill}
				amountKopecks={rublesToKopecks(totalBill)}
				patientId={docPat?.id}
				patientName={docPat?.fullName}
				patientPhone={docPat?.phone ?? undefined}
				patientDepositRub={depositRub}
				patientFamilyBalanceRub={resolvePatientFamilyBalanceRub(docPat)}
				onPaymentComplete={() => {
					void s.loadDashboard?.();
					s.setIsCashboxOpen(false);
				}}
				containerTestId="modal-finance-cashbox"
				title="Касса клиники · Приём оплаты"
			/>

			{s.isQuickExpenseOpen && (
				<QuickExpenseModal
					isOpen={s.isQuickExpenseOpen}
					onClose={() => s.setIsQuickExpenseOpen(false)}
					onSuccess={() => void s.loadDashboard?.()}
				/>
			)}

			{s.isSplitPaymentOpen && (
				<CashRegisterStudioModal
					isOpen={s.isSplitPaymentOpen}
					onClose={() => s.setIsSplitPaymentOpen(false)}
					mode="checkout"
					initialTab="checkout"
					defaultMethod="split"
					totalDueRub={totalBill}
					amountRub={totalBill}
					amountKopecks={rublesToKopecks(totalBill)}
					patientId={effPat?.id}
					patientName={effPat?.fullName}
					patientPhone={effPat?.phone ?? undefined}
					patientDepositRub={effDepositRub}
					patientFamilyBalanceRub={resolvePatientFamilyBalanceRub(effPat)}
					cashierFullName={s.paymentFiscalCashierName || undefined}
					onSuccess={() => {
						void s.loadDashboard?.();
						s.setIsSplitPaymentOpen(false);
					}}
					onPaymentComplete={() => {
						void s.loadDashboard?.();
						s.setIsSplitPaymentOpen(false);
					}}
				/>
			)}

			{s.isAccountingExportOpen && (
				<Suspense fallback={null}>
					<Billing1CExportModal
						isOpen={s.isAccountingExportOpen}
						onClose={() => s.setIsAccountingExportOpen(false)}
						items={[]}
						patientName={docPat?.fullName || effPat?.fullName || "Пациент клиники"}
						patientId={docPat?.id || effPat?.id}
						patientPhone={docPat?.phone ?? effPat?.phone ?? undefined}
						clinicName={clinicName}
						clinicInn={clinicInn}
						clinicKpp={clinicKpp}
						totalRub={totalBill}
					/>
				</Suspense>
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
