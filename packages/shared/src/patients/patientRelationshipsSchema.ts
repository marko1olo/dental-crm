/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT RELATIONSHIPS, RF LEGAL GUARDIANSHIP & FAMILY WALLET ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements:
 * 1. Directed graph of patient relationships:
 *    'parent' | 'child' | 'spouse' | 'sibling' | 'guardian' | 'ward' | 'trustee' | 'other'
 * 2. RF Legal Representative fields (Art. 64 Family Code RF, FZ-323, Art. 185 Civil Code RF):
 *    - isLegalRepresentative: законный представитель ребенка до 15 лет (подпись ИДС и договоров)
 *    - canViewMedicalRecord: доступ к дневникам и амбулаторной карте 043/у
 *    - canSignConsents: право подписи согласий (ИДС)
 *    - canSpendFamilyWallet: право оплаты услуг с общего семейного счета
 *    - documentProofNumber: реквизиты свидетельства о рождении или доверенности (ст. 185 ГК РФ)
 * 3. Dynamic mutual inversion algorithm:
 *    - parent <-> child
 *    - guardian <-> ward
 *    - trustee -> ward (ward -> guardian)
 *    - spouse <-> spouse
 *    - sibling <-> sibling
 *    - other <-> other
 */

import { z } from "zod";
import { kopecksToNumericString } from "../money.js";
import { generateSecureUuid } from "../utils/idGenerators.js";

// ─── 1. Relationship Kinds & Inverse Mapping ──────────────────────────────────

export const PATIENT_RELATIONSHIP_KINDS = [
	"parent",
	"child",
	"spouse",
	"sibling",
	"guardian",
	"ward",
	"trustee",
	"other",
] as const;

export type PatientRelationshipKind = (typeof PATIENT_RELATIONSHIP_KINDS)[number];

export const patientRelationshipKindSchema = z.enum(PATIENT_RELATIONSHIP_KINDS);

/**
 * Dynamic reciprocal / inverse relationship map.
 * When viewing from the counterparty's perspective:
 * - parent <-> child
 * - guardian <-> ward
 * - trustee -> ward (trustee is legal guardian/representative by power of attorney; counterparty is ward)
 * - ward -> guardian
 * - spouse <-> spouse
 * - sibling <-> sibling
 * - other <-> other
 */
export const INVERSE_RELATIONSHIP_MAP: Record<
	PatientRelationshipKind,
	PatientRelationshipKind
> = {
	parent: "child",
	child: "parent",
	guardian: "ward",
	ward: "guardian",
	trustee: "ward",
	spouse: "spouse",
	sibling: "sibling",
	other: "other",
};

/**
 * Inverts the relationship kind from the counterparty's perspective.
 */
export function invertRelationshipKind(
	kind: PatientRelationshipKind,
): PatientRelationshipKind {
	return INVERSE_RELATIONSHIP_MAP[kind] ?? "other";
}

// ─── 2. Russian Localization Labels ──────────────────────────────────────────

export const PATIENT_RELATIONSHIP_KIND_LABELS_RU: Record<
	PatientRelationshipKind,
	{ direct: string; inverse: string }
> = {
	parent: {
		direct: "Родитель (Отец / Мать)",
		inverse: "Ребёнок (Сын / Дочь)",
	},
	child: {
		direct: "Ребёнок (Сын / Дочь)",
		inverse: "Родитель (Отец / Мать)",
	},
	spouse: {
		direct: "Супруг / Супруга",
		inverse: "Супруг / Супруга",
	},
	sibling: {
		direct: "Брат / Сестра",
		inverse: "Брат / Сестра",
	},
	guardian: {
		direct: "Опекун (ст. 32 ГК РФ)",
		inverse: "Подопечный (Опекаемый)",
	},
	ward: {
		direct: "Подопечный",
		inverse: "Законный представитель (Опекун / Попечитель)",
	},
	trustee: {
		direct: "Попечитель / Доверенное лицо (ст. 185 ГК РФ)",
		inverse: "Подопечный / Доверитель",
	},
	other: {
		direct: "Другой родственник / Представитель",
		inverse: "Связанный пациент",
	},
};

