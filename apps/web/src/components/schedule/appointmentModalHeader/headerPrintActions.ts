import type { Dashboard } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "../../patients/blankContractPrint";

export function handlePrintBlankContract(
	dashboard: Dashboard,
	patientId: string,
	currentPatientName: string,
) {
	const currentPatient = (dashboard?.patients ?? []).find(
		(p) => p.id === patientId,
	);
	printBlankMedicalContract(
		{
			id: currentPatient?.id,
			fullName: currentPatient?.fullName || currentPatientName || "",
			phone: currentPatient?.phone || null,
		},
		{
			clinicName: dashboard?.clinicSettings?.profile?.clinicName,
			clinicInn: dashboard?.clinicSettings?.profile?.inn,
			clinicAddress: dashboard?.clinicSettings?.profile?.address,
		},
	);
	showToast("Печать бланка договора со строками (_____)", "info");
}

export function handlePrintBlankConsent(
	dashboard: Dashboard,
	patientId: string,
	currentPatientName: string,
) {
	const currentPatient = (dashboard?.patients ?? []).find(
		(p) => p.id === patientId,
	);
	printBlankMedicalConsent(
		{
			id: currentPatient?.id,
			fullName: currentPatient?.fullName || currentPatientName || "",
			phone: currentPatient?.phone || null,
		},
		{
			clinicName: dashboard?.clinicSettings?.profile?.clinicName,
			clinicInn: dashboard?.clinicSettings?.profile?.inn,
			clinicAddress: dashboard?.clinicSettings?.profile?.address,
		},
	);
	showToast("Печать бланка согласия (ИДС)", "info");
}
