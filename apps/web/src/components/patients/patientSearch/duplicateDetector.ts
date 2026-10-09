/**
 * duplicateDetector.ts — Layer 2: Многофакторное выявление дубликатов и неразрушающее слияние пациентов.
 */

import type { Patient } from "@dental/shared";
import type {
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
	MergedPatientResult,
} from "./types";
import { normalizeCyrillicText, normalizePhoneToNational } from "./stringNormalizers";
import { isFuzzyNameMatch, highlightSearchMatches } from "./fuzzyScoring";

// ============================================================================
// 1. МНОГОФАКТОРНОЕ ВЫЯВЛЕНИЕ ДУБЛИКАТОВ (DUPLICATE DETECTION)
// ============================================================================

/**
 * Многофакторный анализ дубликатов по ФИО, телефону и дате рождения.
 * Совпадение нормализованного E.164 телефона или даты рождения + нечеткого ФИО.
 */
export function findPotentialDuplicates(
	patients: readonly Patient[],
	criteria: FindPotentialDuplicatesCriteria,
): PotentialDuplicateItem[] {
	const name = (criteria.fullName ?? "").trim();
	const phone = (criteria.phone ?? "").trim();
	const birthDate = (criteria.birthDate ?? "").trim();
	const phoneDigits = phone.replace(/\D/g, "");

	if (name.length < 3 && phoneDigits.length < 4 && !birthDate) {
		return [];
	}

	const threshold = criteria.thresholdScore ?? 35;
	const limit = criteria.limit ?? 5;
	const results: PotentialDuplicateItem[] = [];

	for (const patient of patients) {
		// Игнорируем уже объединенные карточки
		if ((patient as any).mergedIntoPatientId || patient.status === "archived") {
			continue;
		}

		let nameDuplicateScore = 0;
		let nameReason: "name" | "fuzzy_name" | null = null;
		let nameIsFuzzy = false;
		let nameSuggested: string | undefined = undefined;

		if (name.length >= 3) {
			const normPatientName = normalizeCyrillicText(patient.fullName);
			const normQueryName = normalizeCyrillicText(name);

			if (normPatientName === normQueryName) {
				nameDuplicateScore = 100;
				nameReason = "name";
			} else if (
				normPatientName.startsWith(normQueryName) ||
				normQueryName.startsWith(normPatientName)
			) {
				nameDuplicateScore = 95;
				nameReason = "name";
			} else {
				const fuzzyCheck = isFuzzyNameMatch(patient.fullName, name);
				if (fuzzyCheck.isMatch) {
					if (fuzzyCheck.isExact) {
						nameDuplicateScore = 95;
						nameReason = "name";
					} else {
						nameDuplicateScore = fuzzyCheck.maxDistance === 1 ? 75 : 65;
						nameReason = "fuzzy_name";
						nameIsFuzzy = true;
						nameSuggested = patient.fullName || undefined;
					}
				}
			}
		}

		let phoneDuplicateScore = 0;
		if (phoneDigits.length >= 4) {
			const queryDigits = phoneDigits;
			const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
			const patientNational = normalizePhoneToNational(patient.phone);
			const queryNational = normalizePhoneToNational(phone);

			if (
				queryDigits.length >= 10 &&
				patientNational &&
				patientNational === queryNational
			) {
				phoneDuplicateScore = 100;
			} else if (
				patientPhoneDigits.length >= 10 &&
				queryDigits.length >= 10 &&
				patientPhoneDigits.slice(-10) === queryDigits.slice(-10)
			) {
				phoneDuplicateScore = 100;
			} else if (patientPhoneDigits.endsWith(phoneDigits)) {
				phoneDuplicateScore = 85;
			} else if (
				patientPhoneDigits.includes(phoneDigits) ||
				(queryNational.length >= 4 && patientNational.includes(queryNational))
			) {
				phoneDuplicateScore = 75;
			} else if ((patient as any).administrativeProfile?.legalRepresentativePhone) {
				const repPhone = (patient as any).administrativeProfile.legalRepresentativePhone;
				const repPhoneDigits = repPhone.replace(/\D/g, "");
				const repNational = normalizePhoneToNational(repPhone);
				if (
					queryDigits.length >= 10 &&
					repNational &&
					repNational === queryNational
				) {
					phoneDuplicateScore = 90;
				} else if (
					repPhoneDigits.endsWith(phoneDigits) ||
					repPhoneDigits.includes(phoneDigits)
				) {
					phoneDuplicateScore = 75;
				}
			}
		}

		// Проверка даты рождения
		let dobMatched = false;
		if (birthDate && patient.birthDate) {
			const cleanQueryDob = birthDate.replace(/\D/g, "");
			const cleanPatientDob = patient.birthDate.replace(/\D/g, "");
			if (cleanQueryDob === cleanPatientDob && cleanQueryDob.length >= 8) {
				dobMatched = true;
			}
		}

		const nameMatched = nameDuplicateScore >= 35;
		const phoneMatched = phoneDuplicateScore >= 50;

		if (!nameMatched && !phoneMatched && !dobMatched) {
			continue;
		}

		let finalScore = 0;
		let duplicateReason: "name" | "phone" | "both" | "fuzzy_name" | "birth_date_and_name" = "name";
		let matchedBy:
			| "name"
			| "phone"
			| "both"
			| "fuzzy_name"
			| "card"
			| "rep_phone"
			| "birth_date" = "name";
		let isFuzzy = false;
		let suggestedName: string | undefined = undefined;
		let explanation = "";

		if (nameMatched && phoneMatched) {
			finalScore = 100;
			duplicateReason = "both";
			matchedBy = "both";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = "Совпадение по ФИО и телефонному номеру";
		} else if (dobMatched && nameMatched) {
			// Совпадение даты рождения + нечеткое ФИО
			finalScore = Math.max(90, nameDuplicateScore);
			duplicateReason = "birth_date_and_name";
			matchedBy = nameIsFuzzy ? "fuzzy_name" : "birth_date";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = `Совпадение даты рождения (${patient.birthDate}) и ФИО`;
		} else if (phoneMatched && !nameMatched) {
			finalScore = phoneDuplicateScore;
			duplicateReason = "phone";
			matchedBy = "phone";
			isFuzzy = false;
			explanation = "Совпадение по номеру телефона";
		} else {
			finalScore = nameDuplicateScore;
			duplicateReason = nameReason || "name";
			matchedBy = nameIsFuzzy ? "fuzzy_name" : "name";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = nameIsFuzzy
				? `Похожее ФИО (вероятная опечатка)`
				: "Совпадение по ФИО";
		}

		if (finalScore < threshold) {
			continue;
		}

		const fullNameHighlights = name.length >= 2
			? highlightSearchMatches(patient.fullName, name)
			: [{ text: patient.fullName || "Пациент", isMatch: false }];

		const phoneHighlights = phoneDigits.length >= 3
			? highlightSearchMatches(patient.phone, phone)
			: [{ text: patient.phone || "—", isMatch: false }];

		const cardNumber = (patient as any).cardNumber ?? undefined;

		results.push({
			patient,
			score: finalScore,
			fullNameHighlights,
			phoneHighlights,
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, name || phone) : undefined,
			matchedBy,
			isFuzzy,
			suggestedName,
			duplicateReason,
			explanation,
		});
	}

	return results
		.sort(
			(a, b) =>
				b.score - a.score ||
				(a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"),
		)
		.slice(0, limit);
}

