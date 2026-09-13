/**
 * patientRelationshipsEngine.ts
 * DENTE Dental CRM — Patient Relationships, Legal Guardians & Family Payment Engine (Wave 133)
 *
 * Reverse-engineered & adapted from DentalPin (backend/app/modules/patient_relationships):
 * - Directional patient-to-patient relationship graph with mutual inversion.
 * - Russian Federation statutory thresholds (FZ-323 Art. 20, 54 & FZ-54).
 * - Legal representative authorization (canSignConsent for pediatric patients < 15 years old).
 * - Financial payer resolution and family wallet permissions (isFinancialGuarantor, Mandate 8e).
 * - Emergency contact identification.
 * - Printable A4 kinship & legal guardian consent protocol with strictly 0 emojis (Mandate 8d item 7).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. RELATIONSHIP TYPES & INVERSION MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
	"parent",
	"child",
	"spouse",
	"sibling",
	"guardian",
	"ward",
	"other",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);

/**
 * Reciprocal inversion matrix matching DentalPin schemas.py & RF family law:
 * - parent <-> child
 * - guardian <-> ward
 * - spouse <-> spouse (symmetric)
 * - sibling <-> sibling (symmetric)
 * - other <-> other (symmetric)
 */
export const INVERSE_RELATIONSHIP_TYPE: Record<RelationshipType, RelationshipType> = {
	parent: "child",
	child: "parent",
	guardian: "ward",
	ward: "guardian",
	spouse: "spouse",
	sibling: "sibling",
	other: "other",
};

export const INVERSE_RELATIONSHIP_MAP: Record<string, string> = {
	parent: "child",
	child: "parent",
	guardian: "ward",
	ward: "guardian",
	spouse: "spouse",
	sibling: "sibling",
	grandparent: "grandchild",
	grandchild: "grandparent",
	payer: "other",
	trustee: "ward",
	other: "other",
};

/**
 * Returns the reciprocal / inverse relationship type from the counterparty's perspective.
 */
export function getInverseRelationshipType(type: RelationshipType | string): RelationshipType {
	return (INVERSE_RELATIONSHIP_MAP[type] as RelationshipType) ?? "other";
}

/**
 * Alias for getInverseRelationshipType (Wave 124 compatibility).
 */
export const getInverseRelationship = getInverseRelationshipType;

/**
 * Type guard for RelationshipType.
 */
export function isRelationshipType(value: unknown): value is RelationshipType {
	return (
		typeof value === "string" &&
		(RELATIONSHIP_TYPES as readonly string[]).includes(value)
	);
}

export const PATIENT_RELATIONSHIP_TYPES = [
	"parent",
	"child",
	"spouse",
	"guardian",
	"payer",
	"other",
] as const;

export const patientRelationshipTypeSchema = z.enum(PATIENT_RELATIONSHIP_TYPES);
export type PatientRelationshipType = z.infer<typeof patientRelationshipTypeSchema>;

export const PATIENT_RELATIONSHIP_LABELS_RU: Record<PatientRelationshipType, string> = {
	parent: "Родитель",
	child: "Ребенок",
	spouse: "Супруг / Супруга",
	guardian: "Опекун / Законный представитель",
	payer: "Основной плательщик / Спонсор лечения",
	other: "Родственник",
};

export const PATIENT_INVERSE_RELATIONSHIP_TYPE: Record<
	PatientRelationshipType,
	PatientRelationshipType
