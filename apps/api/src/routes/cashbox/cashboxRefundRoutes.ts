/**
 * cashboxRefundRoutes.ts — Layer 2: Cashbox Refund & Fiscal Correction Operations.
 * 
 * 54-FZ Return of Income (Возврат прихода), Cash Payout, and Receipt Correction Rails.
 */

import { and, eq, or, sql } from "drizzle-orm";
import { kopecksToNumericString, normalizePaymentMethod, rublesToKopecks } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patientInvoices,
	payments,
	patients,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import {
	calculateBalanceAdd,
	calculateBalanceSubtract,
} from "./cashboxHelpers.js";
import { cashRefundBodySchema } from "./cashboxSchemas.js";

export async function registerCashboxRefundRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. POST /api/cash/refund & POST /api/cashbox/refund
	 * Возврат денежных средств из кассы клиники (54-ФЗ возврат прихода / выдача наличных / возврат на депозит).
	 */
	const handleCashRefund = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash refund payout",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashRefundBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная сумма возврата (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId, invoiceId, paymentId, patientId } = parsed.data;

		// [SEV-2.2] Обязательный заголовок Idempotency-Key для защиты от гонок и повторных возвратов
		const rawIdempHeader =
			request.headers["idempotency-key"] ??
			request.headers["x-idempotency-key"];
		const effectiveMutationId =
			typeof rawIdempHeader === "string" && rawIdempHeader.trim()
				? rawIdempHeader.trim()
				: typeof parsed.data.clientMutationId === "string" && parsed.data.clientMutationId.trim()
					? parsed.data.clientMutationId.trim()
					: typeof parsed.data.idempotencyKey === "string" && parsed.data.idempotencyKey.trim()
						? parsed.data.idempotencyKey.trim()
						: undefined;

		if (!effectiveMutationId) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для проведения возврата обязателен заголовок Idempotency-Key или поле clientMutationId.",
			});
		}

		const result = await withTenantCtx(orgId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_refund:' || ${effectiveMutationId}))`,
			);

			// [DEF-REFUND-01] Идемпотентность: защита от повторного списания при ретраях
			const [existingRefund] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, effectiveMutationId),
					),
				)
				.limit(1);

			if (existingRefund) {
				const [existingOp] = await tx
					.select()
					.from(cashOperations)
					.where(
						and(
							eq(cashOperations.organizationId, orgId),
							eq(cashOperations.reasonText, existingRefund.note || ""),
						),
					)
					.limit(1);

				const [currentBox] = await tx
					.select()
					.from(cashBoxes)
					.where(
						and(
							eq(cashBoxes.organizationId, orgId),
							eq(cashBoxes.id, existingOp?.cashBoxId || cashBoxId || ""),
						),
					)
					.limit(1);

				return {
					kind: "replay" as const,
					operation: existingOp,
					cashBox: currentBox,
					refundPaymentId: existingRefund.id,
					fiscalReceiptNumber: existingRefund.fiscalReceiptNumber,
				};
			}

			// Поиск связанного платежа или счёта для фискального возврата (54-ФЗ Возврат прихода / Tag 1054 = 2)
			let linkedPayment: typeof payments.$inferSelect | undefined;
			const refundKop = rublesToKopecks(amountRub);

			if (paymentId) {
				const [p] = await tx
					.select()
					.from(payments)
					.where(and(eq(payments.id, paymentId), eq(payments.organizationId, orgId)))
					.for("update")
					.limit(1);
				linkedPayment = p;

				if (linkedPayment) {
					// [DEF-REFUND-02] Защита от Over-Refund по исходному платежу
					const [refundHistory] = await tx
						.select({
							alreadyRefundedRub: sql<number>`coalesce(sum(abs(${payments.amountRub})), 0)`,
						})
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								sql`${payments.amountRub} < 0`,
								or(
									eq(payments.id, linkedPayment.id),
									linkedPayment.documentId ? eq(payments.documentId, linkedPayment.documentId) : sql`false`,
									sql`${payments.note} LIKE ${'%' + linkedPayment.id + '%'}`,
								),
							),
						);

					const origPaidKop = rublesToKopecks(Number(linkedPayment.amountRub || 0));
					const prevRefundKop = rublesToKopecks(Number(refundHistory?.alreadyRefundedRub || 0));
					const availableToRefundKop = origPaidKop - prevRefundKop;

					if (refundKop > availableToRefundKop) {
						return {
							kind: "over_refund_forbidden" as const,
							availableRub: kopecksToNumericString(Math.max(0, availableToRefundKop)),
							requestedRub: amountRub.toFixed(2),
						};
					}
				}
			}

			let linkedInvoice: typeof patientInvoices.$inferSelect | undefined;
			const targetInvoiceId = invoiceId || linkedPayment?.documentId;
			if (targetInvoiceId) {
				const [inv] = await tx
					.select()
					.from(patientInvoices)
					.where(and(eq(patientInvoices.id, targetInvoiceId), eq(patientInvoices.organizationId, orgId)))
					.for("update")
					.limit(1);
				linkedInvoice = inv;

				if (linkedInvoice) {
					// [DEF-REFUND-02] Защита от Over-Refund по исходному счёту
					const [invoiceRefunds] = await tx
						.select({
							alreadyRefundedRub: sql<number>`coalesce(sum(abs(${payments.amountRub})), 0)`,
						})
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.documentId, linkedInvoice.id),
								sql`${payments.amountRub} < 0`,
							),
						);

					const invoiceTotalKop = rublesToKopecks(Number(linkedInvoice.totalAmountRub || linkedInvoice.totalRub || 0));
					const prevRefundKop = rublesToKopecks(Number(invoiceRefunds?.alreadyRefundedRub || 0));
					const availableToRefundKop = invoiceTotalKop - prevRefundKop;

					if (refundKop > availableToRefundKop) {
						return {
							kind: "over_refund_forbidden" as const,
							availableRub: kopecksToNumericString(Math.max(0, availableToRefundKop)),
							requestedRub: amountRub.toFixed(2),
						};
					}
				}
			}

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
				return { kind: "box_not_found" as const };
			}

			// [SEV-2.3] Защита кассы от утечки наличных при возврате с депозита/аванса
			const isDepositRefund =
				linkedPayment?.method === "family_wallet" ||
				(linkedPayment?.method as string) === "deposit" ||
				(typeof linkedPayment?.note === "string" &&
					linkedPayment.note.toLowerCase().includes("депозит"));

			const balanceBeforeKop =
				targetBox.balanceKopecks !== undefined && targetBox.balanceKopecks !== null
					? Number(targetBox.balanceKopecks)
					: rublesToKopecks(Number(targetBox.balanceRub || 0));
			const balanceBefore = Number(targetBox.balanceRub || 0);

			if (!isDepositRefund && !targetBox.isCashless && balanceBeforeKop < refundKop) {
				return {
					kind: "insufficient_funds" as const,
					balanceBefore: targetBox.balanceRub,
					requestedAmount: amountRub,
				};
			}

			// Находим активную кассовую смену
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
				balanceAfter = calculateBalanceSubtract(balanceBefore, amountRub);

				// Обновляем баланс кассы (рубли и точные копейки)
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

				// Обновляем расход активной смены
				if (activeShift) {
					const updatedExpense = calculateBalanceAdd(activeShift.expenseTotalRub, amountRub);
					await tx
						.update(cashBoxShifts)
						.set({
							expenseTotalRub: updatedExpense,
							updatedAt: new Date(),
						})
						.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
				}
			}

			// Регистрируем кассовую проводку возврата
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: isDepositRefund ? "expense" : "withdrawal",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText:
						reasonText ||
						(isDepositRefund
							? "Возврат средств на депозит пациента (без выдачи наличных)"
							: "Возврат денежных средств покупателю"),
					operatorId: operatorId ?? null,
				})
				.returning();

			// Определяем пациента для проводки в payments и пополнения депозита
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

				// [SEV-2.3] Восстановление виртуального баланса при возврате депозита/семейного кошелька
				if (isDepositRefund) {
					if (linkedPayment?.method === "family_wallet") {
						let targetFamilyGroupId = pat?.familyGroupId || null;
						if (!targetFamilyGroupId) {
							const [headFg] = await tx
								.select({ id: familyGroups.id })
								.from(familyGroups)
								.where(
									and(
										eq(familyGroups.headPatientId, effectivePatientId),
										eq(familyGroups.organizationId, orgId),
									),
								)
								.limit(1);
							if (headFg) targetFamilyGroupId = headFg.id;
						}

						if (targetFamilyGroupId) {
							await tx
								.update(familyGroups)
								.set({
									balance: sql`(${familyGroups.balance}::numeric + ${amountRub})::numeric(12,2)`,
									updatedAt: new Date(),
								})
								.where(
									and(
										eq(familyGroups.id, targetFamilyGroupId),
										eq(familyGroups.organizationId, orgId),
									),
								);
						} else {
							await tx.insert(advanceDepositTaggings).values({
								organizationId: orgId,
								patientId: effectivePatientId,
								patientName,
								depositAmountRub: amountRub.toFixed(2),
								taggedTargetType: "family_wallet_refund",
								taggedTargetName: `Возврат средств на семейный кошелек (${linkedInvoice?.id || linkedPayment?.id || "б/н"})`,
								allocationStatus: "unallocated",
							});
						}
					} else {
						// Обычный авансовый депозит
						await tx.insert(advanceDepositTaggings).values({
							organizationId: orgId,
							patientId: effectivePatientId,
							patientName,
							depositAmountRub: amountRub.toFixed(2),
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

			// [DEF-FIN-13] До подтверждения от ККТ номер ФД строго null
			const refundReceiptNumber = null;
			const refundMethod = isDepositRefund
				? "family_wallet"
				: targetBox.isCashless
					? "card"
					: (linkedPayment?.method || "cash");

			let refundPaymentId: string | undefined;
			let queuedReceiptId: string | undefined;

			if (effectivePatientId) {
				const [insertedPayment] = await tx
					.insert(payments)
					.values({
						organizationId: orgId,
						patientId: effectivePatientId,
						visitId: linkedPayment?.visitId || linkedInvoice?.visitId || null,
						documentId: linkedInvoice?.id || (linkedPayment?.documentId ?? null),
						clientMutationId: effectiveMutationId || null,
						amountRub: -amountRub,
						method: normalizePaymentMethod(refundMethod),
						status: "refunded",
						paidAt: new Date(),
						fiscalReceiptNumber: refundReceiptNumber,
						fiscalReceiptIssuedAt: null,
						payerFullName: operatorId ? "Кассир" : (linkedPayment?.payerFullName || "Кассир"),
						note: reasonText || (isDepositRefund ? `Возврат на депозит на сумму -${amountRub} ₽` : `Возврат денежных средств (54-ФЗ возврат прихода) на сумму -${amountRub} ₽`),
					})
					.returning({ id: payments.id });

				if (insertedPayment) {
					refundPaymentId = insertedPayment.id;

					const [queuedReceipt] = await tx
						.insert(fiscalReceiptQueue)
						.values({
							organizationId: orgId,
							paymentId: insertedPayment.id,
							visitId: linkedPayment?.visitId || linkedInvoice?.visitId || null,
							receiptType: "income_return",
							status: "pending_print",
							payloadJson: {
								receiptType: "income_return",
								tag1054: 2,
								operationType: "income_return",
								amountRub,
								amountKopecks: rublesToKopecks(amountRub),
								method: refundMethod,
								cashRub: isDepositRefund || targetBox.isCashless ? 0 : amountRub,
								electronicRub: !isDepositRefund && targetBox.isCashless ? amountRub : 0,
								advanceOffsetRub: isDepositRefund ? amountRub : 0,
								fiscalReceiptNumber: null,
								originalFiscalReceiptNumber: linkedPayment?.fiscalReceiptNumber || null,
								originalPaymentId: linkedPayment?.id || null,
								patientId: effectivePatientId,
								patientName,
								cashierFullName: "Кассир",
								invoiceId: linkedInvoice?.id || null,
								reasonText: reasonText || (isDepositRefund ? "Возврат на депозит покупателя" : "Возврат денежных средств покупателю"),
							},
							retryCount: 0,
						})
						.returning({ id: fiscalReceiptQueue.id });

					queuedReceiptId = queuedReceipt?.id;
				}
			}

			// Обновляем статус счёта и исходного платежа при наличии
			if (linkedInvoice) {
				const invoiceTotalRub = Number(linkedInvoice.totalAmountRub || linkedInvoice.totalRub || 0);
				const [allRefunds] = await tx
					.select({
						totalRefunded: sql<number>`coalesce(sum(abs(${payments.amountRub})), 0)`,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.documentId, linkedInvoice.id),
							sql`${payments.amountRub} < 0`,
						),
					);
				const totalRefunded = Number(allRefunds?.totalRefunded || 0);
				const nextStatus = totalRefunded >= invoiceTotalRub ? "refunded" : "partially_refunded";
				await tx
					.update(patientInvoices)
					.set({
						status: nextStatus,
						version: sql`${patientInvoices.version} + 1`,
					})
					.where(
						and(
							eq(patientInvoices.id, linkedInvoice.id),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}

			if (linkedPayment && Number(linkedPayment.amountRub) <= amountRub) {
				await tx
					.update(payments)
					.set({ status: "refunded" })
					.where(
						and(
							eq(payments.id, linkedPayment.id),
							eq(payments.organizationId, orgId),
						),
					);
			}

			if (!operation || !updatedBox) {
				throw new Error("Не удалось зафиксировать операцию возврата из кассы");
			}

			return {
				kind: "ok" as const,
				operation,
				cashBox: updatedBox,
				refundPaymentId,
				queuedReceiptId,
				fiscalReceiptNumber: refundReceiptNumber,
			};
		});

		if (result.kind === "replay") {
			return reply.send({
				success: true,
				isReplay: true,
				message: `Операция возврата уже была выполнена ранее (повторный запрос).`,
				operation: result.operation,
				cashBox: result.cashBox,
				invoiceId,
				paymentId,
				refundPaymentId: result.refundPaymentId,
				fiscalReceiptNumber: result.fiscalReceiptNumber,
			});
		}

		if (result.kind === "over_refund_forbidden") {
			return reply.code(400).send({
				error: "OverRefundForbidden",
				message: `Сумма возврата превышает фактически оплаченный остаток. Доступно к возврату: ${result.availableRub} ₽, запрошено: ${result.requestedRub} ₽.`,
				availableRub: result.availableRub,
				requestedRub: result.requestedRub,
			});
		}

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет для возврата не найден.",
			});
		}

		if (result.kind === "insufficient_funds") {
			return reply.code(400).send({
				error: "InsufficientFunds",
				message: `Недостаточно средств в кассе для возврата. Доступно: ${result.balanceBefore.toFixed(2)} ₽, запрошено: ${result.requestedAmount.toFixed(2)} ₽.`,
			});
		}

		return reply.send({
			success: true,
			message: `Возврат ${amountRub.toFixed(2)} ₽ успешно оформлен в кассе.`,
			operation: result.operation,
			cashBox: result.cashBox,
			invoiceId,
			paymentId,
			refundPaymentId: result.refundPaymentId,
			fiscalReceiptQueueId: result.queuedReceiptId,
			fiscalReceiptNumber: result.fiscalReceiptNumber,
		});
	};

	app.post("/api/cash/refund", handleCashRefund);
	app.post("/api/cashbox/refund", handleCashRefund);
}
