/**
 * types.ts
 * DENTE Dental CRM — Patient Relationships, Legal Guardians & Family Payment Engine
 * Layer 0: Data Contracts, Schemas, Enums & Inversion Matrix
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
	shared_balance_payment: "Оплата с семейного счёта / депозита (54-ФЗ)",
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
	isLegalGuardian: z.boolean().optional(),
	canShareBalance: z.boolean().optional(),
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

export type CreateRelationshipInput = z.input<typeof createRelationshipInputSchema>;
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

export interface FamilyPaymentAuthorizationResult {
	readonly authorized: boolean;
	readonly relationDescription?: string;
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

export interface RelationshipLinkEdge {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType?: string;
}

export interface PayerResolutionCandidate {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType: string;
	readonly isPrimaryPayer: boolean;
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
