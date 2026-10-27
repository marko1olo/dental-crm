import {
	invertRelationshipKind,
	parseKopecks,
	validateFamilyWalletSpend,
	type PatientRelationshipKind,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { patientRelationships } from "../../../db/schema.js";
import { FamilyWalletError, type FamilyGroupRow } from "../familyWalletTypes.js";

export async function verifyFamilySpendAuthorization(params: {
	readonly tx: PgTransaction<any, any, any>;
	readonly organizationId: string;
	readonly family: FamilyGroupRow;
	readonly patientId: string;
	readonly payerPatientId?: string | undefined;
	readonly debitKopecks: number;
}): Promise<void> {
	const { tx, organizationId, family, patientId, payerPatientId, debitKopecks } = params;
	const walletOwnerId = family.headPatientId || family.primaryPatientId;
	const isAuthorizerPayer = payerPatientId && walletOwnerId && payerPatientId === walletOwnerId;

	if (walletOwnerId && patientId !== walletOwnerId && !isAuthorizerPayer) {
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

		const effectiveRel = rel
			? {
					canSpendFamilyWallet: rel.canSpendFamilyWallet || rel.isPrimaryPayer,
					isLegalRepresentative: rel.isLegalRepresentative,
					relationshipType: (rel.patientId === patientId
						? rel.relationshipType
						: invertRelationshipKind(rel.relationshipType as PatientRelationshipKind)) as PatientRelationshipKind,
				}
			: null;

		const currentBalKop = parseKopecks(family.balance);
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
					"Пациент не имеет полномочий на списание средств с семейного кошелька",
				403,
				"UNAUTHORIZED_FAMILY_SPEND",
			);
		}
	}
}
