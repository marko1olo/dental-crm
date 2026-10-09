/**
 * familyBillingEngine.ts
 * DENTE Dental CRM — Patient Relationships, Legal Guardians & Family Payment Engine
 * Layer 1: Family Billing, Shared Deposits & Payer Authorization (Mandate 8e, 54-FZ)
 */

import {
	type RelationshipType,
	type PatientRelationship,
	type PatientRelationshipRecord,
	type FamilyPaymentAuthorizationResult,
	type DepositDeductionAuthParams,
	type DepositDeductionAuthResult,
	type PayerResolutionCandidate,
	getInverseRelationshipType,
	getRelationshipLabelRu,
} from "./types.js";

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
