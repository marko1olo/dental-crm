import type { Patient } from "@dental/shared";
import { normalizeCyrillicText, normalizePhoneToNational } from "./stringNormalizers";
import { isFuzzyNameMatch } from "./fuzzyScoring";

export interface NameScoreResult {
	score: number;
	reason: "name" | "fuzzy_name" | null;
	isFuzzy: boolean;
	suggestedName?: string | undefined;
}

export function scoreNameDuplicate(patientName: string, queryName: string): NameScoreResult {
	if (queryName.length < 3) return { score: 0, reason: null, isFuzzy: false };
	const normPatient = normalizeCyrillicText(patientName);
	const normQuery = normalizeCyrillicText(queryName);
	if (normPatient === normQuery) {
		return { score: 100, reason: "name", isFuzzy: false };
	}
	if (normPatient.startsWith(normQuery) || normQuery.startsWith(normPatient)) {
		return { score: 95, reason: "name", isFuzzy: false };
	}
	const fuzzy = isFuzzyNameMatch(patientName, queryName);
	if (fuzzy.isMatch) {
		if (fuzzy.isExact) return { score: 95, reason: "name", isFuzzy: false };
		return {
			score: fuzzy.maxDistance === 1 ? 75 : 65,
			reason: "fuzzy_name",
			isFuzzy: true,
			suggestedName: patientName || undefined,
		};
	}
	return { score: 0, reason: null, isFuzzy: false };
}

export function scorePhoneDuplicate(patient: Patient, phoneDigits: string, queryPhone: string): number {
	if (phoneDigits.length < 4) return 0;
	const patDigits = (patient.phone ?? "").replace(/\D/g, "");
	const patNational = normalizePhoneToNational(patient.phone);
	const queryNational = normalizePhoneToNational(queryPhone);

	if (phoneDigits.length >= 10 && patNational && patNational === queryNational) {
		return 100;
	}
	if (patDigits.length >= 10 && phoneDigits.length >= 10 && patDigits.slice(-10) === phoneDigits.slice(-10)) {
		return 100;
	}
	if (patDigits.endsWith(phoneDigits)) return 85;
	if (patDigits.includes(phoneDigits) || (queryNational.length >= 4 && patNational.includes(queryNational))) {
		return 75;
	}
	const repPhone = (patient as any).administrativeProfile?.legalRepresentativePhone;
	if (repPhone) {
		const repDigits = repPhone.replace(/\D/g, "");
		const repNational = normalizePhoneToNational(repPhone);
		if (phoneDigits.length >= 10 && repNational && repNational === queryNational) return 90;
		if (repDigits.endsWith(phoneDigits) || repDigits.includes(phoneDigits)) return 75;
	}
	return 0;
}

export function isBirthDateMatch(patientDob: string | null | undefined, queryDob: string): boolean {
	if (!queryDob || !patientDob) return false;
	const cleanQuery = queryDob.replace(/\D/g, "");
	const cleanPat = patientDob.replace(/\D/g, "");
	return cleanQuery === cleanPat && cleanQuery.length >= 8;
}
