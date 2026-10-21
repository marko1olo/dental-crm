import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { printPrimaryIntakePackage } from "../../documents/primaryIntakePackagePrintEngine";
import { showToast } from "../../GlobalToast";
import { TOAST_BLANK_CONTRACT_PRINTED } from "./constants";

export function printBlankContractHelper(
	appLogic: any,
	newPatientName: string,
	newPatientPhone: string,
	newPatientBirthDate: string,
	patientAdministrativeProfileDraft: any,
	isSomaticNorm: boolean,
) {
	const clinicProfile = appLogic?.dashboard?.clinicSettings?.profile;
	printPrimaryIntakePackage({
		patient: {
			fullName: newPatientName.trim() || undefined,
			phone: newPatientPhone.trim() || undefined,
			birthDate: newPatientBirthDate.trim() || undefined,
			snils: patientAdministrativeProfileDraft.snils || undefined,
			passport: patientAdministrativeProfileDraft.identityDocument || undefined,
		},
		clinic: clinicProfile
			? { ...clinicProfile, address: clinicProfile.actualAddress || clinicProfile.address }
			: undefined,
		doctorFullName: null,
		intakeNormApplied: isSomaticNorm,
	});
	showToast(TOAST_BLANK_CONTRACT_PRINTED, "info", 4000);
}

export function handleQuickCreateKeyDownHelper(
	e: ReactKeyboardEvent<HTMLInputElement>,
	handleCreate: () => Promise<void>,
) {
	if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
		e.preventDefault();
		void handleCreate();
	}
}
