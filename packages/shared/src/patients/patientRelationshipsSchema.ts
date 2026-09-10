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
		canSpendFamilyWallet: z.boolean().optional().default(false),
		documentProofNumber: z.string().max(255).optional().nullable(),
		notes: z.string().max(2000).optional().nullable(),
		// Backward compatibility aliases
		isPrimaryPayer: z.boolean().optional(),
		canViewRecords: z.boolean().optional(),
	})
	.transform((data) => ({
		...data,
		canViewMedicalRecord:
			data.canViewMedicalRecord || (data.canViewRecords ?? false),
		canSpendFamilyWallet:
			data.canSpendFamilyWallet || (data.isPrimaryPayer ?? false),
	}));

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
		documentProofNumber: z.string().max(255).optional().nullable(),
		notes: z.string().max(2000).optional().nullable(),
		// Backward compatibility aliases
		isPrimaryPayer: z.boolean().optional(),
		canViewRecords: z.boolean().optional(),
	})
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
	const hasSpendPermission =
		relationship?.canSpendFamilyWallet === true ||
		relationship?.isLegalRepresentative === true ||
		relationship?.relationshipType === "parent" ||
		relationship?.relationshipType === "guardian" ||
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
