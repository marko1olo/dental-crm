/**
 * duplicatePhoneScorer.ts — Phone duplicate score evaluation across direct and representative phones.
 */

import type { Patient } from "@dental/shared";
import { normalizePhoneToNational } from "../../../utils/patientSearchUtils";

export function scorePhoneDuplicate(patient: Patient, phoneDigits: string, rawPhone: string): number {
	if (phoneDigits.length < 4) return 0;

	const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
	const patientNational = normalizePhoneToNational(patient.phone);
	const queryNational = normalizePhoneToNational(rawPhone);

	if (phoneDigits.length >= 10 && patientNational && patientNational === queryNational) {
		return 100;
	}
	if (
		patientPhoneDigits.length >= 10 &&
		phoneDigits.length >= 10 &&
		patientPhoneDigits.slice(-10) === phoneDigits.slice(-10)
	) {
		return 100;
	}
	if (patientPhoneDigits.endsWith(phoneDigits)) {
		return 85;
	}
	if (
		patientPhoneDigits.includes(phoneDigits) ||
		(queryNational.length >= 4 && patientNational.includes(queryNational))
	) {
		return 75;
	}

	const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
	if (repPhone) {
		const repPhoneDigits = repPhone.replace(/\D/g, "");
		const repNational = normalizePhoneToNational(repPhone);
		if (phoneDigits.length >= 10 && repNational && repNational === queryNational) {
			return 90;
		}
		if (repPhoneDigits.endsWith(phoneDigits) || repPhoneDigits.includes(phoneDigits)) {
			return 75;
		}
	}

	return 0;
}