// ============================================================================
// 2. НЕРАЗРУШАЮЩЕЕ СЛИЯНИЕ ДАННЫХ ПАЦИЕНТА (NON-DESTRUCTIVE MERGE)
// ============================================================================

/**
 * Выполняет строгое неразрушающее слияние двух объектов пациента в памяти / клиенте.
 * Правила:
 * 1. Баланс: семейный и личный баланс суммируются целочисленно с точностью до копейки.
 * 2. Аллергии: строгое объединение множеств (UNION). Ни одна аллергия не теряется!
 * 3. Соматические факторы риска: логическое объединение (primary || duplicate).
 * 4. Административные реквизиты: заполняются из дубля, если в основном отсутствовали.
 * 5. Дубль помечается как mergedIntoPatientId = primary.id, статус "archived".
 */
export function mergePatientRecordsNonDestructive(
	primary: Patient,
	duplicate: Patient,
	reason: string = "Объединение дубликата карты",
): MergedPatientResult {
	if (primary.id === duplicate.id) {
		throw new Error("Невозможно объединить карточку саму с собой");
	}

	// 1. Точный расчет баланса в копейках
	const primBalanceKop = Math.round(Number(primary.balanceRub ?? (primary as any).balance ?? 0) * 100);
	const dupBalanceKop = Math.round(Number(duplicate.balanceRub ?? (duplicate as any).balance ?? 0) * 100);
	const combinedBalanceRub = (primBalanceKop + dupBalanceKop) / 100;

	// 2. Строгое объединение аллергий (UNION)
	const rawAllergiesA = ((primary as any).allergies as string | undefined) ?? "";
	const rawAllergiesB = ((duplicate as any).allergies as string | undefined) ?? "";

	const splitAllergies = (str: string) =>
		str
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean);

	const allergyTokens = Array.from(
		new Set([...splitAllergies(rawAllergiesA), ...splitAllergies(rawAllergiesB)]),
	);
	const unitedAllergies = allergyTokens.join("; ");

	// 3. Строгое объединение профиля клинической безопасности (Clinical Safety Profile)
	const safetyA = (primary as any).clinicalSafetyProfile || {};
	const safetyB = (duplicate as any).clinicalSafetyProfile || {};

	const unitedSafetyProfile: Record<string, unknown> = {
		...safetyA,
		// Аллергии
		hasLidocaineAllergy: Boolean(safetyA.hasLidocaineAllergy || safetyB.hasLidocaineAllergy),
		hasArticaineAllergy: Boolean(safetyA.hasArticaineAllergy || safetyB.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(safetyA.hasMepivacaineAllergy || safetyB.hasMepivacaineAllergy),
		hasSulfiteAllergy: Boolean(safetyA.hasSulfiteAllergy || safetyB.hasSulfiteAllergy),
		hasAnestheticAllergy: Boolean(safetyA.hasAnestheticAllergy || safetyB.hasAnestheticAllergy),
		hasIodineAllergy: Boolean(safetyA.hasIodineAllergy || safetyB.hasIodineAllergy),
		hasAnaphylaxisHistory: Boolean(safetyA.hasAnaphylaxisHistory || safetyB.hasAnaphylaxisHistory),
		// Соматика
		hasPacemakerExs: Boolean(safetyA.hasPacemakerExs || safetyB.hasPacemakerExs),
		hasCardiovascularDisease: Boolean(safetyA.hasCardiovascularDisease || safetyB.hasCardiovascularDisease),
		hasHypertension: Boolean(safetyA.hasHypertension || safetyB.hasHypertension),
		takesAnticoagulants: Boolean(safetyA.takesAnticoagulants || safetyB.takesAnticoagulants),
		takesBisphosphonates: Boolean(safetyA.takesBisphosphonates || safetyB.takesBisphosphonates),
		hasDiabetesMellitus: Boolean(safetyA.hasDiabetesMellitus || safetyB.hasDiabetesMellitus),
		hasBronchialAsthma: Boolean(safetyA.hasBronchialAsthma || safetyB.hasBronchialAsthma),
		hasEpilepsy: Boolean(safetyA.hasEpilepsy || safetyB.hasEpilepsy),
		hasHepatitis: Boolean(safetyA.hasHepatitis || safetyB.hasHepatitis),
		hasHiv: Boolean(safetyA.hasHiv || safetyB.hasHiv),
		hasPenicillinAllergy: Boolean(safetyA.hasPenicillinAllergy || safetyB.hasPenicillinAllergy),
		hasLatexAllergy: Boolean(safetyA.hasLatexAllergy || safetyB.hasLatexAllergy),
		hasNsaidAllergy: Boolean(safetyA.hasNsaidAllergy || safetyB.hasNsaidAllergy),
	};

	const unitedSafetyFlags: string[] = [];
	if (unitedSafetyProfile.hasLidocaineAllergy) unitedSafetyFlags.push("Аллергия на лидокаин");
	if (unitedSafetyProfile.hasArticaineAllergy) unitedSafetyFlags.push("Аллергия на артикаин");
	if (unitedSafetyProfile.hasMepivacaineAllergy) unitedSafetyFlags.push("Аллергия на мепивакаин");
	if (unitedSafetyProfile.hasPacemakerExs) unitedSafetyFlags.push("Кардиостимулятор (ЭКС)");
	if (unitedSafetyProfile.takesAnticoagulants) unitedSafetyFlags.push("Антикоагулянтная терапия");
	if (unitedSafetyProfile.takesBisphosphonates) unitedSafetyFlags.push("Бисфосфонаты (риск остеонекроза)");
	if (unitedSafetyProfile.hasBronchialAsthma) unitedSafetyFlags.push("Бронхиальная астма");
	if (unitedSafetyProfile.hasDiabetesMellitus) unitedSafetyFlags.push("Сахарный диабет");
	if (unitedSafetyProfile.hasHypertension) unitedSafetyFlags.push("Гипертония");

	// 4. Дозаполнение административного профиля
	const adminA = (primary.administrativeProfile as Record<string, unknown> | null) || {};
	const adminB = (duplicate.administrativeProfile as Record<string, unknown> | null) || {};
	const unitedAdminProfile: Record<string, unknown> = { ...adminA };

	for (const [key, val] of Object.entries(adminB)) {
		if (
			(unitedAdminProfile[key] === null ||
				unitedAdminProfile[key] === undefined ||
				unitedAdminProfile[key] === "") &&
			val !== null &&
			val !== undefined &&
			val !== ""
		) {
			unitedAdminProfile[key] = val;
		}
	}

	// 5. Заметки
	const primNotes = primary.notes?.trim() || "";
	const dupNotes = duplicate.notes?.trim() || "";
	const auditNote = `[152-ФЗ Аудит слияния: ${new Date().toISOString()}] Карточка объединена с дубликатом «${duplicate.fullName}» (ID: ${duplicate.id}). Причина: ${reason}.`;
	const combinedNotes = [primNotes, dupNotes ? `Заметки из дубликата: ${dupNotes}` : "", auditNote]
		.filter(Boolean)
		.join("\n\n");

	const primaryPatient: Patient = {
		...primary,
		phone: primary.phone || duplicate.phone,
		birthDate: primary.birthDate || duplicate.birthDate,
		email: primary.email || duplicate.email,
		balanceRub: combinedBalanceRub,
		familyGroupId: primary.familyGroupId || duplicate.familyGroupId,
		notes: combinedNotes,
		administrativeProfile: unitedAdminProfile as any,
		...({
			allergies: unitedAllergies,
			clinicalSafetyProfile: unitedSafetyProfile,
		} as any),
	};

	const archivedDuplicatePatient: Patient = {
		...duplicate,
		status: "archived" as any,
		mergedIntoPatientId: primary.id,
		notes: `[152-ФЗ] Карточка объединена в основную карту «${primary.fullName}» (ID: ${primary.id}).`,
	};

	const summary = `Слияние завершено: Баланс объединен (${combinedBalanceRub.toFixed(2)} ₽). Аллергии и соматические риски объединены (${unitedSafetyFlags.length} факторов). Карта «${duplicate.fullName}» переведена в архив как merged_into.`;

	return {
		primaryPatient,
		archivedDuplicatePatient,
		combinedBalanceRub,
		unitedAllergies,
		unitedSafetyFlags,
		summary,
	};
}
