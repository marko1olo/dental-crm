/**
 * Нормализует телефонный номер к каноническому 10-значному национальному представлению
 * Поддерживает форматы: +79991234567, 89991234567, 9991234567, +7 (999) 123-45-67
 */
export function normalizePhoneToNational(value: string | null | undefined): string {
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return digits.slice(1);
	}
	if (digits.length === 10) {
		return digits;
	}
	return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Нормализует кириллический текст (регистр, замена Ё на Е, удаление лишних знаков)
 */
export function normalizeCyrillicText(value: string | null | undefined): string {
	return (value ?? "")
		.trim()
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ");
}

/**
 * Проверяет соответствие пациента строке поиска (ФИО с перестановкой слов + телефон)
 */
export function matchesPatientSearch(
	patient: { fullName?: string | null; phone?: string | null } | null | undefined,
	rawQuery: string,
): boolean {
	if (!patient) return false;
	const query = rawQuery.trim();
	if (!query) return true;

	// 1. Проверка по телефону
	const queryDigits = query.replace(/\D/g, "");
	if (queryDigits.length >= 3) {
		const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
		const patientNational = normalizePhoneToNational(patient.phone);
		const queryNational = normalizePhoneToNational(query);

		if (
			patientPhoneDigits.includes(queryDigits) ||
			(queryNational.length >= 3 && patientNational.includes(queryNational)) ||
			(queryDigits.length >= 10 && patientNational === queryNational)
		) {
			return true;
		}
	}

	// 2. Проверка по ФИО с токенизацией
	const normalizedFullName = normalizeCyrillicText(patient.fullName);
	const normalizedQuery = normalizeCyrillicText(query);
	if (!normalizedQuery) return false;

	if (normalizedFullName.includes(normalizedQuery)) {
		return true;
	}

	const queryTokens = normalizedQuery.split(" ").filter(Boolean);
	const nameTokens = normalizedFullName.split(" ").filter(Boolean);

	if (queryTokens.length === 0) return false;

	// Все токены запроса должны быть подстрокой или префиксом хотя бы одного слова из ФИО
	return queryTokens.every((qToken) =>
		nameTokens.some(
			(nToken) => nToken.startsWith(qToken) || nToken.includes(qToken),
		),
	);
}
