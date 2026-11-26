import { kopecksToNumericString, parseKopecks, sumKopecks } from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { bonusTransactions, patientBonusBalances, patients, payments } from "../../db/schema.js";
import { reconcileInvoiceBalanceInDb } from "../billingRoutes/invoiceBalanceReconciler.js";
import { deductUnspentPointsFifo, processPatientExpiredBonuses } from "./bonusBalanceService.js";
import { isPgUniqueViolation, lockAndResolveLoyaltyInvoice } from "./bonusRedemptionUtils.js";

export interface ExecuteFamilyBonusRedeemParams {
	readonly orgId: string;
	readonly familyGroupId?: string | undefined;
	readonly sponsorPatientId: string;
	readonly targetPatientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub?: number | undefined;
	readonly pointsToRedeem: number;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
	readonly txClient?: TenantDb | undefined;
}

export async function executeFamilyBonusRedeem(p: ExecuteFamilyBonusRedeemParams) {
	const runInTx = async (tx: TenantDb) => {
		if (p.clientMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${p.orgId} || ':bonus_family_redeem:' || ${p.clientMutationId}))`,
			);
			const [existingTx] = await tx
				.select()
				.from(bonusTransactions)
				.where(
					and(
						eq(bonusTransactions.organizationId, p.orgId),
						eq(bonusTransactions.clientMutationId, p.clientMutationId),
					),
				)
				.limit(1)
				.for("update");

			if (existingTx) {
				const redeemedPts = Math.abs(Number(existingTx.amountPoints));
				return {
					success: true as const,
					replayed: true as const,
					redeemedPoints: redeemedPts,
					discountRub: redeemedPts,
					remainingPoolPoints: 0,
					paymentId: existingTx.relatedPaymentId,
					transactionId: existingTx.id,
				};
			}
		}

		const targetPatients = await tx
			.select({ id: patients.id, familyGroupId: patients.familyGroupId })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, p.orgId),
					inArray(patients.id, [p.targetPatientId, p.sponsorPatientId]),
				),
			);

		if (targetPatients.length === 0) {
			return { notFound: true as const };
		}

		const familyGroupId =
			p.familyGroupId ||
			targetPatients.find((pt) => pt.id === p.targetPatientId)?.familyGroupId ||
			targetPatients.find((pt) => pt.id === p.sponsorPatientId)?.familyGroupId;

		let allMemberIds: string[] = [];
		if (familyGroupId) {
			const familyMembers = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, p.orgId),
						eq(patients.familyGroupId, familyGroupId),
					),
				);
			allMemberIds = Array.from(
				new Set([...familyMembers.map((m) => m.id), p.targetPatientId, p.sponsorPatientId]),
			);
		} else {
			allMemberIds = Array.from(new Set([p.targetPatientId, p.sponsorPatientId]));
		}

		if (p.invoiceId) {
			const invRes = await lockAndResolveLoyaltyInvoice(tx, {
				orgId: p.orgId,
				invoiceId: p.invoiceId,
				allowedPatientIds: allMemberIds,
			});
			if (!invRes.ok) {
				return { invalidInvoice: true as const, message: invRes.message, code: invRes.code };
			}
		}

		// Детерминированный порядок блокировки строк для предотвращения взаимных блокировок (Deadlocks)
		const sortedMemberIds = [...allMemberIds].sort();

		for (const mid of sortedMemberIds) {
			await processPatientExpiredBonuses(tx, p.orgId, mid);
		}

		const balances = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					inArray(patientBonusBalances.patientId, sortedMemberIds),
				),
			)
			.orderBy(patientBonusBalances.patientId)
			.for("update");

		const balMap = new Map<string, { activeKop: number; spentKop: number }>();
		let totalActiveKop = 0;
		for (const b of balances) {
			const activeKop = parseKopecks(b.activePoints ?? 0);
			const spentKop = parseKopecks(b.lifetimeSpentPoints ?? 0);
			balMap.set(b.patientId, { activeKop, spentKop });
			totalActiveKop += activeKop;
		}

		const pointsToRedeemKop = parseKopecks(p.pointsToRedeem);
		if (pointsToRedeemKop <= 0) {
			return {
				success: true as const,
				redeemedPoints: 0,
				discountRub: 0,
				remainingPoolPoints: Number(kopecksToNumericString(totalActiveKop)),
			};
		}

		if (totalActiveKop < pointsToRedeemKop) {
			return {
				insufficientPoints: true as const,
				activePoints: Number(kopecksToNumericString(totalActiveKop)),
			};
		}

		// Каскадный порядок расходования: сначала целевой пациент, затем спонсор, затем остальные
		const deductionOrder: string[] = [];
		if (allMemberIds.includes(p.targetPatientId)) {
			deductionOrder.push(p.targetPatientId);
		}
		if (p.sponsorPatientId !== p.targetPatientId && allMemberIds.includes(p.sponsorPatientId)) {
			deductionOrder.push(p.sponsorPatientId);
		}
		for (const mid of allMemberIds) {
			if (!deductionOrder.includes(mid)) {
				deductionOrder.push(mid);
			}
		}

		let paymentId: string | null = null;
		let invoiceStatusUpdated = false;
		if (p.invoiceId) {
			const redeemedRubExact = Number(kopecksToNumericString(pointsToRedeemKop));
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: p.orgId,
					patientId: p.targetPatientId,
					documentId: p.invoiceId,
					amountRub: redeemedRubExact,
					amountKopecks: BigInt(pointsToRedeemKop),
					method: "other",
					status: "paid",
					paidAt: new Date(),
					note: `Оплата семейными баллами (${redeemedRubExact} б.)`,
					clientMutationId: p.clientMutationId || null,
				})
				.returning({ id: payments.id });
			paymentId = payment?.id ?? null;

			const rec = await reconcileInvoiceBalanceInDb(tx, p.orgId, p.invoiceId);
			invoiceStatusUpdated = rec.isFullyPaid;
		}

		let remainingToDeductKop = pointsToRedeemKop;
		let firstTxId = "family-redemption";
		let isFirstTx = true;

		for (const mid of deductionOrder) {
			if (remainingToDeductKop <= 0) break;
			const cur = balMap.get(mid) ?? { activeKop: 0, spentKop: 0 };
			const deductForMemberKop = Math.min(cur.activeKop, remainingToDeductKop);
			if (deductForMemberKop <= 0) continue;

			const newActiveKop = Math.max(0, cur.activeKop - deductForMemberKop);
			const newSpentKop = sumKopecks([cur.spentKop, deductForMemberKop]);
			const newActiveStr = kopecksToNumericString(newActiveKop);
			const newSpentStr = kopecksToNumericString(newSpentKop);

			await tx
				.update(patientBonusBalances)
				.set({
					activePoints: newActiveStr,
					lifetimeSpentPoints: newSpentStr,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patientBonusBalances.organizationId, p.orgId),
						eq(patientBonusBalances.patientId, mid),
					),
				);

			await deductUnspentPointsFifo(tx, {
				orgId: p.orgId,
				patientId: mid,
				pointsToDeduct: Number(kopecksToNumericString(deductForMemberKop)),
			});

			const mutationIdForTx =
				isFirstTx && p.clientMutationId
					? p.clientMutationId
					: p.clientMutationId
						? `${p.clientMutationId}:${mid}`
						: null;

			const [txRecord] = await tx
				.insert(bonusTransactions)
				.values({
					organizationId: p.orgId,
					patientId: mid,
					amountPoints: kopecksToNumericString(-deductForMemberKop),
					balanceAfterPoints: newActiveStr,
					type: "redemption_payment",
					relatedPaymentId: paymentId || null,
					relatedInvoiceId: p.invoiceId || null,
					clientMutationId: mutationIdForTx,
					description: p.description,
				})
				.returning();

			if (isFirstTx && txRecord) {
				firstTxId = txRecord.id;
				isFirstTx = false;
			}

			remainingToDeductKop -= deductForMemberKop;
		}

		const totalRemainingPoolKop = Math.max(0, totalActiveKop - pointsToRedeemKop);
		const redeemedRubExact = Number(kopecksToNumericString(pointsToRedeemKop));

		return {
			success: true as const,
			redeemedPoints: redeemedRubExact,
			discountRub: redeemedRubExact,
			remainingPoolPoints: Number(kopecksToNumericString(totalRemainingPoolKop)),
			paymentId,
			invoiceStatusUpdated,
			transactionId: firstTxId,
		};
	};

	const execTenant = () => (p.txClient ? runInTx(p.txClient) : withTenantCtx(p.orgId, runInTx));

	if (p.clientMutationId) {
		try {
			return await execTenant();
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const clientMutationId = p.clientMutationId;
				const lookupReplay = async (tx: TenantDb) => {
					const [existingTx] = await tx
						.select()
						.from(bonusTransactions)
						.where(
							and(
								eq(bonusTransactions.organizationId, p.orgId),
								eq(bonusTransactions.clientMutationId, clientMutationId),
							),
						)
						.limit(1);
					if (!existingTx) return null;
					const redeemedPts = Math.abs(Number(existingTx.amountPoints));
					return {
						success: true as const,
						replayed: true as const,
						redeemedPoints: redeemedPts,
						discountRub: redeemedPts,
						remainingPoolPoints: 0,
						paymentId: existingTx.relatedPaymentId,
						transactionId: existingTx.id,
					};
				};
				const replayed = await withTenantCtx(p.orgId, lookupReplay);
				if (replayed) return replayed;
			}
			throw err;
		}
	}

	return execTenant();
}
