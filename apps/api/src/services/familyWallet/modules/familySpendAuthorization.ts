import {
	formatKopecksToRubles,
	invertRelationshipKind,
	parseKopecks,
	validateFamilyWalletSpend,
	type PatientRelationshipKind,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { TenantDb } from "../../../db/client.js";
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
	readonly tx: TenantDb;
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
			"Не определен владелец семейного счета (headPatientId)",
			403,
			"UNAUTHORIZED_FAMILY_SPEND",
		);
	}

	const currentBalKop = parseKopecks(family.balance);
	if (currentBalKop < debitKopecks) {
		throw new FamilyWalletError(
			`Недостаточно средств на семейном кошельке (доступно ${formatKopecksToRubles(currentBalKop)} ₽, требуется ${formatKopecksToRubles(debitKopecks)} ₽)`,
			402,
			"INSUFFICIENT_FAMILY_BALANCE",
		);
	}

	// Case 1: Wallet owner is spending for themselves
	if (patientId === walletOwnerId) {
		return;
	}

	const [patientRow] = await tx
		.select({ id: patients.id, familyGroupId: patients.familyGroupId })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	const isDirectFamilyMember = Boolean(
		patientRow?.familyGroupId && family.id && patientRow.familyGroupId === family.id,
	);

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

	// 1. Проверка полномочий списания семейного депозита:
	// Если нет подтвержденного родства и пациент не входит в семейную группу — блокируем
	if (!rel && !isDirectFamilyMember) {
		throw new FamilyWalletError(
			"Пациент не связан подтвержденным родством или семейной группой с владельцем семейного депозита",
			403,
			"NOT_AUTHORIZED_KINSHIP",
		);
	}

	// Явный запрет в patient_relationships (canSpendFamilyWallet === false) блокирует списание
	if (rel && rel.canSpendFamilyWallet === false) {
		throw new FamilyWalletError(
			"Пациент не имеет полномочий на списание средств с семейного кошелька (canSpendFamilyWallet = false)",
			403,
			"UNAUTHORIZED_FAMILY_SPEND",
		);
	}

	// Защита от BOLA/IDOR [LOY-05]: Члены подтвержденной семейной группы авторизованы по умолчанию (Мандат 8n).
	// Если пациент НЕ является прямым членом семьи, списание со счета другого лица требует явного
	// подтверждения полномочий в patient_relationships (canSpendFamilyWallet === true или isLegalRepresentative === true).
	if (!isDirectFamilyMember) {
		if (!rel || (rel.canSpendFamilyWallet !== true && rel.isLegalRepresentative !== true)) {
			throw new FamilyWalletError(
				"Пациент не имеет полномочий на списание средств с семейного кошелька (canSpendFamilyWallet = false)",
				403,
				"UNAUTHORIZED_FAMILY_SPEND",
			);
		}
	}

	// 2. Check individual spend limit if configured on the relationship (Mandates 8ap, 8bm)
	const spendLimitKop =
		rel?.spendLimitKopecks != null ? Number(rel.spendLimitKopecks) : undefined;
	if (spendLimitKop !== undefined && spendLimitKop >= 0 && debitKopecks > spendLimitKop) {
		throw new FamilyWalletError(
			`Превышен установленный лимит списания с семейного кошелька (лимит: ${formatKopecksToRubles(spendLimitKop)} ₽, запрошено: ${formatKopecksToRubles(debitKopecks)} ₽)`,
			403,
			"SPEND_LIMIT_EXCEEDED",
		);
	}

	// 3. Validate spend with shared logic
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
			canSpendFamilyWallet: isDirectFamilyMember,
			isLegalRepresentative: false,
			relationshipType: "other" as PatientRelationshipKind,
			spendLimitKopecks: spendLimitKop,
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
