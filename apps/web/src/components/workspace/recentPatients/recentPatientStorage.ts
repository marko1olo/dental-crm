import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";

export const DENTE_LAST_ACTIVE_PATIENT_KEY = "dente_last_active_patient";

export interface LastActivePatientData {
	readonly patientId: string;
	readonly patientName: string;
	readonly phone?: string | undefined;
	readonly timestamp: number;
}

export interface RecentPatientItem {
	readonly id: string;
	readonly organizationId: string;
	readonly userId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly lastViewedAt: string;
}

export function saveLastActivePatient(patient: {
	patientId: string;
	patientName: string;
	phone?: string | undefined;
}): void {
	safeLocalStorageSetJson(
		DENTE_LAST_ACTIVE_PATIENT_KEY,
		{
			patientId: patient.patientId,
			patientName: patient.patientName,
			phone: patient.phone || "",
			timestamp: Date.now(),
		},
		true,
	);
}

export function getLastActivePatient(): LastActivePatientData | null {
	const parsed = safeLocalStorageGetJson<LastActivePatientData | null>(
		DENTE_LAST_ACTIVE_PATIENT_KEY,
		null,
	);
	if (
		parsed &&
		typeof parsed.patientId === "string" &&
		typeof parsed.patientName === "string"
	) {
		return parsed;
	}
	return null;
}
