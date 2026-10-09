/**
 * guardianshipRules.ts
 * DENTE Dental CRM — Patient Relationships, Legal Guardians & Family Payment Engine
 * Layer 1: Statutory Guardianship Rules (FZ-323 Art. 20 & 54) & A4 Consent Documentation
 */

import {
	RF_STATUTORY_CONSENT_AGE_THRESHOLD,
	PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD,
	MAJORITY_AGE_THRESHOLD,
	type RelationshipType,
	type PatientRelationship,
	type AuthorizedSignersResolution,
	type PediatricGuardianValidation,
	type LegalGuardianConsentA4Params,
	getRelationshipLabelRu,
} from "./types.js";

function formatDateRu(dateStr?: string): string {
	if (!dateStr) return "Не указана";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return dateStr;
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
}

export function isPediatricGuardianRequired(patientAgeYears: number): boolean {
	return patientAgeYears < PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD;
}

/**
 * Formats statutory protocol of legal representative's informed consent
 * pursuant to FZ-323 Art. 20 & 54 for Form 043/u.
 *
 * Mandate 8d Item 7: STRICTLY 0 EMOJIS! Professional Russian healthcare typography.
 */
export function formatLegalGuardianConsentA4Protocol(
	params: LegalGuardianConsentA4Params,
): string {
	const clinicName = (params.clinicName || "Стоматологическая клиника").trim();
	const clinicAddress = (params.clinicAddress || "Адрес места нахождения клиники не указан").trim();
	const clinicLicense = (params.clinicLicense || "Лицензия на осуществление медицинской деятельности").trim();
	const patientName = (params.patientFullName || "Пациент").trim();
	const patientBirth = (params.patientBirthDate || "Не указана").trim();
	const cardNum = (params.patientCardNumber || "Б/Н").trim();
	const guardianName = (params.guardianFullName || "Законный представитель").trim();
	const guardianBirth = (params.guardianBirthDate || "Не указана").trim();
	const guardianPassport = (params.guardianPassport || "Паспортные данные не указаны").trim();
	const guardianPhone = (params.guardianPhone || "Телефон не указан").trim();
	const grounds = (params.documentGrounds || "Свидетельство о рождении / Решение уполномоченного органа").trim();
	const scope = (params.scopeOfTreatment || "Оказание первичной медико-санитарной специализированной стоматологической помощи").trim();
	const doctor = (params.doctorFullName || "Лечащий врач-стоматолог").trim();
	const relLabel = getRelationshipLabelRu(params.relationshipType);
	const dateStr = formatDateRu(params.consentDateIso || new Date().toISOString());

	const sep = "=".repeat(78);
	const sub = "-".repeat(78);

	const lines: string[] = [
		sep,
		"ПРОТОКОЛ ИНФОРМИРОВАННОГО ДОБРОВОЛЬНОГО СОГЛАСИЯ ЗАКОННОГО ПРЕДСТАВИТЕЛЯ",
		"НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО (ФОРМА 043/У, СТ. 20 И СТ. 54 ФЗ № 323-ФЗ)",
		sep,
		`Медицинская организация: ${clinicName}`,
		`Лицензия: ${clinicLicense}`,
		`Адрес оказания услуг: ${clinicAddress}`,
		sub,
		"1. СВЕДЕНИЯ О ПАЦИЕНТЕ (НЕСОВЕРШЕННОЛЕТНЕМ / НЕДЕЕСПОСОБНОМ ЛИЦЕ):",
		`   ФИО пациента: ${patientName}`,
		`   Дата рождения: ${patientBirth}`,
		`   Медицинская карта стоматологического больного (Форма 043/у): № ${cardNum}`,
		sub,
		"2. СВЕДЕНИЯ О ЗАКОННОМ ПРЕДСТАВИТЕЛЕ (ДОВЕРИТЕЛЕ):",
		`   ФИО представителя: ${guardianName}`,
		`   Дата рождения: ${guardianBirth}`,
		`   Статус представителя: ${relLabel}`,
		`   Документ, удостоверяющий личность: ${guardianPassport}`,
		`   Контактный телефон: ${guardianPhone}`,
		`   Документ, подтверждающий полномочия законного представителя: ${grounds}`,
		sub,
		"3. ПРЕДМЕТ СОГЛАСИЯ И ОБЪЕМ СТОМАТОЛОГИЧЕСКОГО ВМЕШАТЕЛЬСТВА:",
		`   Объем медицинской помощи: ${scope}`,
		"   В соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ",
		"   «Об основах охраны здоровья граждан в Российской Федерации» даю информированное",
		"   добровольное согласие на проведение стоматологического осмотра, диагностики,",
		"   местной анестезии и лечения несовершеннолетнего / подопечного лица.",
		"   Мне в доступной форме разъяснены цели, методы оказания медицинской помощи,",
		"   связанный с ними риск, возможные варианты вмешательства, их последствия,",
		"   а также предполагаемые результаты оказания медицинской помощи.",
		sub,
		"4. ФИНАНСОВЫЕ И РАСЧЕТНЫЕ ОБЯЗАТЕЛЬСТВА (54-ФЗ):",
		"   Законный представитель подтверждает право оплаты лечения с единого семейного",
		"   счета / депозита пациента без бюрократических барьеров и задержек.",
	];

	if (params.notes && params.notes.trim()) {
		lines.push(`   Особые клинические отметки и примечания: ${params.notes.trim()}`);
	}

	lines.push(sub);
	lines.push(`Дата подписания протокола: ${dateStr}`);
	lines.push("");
	lines.push("Подписи сторон:");
	lines.push(`Законный представитель: ____________________ / ${guardianName} /`);
	lines.push(`Лечащий врач:           ____________________ / ${doctor} /`);
	lines.push("");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(sep);

	return lines.join("\n");
}