/**
 * Returns human-readable Russian label for a relationship kind.
 */
export function getRelationshipKindLabelRu(
	kind: PatientRelationshipKind,
	perspective: "direct" | "inverse" = "direct",
): string {
	const labels = PATIENT_RELATIONSHIP_KIND_LABELS_RU[kind];
	if (!labels) return kind;
	return perspective === "direct" ? labels.direct : labels.inverse;
}

// ─── 3. Legal Statutory Thresholds (RF Law) ──────────────────────────────────

/**
 * Under FZ-323 Art. 20 and Art. 54, pediatric patients under 15 years old
 * cannot give valid informed consent themselves.
 * Informed medical consent (ИДС) must be signed by a legal representative
 * (parent pursuant to Art. 64 Family Code RF, or guardian/trustee).
 */
export const RF_PEDIATRIC_CONSENT_AGE_THRESHOLD = 15;

/**
 * Civil majority age in Russian law (Art. 21 Civil Code RF).
 */
export const RF_MAJORITY_AGE_THRESHOLD = 18;

// ─── 4. Zod DTO Schemas ──────────────────────────────────────────────────────

/**
 * Body DTO for establishing a directed relationship between patient and related patient.
 */
export const createPatientRelationshipDtoSchema = z
	.object({
		relatedPatientId: z.string().uuid("Некорректный UUID связанного пациента"),
		relationshipType: patientRelationshipKindSchema,
		isLegalRepresentative: z.boolean().optional().default(false),
		canViewMedicalRecord: z.boolean().optional().default(false),
		canSignConsents: z.boolean().optional().default(false),
		canSpendFamilyWallet: z.boolean().optional(),
		spendLimitKopecks: z.number().int().nonnegative().optional(),
		documentProofNumber: z.string().max(255).optional().nullable(),
		notes: z.string().max(2000).optional().nullable(),
		// Backward compatibility aliases
		isPrimaryPayer: z.boolean().optional(),
		canViewRecords: z.boolean().optional(),
	})
	.strict()
	.transform((data) => {
		const isCloseRelative = ["parent", "child", "spouse", "guardian", "ward"].includes(data.relationshipType);
		const defaultCanSpend = isCloseRelative ? true : (data.isPrimaryPayer ?? false);
		return {
			...data,
			canViewMedicalRecord:
				data.canViewMedicalRecord || (data.canViewRecords ?? false),
			canSpendFamilyWallet:
				data.canSpendFamilyWallet !== undefined ? data.canSpendFamilyWallet : defaultCanSpend,
		};
	});

export type CreatePatientRelationshipDto = z.infer<
	typeof createPatientRelationshipDtoSchema
>;

/**
 * Body DTO for patching access rights and legal attributes of a relationship.
 */
export const patchPatientRelationshipDtoSchema = z
	.object({
		relationshipType: patientRelationshipKindSchema.optional(),
		isLegalRepresentative: z.boolean().optional(),
		canViewMedicalRecord: z.boolean().optional(),
		canSignConsents: z.boolean().optional(),
		canSpendFamilyWallet: z.boolean().optional(),
		spendLimitKopecks: z.number().int().nonnegative().optional(),
		documentProofNumber: z.string().max(255).optional().nullable(),
		notes: z.string().max(2000).optional().nullable(),
		// Backward compatibility aliases
		isPrimaryPayer: z.boolean().optional(),
		canViewRecords: z.boolean().optional(),
	})
	.strict()
	.transform((data) => {
		const out = { ...data };
		if (out.canViewRecords !== undefined && out.canViewMedicalRecord === undefined) {
			out.canViewMedicalRecord = out.canViewRecords;
		}
		if (out.isPrimaryPayer !== undefined && out.canSpendFamilyWallet === undefined) {
			out.canSpendFamilyWallet = out.isPrimaryPayer;
		}
		return out;
	});

