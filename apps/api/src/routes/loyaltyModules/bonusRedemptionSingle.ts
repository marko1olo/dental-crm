import {
	calculateMaxRedeemablePoints,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	bonusTransactions,
	patientBonusBalances,
	patientInvoices,
	patients,
	payments,
} from "../../db/schema.js";
import { reconcileInvoiceBalanceInDb } from "../billingRoutes/invoiceBalanceReconciler.js";
import { deductUnspentPointsFifo, processPatientExpiredBonuses } from "./bonusBalanceService.js";
import {
	isPgUniqueViolation,
	lockAndResolveLoyaltyInvoice,
	resolveCanonicalInvoiceTotalKop,
	resolvePatientLoyaltyCoveragePercent,
} from "./bonusRedemptionUtils.js";

export interface ExecuteRedeemParams {
	readonly orgId: string;
	readonly patientId: string;
	readonly invoiceId?: string | null | undefined;
	readonly invoiceAmountRub: number;
	readonly pointsToRedeem: number;
	readonly allowFullCoverage?: boolean | undefined;
	readonly clientMutationId?: string | undefined;
	readonly description: string;
	readonly txClient?: TenantDb | undefined;
}

async function buildRedeemReplayResponse(
	tx: TenantDb,
	p: ExecuteRedeemParams,
	existingTx: typeof bonusTransactions.$inferSelect,
) {
	const redeemedPts = Math.abs(Number(existingTx.amountPoints));
	const redeemedKop = parseKopecks(redeemedPts);
	let invoiceAmountKop = parseKopecks(p.invoiceAmountRub);
	const targetInvoiceId = existingTx.relatedInvoiceId ?? p.invoiceId;
	if (targetInvoiceId) {
		const [inv] = await tx
			.select({
				totalPriceKopecks: patientInvoices.totalPriceKopecks,
				totalAmountRub: patientInvoices.totalAmountRub,
				totalRub: patientInvoices.totalRub,
			})
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, p.orgId),
					eq(patientInvoices.id, targetInvoiceId),
				),
			)
			.limit(1);
		if (inv) {
			invoiceAmountKop = resolveCanonicalInvoiceTotalKop(inv);
		}
	}
	const remainingInvoicePaymentKop = Math.max(0, invoiceAmountKop - redeemedKop);
	const remainingInvoicePaymentRub = Number(kopecksToNumericString(remainingInvoicePaymentKop));
	return {
		success: true as const,
		replayed: true as const,
		redeemedPoints: redeemedPts,
		discountRub: redeemedPts,
		remainingInvoicePaymentRub,
		newActivePoints: Number(existingTx.balanceAfterPoints),
		paymentId: existingTx.relatedPaymentId,
		invoiceStatusUpdated: false,
		transactionId: existingTx.id,
	};
}