/**
 * Resolves legal authorized signers for informed consent (ИДС) under 323-FZ Art. 20 & 54.
 */
export function resolveAuthorizedSigners(
	patientAgeYears: number,
	relationships: PatientRelationship[] = [],
): AuthorizedSignersResolution {
	const safeAge = Number.isFinite(patientAgeYears) ? Math.max(0, patientAgeYears) : 0;
	const safeRelationships = Array.isArray(relationships)
		? relationships.filter((r) => r && typeof r === "object")
		: [];

	if (safeAge < RF_STATUTORY_CONSENT_AGE_THRESHOLD) {
		const signers = safeRelationships.filter(
			(r) =>
				r.canSignConsent === true ||
				r.relationshipType === "parent" ||
				r.relationshipType === "guardian",
		);

		const firstSigner = signers[0];
		return {
			requiresRepresentative: true,
			authorizedSigners: signers,
			defaultSignerName:
				firstSigner
					? firstSigner.relatedPatientName
					: "Требуется законный представитель (родитель/опекун)",
		};
	}

	const optionalDelegates = safeRelationships.filter((r) => r.canSignConsent === true);

	return {
		requiresRepresentative: false,
		authorizedSigners: optionalDelegates,
		defaultSignerName: "Пациент (самостоятельно)",
	};
}

/**
 * Formats a clean, professional A4 printout protocol of family relationships & legal guardians.
 *
 * Mandate 8d item 7 invariant: Strictly 0 emojis in clinical & legal documents.
 */