export type PatchPatientRelationshipDto = z.infer<
	typeof patchPatientRelationshipDtoSchema
>;

/**
 * Resolved relationship item presented to client applications.
 */
export const patientRelationshipItemSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	relatedPatientId: z.string().uuid(),
	relatedPatientName: z.string(),
	relatedPatientPhone: z.string().nullable().optional(),
	relatedPatientBirthDate: z.string().nullable().optional(),
	isMinor: z.boolean(),
	relationshipType: patientRelationshipKindSchema,
	relationshipLabelRu: z.string(),
	originalRelationshipType: patientRelationshipKindSchema,
	isInverse: z.boolean(),
	isLegalRepresentative: z.boolean(),
	canViewMedicalRecord: z.boolean(),
	canSignConsents: z.boolean(),
	canSpendFamilyWallet: z.boolean(),
	spendLimitKopecks: z.number().int().nonnegative().optional(),
	documentProofNumber: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string().optional(),
});

export type PatientRelationshipItem = z.infer<
	typeof patientRelationshipItemSchema
>;

/**
 * GET /api/patients/:patientId/relationships response schema.
 */
export const patientRelationshipsListResponseSchema = z.object({
	patientId: z.string().uuid(),
	patientFullName: z.string(),
	count: z.number().int().min(0),
	relationships: z.array(patientRelationshipItemSchema),
});

export type PatientRelationshipsListResponse = z.infer<
	typeof patientRelationshipsListResponseSchema
>;

// ─── 5. Pure Domain Business Logic ──────────────────────────────────────────

export interface LegalConsentValidationResult {
	readonly isAuthorized: boolean;
	readonly requiresLegalRepresentative: boolean;
	readonly authorizedByPatientId?: string;
	readonly justificationRu: string;
}

/**
 * Validates whether a legal representative is authorized to sign medical informed consent (ИДС)
 * under Art. 64 Family Code RF and FZ-323 Art. 20.
 */
export function validateConsentSignatureAuthorization(params: {
	patientAgeYears: number;
	signerPatientId: string;
	subjectPatientId: string;
	relationship?: {
		isLegalRepresentative?: boolean;
		canSignConsents?: boolean;
		relationshipType?: PatientRelationshipKind;
		documentProofNumber?: string | null;
	} | null;
}): LegalConsentValidationResult {
	const { patientAgeYears, signerPatientId, subjectPatientId, relationship } =
		params;

	// Case 1: Self-signing
	if (signerPatientId === subjectPatientId) {
		if (patientAgeYears < RF_PEDIATRIC_CONSENT_AGE_THRESHOLD) {
			return {
				isAuthorized: false,
				requiresLegalRepresentative: true,
				justificationRu: `Пациенту ${patientAgeYears} лет (младше 15 лет). По ст. 20, 54 ФЗ-323 согласие обязан подписать законный представитель.`,
			};
		}
		return {
			isAuthorized: true,
			requiresLegalRepresentative: false,
			authorizedByPatientId: signerPatientId,
			justificationRu:
				"Пациент достиг 15 лет и вправе самостоятельно подписывать ИДС (ст. 54 ФЗ-323).",
		};
	}

	// Case 2: Signing by counterparty (Parent / Guardian / Trustee)
	if (!relationship) {
		return {
			isAuthorized: false,
			requiresLegalRepresentative:
				patientAgeYears < RF_PEDIATRIC_CONSENT_AGE_THRESHOLD,
			justificationRu: "Родственная или законная связь с пациентом не найдена.",
		};
	}

	const hasExplicitRights =
		relationship.isLegalRepresentative === true ||
		relationship.canSignConsents === true;

	const isStatutoryGuardian =
		relationship.relationshipType === "parent" ||
		relationship.relationshipType === "guardian";

	if (hasExplicitRights || isStatutoryGuardian) {
		const roleLabel = getRelationshipKindLabelRu(
			relationship.relationshipType ?? "other",
		);
		const proofNote = relationship.documentProofNumber
			? ` (документ: ${relationship.documentProofNumber})`
			: "";

		return {
			isAuthorized: true,
			requiresLegalRepresentative:
				patientAgeYears < RF_PEDIATRIC_CONSENT_AGE_THRESHOLD,
			authorizedByPatientId: signerPatientId,
			justificationRu: `Подпись разрешена законному представителю: ${roleLabel}${proofNote}.`,
		};
	}

	return {
		isAuthorized: false,
		requiresLegalRepresentative:
			patientAgeYears < RF_PEDIATRIC_CONSENT_AGE_THRESHOLD,
		justificationRu:
			"У связанного лица отсутствуют полномочия законного представителя или право подписи ИДС.",
	};
}

