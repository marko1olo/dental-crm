/**
 * balanceModules/balanceQueryService.ts — Read-only segregated patient balance calculation.
 * Segregates personal advances, family shared wallets (with spend limits & bidirectional kinship),
 * and loyalty bonus balances.
 */

import {
	kopecksToRubles,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	advanceDepositTaggings,
	familyGroups,
	patientBonusBalances,
	patientRelationships,
	patients,
} from "../../../db/schema.js";
import type { PatientDetailedBalance } from "./types.js";

export async function getDetailedPatientBalance(
	tx: TenantDb,
	orgId: string,
	patientId: string,
): Promise<PatientDetailedBalance | null> {
	const [patient] = await tx
		.select()
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
		.limit(1);

	if (!patient) return null;

	// 1. Расчет личного аванса из активных записей advanceDepositTaggings
	const advanceRows = await tx
		.select()
		.from(advanceDepositTaggings)
		.where(
			and(
				eq(advanceDepositTaggings.organizationId, orgId),
				or(
					eq(advanceDepositTaggings.patientId, patientId),
					and(
						isNull(advanceDepositTaggings.patientId),
						eq(advanceDepositTaggings.patientName, patient.fullName || ""),
					),
				),
				inArray(advanceDepositTaggings.allocationStatus, ["pinned", "unallocated"]),
			),
		);

	const personalAdvanceKopecks = sumKopecks(
		advanceRows.map((row) =>
			row.depositAmountKopecks != null &&
			(row.depositAmountKopecks > 0n || Number(row.depositAmountRub || 0) === 0)
				? Number(row.depositAmountKopecks)
				: parseKopecks(row.depositAmountRub),
		),
	);

	// 2. Расчет доступного семейного баланса (с приоритетом balanceKopecks и учетом spendLimitKopecks)
	let hasFamily = false;
	let familyGroupId: string | null = null;
	let familyName: string | null = null;
	let familyBalanceKopecks = 0;
	let canSpend = false;
	let spendLimitKopecks: number | null = null;
	let availableFromFamilyKop = 0;

	let family: typeof familyGroups.$inferSelect | undefined;
	if (patient.familyGroupId) {
		const [byGroupId] = await tx
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, patient.familyGroupId),
					eq(familyGroups.organizationId, orgId),
				),
			)
			.limit(1);
		family = byGroupId;
	} else {
		const [byHead] = await tx
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.organizationId, orgId),
					or(
						eq(familyGroups.headPatientId, patient.id),
						eq(familyGroups.primaryPatientId, patient.id),
					),
				),
			)
			.limit(1);
		family = byHead;
	}

	if (family) {
		hasFamily = true;
		familyGroupId = family.id;
		familyName = family.name ?? family.groupName ?? "Семья";
		familyBalanceKopecks =
			family.balanceKopecks != null &&
			(family.balanceKopecks !== 0 || Number(family.balance || 0) === 0)
				? Number(family.balanceKopecks)
				: parseKopecks(family.balance || "0.00");

		if (family.headPatientId === patient.id || family.primaryPatientId === patient.id) {
			canSpend = true;
		} else {
			const headOrPrimaryIds = [family.headPatientId, family.primaryPatientId].filter(
				(id): id is string => Boolean(id),
			);
			const relRows = await tx
				.select()
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, orgId),
						eq(patientRelationships.canSpendFamilyWallet, true),
						or(
							eq(patientRelationships.patientId, patient.id),
							eq(patientRelationships.relatedPatientId, patient.id),
						),
					),
				);

			const preferredRel =
				headOrPrimaryIds.length > 0
					? relRows.find(
							(r) =>
								headOrPrimaryIds.includes(r.patientId) ||
								headOrPrimaryIds.includes(r.relatedPatientId),
						)
					: relRows[0];

			if (preferredRel) {
				canSpend = true;
				spendLimitKopecks =
					preferredRel.spendLimitKopecks != null
						? Number(preferredRel.spendLimitKopecks)
						: null;
			}
		}

		if (canSpend) {
			availableFromFamilyKop =
				spendLimitKopecks !== null
					? Math.min(familyBalanceKopecks, spendLimitKopecks)
					: familyBalanceKopecks;
		}
	}

	// 3. Активные баллы лояльности
	let loyaltyBonusPoints = 0;
	const [bonusRow] = await tx
		.select()
		.from(patientBonusBalances)
		.where(
			and(
				eq(patientBonusBalances.organizationId, orgId),
				eq(patientBonusBalances.patientId, patientId),
			),
		)
		.limit(1);

	if (bonusRow?.activePoints) {
		loyaltyBonusPoints = Number(bonusRow.activePoints) || 0;
	}

	const totalAvailableKopecks = personalAdvanceKopecks + availableFromFamilyKop;

	return {
		patientId,
		patientFullName: patient.fullName || "Пациент клиники",
		personalAdvanceKopecks,
		personalAdvanceRub: kopecksToRubles(personalAdvanceKopecks),
		familyWallet: {
			hasFamily,
			familyGroupId,
			familyName,
			familyBalanceKopecks,
			familyBalanceRub: kopecksToRubles(familyBalanceKopecks),
			canSpend,
			spendLimitKopecks,
			availableToPatientKopecks: availableFromFamilyKop,
			availableToPatientRub: kopecksToRubles(availableFromFamilyKop),
		},
		loyaltyBonusPoints,
		totalAvailableForTreatmentKopecks: totalAvailableKopecks,
		totalAvailableForTreatmentRub: kopecksToRubles(totalAvailableKopecks),
	};
}
