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
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export interface PatientSearchableFields {
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	cardNumber?: string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
	} | null | undefined;
}

/**
 * Проверяет соответствие пациента строке поиска:
 * 1. Поиск по номеру телефона (включая последние 4 цифры «9912», 3+ цифры, национальный формат);
 * 2. Поиск по телефону законного представителя (для детей / опекаемых);
 * 3. Поиск по номеру карты пациента;
 * 4. Поиск по дате рождения (ГГГГ, ДД.ММ.ГГГГ);
 * 5. Поиск по ФИО с токенизацией и перестановкой слов.
 */
export function matchesPatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): boolean {
	if (!patient) return false;
	const query = rawQuery.trim();
	if (!query) return true;

	// 1. Проверка по номеру телефона пациента и представителя
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

		// Телефон законного представителя
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone) {
			const repPhoneDigits = repPhone.replace(/\D/g, "");
			const repNational = normalizePhoneToNational(repPhone);
			if (
				repPhoneDigits.includes(queryDigits) ||
				(queryNational.length >= 3 && repNational.includes(queryNational))
			) {
				return true;
			}
		}
	}

	// 2. Проверка по номеру медицинской карты
	if (patient.cardNumber) {
		const normCard = normalizeCyrillicText(patient.cardNumber);
		const normQuery = normalizeCyrillicText(query);
		if (normCard.includes(normQuery)) {
			return true;
		}
		const cardDigits = patient.cardNumber.replace(/\D/g, "");
		if (queryDigits.length >= 2 && cardDigits && cardDigits.includes(queryDigits)) {
			return true;
		}
	}

	// 3. Проверка по дате рождения (YYYY-MM-DD или DD.MM.YYYY)
	if (patient.birthDate && queryDigits.length >= 2) {
		if (patient.birthDate.includes(queryDigits)) {
			return true;
		}
		const [year, month, day] = patient.birthDate.split("-");
		if (day && month && year) {
			const formattedDot = `${day}.${month}.${year}`;
			if (formattedDot.includes(query) || formattedDot.replace(/\D/g, "").includes(queryDigits)) {
				return true;
			}
		}
	}

	// 4. Проверка по ФИО с токенизацией
	const normalizedFullName = normalizeCyrillicText(patient.fullName);
	const normalizedQuery = normalizeCyrillicText(query);
	if (!normalizedQuery) return false;

	if (normalizedFullName.includes(normalizedQuery)) {
		return true;
	}

	// Проверка ФИО представителя
	const repName = patient.administrativeProfile?.legalRepresentativeFullName;
	if (repName) {
		const normRepName = normalizeCyrillicText(repName);
		if (normRepName.includes(normalizedQuery)) {
			return true;
		}
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