export interface FamilyWalletSpendValidationResult {
	readonly isAuthorized: boolean;
	readonly remainingBalanceKopecks: number;
	readonly failureReason?: string;
}

/**
 * Validates whether a patient or related family member is authorized to spend funds
 * from the shared family deposit wallet.
 */
export function validateFamilyWalletSpend(params: {
	spenderPatientId: string;
	walletOwnerPatientId: string;
	requiredAmountKopecks: number;
	currentBalanceKopecks: number;
	relationship?: {
		canSpendFamilyWallet?: boolean;
		isLegalRepresentative?: boolean;
		relationshipType?: PatientRelationshipKind;
		spendLimitKopecks?: number | null | undefined;
	} | null;
}): FamilyWalletSpendValidationResult {
	const {
		spenderPatientId,
		walletOwnerPatientId,
		requiredAmountKopecks,
		currentBalanceKopecks,
		relationship,
	} = params;

	if (requiredAmountKopecks <= 0) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentBalanceKopecks,
			failureReason: "Сумма списания должна быть строго больше нуля",
		};
	}

	// Case 1: Wallet owner spends their own funds
	if (spenderPatientId === walletOwnerPatientId) {
		if (currentBalanceKopecks < requiredAmountKopecks) {
			return {
				isAuthorized: false,
				remainingBalanceKopecks: currentBalanceKopecks,
				failureReason: `Недостаточно средств на счете (требуется ${requiredAmountKopecks} коп., доступно ${currentBalanceKopecks} коп.)`,
			};
		}
		return {
			isAuthorized: true,
			remainingBalanceKopecks: currentBalanceKopecks - requiredAmountKopecks,
		};
	}

	// Case 2: Spender is a family member or legal representative
	// 2.1 Explicit spending ban by administrator or account holder
	if (relationship?.canSpendFamilyWallet === false) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentBalanceKopecks,
			failureReason:
				"Пациент не имеет полномочий на списание средств с семейного кошелька (canSpendFamilyWallet = false)",
		};
	}

	// 2.2 Spend limit check if configured on the relationship
	const spendLimitKop = relationship?.spendLimitKopecks;
	if (spendLimitKop !== undefined && spendLimitKop !== null && requiredAmountKopecks > spendLimitKop) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentBalanceKopecks,
			failureReason: `Превышен индивидуальный лимит списания с семейного кошелька (лимит: ${kopecksToNumericString(spendLimitKop)} ₽, требуется: ${kopecksToNumericString(requiredAmountKopecks)} ₽)`,
		};
	}

	const hasSpendPermission =
		relationship?.canSpendFamilyWallet === true ||
		relationship?.isLegalRepresentative === true ||
		relationship?.relationshipType === "parent" ||
		relationship?.relationshipType === "child" ||
		relationship?.relationshipType === "guardian" ||
		relationship?.relationshipType === "ward" ||
		relationship?.relationshipType === "spouse";

	if (!hasSpendPermission) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentBalanceKopecks,
			failureReason:
				"Пациент не имеет полномочий на списание средств с семейного кошелька данного лица",
		};
	}

	if (currentBalanceKopecks < requiredAmountKopecks) {
		return {
			isAuthorized: false,
			remainingBalanceKopecks: currentBalanceKopecks,
			failureReason: `Недостаточно средств на семейном кошельке (требуется ${requiredAmountKopecks} коп., доступно ${currentBalanceKopecks} коп.)`,
		};
	}

	return {
		isAuthorized: true,
		remainingBalanceKopecks: currentBalanceKopecks - requiredAmountKopecks,
	};
}

