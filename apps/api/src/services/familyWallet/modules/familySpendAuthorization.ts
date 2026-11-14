import {
	invertRelationshipKind,
	parseKopecks,
	validateFamilyWalletSpend,
	type PatientRelationshipKind,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { patientRelationships, patients } from "../../../db/schema.js";
import { FamilyWalletError, type FamilyGroupRow } from "../familyWalletTypes.js";

/**
 * verifyFamilySpendAuthorization
 *
 * Implements strict BOLA/IDOR protection for family wallet debits ([LOY-05]).
 * Mandatory invariants:
 * 1. If spender is the wallet owner (headPatientId / primaryPatientId), they are authorized.
 * 2. If spender is a family member (patientId !== walletOwnerId), they MUST have a confirmed
 *    relationship in `patient_relationships` with `canSpendFamilyWallet === true` (or legal rep / spouse / parent).
 * 3. Client parameter `payerPatientId` CANNOT bypass relationship and spend authorization checks!
 */
export async function verifyFamilySpendAuthorization(params: {
	readonly tx: PgTransaction<any, any, any>;
	readonly organizationId: string;
	readonly family: FamilyGroupRow;
	readonly patientId: string;
	readonly payerPatientId?: string | undefined;
	readonly debitKopecks: number;
}): Promise<void> {
	const { tx, organizationId, family, patientId, debitKopecks } = params;
	const walletOwnerId = family.headPatientId || family.primaryPatientId;

	if (!walletOwnerId) {
		throw new FamilyWalletError(
			"Семейный кошелек не имеет назначенного владельца (headPatientId)",
			400,
			"MISSING_WALLET_OWNER",
		);
	}

	const currentBalKop = parseKopecks(family.balance);
	if (currentBalKop < debitKopecks) {
		throw new FamilyWalletError(
			`Недостаточно средств на семейном кошельке (доступно ${(currentBalKop / 100).toFixed(2)} ₽, требуется ${(debitKopecks / 100).toFixed(2)} ₽)`,
			402,
			"INSUFFICIENT_FAMILY_BALANCE",
		);
	}

	// Case 1: Wallet owner is spending for themselves
	if (patientId === walletOwnerId) {
		return;
	}

	// Case 2: Family member spending from the wallet owner's deposit.
	// BOLA/IDOR Fix [LOY-05]: Strict check in patient_relationships is MANDATORY.
	// Client parameter `payerPatientId` cannot bypass verified kinship & canSpendFamilyWallet.
	const [rel] = await tx
		.select()
		.from(patientRelationships)
		.where(
			and(
				eq(patientRelationships.organizationId, organizationId),
				or(
					and(
						eq(patientRelationships.patientId, walletOwnerId),
						eq(patientRelationships.relatedPatientId, patientId),
					),
					and(
						eq(patientRelationships.patientId, patientId),
						eq(patientRelationships.relatedPatientId, walletOwnerId),
					),
				),
			),
		)
		.limit(1);

	if (!rel) {
		throw new FamilyWalletError(
			"Пациент не связан подтвержденным родством с владельцем семейного депозита",
			403,
			"NOT_AUTHORIZED_KINSHIP",
		);
	}

	const effectiveRel = {
		canSpendFamilyWallet: rel.canSpendFamilyWallet === true || rel.isPrimaryPayer === true,
		isLegalRepresentative: rel.isLegalRepresentative === true,
		relationshipType: (rel.patientId === patientId
			? rel.relationshipType
			: invertRelationshipKind(rel.relationshipType as PatientRelationshipKind)) as PatientRelationshipKind,
	};

	const spendValidation = validateFamilyWalletSpend({
		spenderPatientId: patientId,
		walletOwnerPatientId: walletOwnerId,
		requiredAmountKopecks: debitKopecks,
		currentBalanceKopecks: currentBalKop,
		relationship: effectiveRel,
	});

	if (!spendValidation.isAuthorized) {
		throw new FamilyWalletError(
			spendValidation.failureReason ||
				"Пациент не имеет полномочий на списание средств с семейного кошелька (canSpendFamilyWallet = false)",
			403,
			"UNAUTHORIZED_FAMILY_SPEND",
		);
	}
}