export async function executeBonusRedeem(p: ExecuteRedeemParams) {
	const runInTx = async (tx: TenantDb) => {
		if (p.clientMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${p.orgId} || ':bonus_redeem:' || ${p.clientMutationId}))`,
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
				return buildRedeemReplayResponse(tx, p, existingTx);
			}
		}

		const [patient] = await tx
			.select({ id: patients.id, familyGroupId: patients.familyGroupId })
			.from(patients)
			.where(and(eq(patients.organizationId, p.orgId), eq(patients.id, p.patientId)))
			.limit(1)
			.for("update");
		if (!patient) return { notFound: true as const };

		await processPatientExpiredBonuses(tx, p.orgId, p.patientId);

		const [balance] = await tx
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, p.patientId),
				),
			)
			.limit(1)
			.for("update");

		let effectiveInvoiceAmountRub = p.invoiceAmountRub;
		if (p.invoiceId) {
			const invRes = await lockAndResolveLoyaltyInvoice(tx, {
				orgId: p.orgId,
				invoiceId: p.invoiceId,
				allowedPatientIds: [p.patientId],
			});
			if (!invRes.ok) {
				return { invalidInvoice: true as const, message: invRes.message, code: invRes.code };
			}
			effectiveInvoiceAmountRub = invRes.invoiceTotalRub;
		}

		const maxCoverage = resolvePatientLoyaltyCoveragePercent({
			hasFamilyGroup: Boolean(patient.familyGroupId),
			lifetimeSpentPoints: balance?.lifetimeSpentPoints,
			lifetimeEarnedPoints: balance?.lifetimeEarnedPoints,
			allowFullCoverage: p.allowFullCoverage,
		});

		const activePoints = Number(balance?.activePoints ?? 0);
		const coverage = calculateMaxRedeemablePoints(
			effectiveInvoiceAmountRub,
			activePoints,
			maxCoverage,
		);

		if (p.pointsToRedeem > coverage.maxAllowedPoints) {
			return { limitExceeded: true as const, maxAllowedPoints: coverage.maxAllowedPoints };
		}
		if (p.pointsToRedeem > activePoints) {
			return { insufficientPoints: true as const, activePoints };
		}

		const activePointsKop = parseKopecks(balance?.activePoints ?? 0);
		const pointsToRedeemKop = parseKopecks(p.pointsToRedeem);
		const currentLifetimeSpentKop = parseKopecks(balance?.lifetimeSpentPoints ?? 0);

		const newActivePointsKop = Math.max(0, activePointsKop - pointsToRedeemKop);
		const newLifetimeSpentKop = sumKopecks([currentLifetimeSpentKop, pointsToRedeemKop]);
		const newActivePointsStr = kopecksToNumericString(newActivePointsKop);
		const newLifetimeSpentStr = kopecksToNumericString(newLifetimeSpentKop);
		const newActivePoints = Number(newActivePointsStr);
		const redeemedAmountRubExact = Number(kopecksToNumericString(pointsToRedeemKop));

		await tx
			.update(patientBonusBalances)
			.set({
				activePoints: newActivePointsStr,
				lifetimeSpentPoints: newLifetimeSpentStr,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(patientBonusBalances.organizationId, p.orgId),
					eq(patientBonusBalances.patientId, p.patientId),
				),
			);

		await deductUnspentPointsFifo(tx, {
			orgId: p.orgId,
			patientId: p.patientId,
			pointsToDeduct: p.pointsToRedeem,
		});

		let paymentId: string | null = null;
		let invoiceStatusUpdated = false;

		if (p.invoiceId) {
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: p.orgId,
					patientId: p.patientId,
					documentId: p.invoiceId,
					amountRub: redeemedAmountRubExact,
					amountKopecks: BigInt(pointsToRedeemKop),
					method: "other",
					status: "paid",
					paidAt: new Date(),
					note: `Оплата баллами (${redeemedAmountRubExact} б.)`,
					clientMutationId: p.clientMutationId || null,
				})
				.returning({ id: payments.id });
			paymentId = payment?.id ?? null;

			const rec = await reconcileInvoiceBalanceInDb(tx, p.orgId, p.invoiceId);
			invoiceStatusUpdated = rec.isFullyPaid;
		}

		const [txRecord] = await tx
			.insert(bonusTransactions)
			.values({
				organizationId: p.orgId,
				patientId: p.patientId,
				amountPoints: kopecksToNumericString(-pointsToRedeemKop),
				balanceAfterPoints: newActivePointsStr,
				type: "redemption_payment",
				relatedPaymentId: paymentId || null,
				relatedInvoiceId: p.invoiceId || null,
				clientMutationId: p.clientMutationId || null,
				description: p.description,
			})
			.returning();

		const effectiveInvoiceKop = parseKopecks(effectiveInvoiceAmountRub);
		const remainingInvoicePaymentKop = Math.max(0, effectiveInvoiceKop - pointsToRedeemKop);
		const remainingInvoicePaymentRub = Number(
			kopecksToNumericString(remainingInvoicePaymentKop),
		);

		return {
			success: true as const,
			redeemedPoints: redeemedAmountRubExact,
			discountRub: redeemedAmountRubExact,
			remainingInvoicePaymentRub,
			newActivePoints,
			paymentId,
			invoiceStatusUpdated,
			transactionId: txRecord?.id || "redemption",
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
					return existingTx ? buildRedeemReplayResponse(tx, p, existingTx) : null;
				};
				const replayed = await withTenantCtx(p.orgId, lookupReplay);
				if (replayed) return replayed;
			}
			throw err;
		}
	}

	return execTenant();
}
