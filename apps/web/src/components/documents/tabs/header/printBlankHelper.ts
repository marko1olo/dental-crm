import type { Patient, StaffMember } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../../AppHelpers";
import { printBlankMedicalContract } from "../../../patients/blankContractPrint";

export function handlePrintBlankContract(
	activePatient: Patient | null | undefined,
	activeDoctor: StaffMember | null | undefined,
	clinicProfileDraft: ClinicProfileDraft | undefined,
): void {
	void printBlankMedicalContract(
		activePatient
			? {
					id: activePatient.id,
					fullName: activePatient.fullName,
					phone: activePatient.phone,
					birthDate: activePatient.birthDate,
					administrativeProfile: (activePatient as any)?.administrativeProfile,
				}
			: null,
		{
			doctorName: activeDoctor?.fullName || "",
			clinicName: clinicProfileDraft?.clinicName || clinicProfileDraft?.legalName,
			clinicAddress: clinicProfileDraft?.address,
			clinicInn: clinicProfileDraft?.inn,
			clinicOgrn: clinicProfileDraft?.ogrn,
		},
	);
}