export function formatKinshipSummaryA4(
	relationships: PatientRelationship[],
	patientName: string,
): string {
	const safeName = typeof patientName === "string" && patientName.trim()
		? patientName.trim()
		: "Пациент";

	const safeList = Array.isArray(relationships)
		? relationships.filter((r) => r && typeof r === "object" && typeof r.relatedPatientName === "string")
		: [];

	const lines: string[] = [];
	const separator = "=".repeat(78);
	const subSeparator = "-".repeat(78);

	lines.push(separator);
	lines.push("ПРОТОКОЛ СЕМЕЙНЫХ СВЯЗЕЙ И ЗАКОННЫХ ПРЕДСТАВИТЕЛЕЙ (ФОРМА 043/У)");
	lines.push("РЕЕСТР РОДСТВЕННЫХ ОТНОШЕНИЙ, ПРАВ ПОДПИСИ И СОГЛАСИЙ (СТ. 20 № 323-ФЗ, 54-ФЗ)");
	lines.push(separator);
	lines.push(`Пациент: ${safeName}`);
	lines.push(`Дата формирования реестра: ${formatDateRu(new Date().toISOString())}`);
	lines.push(`Всего зарегистрировано связей: ${safeList.length}`);
	lines.push(separator);
	lines.push("");

	if (safeList.length === 0) {
		lines.push("Записи о родственных связях и законных представителях отсутствуют.");
		lines.push("");
	} else {
		for (let i = 0; i < safeList.length; i++) {
			const rel = safeList[i];
			if (!rel) {
				continue;
			}
			const indexStr = String(i + 1).padStart(3, "0");
			const directLabel = getRelationshipLabelRu(rel.relationshipType);
			const inverseLabel = getRelationshipLabelRu(rel.inverseType || "other");

			lines.push(`[${indexStr}] Связанное лицо: ${rel.relatedPatientName}`);
			lines.push(`      Степень родства: ${directLabel} (встречный статус: ${inverseLabel})`);
			lines.push(
				`      Право подписи ИДС (ст. 20 № 323-ФЗ): ${
					rel.canSignConsent ? "Да (законный представитель)" : "Нет"
				}`,
			);
			lines.push(
				`      Финансовый плательщик (54-ФЗ): ${
					rel.isFinancialPayer ? "Да (семейный счет)" : "Нет"
				}`,
			);
			lines.push(
				`      Экстренная связь: ${rel.isEmergencyContact ? "Да" : "Нет"}`,
			);

			if (rel.notes && rel.notes.trim()) {
				lines.push(`      Примечания: ${rel.notes.trim()}`);
			} else {
				lines.push("      Примечания: —");
			}

			if (i < safeList.length - 1) {
				lines.push(subSeparator);
			}
		}
		lines.push("");
	}

	lines.push(separator);
	lines.push("Документ сформирован в медицинской информационной системе DENTE Dental CRM.");
	lines.push("Подпись регистратора / уполномоченного лица: ____________________ / ____________________");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}

/**
 * Evaluates whether a guardian relationship is legally authorized to sign medical consent
 * under FZ-323 Art. 20 and Art. 54.
 */
export function validateGuardianForMinor(
	patientAgeYears: number,
	relationships: readonly {
		relatedPatientId: string;
		relatedPatientName?: string;
		relationshipType: RelationshipType | string;
		isLegalGuardian?: boolean;
		canSignConsent?: boolean;
	}[],
): PediatricGuardianValidation {
	const isMinor = patientAgeYears < MAJORITY_AGE_THRESHOLD;
	const requiresGuardianForConsent = patientAgeYears < PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD;

	if (!requiresGuardianForConsent) {
		return {
			isMinor,
			requiresGuardianForConsent: false,
			hasValidGuardian: true,
			guardianPatientId: null,
			guardianFullName: null,
			guardianRelationshipType: null,
			validationMessageRu: "Пациент вправе подписывать ИДС и медицинские согласия самостоятельно (≥ 15 лет).",
		};
	}

	const validGuardian = relationships.find(
		(r) =>
			r.isLegalGuardian ||
			r.canSignConsent ||
			r.relationshipType === "parent" ||
			r.relationshipType === "guardian",
	);

	if (validGuardian) {
		return {
			isMinor: true,
			requiresGuardianForConsent: true,
			hasValidGuardian: true,
			guardianPatientId: validGuardian.relatedPatientId,
			guardianFullName: validGuardian.relatedPatientName ?? null,
			guardianRelationshipType: validGuardian.relationshipType,
			validationMessageRu: `Законный представитель подтвержден: ${getRelationshipLabelRu(validGuardian.relationshipType as RelationshipType)}.`,
		};
	}

	return {
		isMinor: true,
		requiresGuardianForConsent: true,
		hasValidGuardian: false,
		guardianPatientId: null,
		guardianFullName: null,
		guardianRelationshipType: null,
		validationMessageRu: "ВНИМАНИЕ: Пациент младше 15 лет. Требуется прикрепить родителя или опекуна для подписания ИДС (ФЗ-323).",
	};
}
