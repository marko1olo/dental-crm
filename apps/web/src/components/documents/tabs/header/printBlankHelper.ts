import type { Patient, StaffMember } from "@dental/shared";
import type { DocumentClinicProfileRequisites } from "../formSwitch/documentFormSwitchTypes";
import { printBlankMedicalContract } from "../../../patients/blankContractPrint";

export function handlePrintBlankContract(
	activePatient: Patient | null | undefined,
	activeDoctor: StaffMember | null | undefined,
	clinicProfileDraft: DocumentClinicProfileRequisites | null | undefined,
): void {
	void printBlankMedicalContract(
		activePatient
			? {
					id: activePatient.id,
					fullName: activePatient.fullName,
					phone: activePatient.phone,
					birthDate: activePatient.birthDate,
					administrativeProfile: activePatient.administrativeProfile,
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