/**
 * Справочник соответствия видов родственных связей кодам ФНС РФ
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, КНД 1151156).
 *
 * 1 — налогоплательщик лично
 * 2 — супруг (супруга)
 * 3 — родитель (отец / мать)
 * 4 — ребенок (в т.ч. усыновленный) / подопечный
 * 5 — иной подопечный
 */
export const RELATIONSHIP_TO_FNS_TAX_CODE_MAP: Record<
	PatientRelationshipKind,
	"1" | "2" | "3" | "4" | "5"
> = {
	spouse: "2",
	parent: "3",
	child: "4",
	ward: "4",
	guardian: "4",
	trustee: "4",
	sibling: "1",
	other: "1",
};

export function mapRelationshipKindToFnsTaxCode(
	kind: PatientRelationshipKind,
): "1" | "2" | "3" | "4" | "5" {
	return RELATIONSHIP_TO_FNS_TAX_CODE_MAP[kind] ?? "1";
}

// ─── 6. Consolidated Relationship Types, Graph, Guardianship & Family Billing ─

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

export const INVERSE_RELATIONSHIP_TYPE: Record<RelationshipType, RelationshipType> = {
	parent: "child",
	child: "parent",
	guardian: "ward",
	ward: "guardian",
	spouse: "spouse",
	sibling: "sibling",
	other: "other",
};

const EXTENDED_INVERSE_RELATIONSHIP_MAP: Readonly<Record<string, string>> = {
	...INVERSE_RELATIONSHIP_MAP,
	grandparent: "grandchild",
	grandchild: "grandparent",
	payer: "other",
};

export function getInverseRelationshipType(type: RelationshipType | string): RelationshipType {
	const mapped = EXTENDED_INVERSE_RELATIONSHIP_MAP[type];
	return typeof mapped === "string" ? (mapped as RelationshipType) : "other";
}

export const getInverseRelationship = getInverseRelationshipType;

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
}).strict();

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
}).strict();

export type ResolvedPatientRelationship = z.infer<typeof resolvedPatientRelationshipSchema>;

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

export const RF_STATUTORY_CONSENT_AGE_THRESHOLD = RF_PEDIATRIC_CONSENT_AGE_THRESHOLD;
export const PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD = RF_PEDIATRIC_CONSENT_AGE_THRESHOLD;
export const MAJORITY_AGE_THRESHOLD = RF_MAJORITY_AGE_THRESHOLD;

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
}).strict();

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
}).strict();

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
}).strict();

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
}).strict();
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
}).strict();
export type FamilyGroup = z.infer<typeof familyGroupSchema>;

export const pediatricGuardianValidationSchema = z.object({
	isMinor: z.boolean(),
	requiresGuardianForConsent: z.boolean(),
	hasValidGuardian: z.boolean(),
	guardianPatientId: z.string().uuid().nullable(),
	guardianFullName: z.string().nullable(),
	guardianRelationshipType: z.string().nullable(),
	validationMessageRu: z.string().nullable(),
}).strict();
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
}).strict();
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
}).strict();
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
	readonly relationDescription?: string | undefined;
}

