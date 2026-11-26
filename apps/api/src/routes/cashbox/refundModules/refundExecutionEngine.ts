/**
 * apps/api/src/routes/cashbox/refundModules/refundExecutionEngine.ts
 * Stage 2: Atomic ACID cashbox refund, deposit restoration, 54-FZ queue & invoice recalculation.
 */

import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
	buildCanonicalRefundPaymentAmounts,
	classifyPaymentFlowRecord,
	kopecksToNumericString,
	kopecksToRub,
	normalizePaymentMethod,
	rublesToKopecks,
} from "@dental/shared";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patientInvoices,
	patientRelationships,
	patients,
	payments,
	users,
} from "../../../db/schema.js";
import { withTenantCtx } from "../../../db/rls.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import {
	checkCashRefundReplay,
	lockAndValidateRefundTargets,
	resolveInvoiceTotalKopecks,
} from "./refundLookupAndValidation.js";
import type { CashRefundTxResult, ExecuteCashRefundParams } from "./types.js";

export async function executeCashRefundTransaction(
	orgId: string,
	params: ExecuteCashRefundParams,
): Promise<CashRefundTxResult> {
	const {
		cashBoxId,
		refundKop,
		amountRub,
		reasonText,
		operatorId,
		invoiceId,
		paymentId,
		patientId,
		cashierFullName,
		effectiveMutationId,
	} = params;
	const exactAmountRub = kopecksToRub(refundKop);

	return withTenantCtx(orgId, async (tx): Promise<CashRefundTxResult> => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_refund:' || ${effectiveMutationId}))`,
		);

		const replayResult = await checkCashRefundReplay(
			tx,
			orgId,
			effectiveMutationId,
			cashBoxId,
		);
		if (replayResult) {
			return replayResult;
		}

		const validation = await lockAndValidateRefundTargets(
			tx,
			orgId,
			refundKop,
			paymentId,
			invoiceId,
		);
		if (!validation.ok) {
			return validation.failure;
		}
		const { linkedPayment, linkedInvoice } = validation.targets;

		await ensureOrganizationCashBoxes(tx, orgId);

		let targetBox: typeof cashBoxes.$inferSelect | undefined;
		if (cashBoxId) {
			const [box] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
				.for("update")
				.limit(1);
			targetBox = box;
		} else {
			const [box] = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
				.for("update")
				.limit(1);
			targetBox = box;
		}

		if (!targetBox) {
			return { kind: "box_not_found" };
		}

		const isDepositRefund =
			linkedPayment?.method === "family_wallet" ||
			String(linkedPayment?.method ?? "") === "deposit";

		const balanceBeforeKop =
			targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
				? Number(targetBox.balanceKopecks)
				: rublesToKopecks(Number(targetBox.balanceRub || 0));
		const balanceBefore = kopecksToRub(balanceBeforeKop);

		if (!isDepositRefund && !targetBox.isCashless && balanceBeforeKop < refundKop) {
			return {
				kind: "insufficient_funds",
				balanceBeforeKop,
				requestedKop: refundKop,
			};
		}

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, targetBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		let updatedBox = targetBox;
		let balanceAfter = balanceBefore;
		let balanceAfterKop = balanceBeforeKop;

		if (!isDepositRefund) {
			balanceAfterKop = balanceBeforeKop - refundKop;
			balanceAfter = kopecksToRub(balanceAfterKop);

			const [savedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					balanceKopecks: balanceAfterKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();
			if (savedBox) updatedBox = savedBox;

			if (activeShift) {
				const prevExpenseKop =
					activeShift.expenseTotalKopecks > 0
						? activeShift.expenseTotalKopecks
						: rublesToKopecks(Number(activeShift.expenseTotalRub || 0));
				const nextExpenseKop = prevExpenseKop + refundKop;
				await tx
					.update(cashBoxShifts)
					.set({
						expenseTotalRub: kopecksToRub(nextExpenseKop),
						expenseTotalKopecks: nextExpenseKop,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}
		}

		// Все возвраты пациентам отражаются типом "expense" с флагом isDepositRefund в metadata
		// ("withdrawal" зарезервирован исключительно под инкассацию).
		const [operation] = await tx
			.insert(cashOperations)
			.values({
				organizationId: orgId,
				cashBoxId: targetBox.id,
				shiftId: activeShift?.id ?? null,
				operationType: "expense",
				amountRub: exactAmountRub,
				amountKopecks: refundKop,
				balanceBeforeRub: balanceBefore,
				balanceBeforeKopecks: BigInt(balanceBeforeKop),
				balanceAfterRub: balanceAfter,
				balanceAfterKopecks: BigInt(balanceAfterKop),
				reasonText:
					reasonText ||
					(isDepositRefund
						? "Возврат средств на депозит пациента (без выдачи наличных)"
						: "Возврат денежных средств покупателю"),
				operatorId: operatorId ?? null,
				metadata: {
					idempotencyKey: effectiveMutationId,
					isDepositRefund,
					...(linkedPayment ? { originalPaymentId: linkedPayment.id } : {}),
				},
			})
			.returning();

		let resolvedCashierName = cashierFullName?.trim() || "";
		if (!resolvedCashierName && operatorId) {
			const [opUser] = await tx
				.select({ fullName: users.fullName })
				.from(users)
				.where(and(eq(users.id, operatorId), eq(users.organizationId, orgId)))
				.limit(1);
			if (opUser?.fullName) {
				resolvedCashierName = opUser.fullName;
			}
		}
		if (!resolvedCashierName) {
			resolvedCashierName = linkedPayment?.payerFullName || "Администратор кассы";
		}

		let effectivePatientId = patientId || linkedPayment?.patientId || linkedInvoice?.patientId || null;
		let patientName = "Розничный покупатель";

		if (effectivePatientId) {
			const [pat] = await tx
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.id, effectivePatientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (pat?.fullName) {
				patientName = pat.fullName;
			}

			if (isDepositRefund) {
				if (linkedPayment?.method === "family_wallet") {
					let targetFamilyGroupId = pat?.familyGroupId || null;
					if (!targetFamilyGroupId) {
						const [headFg] = await tx
							.select({ id: familyGroups.id })
							.from(familyGroups)
							.where(
								and(
									or(
										eq(familyGroups.headPatientId, effectivePatientId),
										eq(familyGroups.primaryPatientId, effectivePatientId),
									),
									eq(familyGroups.organizationId, orgId),
								),
							)
							.for("update")
							.limit(1);
						if (headFg) targetFamilyGroupId = headFg.id;
					}
					if (!targetFamilyGroupId) {
						const relRows = await tx
							.select({
								patientId: patientRelationships.patientId,
								relatedPatientId: patientRelationships.relatedPatientId,
							})
							.from(patientRelationships)
							.where(
								and(
									eq(patientRelationships.organizationId, orgId),
									eq(patientRelationships.canSpendFamilyWallet, true),
									or(
										eq(patientRelationships.patientId, effectivePatientId),
										eq(patientRelationships.relatedPatientId, effectivePatientId),
									),
								),
							);
						const otherIds = Array.from(
							new Set(
								relRows
									.map((r) =>
										r.patientId === effectivePatientId ? r.relatedPatientId : r.patientId,
									)
									.filter((id): id is string => Boolean(id)),
							),
						);
						if (otherIds.length > 0) {
							const [relFg] = await tx
								.select({ id: familyGroups.id })
								.from(familyGroups)
								.where(
									and(
										eq(familyGroups.organizationId, orgId),
										or(
											inArray(familyGroups.headPatientId, otherIds),
											inArray(familyGroups.primaryPatientId, otherIds),
										),
									),
								)
								.for("update")
								.limit(1);
							if (relFg) {
								targetFamilyGroupId = relFg.id;
							} else {
								const relPats = await tx
									.select({ familyGroupId: patients.familyGroupId })
									.from(patients)
									.where(
										and(
											eq(patients.organizationId, orgId),
											inArray(patients.id, otherIds),
										),
									);
								targetFamilyGroupId =
									relPats.find((rp) => Boolean(rp.familyGroupId))?.familyGroupId ?? null;
							}
						}
					}

					let lockedFg: { id: string; balanceKopecks: number; balance: string } | null = null;
					if (targetFamilyGroupId) {
						const [fgRow] = await tx
							.select({
								id: familyGroups.id,
								balanceKopecks: familyGroups.balanceKopecks,
								balance: familyGroups.balance,
							})
							.from(familyGroups)
							.where(
								and(
									eq(familyGroups.id, targetFamilyGroupId),
									eq(familyGroups.organizationId, orgId),
								),
							)
							.for("update")
							.limit(1);
						lockedFg = fgRow ?? null;
					}

					if (lockedFg) {
						const currentKop =
							lockedFg.balanceKopecks !== null &&
							lockedFg.balanceKopecks !== undefined &&
							(lockedFg.balanceKopecks !== 0 || Number(lockedFg.balance || 0) === 0)
								? Number(lockedFg.balanceKopecks)
								: rublesToKopecks(Number(lockedFg.balance || 0));
						const newBalanceKop = currentKop + refundKop;
						const newBalanceRubStr = kopecksToNumericString(newBalanceKop);

						await tx
							.update(familyGroups)
							.set({
								balanceKopecks: newBalanceKop,
								balance: newBalanceRubStr,
								updatedAt: new Date(),
							})
							.where(and(eq(familyGroups.id, lockedFg.id), eq(familyGroups.organizationId, orgId)));
					} else {
						await tx.insert(advanceDepositTaggings).values({
							organizationId: orgId,
							patientId: effectivePatientId,
							patientName,
							depositAmountRub: kopecksToNumericString(refundKop),
							depositAmountKopecks: BigInt(refundKop),
							taggedTargetType: "family_wallet_refund",
							taggedTargetName: `Возврат средств на семейный кошелек (${linkedInvoice?.id || linkedPayment?.id || "б/н"})`,
							allocationStatus: "unallocated",
						});
					}
				} else {
					await tx.insert(advanceDepositTaggings).values({
						organizationId: orgId,
						patientId: effectivePatientId,
						patientName,
						depositAmountRub: kopecksToNumericString(refundKop),
						depositAmountKopecks: BigInt(refundKop),
						taggedTargetType: "deposit_refund",
						taggedTargetName: `Возврат средств на авансовый депозит (${linkedInvoice?.id || linkedPayment?.id || "б/н"})`,
						allocationStatus: "unallocated",
					});
				}
			}
		} else {
			const [existingRetail] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.fullName, "Розничный покупатель")))
				.limit(1);
			if (existingRetail) {
				effectivePatientId = existingRetail.id;
			} else {
				const [createdRetail] = await tx
					.insert(patients)
					.values({
						organizationId: orgId,
						fullName: "Розничный покупатель",
						notes: "Системная запись для возвратов и розничных продаж (54-ФЗ)",
					})
					.returning({ id: patients.id });
				effectivePatientId = createdRetail?.id ?? null;
			}
		}

		// До подтверждения от ККТ номер ФД строго null
		const refundReceiptNumber = null;
		const refundMethod = isDepositRefund
			? "family_wallet"
			: linkedPayment?.method === "online" || targetBox.type === "sbp"
				? "online"
				: targetBox.isCashless
					? "card"
					: linkedPayment?.method || "cash";

		let refundPaymentId: string | undefined;
		let queuedReceiptId: string | undefined;

		if (effectivePatientId) {
			const canonicalRefundAmounts = buildCanonicalRefundPaymentAmounts(BigInt(refundKop));
			const [insertedPayment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: effectivePatientId,
					visitId: linkedPayment?.visitId || linkedInvoice?.visitId || null,
					documentId: linkedInvoice?.id || (linkedPayment?.documentId ?? null),
					clientMutationId: effectiveMutationId,
					amountRub: canonicalRefundAmounts.amountRub,
					amountKopecks: canonicalRefundAmounts.amountKopecks,
					method: normalizePaymentMethod(refundMethod),
					status: canonicalRefundAmounts.status,
					paidAt: new Date(),
					fiscalReceiptNumber: refundReceiptNumber,
					fiscalReceiptIssuedAt: null,
					payerFullName: resolvedCashierName,
					note: (() => {
						const baseNote =
							reasonText ||
							(isDepositRefund
								? `Возврат на депозит на сумму -${amountRub} ₽`
								: `Возврат денежных средств на сумму -${amountRub} ₽`);
						return linkedPayment ? `${baseNote} [ref:${linkedPayment.id}]` : baseNote;
					})(),
				})
				.returning({ id: payments.id });

			if (insertedPayment) {
				refundPaymentId = insertedPayment.id;

				// Internal deposit / family_wallet refunds restore patient credit without paying cash/card out of KKT drawer.
				if (!isDepositRefund) {
					const refundFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
						patientId: effectivePatientId,
						operationType: "income_return",
						taxationSystem: "usn_income",
						cashierFullName: resolvedCashierName,
						customerContact: "",
						customerName: patientName,
						totalKopecks: refundKop,
						cashKopecks: !targetBox.isCashless ? refundKop : 0,
						electronicCardKopecks:
							targetBox.isCashless && refundMethod !== "online" ? refundKop : 0,
						sbpKopecks: refundMethod === "online" ? refundKop : 0,
						prepaidKopecks: 0,
						items: [
							{
								name: reasonText || "Возврат денежных средств покупателю",
								priceKopecks: refundKop,
								quantity: 1,
								amountKopecks: refundKop,
								subject: "service",
								method: "full_payment",
								vatRate: "vat_none",
								measure: "piece",
							},
						],
					});

					const [queuedReceipt] = await tx
						.insert(fiscalReceiptQueue)
						.values({
							organizationId: orgId,
							paymentId: insertedPayment.id,
							visitId: linkedPayment?.visitId || linkedInvoice?.visitId || null,
							receiptType: "income_return",
							status: "pending_print",
							payloadJson: {
								...refundFfdPayload,
								clientMutationId: effectiveMutationId,
								originalFiscalReceiptNumber: linkedPayment?.fiscalReceiptNumber || null,
								originalPaymentId: linkedPayment?.id || null,
								patientId: effectivePatientId,
								patientName,
								invoiceId: linkedInvoice?.id || null,
								reasonText: reasonText || "Возврат денежных средств покупателю",
							},
							retryCount: 0,
						})
						.returning({ id: fiscalReceiptQueue.id });

					queuedReceiptId = queuedReceipt?.id;
				}
			}
		}

		if (linkedInvoice) {
			const invoiceTotalKop = resolveInvoiceTotalKopecks(linkedInvoice);
			const invoicePayments = await tx
				.select({
					status: payments.status,
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
					fiscalReceipt: payments.fiscalReceipt,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.documentId, linkedInvoice.id),
					),
				);
			let totalPaidKop = 0n;
			let totalRefundedKop = 0n;
			for (const row of invoicePayments) {
				const flow = classifyPaymentFlowRecord(row, "ledger");
				if (flow.kind === "payment") {
					totalPaidKop += flow.absKopecks;
				} else if (flow.kind === "refund") {
					totalRefundedKop += flow.absKopecks;
				}
			}
			const netPaidKop = totalPaidKop > totalRefundedKop ? totalPaidKop - totalRefundedKop : 0n;
			const nextStatus =
				netPaidKop <= 0n || totalRefundedKop >= invoiceTotalKop ? "refunded" : "partially_refunded";
			await tx
				.update(patientInvoices)
				.set({
					status: nextStatus,
					paidAt: null,
					version: sql`${patientInvoices.version} + 1`,
				})
				.where(
					and(
						eq(patientInvoices.id, linkedInvoice.id),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}

		if (!operation || !updatedBox) {
			throw new Error("Не удалось зафиксировать операцию возврата из кассы");
		}

		return {
			kind: "ok",
			operation,
			cashBox: updatedBox,
			refundPaymentId,
			queuedReceiptId,
			fiscalReceiptNumber: refundReceiptNumber,
		};
	});
}
