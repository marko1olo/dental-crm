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
 * 2. If spender is a family member (patientId !== walletOwnerId):
 *    - Члены подтверждённой семейной группы имеют право на списание по умолчанию (Мандат 8n),
 *      если нет явного запрета `canSpendFamilyWallet === false`.
 *    - Запрещено, если в `patient_relationships` явно установлен флаг `canSpendFamilyWallet === false`.
 *    - Запрещено, если пациент не входит в семейную группу и не связан подтвержденным родством в `patient_relationships`.
 *    - Запрещено, если превышен установленный индивидуальный лимит списания (`spendLimitKopecks`).
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
	// BOLA/IDOR Fix [LOY-05] & Mandate 8n canonical alignment.
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

	// 1. Explicit prohibition check in patient_relationships
	if (rel && rel.canSpendFamilyWallet === false) {
		throw new FamilyWalletError(
			"Пациент не имеет полномочий на списание средств с семейного кошелька (canSpendFamilyWallet = false)",
			403,
			"UNAUTHORIZED_FAMILY_SPEND",
		);
	}

	// 2. Check if patient belongs to the confirmed family group
	const [patientRow] = await tx
		.select({
			id: patients.id,
			familyGroupId: patients.familyGroupId,
		})
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	const isConfirmedFamilyMember = Boolean(
		patientRow?.familyGroupId && patientRow.familyGroupId === family.id,
	);

	if (!rel && !isConfirmedFamilyMember) {
		throw new FamilyWalletError(
			"Пациент не связан подтвержденным родством или семейной группой с владельцем семейного депозита",
			403,
			"NOT_AUTHORIZED_KINSHIP",
		);
	}

	// 3. Check individual spend limit if configured on the relationship
	let spendLimitKop: number | undefined;
	if ((rel as Record<string, unknown> | undefined)?.["spendLimitKopecks"] !== undefined) {
		spendLimitKop = Number((rel as Record<string, unknown>)["spendLimitKopecks"]);
	} else if (rel?.notes) {
		try {
			const parsed = JSON.parse(rel.notes);
			if (typeof parsed?.spendLimitKopecks === "number") {
				spendLimitKop = parsed.spendLimitKopecks;
			}
		} catch {
			// plain text notes
		}
	}
	if (spendLimitKop !== undefined && spendLimitKop >= 0 && debitKopecks > spendLimitKop) {
		throw new FamilyWalletError(
			`Превышен установленный лимит списания с семейного кошелька (лимит: ${(spendLimitKop / 100).toFixed(2)} ₽, запрошено: ${(debitKopecks / 100).toFixed(2)} ₽)`,
			403,
			"SPEND_LIMIT_EXCEEDED",
		);
	}

	// 4. Validate spend with shared logic
	const effectiveRel = rel
		? {
				canSpendFamilyWallet: rel.canSpendFamilyWallet !== false,
				isLegalRepresentative: rel.isLegalRepresentative === true,
				relationshipType: (rel.patientId === patientId
					? rel.relationshipType
					: invertRelationshipKind(rel.relationshipType as PatientRelationshipKind)) as PatientRelationshipKind,
				spendLimitKopecks: spendLimitKop,
			}
		: {
				canSpendFamilyWallet: true,
				isLegalRepresentative: false,
				relationshipType: "relative" as PatientRelationshipKind,
				spendLimitKopecks: undefined,
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
