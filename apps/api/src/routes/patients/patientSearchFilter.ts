import {
	convertQwertyMistype,
	phoneKey,
	transliterateLatinToCyrillic,
} from "../../services/patients/duplicateDetection.js";

/**
 * Фильтрация массива пациентов по поисковому запросу с учетом опечаток QWERTY,
 * транслитерации, нормализации телефонных номеров, СНИЛС, полиса ОМС и номера карты.
 */
export function filterPatientsBySearchQuery<
	T extends {
		fullName?: unknown;
		phone?: unknown;
		email?: unknown;
		birthDate?: unknown;
		id?: unknown;
		cardNumber?: unknown;
		medicalCardNumber?: unknown;
		snils?: unknown;
		omsPolicyNumber?: unknown;
		administrativeProfile?: unknown;
	},
>(
	patients: T[],
	searchRaw: string,
): T[] {
	if (!searchRaw) return patients;
	const qLower = searchRaw.toLowerCase().trim();
	if (!qLower) return patients;

	const qwertySearch = convertQwertyMistype(qLower);
	const translitSearch = transliterateLatinToCyrillic(qLower);
	const searchDigits = qLower.replace(/\D/g, "");
	const searchPk = phoneKey(qLower);

	return patients.filter((p) => {
		const nameStr = typeof p.fullName === "string" ? p.fullName : "";
		const nameLower = nameStr.toLowerCase();
		const nameMatch =
			nameLower.includes(qLower) ||
			(qwertySearch !== qLower && nameLower.includes(qwertySearch)) ||
			(translitSearch !== qLower && nameLower.includes(translitSearch));

		const pPhone = typeof p.phone === "string" ? p.phone : "";
		const phoneDigits = pPhone.replace(/\D/g, "");
		const phonePk = phoneKey(pPhone);
		const phoneMatch =
			pPhone.toLowerCase().includes(qLower) ||
			(searchDigits.length >= 4 && phoneDigits.includes(searchDigits)) ||
			(searchPk !== null && phonePk !== null && searchPk === phonePk);

		const pEmail = typeof p.email === "string" ? p.email : "";
		const emailMatch = pEmail.toLowerCase().includes(qLower);

		const pBirth = typeof p.birthDate === "string" ? p.birthDate : "";
		const birthMatch =
			pBirth.length > 0 &&
			(pBirth.toLowerCase().includes(qLower) ||
				(searchDigits.length >= 4 && pBirth.replace(/\D/g, "").includes(searchDigits)));

		const adminProf =
			p.administrativeProfile && typeof p.administrativeProfile === "object"
				? (p.administrativeProfile as Record<string, unknown>)
				: null;

		// Поиск по СНИЛС
		const snilsRaw =
			typeof p.snils === "string"
				? p.snils
				: typeof adminProf?.snils === "string"
					? adminProf.snils
					: "";
		const snilsDigits = snilsRaw.replace(/\D/g, "");
		const snilsMatch =
			snilsRaw.length > 0 &&
			(snilsRaw.toLowerCase().includes(qLower) ||
				(searchDigits.length >= 4 && snilsDigits.includes(searchDigits)));

		// Поиск по полису ОМС
		const omsRaw =
			typeof p.omsPolicyNumber === "string"
				? p.omsPolicyNumber
				: typeof adminProf?.insurancePolicyNumber === "string"
					? adminProf.insurancePolicyNumber
					: "";
		const omsDigits = omsRaw.replace(/\D/g, "");
		const omsMatch =
			omsRaw.length > 0 &&
			(omsRaw.toLowerCase().includes(qLower) ||
				(searchDigits.length >= 4 && omsDigits.includes(searchDigits)));

		// Поиск по номеру карты или идентификатору
		const cardRaw =
			typeof p.cardNumber === "string"
				? p.cardNumber
				: typeof p.medicalCardNumber === "string"
					? p.medicalCardNumber
					: typeof adminProf?.cardNumber === "string"
						? adminProf.cardNumber
						: typeof p.id === "string"
							? p.id
							: "";
		const cardMatch = cardRaw.length > 0 && cardRaw.toLowerCase().includes(qLower);

		return Boolean(
			nameMatch ||
			phoneMatch ||
			emailMatch ||
			birthMatch ||
			snilsMatch ||
			omsMatch ||
			cardMatch,
		);
	});
}