> = {
	parent: "child",
	child: "parent",
	guardian: "child",
	spouse: "spouse",
	payer: "other",
	other: "other",
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. FAMILY GUARANTOR PERMISSIONS & RECORD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const FAMILY_GUARANTOR_PERMISSIONS = [
	"view_medical_records",
	"sign_consents",
	"shared_balance_payment",
	"appointment_management",
] as const;

export type FamilyGuarantorPermission = (typeof FAMILY_GUARANTOR_PERMISSIONS)[number];

export const familyGuarantorPermissionSchema = z.enum(FAMILY_GUARANTOR_PERMISSIONS);

export const FAMILY_GUARANTOR_PERMISSION_LABELS_RU: Record<FamilyGuarantorPermission, string> = {
	view_medical_records: "Просмотр медицинской карты и снимков",
	sign_consents: "Подписание ИДС и юридических согласий (ст. 20 № 323-ФЗ)",
	shared_balance_payment: "Оплата с семейного счёта / депозита (Мандат 8e, 54-ФЗ)",
	appointment_management: "Управление записями и расписанием приёмов",
};

export const patientRelationshipRecordSchema = z.object({
	id: z.string().uuid("Некорректный UUID записи родства"),
	clinicId: z.string().uuid("Некорректный UUID клиники"),
	patientId: z.string().uuid("Некорректный UUID пациента"),
	relatedPatientId: z.string().uuid("Некорректный UUID связанного лица"),
	relationshipType: relationshipTypeSchema,
	isLegalGuardian: z.boolean().default(false),
	isFinancialGuarantor: z.boolean().default(false),
	permissions: z.array(familyGuarantorPermissionSchema).default([]),
	notes: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type PatientRelationshipRecord = z.infer<typeof patientRelationshipRecordSchema>;

export const resolvedPatientRelationshipSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	relatedPatientId: z.string().uuid(),
	relationshipType: relationshipTypeSchema,
	relationshipLabelRu: z.string(),
	isLegalGuardian: z.boolean(),
	isFinancialGuarantor: z.boolean(),
	permissions: z.array(familyGuarantorPermissionSchema),
	notes: z.string().nullable().optional(),
	isInverse: z.boolean(),
	createdAt: z.string().optional(),
});

export type ResolvedPatientRelationship = z.infer<typeof resolvedPatientRelationshipSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. RUSSIAN LEGAL NOMENCLATURE & LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_LABELS_RU: Record<RelationshipType, string> = {
	parent: "Мать / Отец",
	child: "Сын / Дочь",
	guardian: "Опекун (законный представитель)",
	ward: "Подопечный",
	spouse: "Супруг(а)",
	sibling: "Брат / Сестра",
	other: "Связанное лицо / Другой представитель",
};

export const EMR_RELATIONSHIP_LABELS_RU: Record<string, { direct: string; inverse: string }> = {
	parent: { direct: "Родитель (Отец/Мать)", inverse: "Ребёнок (Сын/Дочь)" },
	child: { direct: "Ребёнок (Сын/Дочь)", inverse: "Родитель (Отец/Мать)" },
	guardian: { direct: "Опекун / Законный представитель", inverse: "Подопечный" },
	ward: { direct: "Подопечный", inverse: "Опекун / Законный представитель" },
	spouse: { direct: "Супруг / Супруга", inverse: "Супруг / Супруга" },
	sibling: { direct: "Брат / Сестра", inverse: "Брат / Сестра" },
	grandparent: { direct: "Дедушка / Бабушка", inverse: "Внук / Внучка" },
	grandchild: { direct: "Внук / Внучка", inverse: "Дедушка / Бабушка" },
	other: { direct: "Другой родственник / Представитель", inverse: "Связанный пациент" },
};

/**
 * Returns human-readable Russian statutory nomenclature for a relationship type.
 * Supports boolean isInverse (Wave 124) or "direct" | "inverse" string perspective (EMR).
 */
export function getRelationshipLabelRu(
	type: RelationshipType | string,
	isInverseOrPerspective: boolean | "direct" | "inverse" = false,
): string {
	if (typeof isInverseOrPerspective === "string") {
		const emrLabel = EMR_RELATIONSHIP_LABELS_RU[type];
		if (emrLabel) {
			return isInverseOrPerspective === "inverse" ? emrLabel.inverse : emrLabel.direct;
		}
	}
	const isInverse = isInverseOrPerspective === true || isInverseOrPerspective === "inverse";
	const effectiveType = isInverse ? getInverseRelationshipType(type) : (type as RelationshipType);
	return RELATIONSHIP_LABELS_RU[effectiveType] ?? "Связанное лицо";
}

/**
 * Under FZ-323 Art. 20 part 2 and Art. 54 part 2:
 * Minors under 15 years old cannot sign informed voluntary medical consent (ИДС) independently.
 * Consent must be signed by a legal representative (parent, guardian, or trustee).
 * From 15 years of age, pediatric patients have legal capacity to sign ИДС themselves.
 */
export const RF_STATUTORY_CONSENT_AGE_THRESHOLD = 15;
export const PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD = 15;
export const MAJORITY_AGE_THRESHOLD = 18;

export function isPediatricGuardianRequired(patientAgeYears: number): boolean {
	return patientAgeYears < PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LEGACY SCHEMAS & INTERFACES (Wave 124 & EMR Compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export const patientRelationshipSchema = z.object({
	id: z.string().uuid("Некорректный UUID записи родства"),
	clinicId: z.string().uuid().optional(),
	patientId: z.string().uuid("Некорректный UUID пациента"),
	relatedPatientId: z.string().uuid("Некорректный UUID связанного лица"),
	relatedPatientName: z.string().min(1, "ФИО связанного лица обязательно").optional().default("Связанное лицо"),
	relationshipType: z.string(),
	inverseType: z.string().optional(),
	isLegalGuardian: z.boolean().optional().default(false),
	canShareBalance: z.boolean().optional().default(false),
	canSignConsent: z.boolean().optional().default(false),
	isFinancialPayer: z.boolean().optional().default(false),
	isEmergencyContact: z.boolean().optional().default(true),
	notes: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type PatientRelationship = z.infer<typeof patientRelationshipSchema>;

export const createRelationshipInputSchema = z.object({
	id: z.string().uuid().optional(),
	inverseId: z.string().uuid().optional(),
	clinicId: z.string().uuid().optional(),
	patientId: z.string().uuid("Некорректный UUID пациента").optional(),
	patientName: z.string().optional(),
	relatedPatientId: z.string().uuid("Некорректный UUID связанного лица"),
	relatedPatientName: z.string().min(1, "ФИО связанного лица обязательно").optional().default("Связанное лицо"),
	relationshipType: z.enum([
		"parent",
		"child",
		"spouse",
		"sibling",
		"guardian",
		"ward",
		"payer",
		"other",
	]),
	canSignConsent: z.boolean().optional().default(false),
	isFinancialPayer: z.boolean().optional().default(false),
	isEmergencyContact: z.boolean().optional().default(true),
	isPrimaryPayer: z.boolean().optional().default(false),
	canViewRecords: z.boolean().optional().default(true),
	canSignConsents: z.boolean().optional().default(false),
	notes: z.string().nullable().optional(),
	createdAt: z.string().optional(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipInputSchema>;
export const createPatientRelationshipSchema = createRelationshipInputSchema;
export type CreatePatientRelationshipInput = CreateRelationshipInput;

export const updateRelationshipInputSchema = z.object({
	relationshipType: z.string().optional(),
	canSignConsent: z.boolean().optional(),
	canSignConsents: z.boolean().optional(),
	isFinancialPayer: z.boolean().optional(),
	isPrimaryPayer: z.boolean().optional(),
	canViewRecords: z.boolean().optional(),
	isEmergencyContact: z.boolean().optional(),
	isLegalGuardian: z.boolean().optional(),
	canShareBalance: z.boolean().optional(),
	notes: z.string().nullable().optional(),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipInputSchema>;
export const updatePatientRelationshipSchema = updateRelationshipInputSchema;
export type UpdatePatientRelationshipInput = UpdateRelationshipInput;

export const familyMemberSchema = z.object({
	patientId: z.string().uuid(),
	fullName: z.string().min(1),
	dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	ageYears: z.number().int().min(0).max(130).optional(),
	relationshipToHead: z.string(),
	balanceKopecks: z.number().int().default(0),
	isHeadOfFamily: z.boolean().default(false),
	isMinor: z.boolean().default(false),
	canUseSharedDeposit: z.boolean().default(true),
});
export type FamilyMember = z.infer<typeof familyMemberSchema>;

export const familyGroupSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	familyName: z.string().min(1).max(200),
	headPatientId: z.string().uuid(),
	members: z.array(familyMemberSchema).min(1),
	sharedDepositBalanceKopecks: z.number().int().default(0),
	notes: z.string().max(2000).nullable().optional().default(null),
	createdAt: z.string().datetime().optional(),
});
export type FamilyGroup = z.infer<typeof familyGroupSchema>;

export const pediatricGuardianValidationSchema = z.object({
	isMinor: z.boolean(),
	requiresGuardianForConsent: z.boolean(),
	hasValidGuardian: z.boolean(),
	guardianPatientId: z.string().uuid().nullable(),
	guardianFullName: z.string().nullable(),
	guardianRelationshipType: z.string().nullable(),
	validationMessageRu: z.string().nullable(),
});
export type PediatricGuardianValidation = z.infer<typeof pediatricGuardianValidationSchema>;

export const patientFamilyRelationshipRecordSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	relatedPatientId: z.string().uuid(),
	relationshipType: patientRelationshipTypeSchema,
	isPrimaryPayer: z.boolean().default(false),
	canViewRecords: z.boolean().default(true),
	canSignConsents: z.boolean().default(false),
	notes: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});
export type PatientFamilyRelationshipRecord = z.infer<
	typeof patientFamilyRelationshipRecordSchema
>;

export const patientFamilyTreeMemberSchema = z.object({
	id: z.string().uuid(),
	fullName: z.string().default("—"),
	phone: z.string().nullable().optional(),
	birthDate: z.string().nullable().optional(),
	isMinor: z.boolean().default(false),
	relationshipId: z.string().uuid(),
	relationshipType: patientRelationshipTypeSchema,
	relationshipLabelRu: z.string(),
	isPrimaryPayer: z.boolean().default(false),
	canViewRecords: z.boolean().default(true),
	canSignConsents: z.boolean().default(false),
	notes: z.string().nullable().optional(),
	isInverse: z.boolean().default(false),
});
export type PatientFamilyTreeMember = z.infer<
	typeof patientFamilyTreeMemberSchema
>;

export interface AuthorizedSignersResolution {
	requiresRepresentative: boolean;
	authorizedSigners: PatientRelationship[];
	defaultSignerName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateUUID(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function formatDateRu(dateStr?: string): string {
	if (!dateStr) return "Не указана";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return dateStr;
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. WAVE 133 CORE DOMAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforms a list of directional relationship links to the perspective of the specified patient.
 * Aligned with DentalPin service.list_relationships_for_patient logic:
 * - If patient is the source, retains relationshipType.
 * - If patient is the target, inverts relationshipType so the list always reads "this person is my ___".
 */
export function buildBidirectionalRelationshipList(
	patientId: string,
	links: readonly PatientRelationshipRecord[] = [],
): ResolvedPatientRelationship[] {
	const targetId = typeof patientId === "string" ? patientId.trim() : "";
	if (!targetId || !Array.isArray(links)) return [];

	const results: ResolvedPatientRelationship[] = [];

	for (const r of links) {
		if (!r || typeof r !== "object") continue;

		if (r.patientId === targetId) {
			results.push({
				id: r.id,
				clinicId: r.clinicId,
				patientId: targetId,
				relatedPatientId: r.relatedPatientId,
				relationshipType: r.relationshipType,
				relationshipLabelRu: getRelationshipLabelRu(r.relationshipType),
				isLegalGuardian: Boolean(r.isLegalGuardian),
				isFinancialGuarantor: Boolean(r.isFinancialGuarantor),
				permissions: Array.isArray(r.permissions) ? [...r.permissions] : [],
				notes: r.notes ?? null,
				isInverse: false,
				createdAt: r.createdAt,
			});
		} else if (r.relatedPatientId === targetId) {
			const invType = getInverseRelationshipType(r.relationshipType);
			results.push({
				id: r.id,
				clinicId: r.clinicId,
				patientId: targetId,
				relatedPatientId: r.patientId,
				relationshipType: invType,
				relationshipLabelRu: getRelationshipLabelRu(invType),
				isLegalGuardian: Boolean(r.isLegalGuardian),
				isFinancialGuarantor: Boolean(r.isFinancialGuarantor),
				permissions: Array.isArray(r.permissions) ? [...r.permissions] : [],
				notes: r.notes ?? null,
				isInverse: true,
				createdAt: r.createdAt,
			});
		}
	}

	return results;
}

/**
 * Validates whether a new relationship can be established without self-linking
 * or duplicate link creation in either direction (DentalPin create_relationship invariant).
 */
export function validateRelationshipPair(
	patientId: string,
	relatedPatientId: string,
	existingLinks: readonly PatientRelationshipRecord[] = [],
): { valid: boolean; reason?: string } {
	const pId = typeof patientId === "string" ? patientId.trim() : "";
	const rId = typeof relatedPatientId === "string" ? relatedPatientId.trim() : "";

	if (!pId || !rId) {
		return {
			valid: false,
			reason: "ID обоих пациентов обязательны для установления связи",
		};
	}

	if (pId === rId) {
		return {
			valid: false,
			reason: "Пациент не может быть связан сам с собой",
		};
	}

	const isDuplicate = existingLinks.some(
		(link) =>
			(link.patientId === pId && link.relatedPatientId === rId) ||
			(link.patientId === rId && link.relatedPatientId === pId),
	);

	if (isDuplicate) {
		return {
			valid: false,
			reason: "Связь между данными пациентами уже существует в базе данных",
		};
	}

	return { valid: true };
}

export interface FamilyPaymentAuthorizationResult {
	readonly authorized: boolean;
	readonly relationDescription?: string;
}

/**
 * Evaluates whether a payer is authorized to settle bills on behalf of a patient.
 * Enforces Mandate 8e (Doctor Autonomy & Zero-Friction Cashier 54-FZ):
 * - Self-payment is always authorized.
 * - Parents, legal guardians, and spouses have full automatic payment rights.
 * - Explicit financial guarantors and shared balance permissions are honored without barrier prompts.
 */
export function evaluateFamilyPaymentAuthorization(
	payerPatientId: string,
	patientId: string,
	relationships: readonly PatientRelationshipRecord[] = [],
): FamilyPaymentAuthorizationResult {
	const payerId = typeof payerPatientId === "string" ? payerPatientId.trim() : "";
	const targetId = typeof patientId === "string" ? patientId.trim() : "";

	if (!payerId || !targetId) {
		return {
			authorized: false,
			relationDescription: "Идентификаторы плательщика и пациента обязательны",
		};
	}

	// Self-payment: always authorized
	if (payerId === targetId) {
		return {
			authorized: true,
			relationDescription: "Пациент оплачивает лечение самостоятельно",
		};
	}

	if (!Array.isArray(relationships) || relationships.length === 0) {
		return {
			authorized: false,
			relationDescription: "Связи между пациентами не найдены",
		};
	}

	// Search for matching link in either orientation
	const link = relationships.find(
		(r) =>
			(r.patientId === targetId && r.relatedPatientId === payerId) ||
			(r.patientId === payerId && r.relatedPatientId === targetId),
	);

	if (!link) {
		return {
			authorized: false,
			relationDescription: "Отсутствует подтвержденная родственная связь или финансовое поручительство",
		};
	}

	// Determine payer's role relative to patient
	const payerRelationToPatient: RelationshipType =
		link.patientId === targetId
			? link.relationshipType
			: getInverseRelationshipType(link.relationshipType);

	const hasSharedBalancePermission =
		Array.isArray(link.permissions) &&
		link.permissions.includes("shared_balance_payment");

	// Mandate 8e: Zero-friction family payments for parents, guardians, spouses, financial guarantors
	if (
		link.isFinancialGuarantor ||
		hasSharedBalancePermission ||
		payerRelationToPatient === "parent" ||
		payerRelationToPatient === "guardian" ||
		payerRelationToPatient === "spouse" ||
		payerRelationToPatient === "sibling"
	) {
		let description = getRelationshipLabelRu(payerRelationToPatient);
		if (link.isFinancialGuarantor) {
			description += " (финансовый поручитель)";
		} else if (hasSharedBalancePermission) {
			description += " (семейный баланс)";
		}

		return {
			authorized: true,
			relationDescription: description,
		};
	}

	return {
		authorized: false,
		relationDescription: "Связанное лицо не наделено правами финансового поручителя",
	};
}

export interface LegalGuardianConsentA4Params {
	readonly clinicName: string;
	readonly clinicAddress?: string | null;
	readonly clinicLicense?: string | null;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null;
	readonly patientCardNumber?: string | null;
	readonly guardianFullName: string;
	readonly guardianBirthDate?: string | null;
	readonly guardianPassport?: string | null;
	readonly guardianPhone?: string | null;
	readonly relationshipType: RelationshipType;
	readonly documentGrounds?: string | null;
	readonly scopeOfTreatment?: string | null;
	readonly consentDateIso?: string | null;
	readonly doctorFullName?: string | null;
	readonly notes?: string | null;
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
		"4. ФИНАНСОВЫЕ И РЕГЛАМЕНТНЫЕ ОБЯЗАТЕЛЬСТВА (МАНДАТ 8E, 54-ФЗ):",
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

// ─────────────────────────────────────────────────────────────────────────────
// 7. WAVE 124 DOMAIN FUNCTIONS (Full backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a bidirectional relationship pair (direct + inverse) with Mandate 8e smart defaults.
 */
export function createRelationshipPair(
	params: CreateRelationshipInput,
): { direct: PatientRelationship; inverse: PatientRelationship } {
	if (!params) {
		throw new Error("Параметры создания родственной связи обязательны");
	}

	const patientId = params.patientId ? params.patientId.trim() : "";
	const relatedPatientId = params.relatedPatientId
		? params.relatedPatientId.trim()
		: "";

	if (!patientId || !relatedPatientId) {
		throw new Error("UUID обоих пациентов обязательны для установления связи");
	}

	if (patientId === relatedPatientId) {
		throw new Error("Пациент не может быть связан сам с собой");
	}

	const relType = params.relationshipType;
	if (!isRelationshipType(relType)) {
		throw new Error(`Недопустимый тип родственной связи: ${String(relType)}`);
	}

	const invType = getInverseRelationshipType(relType);
	const timestamp = params.createdAt && params.createdAt.trim()
		? params.createdAt.trim()
		: new Date().toISOString();

	// Direct rights determination (Mandate 8e)
	const directCanSign =
		typeof params.canSignConsent === "boolean"
			? params.canSignConsent
			: relType === "parent" || relType === "guardian";

	const directIsPayer =
		typeof params.isFinancialPayer === "boolean"
			? params.isFinancialPayer
			: relType === "parent" || relType === "guardian" || relType === "spouse";

	const directIsEmergency =
		typeof params.isEmergencyContact === "boolean"
			? params.isEmergencyContact
			: true;

	const direct: PatientRelationship = {
		id: params.id || generateUUID(),
		patientId,
		relatedPatientId,
		relatedPatientName: params.relatedPatientName.trim(),
		relationshipType: relType,
		inverseType: invType,
		isLegalGuardian: relType === "parent" || relType === "guardian",
		canShareBalance: directIsPayer,
		canSignConsent: directCanSign,
		isFinancialPayer: directIsPayer,
		isEmergencyContact: directIsEmergency,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	// Inverse rights determination (perspective of related party)
	const inverseCanSign = invType === "parent" || invType === "guardian";
	const inverseIsPayer =
		invType === "parent" || invType === "guardian" || invType === "spouse";
	const inverseIsEmergency = true;

	const inverse: PatientRelationship = {
		id: params.inverseId || generateUUID(),
		patientId: relatedPatientId,
		relatedPatientId: patientId,
		relatedPatientName:
			params.patientName && params.patientName.trim()
				? params.patientName.trim()
				: "Пациент",
		relationshipType: invType,
		inverseType: relType,
		isLegalGuardian: invType === "parent" || invType === "guardian",
		canShareBalance: inverseIsPayer,
		canSignConsent: inverseCanSign,
		isFinancialPayer: inverseIsPayer,
		isEmergencyContact: inverseIsEmergency,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	return { direct, inverse };
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
 * Returns all relationships authorized as financial payers for family billing (54-FZ).
 */
export function resolveFamilyPayers(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isFinancialPayer === true);
}

/**
 * Returns all relationships designated as emergency contacts.
 */
export function resolveEmergencyContacts(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isEmergencyContact === true);
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

// ─────────────────────────────────────────────────────────────────────────────
// 8. FAMILY DEPOSITS, GUARDIAN VALIDATION & WALLET ARITHMETIC (SSOT CONSOLIDATION)
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Calculates combined aggregate balance across all family members and the shared deposit pool.
 */
export function calculateCombinedFamilyBalance(familyGroup: {
	members: readonly { balanceKopecks?: number }[];
	sharedDepositBalanceKopecks?: number;
}): {
	individualTotalKopecks: number;
	sharedDepositKopecks: number;
	grandTotalKopecks: number;
} {
	const individualTotal = familyGroup.members.reduce(
		(acc, m) => acc + (m.balanceKopecks || 0),
		0,
	);
	const sharedDeposit = familyGroup.sharedDepositBalanceKopecks || 0;
	return {
		individualTotalKopecks: individualTotal,
		sharedDepositKopecks: sharedDeposit,
		grandTotalKopecks: individualTotal + sharedDeposit,
	};
}

export interface RelationshipLinkEdge {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType?: string;
}

/**
 * Validates whether a new relationship can be established without self-linking,
 * direct duplicate edges, or circular hierarchy cycles.
 */
export function validateRelationshipLink(
	patientId: string,
	relatedPatientId: string,
	existingLinks: readonly RelationshipLinkEdge[],
	newType?: string,
): { isValid: boolean; error?: string } {
	if (!patientId || !relatedPatientId) {
		return { isValid: false, error: "ID обоих пациентов обязательны для создания связи" };
	}

	if (patientId === relatedPatientId) {
		return {
			isValid: false,
			error: "Пациент не может быть связан сам с собой",
		};
	}

	const alreadyLinked = existingLinks.some(
		(link) =>
			(link.patientId === patientId && link.relatedPatientId === relatedPatientId) ||
			(link.patientId === relatedPatientId && link.relatedPatientId === patientId),
	);

	if (alreadyLinked) {
		return {
			isValid: false,
			error: "Связь между этими пациентами уже существует в базе данных",
		};
	}

	if (newType === "parent" || newType === "guardian") {
		const visited = new Set<string>();
		const queue: string[] = [relatedPatientId];

		while (queue.length > 0) {
			const current = queue.shift()!;
			if (current === patientId) {
				return {
					isValid: false,
					error: "Обнаружен циклический конфликт в семейном древе (запрет рекурсивного родства)",
				};
			}

			if (!visited.has(current)) {
				visited.add(current);
				for (const link of existingLinks) {
					if (
						link.patientId === current &&
						(link.relationshipType === "parent" || link.relationshipType === "guardian")
					) {
						queue.push(link.relatedPatientId);
					}
				}
			}
		}
	}

	return { isValid: true };
}

export interface PayerResolutionCandidate {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType: string;
	readonly isPrimaryPayer: boolean;
}

/**
 * Identifies the designated paying guarantor for minors or dependent family members.
 * Returns the payer patient ID, relationship type, and whether the patient is self-paying.
 */
export function resolveFamilyPrimaryPayer(
	patientId: string,
	relationships: readonly PayerResolutionCandidate[],
	familyHeadId?: string | null,
): {
	payerPatientId: string;
	payerRelationshipType?: string;
	isSelfPaying: boolean;
} {
	const explicitPayer = relationships.find(
		(r) => r.patientId === patientId && r.isPrimaryPayer,
	);
	if (explicitPayer) {
		return {
			payerPatientId: explicitPayer.relatedPatientId,
			payerRelationshipType: explicitPayer.relationshipType,
			isSelfPaying: false,
		};
	}

	const parentOrGuardianPayer = relationships.find(
		(r) =>
			r.patientId === patientId &&
			(r.relationshipType === "payer" ||
				r.relationshipType === "parent" ||
				r.relationshipType === "guardian"),
	);
	if (parentOrGuardianPayer) {
		return {
			payerPatientId: parentOrGuardianPayer.relatedPatientId,
			payerRelationshipType: parentOrGuardianPayer.relationshipType,
			isSelfPaying: false,
		};
	}

	if (familyHeadId && familyHeadId !== patientId) {
		return {
			payerPatientId: familyHeadId,
			payerRelationshipType: "payer",
			isSelfPaying: false,
		};
	}

	return {
		payerPatientId: patientId,
		isSelfPaying: true,
	};
}

export interface DepositDeductionAuthParams {
	readonly spenderPatientId: string;
	readonly accountOwnerPatientId: string;
	readonly requiredAmountKopecks: number;
	readonly currentDepositBalanceKopecks: number;
	readonly relationship?: {
		readonly isPrimaryPayer?: boolean;
		readonly canViewRecords?: boolean;
		readonly relationshipType?: string;
	} | null;
	readonly isFamilyHead?: boolean;
}

export interface DepositDeductionAuthResult {
	readonly isAuthorized: boolean;
	readonly remainingBalanceKopecks: number;
	readonly failureReason?: string;
}

/**
 * Verifies if a family member is authorized to charge a shared or parent's deposit account,
 * and validates sufficient balance in kopecks.
 */
export function authorizeFamilyDepositDeduction(
	params: DepositDeductionAuthParams,
): DepositDeductionAuthResult {
	const {
		spenderPatientId,
		accountOwnerPatientId,
		requiredAmountKopecks,
		currentDepositBalanceKopecks,
		relationship,
		isFamilyHead,
	} = params;

	if (requiredAmountKopecks <= 0) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentDepositBalanceKopecks,
			failureReason: "Сумма списания должна быть строго больше нуля",
		};
	}

	if (spenderPatientId === accountOwnerPatientId) {
		if (currentDepositBalanceKopecks < requiredAmountKopecks) {
			return {
				isAuthorized: false,
				remainingBalanceKopecks: currentDepositBalanceKopecks,
				failureReason: `Недостаточно средств на депозите (требуется ${requiredAmountKopecks} коп., доступно ${currentDepositBalanceKopecks} коп.)`,
			};
		}

		return {
			isAuthorized: true,
			remainingBalanceKopecks: currentDepositBalanceKopecks - requiredAmountKopecks,
		};
	}

	const isGuarantor =
		isFamilyHead ||
		relationship?.isPrimaryPayer === true ||
		relationship?.relationshipType === "parent" ||
		relationship?.relationshipType === "guardian" ||
		relationship?.relationshipType === "spouse" ||
		relationship?.relationshipType === "payer";

	if (!isGuarantor) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentDepositBalanceKopecks,
			failureReason:
				"Пациент не имеет полномочий плательщика на списание средств с семейного депозита данного лица",
		};
	}

	if (currentDepositBalanceKopecks < requiredAmountKopecks) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentDepositBalanceKopecks,
			failureReason: `Недостаточно средств на семейном депозите (требуется ${requiredAmountKopecks} коп., доступно ${currentDepositBalanceKopecks} коп.)`,
		};
	}

	return {
		isAuthorized: true,
		remainingBalanceKopecks: currentDepositBalanceKopecks - requiredAmountKopecks,
	};
}

