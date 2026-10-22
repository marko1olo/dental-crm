import type { PatientSearchableFields, PatientSearchScoredResult } from "./types";
import {
	extractPatientCardNumbers,
	extractPatientPhones,
	normalizeCardQuery,
	normalizeCyrillicText,
	normalizePhoneToNational,
} from "./stringNormalizers";

export function checkPhoneMatch(
	patient: PatientSearchableFields,
	queryDigits: string,
	queryNational: string,
): PatientSearchScoredResult | null {
	if (queryDigits.length < 3) return null;
	const patientPhones = extractPatientPhones(patient);
	for (const pPhone of patientPhones) {
		const pDigits = pPhone.replace(/\D/g, "");
		const pNational = normalizePhoneToNational(pPhone);
		if (queryDigits.length >= 10 && pNational === queryNational) {
			return { isMatch: true, score: 100, matchedBy: "phone", isExact: true, isFuzzy: false };
		}
		if (queryDigits.length >= 4 && pDigits.endsWith(queryDigits)) {
			return { isMatch: true, score: 85, matchedBy: "phone", isExact: true, isFuzzy: false };
		}
		if (pDigits.includes(queryDigits) || (queryNational.length >= 3 && pNational.includes(queryNational))) {
			return { isMatch: true, score: 60, matchedBy: "phone", isExact: true, isFuzzy: false };
		}
	}
	const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
	if (repPhone) {
		const repDigits = repPhone.replace(/\D/g, "");
		const repNational = normalizePhoneToNational(repPhone);
		if (repDigits.includes(queryDigits) || (queryNational.length >= 3 && repNational.includes(queryNational))) {
			return { isMatch: true, score: 50, matchedBy: "rep_phone", isExact: true, isFuzzy: false };
		}
	}
	return null;
}

export function checkCardMatch(
	patient: PatientSearchableFields,
	query: string,
	normalizedQuery: string,
	queryDigits: string,
): PatientSearchScoredResult | null {
	const patientCards = extractPatientCardNumbers(patient);
	if (patientCards.length === 0) return null;
	const cardQuery = normalizeCardQuery(query);
	for (const card of patientCards) {
		const normCard = normalizeCyrillicText(card);
		const cardDigits = card.replace(/\D/g, "");
		if (normCard === normalizedQuery || (cardQuery.cleanCardToken && normCard === cardQuery.cleanCardToken)) {
			return { isMatch: true, score: 80, matchedBy: "card", isExact: true, isFuzzy: false };
		}
		if (cardQuery.isCardExplicit && cardQuery.cardDigits.length >= 1) {
			if (cardDigits === cardQuery.cardDigits || cardDigits.endsWith(cardQuery.cardDigits)) {
				return { isMatch: true, score: 80, matchedBy: "card", isExact: true, isFuzzy: false };
			}
		}
		if (normCard.includes(normalizedQuery) || (cardQuery.cleanCardToken && normCard.includes(cardQuery.cleanCardToken))) {
			return { isMatch: true, score: 80, matchedBy: "card", isExact: true, isFuzzy: false };
		}
		if ((queryDigits.length >= 2 && cardDigits && cardDigits.includes(queryDigits)) || (cardQuery.cardDigits.length >= 2 && cardDigits && cardDigits.includes(cardQuery.cardDigits))) {
			return { isMatch: true, score: 80, matchedBy: "card", isExact: true, isFuzzy: false };
		}
	}
	return null;
}

export function checkBirthDateMatch(patient: PatientSearchableFields, query: string, queryDigits: string): PatientSearchScoredResult | null {
	if (!patient.birthDate || queryDigits.length < 2) return null;
	const [year, month, day] = patient.birthDate.split("-");
	const formattedDot = day && month && year ? `${day}.${month}.${year}` : "";
	if (patient.birthDate.includes(queryDigits) || (formattedDot && (formattedDot.includes(query) || formattedDot.replace(/\D/g, "").includes(queryDigits)))) {
		return { isMatch: true, score: 55, matchedBy: "birth_date", isExact: true, isFuzzy: false };
	}
	return null;
}

export function checkSnilsAndPolicyMatch(
	patient: PatientSearchableFields,
	normalizedQuery: string,
	queryDigits: string,
): PatientSearchScoredResult | null {
	const snilsVal = patient.snils || patient.administrativeProfile?.snils;
	if (snilsVal && queryDigits.length >= 3) {
		const snilsDigits = snilsVal.replace(/\D/g, "");
		if (snilsDigits.includes(queryDigits)) {
			return { isMatch: true, score: 85, matchedBy: "snils", isExact: snilsDigits === queryDigits, isFuzzy: false };
		}
	}
	const policyVal = patient.insurancePolicyNumber || patient.policyNumber || patient.omsPolicy || patient.dmsPolicyNumber || patient.administrativeProfile?.insurancePolicyNumber;
	if (policyVal) {
		const normPolicy = normalizeCyrillicText(policyVal);
		const policyDigits = policyVal.replace(/\D/g, "");
		if (normPolicy.includes(normalizedQuery) || (queryDigits.length >= 3 && policyDigits.includes(queryDigits))) {
			return { isMatch: true, score: 80, matchedBy: "policy", isExact: normPolicy === normalizedQuery || (queryDigits.length >= 6 && policyDigits === queryDigits), isFuzzy: false };
		}
	}
	return null;
}
