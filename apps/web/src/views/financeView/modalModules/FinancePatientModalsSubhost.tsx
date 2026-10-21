import type React from "react";
import { FamilyCombinedBillingModal } from "../../../components/finance/FamilyCombinedBillingModal";
import { PatientBillingModal } from "../../../components/finance/PatientBillingModal";
import { TaxDeductionCertificateModal } from "../../../components/finance/TaxDeductionCertificateModal";
import { DoctorPayrollModal } from "../../../components/payroll/DoctorPayrollModal";

export interface FinancePatientModalsSubhostProps {
	readonly s: any;
	readonly isDoctorPayrollOpen?: boolean | undefined;
	readonly onCloseDoctorPayroll?: (() => void) | undefined;
}

export const FinancePatientModalsSubhost: React.FC<
	FinancePatientModalsSubhostProps
> = ({ s, isDoctorPayrollOpen, onCloseDoctorPayroll }) => {
	const docPat = s.documentPatient;
	const activePat = s.activePatient;

	return (
		<>
			{s.isBillingActOpen && (
				<PatientBillingModal
					isOpen={s.isBillingActOpen}
					onClose={() => s.setIsBillingActOpen(false)}
					patient={
						docPat
							? {
									id: docPat.id,
									fullName: docPat.fullName,
									birthDate: docPat.birthDate,
									phone: docPat.phone,
									address: docPat.address,
									medicalCardNumber: docPat.medicalCardNumber,
									depositRub: docPat.depositRub,
									familyBalanceRub: docPat.familyBalanceRub,
								}
							: null
					}
					patientDepositRub={docPat?.depositRub ?? 0}
					patientFamilyBalanceRub={docPat?.familyBalanceRub ?? 0}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
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
					patientInn={activePat?.inn || docPat?.inn || ""}
					patientSnils={activePat?.snils || docPat?.snils || ""}
					patientId={activePat?.id || docPat?.id}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
					payments={s.taxDeductionPayments}
				/>
			)}

			{s.isTimesheetT13Open && (
				<DoctorPayrollModal
					isOpen={s.isTimesheetT13Open}
					onClose={() => s.setIsTimesheetT13Open(false)}
					clinicName={
						s.dashboard?.clinicSettings?.name || s.dashboard?.clinicName
					}
				/>
			)}

			{s.isFamilyBillingOpen && (
				<FamilyCombinedBillingModal
					isOpen={s.isFamilyBillingOpen}
					onClose={() => s.setIsFamilyBillingOpen(false)}
					familyGroupId={docPat?.familyGroupId}
					familyGroupName={docPat?.familyGroupName || "Семейная группа"}
					availableFamilyWalletRub={docPat?.familyBalanceRub ?? 0}
					initialPayer={{
						payerId: docPat?.id || "",
						payerFullName: docPat?.fullName || "Ответственный плательщик",
					}}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
					onCheckoutComplete={() => {
						void s.loadDashboard?.();
						s.setIsFamilyBillingOpen(false);
					}}
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
};

export default FinancePatientModalsSubhost;