export interface LegalGuardianConsentA4Params {
	readonly clinicName: string;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientCardNumber?: string | null | undefined;
	readonly guardianFullName: string;
	readonly guardianBirthDate?: string | null | undefined;
	readonly guardianPassport?: string | null | undefined;
	readonly guardianPhone?: string | null | undefined;
	readonly relationshipType: RelationshipType;
	readonly documentGrounds?: string | null | undefined;
	readonly scopeOfTreatment?: string | null | undefined;
	readonly consentDateIso?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface RelationshipLinkEdge {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType?: string | undefined;
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
		readonly isPrimaryPayer?: boolean | undefined;
		readonly canViewRecords?: boolean | undefined;
		readonly relationshipType?: string | undefined;
	} | null | undefined;
	readonly isFamilyHead?: boolean | undefined;
}

export interface DepositDeductionAuthResult {
	readonly isAuthorized: boolean;
	readonly remainingBalanceKopecks: number;
	readonly failureReason?: string | undefined;
}

function formatRelationshipDateRu(dateStr?: string | undefined): string {
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
	const dateStr = formatRelationshipDateRu(params.consentDateIso || new Date().toISOString());

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
	lines.push(`Дата формирования реестра: ${formatRelationshipDateRu(new Date().toISOString())}`);
	lines.push(`Всего зарегистрировано связей: ${safeList.length}`);
	lines.push(separator);
	lines.push("");

	if (safeList.length === 0) {
		lines.push("Записи о родственных связях и законных представителях отсутствуют.");
		lines.push("");
	} else {
		for (let i = 0; i < safeList.length; i++) {
			const rel = safeList[i];
			if (!rel) continue;
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
			lines.push(`      Экстренная связь: ${rel.isEmergencyContact ? "Да" : "Нет"}`);

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

export function validateGuardianForMinor(
	patientAgeYears: number,
	relationships: readonly {
		relatedPatientId: string;
		relatedPatientName?: string | undefined;
		relationshipType: RelationshipType | string;
		isLegalGuardian?: boolean | undefined;
		canSignConsent?: boolean | undefined;
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
			validationMessageRu: `Законный представитель подтвержден: ${getRelationshipLabelRu(validGuardian.relationshipType)}.`,
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

	const payerRelationToPatient: RelationshipType =
		link.patientId === targetId
			? link.relationshipType
			: getInverseRelationshipType(link.relationshipType);

	const hasSharedBalancePermission =
		Array.isArray(link.permissions) &&
		link.permissions.includes("shared_balance_payment");

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

export function resolveFamilyPayers(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isFinancialPayer === true);
}

export function calculateCombinedFamilyBalance(familyGroup: {
	members: readonly { balanceKopecks?: number | undefined }[];
	sharedDepositBalanceKopecks?: number | undefined;
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

export function resolveFamilyPrimaryPayer(
	patientId: string,
	relationships: readonly PayerResolutionCandidate[],
	familyHeadId?: string | null,
): {
	payerPatientId: string;
	payerRelationshipType?: string | undefined;
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
		id: params.id || generateSecureUuid(),
		patientId,
		relatedPatientId,
		relatedPatientName:
			params.relatedPatientName && params.relatedPatientName.trim()
				? params.relatedPatientName.trim()
				: "Связанное лицо",
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

	const inverseCanSign = invType === "parent" || invType === "guardian";
	const inverseIsPayer =
		invType === "parent" || invType === "guardian" || invType === "spouse";

	const inverse: PatientRelationship = {
		id: params.inverseId || generateSecureUuid(),
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
		isEmergencyContact: true,
		notes: params.notes ?? null,
		createdAt: timestamp,
	};

	return { direct, inverse };
}

export function resolveEmergencyContacts(
	relationships: PatientRelationship[] = [],
): PatientRelationship[] {
	if (!Array.isArray(relationships)) return [];
	return relationships.filter((r) => r && r.isEmergencyContact === true);
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
			const current = queue.shift();
			if (current === undefined) continue;
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
