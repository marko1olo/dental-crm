/**
 * apps/api/src/routes/cashbox/paymentStages/depositAndFamilyStage.ts
 *
 * Stage 3: Advance Deposit Topup, Ledger Verification, FIFO Deduction & Family Wallet.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & Clinical Autonomy).
 */

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
	kopecksToNumericString,
	parseKopecks,
} from "@dental/shared";
import {
	advanceDepositTaggings,
	familyGroups,
	patientRelationships,
	payments,
	treatmentItems,
} from "../../../db/schema.js";
import {
	buildPatientLedger,
	clinicOwesPatientKopecks,
} from "../../../money/patientDebt.js";
import { onTenantTxCommit } from "../../../db/rls.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

export async function processDepositAndFamilyStage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment) {
		return { success: true };
	}

	const {
		orgId,
		body,
		totalKopecks,
		requiredDepositKopecks,
		resolvedPatientId,
		patientRow,
		patientName,
	} = ctx;

	// 1. Пополнение депозита при isAdvanceDeposit === true
	if (body.isAdvanceDeposit === true) {
		if (body.familyGroupId) {
			const [fg] = await tx
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.id, body.familyGroupId), eq(familyGroups.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!fg) {
				return { failure: { kind: "family_wallet_not_found" } };
			}

			ctx.lockedTopupFamilyGroup = fg;
			ctx.topupPrevBalKop = fg.balanceKopecks != null && (Number(fg.balanceKopecks) !== 0 || !fg.balance || parseKopecks(fg.balance) === 0)
				? BigInt(fg.balanceKopecks)
				: BigInt(parseKopecks(fg.balance ?? 0));
			ctx.topupNewBalKop = ctx.topupPrevBalKop + totalKopecks;
			const newBalanceStr = kopecksToNumericString(Number(ctx.topupNewBalKop));

			await tx
				.update(familyGroups)
				.set({
					balance: newBalanceStr,
					balanceKopecks: Number(ctx.topupNewBalKop),
					updatedAt: new Date(),
				})
				.where(and(eq(familyGroups.id, fg.id), eq(familyGroups.organizationId, orgId)));

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(orgId, {
					type: "FAMILY_BALANCE_UPDATED",
					payload: {
						organizationId: orgId,
						familyGroupId: fg.id,
						balance: newBalanceStr,
					},
				});
			});
		} else if (resolvedPatientId) {
			await tx.insert(advanceDepositTaggings).values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				patientName: patientRow?.fullName || patientName,
				depositAmountRub: kopecksToNumericString(Number(totalKopecks)),
				taggedTargetType: "patient_deposit",
				taggedTargetName: body.note?.trim() || "Внесение авансового депозита",
				allocationStatus: "unallocated",
			});
		}
	}

	// 2. Списание с депозита / семейного баланса
	if (requiredDepositKopecks > 0n && patientRow) {
		let targetFamilyGroupId = body.familyGroupId || patientRow.familyGroupId || null;
		if (!targetFamilyGroupId) {
			const [headFamily] = await tx
				.select({ id: familyGroups.id })
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.headPatientId, resolvedPatientId),
						eq(familyGroups.organizationId, orgId),
					),
				)
				.limit(1);
			if (headFamily) {
				targetFamilyGroupId = headFamily.id;
			}
		}

		if (
			!targetFamilyGroupId &&
			(body.method === "family_wallet" ||
				body.familyDepositAmountRub ||
				body.familyDepositAmountKopecks)
		) {
			const [relHead] = await tx
				.select({ familyGroupId: familyGroups.id })
				.from(patientRelationships)
				.innerJoin(
					familyGroups,
					and(
						eq(familyGroups.organizationId, orgId),
						or(
							eq(familyGroups.headPatientId, patientRelationships.patientId),
							eq(familyGroups.headPatientId, patientRelationships.relatedPatientId),
						),
					),
				)
				.where(
					and(
						eq(patientRelationships.organizationId, orgId),
						or(
							eq(patientRelationships.patientId, resolvedPatientId),
							eq(patientRelationships.relatedPatientId, resolvedPatientId),
						),
					),
				)
				.limit(1);

			if (relHead) {
				targetFamilyGroupId = relHead.familyGroupId;
			} else {
				return { failure: { kind: "family_wallet_not_found" } };
			}
		}

		let lockedFamilyGroup: typeof familyGroups.$inferSelect | null = null;
		if (targetFamilyGroupId) {
			const [fg] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, targetFamilyGroupId),
						eq(familyGroups.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
			lockedFamilyGroup = fg ?? null;
		}

		if (
			!lockedFamilyGroup &&
			(body.method === "family_wallet" ||
				body.familyDepositAmountRub ||
				body.familyDepositAmountKopecks)
		) {
			return { failure: { kind: "family_wallet_not_found" } };
		}

		ctx.lockedFamilyGroup = lockedFamilyGroup;
		const familyBalanceKop = lockedFamilyGroup
			? (lockedFamilyGroup.balanceKopecks != null && (Number(lockedFamilyGroup.balanceKopecks) !== 0 || !lockedFamilyGroup.balance || parseKopecks(lockedFamilyGroup.balance) === 0)
				? BigInt(lockedFamilyGroup.balanceKopecks)
				: BigInt(parseKopecks(lockedFamilyGroup.balance ?? 0)))
			: 0n;
		ctx.familyBalanceKop = familyBalanceKop;

		// Изоляция балансов (ROT-002): семейный депозит и личный аванс строго изолированы
		if (lockedFamilyGroup) {
			ctx.advanceRows = [];

			// Сначала проверяем полномочия и лимит списания семейного кошелька ДО любых мутаций
			const walletOwnerId =
				lockedFamilyGroup.headPatientId ||
				lockedFamilyGroup.primaryPatientId ||
				(patientRow?.familyGroupId === lockedFamilyGroup.id ? resolvedPatientId : null);
			if (!walletOwnerId) {
				return {
					failure: {
						kind: "unauthorized_family_spend",
						reason:
							"У семейной группы не назначен владелец счета (headPatientId). Списание семейного депозита заблокировано.",
					},
				};
			}

			if (resolvedPatientId !== walletOwnerId) {
				// DEF-FAM-01: BOLA guard
				const [rel] = await tx
					.select()
					.from(patientRelationships)
					.where(
						and(
							eq(patientRelationships.organizationId, orgId),
							or(
								and(
									eq(patientRelationships.patientId, walletOwnerId),
									eq(patientRelationships.relatedPatientId, resolvedPatientId),
								),
								and(
									eq(patientRelationships.patientId, resolvedPatientId),
									eq(patientRelationships.relatedPatientId, walletOwnerId),
								),
							),
						),
					)
					.limit(1);

				if (!rel || (rel.canSpendFamilyWallet !== true && rel.isLegalRepresentative !== true)) {
					return {
						failure: {
							kind: "unauthorized_family_spend",
							reason:
								"Пациент не имеет полномочий на списание средств с семейного депозита (canSpendFamilyWallet = false).",
						},
					};
				}

				// Проверка лимита списания spendLimitKopecks
				const spendLimitKop =
					rel.spendLimitKopecks != null ? Number(rel.spendLimitKopecks) : undefined;
				if (
					spendLimitKop !== undefined &&
					spendLimitKop >= 0 &&
					Number(requiredDepositKopecks) > spendLimitKop
				) {
					return {
						failure: {
							kind: "unauthorized_family_spend",
							reason: `Превышен установленный лимит списания с семейного депозита (лимит: ${kopecksToNumericString(spendLimitKop)} ₽, запрошено: ${kopecksToNumericString(Number(requiredDepositKopecks))} ₽).`,
						},
					};
				}
			}

			if (familyBalanceKop < requiredDepositKopecks) {
				const availableRub = kopecksToNumericString(Number(familyBalanceKop));
				const requiredRub = kopecksToNumericString(Number(requiredDepositKopecks));
				return {
					failure: {
						kind: "insufficient_deposit",
						availableRub,
						requiredRub,
						isFamilyWallet: true,
					},
				};
			}

			const newFamilyBalKop = familyBalanceKop - requiredDepositKopecks;
			const newFamilyBalStr = kopecksToNumericString(Number(newFamilyBalKop));

			await tx
				.update(familyGroups)
				.set({
					balance: newFamilyBalStr,
					balanceKopecks: Number(newFamilyBalKop),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(familyGroups.id, lockedFamilyGroup.id),
						eq(familyGroups.organizationId, orgId),
					),
				);

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(orgId, {
					type: "FAMILY_BALANCE_UPDATED",
					payload: {
						organizationId: orgId,
						familyGroupId: lockedFamilyGroup.id,
						balance: newFamilyBalStr,
					},
				});
			});
		} else {
			// Поиск и блокировка целевых личных авансов advanceDepositTaggings
			const advanceRows = await tx
				.select()
				.from(advanceDepositTaggings)
				.where(
					and(
						eq(advanceDepositTaggings.organizationId, orgId),
						or(
							eq(advanceDepositTaggings.patientId, resolvedPatientId),
							and(
								isNull(advanceDepositTaggings.patientId),
								eq(advanceDepositTaggings.patientName, patientRow.fullName || ""),
							),
						),
						inArray(advanceDepositTaggings.allocationStatus, [
							"unallocated",
							"pinned",
							"active",
						]),
					),
				)
				.for("update");
			ctx.advanceRows = advanceRows;

			let advanceTotalKop = 0n;
			for (const adv of advanceRows) {
				advanceTotalKop += BigInt(parseKopecks(adv.depositAmountRub ?? 0));
			}

			// Расчёт фактического сальдо лицевого счета (переплата / авансы по леджеру)
			const [patientCharges, patientPayments] = await Promise.all([
				tx
					.select({
						patientId: treatmentItems.patientId,
						status: treatmentItems.status,
						unitPriceRub: treatmentItems.unitPriceRub,
						quantity: treatmentItems.quantity,
						discountRub: treatmentItems.discountRub,
					})
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							eq(treatmentItems.patientId, resolvedPatientId),
						),
					),
				tx
					.select({
						patientId: payments.patientId,
						status: payments.status,
						amountRub: payments.amountRub,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.patientId, resolvedPatientId),
						),
					),
			]);

			const ledger = buildPatientLedger(resolvedPatientId, patientCharges, patientPayments, {
				organizationId: orgId,
			});
			const ledgerOverpaidKop = BigInt(clinicOwesPatientKopecks(ledger));

			// Доступный личный аванс: максимум из размеченных авансов (advanceDepositTaggings) и сальдо леджера переплаты.
			const personalAvailableKop =
				advanceTotalKop > ledgerOverpaidKop
					? advanceTotalKop
					: (ledgerOverpaidKop > 0n ? ledgerOverpaidKop : 0n);

			if (personalAvailableKop < requiredDepositKopecks) {
				const availableRub = kopecksToNumericString(Number(personalAvailableKop));
				const requiredRub = kopecksToNumericString(Number(requiredDepositKopecks));
				return {
					failure: {
						kind: "insufficient_deposit",
						availableRub,
						requiredRub,
						isFamilyWallet: body.method === "family_wallet",
					},
				};
			}

			// Списание с личного депозита: сначала с размеченных авансов (устранен float round-trip!)
			let remainingToDeductKop = requiredDepositKopecks;
			for (const adv of advanceRows) {
				if (remainingToDeductKop <= 0n) break;
				const advKop = BigInt(parseKopecks(adv.depositAmountRub ?? 0));
				if (advKop <= remainingToDeductKop) {
					remainingToDeductKop -= advKop;
					await tx
						.update(advanceDepositTaggings)
						.set({ allocationStatus: "spent" })
						.where(
							and(
								eq(advanceDepositTaggings.id, adv.id),
								eq(advanceDepositTaggings.organizationId, orgId),
							),
						);
				} else {
					const nextAdvKop = advKop - remainingToDeductKop;
					remainingToDeductKop = 0n;
					await tx
						.update(advanceDepositTaggings)
						.set({ depositAmountRub: kopecksToNumericString(Number(nextAdvKop)) })
						.where(
							and(
								eq(advanceDepositTaggings.id, adv.id),
								eq(advanceDepositTaggings.organizationId, orgId),
							),
						);
				}
			}

			// [DEF-DEP-01] Зачёт аванса по леджеру соло-пациента без предварительного тегирования
			if (remainingToDeductKop > 0n) {
				await tx.insert(advanceDepositTaggings).values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					patientName: patientRow?.fullName || "Пациент клиники",
					depositAmountRub: kopecksToNumericString(Number(remainingToDeductKop)),
					taggedTargetType: "treatment_plan",
					taggedTargetName: `Зачёт аванса по леджеру (счёт ${body.invoiceId || "б/н"})`,
					allocationStatus: "spent",
				});
				remainingToDeductKop = 0n;
			}
		}
	}

	return { success: true };
}
