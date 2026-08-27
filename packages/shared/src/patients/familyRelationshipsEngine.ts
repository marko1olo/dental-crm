/**
 * familyRelationshipsEngine.ts — Patient-to-Patient Family Relationships & Shared Payer Deposit Engine.
 *
 * Provides domain schemas, reciprocal relationship conversions, circular reference guards,
 * primary guarantor/payer resolution, and shared family deposit authorization.
 */

import { z } from "zod";

// ─── 1. Relationship Types & Labels ──────────────────────────────────────────

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

/**
 * Inverse reciprocal relationships when viewing from the perspective of the related party.
 * - parent <-> child
 * - guardian <-> child
 * - spouse <-> spouse
 * - payer <-> other
 * - other <-> other
 */
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

// ─── 2. Schemas ─────────────────────────────────────────────────────────────

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

export const createRelationshipInputSchema = z.object({
	relatedPatientId: z
		.string()
		.uuid("Некорректный UUID связанного пациента"),
	relationshipType: patientRelationshipTypeSchema,
	isPrimaryPayer: z.boolean().optional().default(false),
	canViewRecords: z.boolean().optional().default(true),
	canSignConsents: z.boolean().optional().default(false),
	notes: z.string().optional(),
});
export type CreateRelationshipInput = z.infer<
	typeof createRelationshipInputSchema
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

// ─── 3. Pure Domain Algorithms ──────────────────────────────────────────────

export interface RelationshipLinkEdge {
	readonly patientId: string;
	readonly relatedPatientId: string;
	readonly relationshipType?: PatientRelationshipType;
}

/**
 * Validates whether a new relationship can be established without self-linking,
 * direct duplicate edges, or circular hierarchy cycles.
 */
export function validateRelationshipLink(
	patientId: string,
	relatedPatientId: string,
	existingLinks: readonly RelationshipLinkEdge[],
	newType?: PatientRelationshipType,
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

	// 1. Check direct duplicate links in either orientation
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

	// 2. Check circular ancestral cycle for parent/child or guardian relations
	if (newType === "parent" || newType === "guardian") {
		// If A is claiming B is parent of A (or A is parent of B), ensure B is not already child/dependent of A
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
				// Find all parents/guardians of 'current'
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
	readonly relationshipType: PatientRelationshipType;
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
	payerRelationshipType?: PatientRelationshipType;
	isSelfPaying: boolean;
} {
	// 1. Explicit primary payer flag
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

	// 2. Designated payer type or parent/guardian
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

	// 3. Fallback to family group head if configured
	if (familyHeadId && familyHeadId !== patientId) {
		return {
			payerPatientId: familyHeadId,
			payerRelationshipType: "payer",
			isSelfPaying: false,
		};
	}

	// 4. Self-paying individual
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
		readonly relationshipType?: PatientRelationshipType;
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

	// Self-charge
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

	// Family member authorization check
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
