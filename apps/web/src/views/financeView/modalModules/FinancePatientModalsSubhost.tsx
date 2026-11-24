import type React from "react";
import { CashRegisterStudioModal } from "../../../components/cashbox/CashRegisterStudioModal";
import { TaxDeductionCertificateModal } from "../../../components/documents/DocumentsStudioModal";
import { DoctorPayrollStudioModal } from "../../../components/payroll/DoctorPayrollStudioModal";
import type { FinanceViewState } from "../useFinanceView";

function resolvePatientDeposit(patient: unknown): number {
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

function resolvePatientFamilyBalance(patient: unknown): number {
	if (!patient || typeof patient !== "object") return 0;
	if ("familyBalanceRub" in patient && typeof (patient as { familyBalanceRub?: unknown }).familyBalanceRub === "number") {
		return (patient as { familyBalanceRub: number }).familyBalanceRub;
	}
	return 0;
}

function resolvePatientInn(patient: unknown): string {
	if (!patient || typeof patient !== "object") return "";
	if ("inn" in patient && typeof (patient as { inn?: unknown }).inn === "string") {
		return (patient as { inn: string }).inn;
	}
	if ("administrativeProfile" in patient) {
		const profile = (patient as { administrativeProfile?: { taxpayerInn?: string | null } }).administrativeProfile;
		if (profile?.taxpayerInn) return profile.taxpayerInn;
	}
	return "";
}

function resolvePatientSnils(patient: unknown): string {
	if (!patient || typeof patient !== "object") return "";
	if ("snils" in patient && typeof (patient as { snils?: unknown }).snils === "string") {
		return (patient as { snils: string }).snils;
	}
	if ("administrativeProfile" in patient) {
		const profile = (patient as { administrativeProfile?: { snils?: string | null } }).administrativeProfile;
		if (profile?.snils) return profile.snils;
	}
	return "";
}

function resolvePatientAddress(patient: unknown): string | null {
	if (!patient || typeof patient !== "object") return null;
	if ("address" in patient && typeof (patient as { address?: unknown }).address === "string") {
		return (patient as { address: string }).address;
	}
	if ("administrativeProfile" in patient) {
		const profile = (patient as { administrativeProfile?: { residentialAddress?: string | null; registrationAddress?: string | null } }).administrativeProfile;
		return profile?.residentialAddress ?? profile?.registrationAddress ?? null;
	}
	return null;
}

export interface FinancePatientModalsSubhostProps {
	readonly s: FinanceViewState;
	readonly isDoctorPayrollOpen?: boolean | undefined;
	readonly onCloseDoctorPayroll?: (() => void) | undefined;
}

export const FinancePatientModalsSubhost: React.FC<
	FinancePatientModalsSubhostProps
> = ({ s, isDoctorPayrollOpen, onCloseDoctorPayroll }) => {
	const docPat = s.documentPatient;
	const activePat = s.activePatient;
	const profile = s.dashboard?.clinicSettings?.profile;
	const clinicName = profile?.clinicName || s.dashboard?.clinicName || "Стоматология ДЕНТЕ Премиум";
	const clinicLegalName = profile?.legalName || clinicName;
	const clinicInn = profile?.inn ?? undefined;

	return (
		<>
			{s.isBillingActOpen && (
				<CashRegisterStudioModal
					key={s.pendingCheckout?.invoiceId || docPat?.id || "billing-act"}
					isOpen={s.isBillingActOpen}
					onClose={() => s.setIsBillingActOpen(false)}
					mode="checkout"
					patientId={docPat?.id}
					patientName={docPat?.fullName}
					patientPhone={docPat?.phone ?? undefined}
					patientDepositRub={resolvePatientDeposit(docPat)}
					patientFamilyBalanceRub={resolvePatientFamilyBalance(docPat)}
					clinicName={clinicName}
					clinicLegalName={clinicLegalName}
				/>
			)}

			{s.isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={s.isTaxModalOpen}
					onClose={() => s.setIsTaxModalOpen(false)}
					patientName={activePat?.fullName || docPat?.fullName || ""}
					patientBirthDate={
						activePat?.birthDate || docPat?.birthDate || undefined
					}
					patientInn={resolvePatientInn(activePat) || resolvePatientInn(docPat)}
					patientSnils={resolvePatientSnils(activePat) || resolvePatientSnils(docPat)}
					patientId={activePat?.id || docPat?.id}
					clinicName={clinicName}
					clinicInn={clinicInn}
					payments={s.taxDeductionPayments}
				/>
			)}

			{/* Табель смен и Расчетная ведомость начисления зарплаты (канонический SSOT) */}
			{(isDoctorPayrollOpen || s.isShiftTimesheetOpen || s.isTimesheetT13Open) && (
				<DoctorPayrollStudioModal
					isOpen={Boolean(isDoctorPayrollOpen || s.isShiftTimesheetOpen || s.isTimesheetT13Open)}
					onClose={() => {
						if (onCloseDoctorPayroll) {
							onCloseDoctorPayroll();
						}
						s.setIsShiftTimesheetOpen?.(false);
						s.setIsTimesheetT13Open?.(false);
					}}
					clinicName={clinicName}
				/>
			)}

			{s.isFamilyBillingOpen && (
				<CashRegisterStudioModal
					key={s.pendingCheckout?.invoiceId || docPat?.id || "family-billing"}
					isOpen={s.isFamilyBillingOpen}
					onClose={() => s.setIsFamilyBillingOpen(false)}
					mode="checkout"
					patientId={docPat?.id}
					patientName={docPat?.fullName}
					patientPhone={docPat?.phone ?? undefined}
					patientFamilyBalanceRub={resolvePatientFamilyBalance(docPat)}
					clinicName={clinicName}
					clinicLegalName={clinicLegalName}
					onPaymentComplete={() => {
						void s.loadDashboard?.();
						s.setIsFamilyBillingOpen(false);
					}}
				/>
			)}
		</>
	);
};

export default FinancePatientModalsSubhost;
