/**
 * installmentTranchePayRoutes.ts — Atomic Tranche Payment & 54-FZ Fiscal Queueing.
 */

import { kopecksToRubles, positiveMoneyRubSchema, rublesToKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	installmentContracts,
	installmentTranches,
	payments,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { reconcileInvoiceBalanceInDb } from "../../billingRoutes/invoiceBalanceReconciler.js";
import {
	parseHeaderIdempotencyKey,
	resolveCashBoxPaymentMethod,
	resolveLockedCashBoxForInstallment,
	resolveSafeKopecks,
} from "./installmentHelpers.js";

const payTrancheBodySchema = z
	.object({
		cashBoxId: z.string().uuid().optional(),
		operatorId: z.string().uuid().optional(),
		amountPaidKopecks: z.number().int().positive().optional(),
		amountRub: positiveMoneyRubSchema.optional(),
		notes: z.string().trim().optional(),
		clientMutationId: z.string().trim().optional(),
		idempotencyKey: z.string().trim().optional(),
	})
	.strict();

export function registerInstallmentTranchePayRoutes(app: FastifyInstance): void {
	const handlePayTranche = async (
		request: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"pay installment tranche",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const paramsParsed = z
			.object({ id: z.string().uuid("Идентификатор транша должен быть корректным UUID") })
			.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор транша рассрочки.",
				details: paramsParsed.error.issues,
			});
		}
		const { id } = paramsParsed.data;

		const idempotencyKey = parseHeaderIdempotencyKey(request);
		if (!idempotencyKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для проведения оплаты транша рассрочки обязателен заголовок Idempotency-Key (UUIDv7).",
			});
		}
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}

		const parsed = payTrancheBodySchema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для оплаты транша рассрочки.",
				details: parsed.error.issues,
			});
		}
		const payData = parsed.data;

		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);

		const result = await withTenantCtx(orgId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':installment_tranche_pay:' || ${idempotencyKey}))`,
			);

			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, idempotencyKey),
					),
				)
				.limit(1);

			const [existingOp] = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						sql`${cashOperations.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
					),
				)
				.limit(1);

			if (existingPayment || existingOp) {
				const [currentTranche] = await tx
					.select()
					.from(installmentTranches)
					.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
					.limit(1);

				if (!currentTranche) {
					return { kind: "tranche_not_found" as const };
				}

				const [currentContract] = await tx
					.select()
					.from(installmentContracts)
					.where(
						and(
							eq(installmentContracts.id, currentTranche.contractId),
							eq(installmentContracts.organizationId, orgId),
						),
					)
					.limit(1);

				if (!currentContract) {
					return { kind: "contract_not_found" as const };
				}

				const replayAmountRub = existingPayment?.amountRub ?? existingOp?.amountRub ?? 0;

				return {
					kind: "ok" as const,
					tranche: currentTranche,
					contract: currentContract,
					cashOperation: existingOp,
					payment: existingPayment,
					paymentRub: replayAmountRub,
					isTrancheFullyPaid: currentTranche.isPaid,
					isReplay: true,
				};
			}

			const [tranche] = await tx
				.select()
				.from(installmentTranches)
				.where(and(eq(installmentTranches.id, id), eq(installmentTranches.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!tranche) {
				return { kind: "tranche_not_found" as const };
			}

			if (tranche.isPaid) {
				return { kind: "already_paid" as const };
			}

			const trancheNominalKop =
				tranche.amountKopecks !== null && tranche.amountKopecks !== undefined
					? Number(tranche.amountKopecks)
					: rublesToKopecks(tranche.amountRub);
			const currentPaidKop =
				tranche.paidAmountKopecks !== null && tranche.paidAmountKopecks !== undefined
					? Number(tranche.paidAmountKopecks)
					: tranche.isPaid
						? trancheNominalKop
						: 0;

			const trancheRemainingKop = Math.max(0, trancheNominalKop - currentPaidKop);
			if (trancheRemainingKop <= 0) {
				return { kind: "already_paid" as const };
			}

			const requestedKop =
				payData.amountPaidKopecks ??
				(payData.amountRub ? rublesToKopecks(payData.amountRub) : null);
			const paymentKop =
				requestedKop !== null ? Math.min(trancheRemainingKop, requestedKop) : trancheRemainingKop;
			const paymentRub = kopecksToRubles(paymentKop);

			const newPaidKop = currentPaidKop + paymentKop;
			const remainingTrancheKop = Math.max(0, trancheNominalKop - newPaidKop);
			const isTrancheFullyPaid = remainingTrancheKop === 0;

			const [contract] = await tx
				.select()
				.from(installmentContracts)
				.where(
					and(
						eq(installmentContracts.id, tranche.contractId),
						eq(installmentContracts.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);

			if (!contract) {
				return { kind: "contract_not_found" as const };
			}

			const boxRes = await resolveLockedCashBoxForInstallment(
				tx,
				orgId,
				payData.cashBoxId,
				"cashless",
			);
			if (!boxRes.ok) {
				return { kind: boxRes.kind };
			}
			const targetBox = boxRes.box;

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

			const beforeKop = resolveSafeKopecks(targetBox.balanceKopecks, targetBox.balanceRub);
			const balanceBefore = kopecksToRubles(beforeKop);
			const afterKop = beforeKop + paymentKop;
			const balanceAfter = kopecksToRubles(afterKop);
			const now = new Date();

			await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					balanceKopecks: afterKop,
					updatedAt: now,
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)));

			if (activeShift) {
				const prevIncomeKop = resolveSafeKopecks(
					activeShift.incomeTotalKopecks,
					activeShift.incomeTotalRub,
				);
				const nextIncomeKop = prevIncomeKop + paymentKop;
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: kopecksToRubles(nextIncomeKop),
						incomeTotalKopecks: nextIncomeKop,
						updatedAt: now,
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			const operationReasonText = isTrancheFullyPaid
				? `Оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber}`
				: `Частичная оплата взноса №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber} (остаток долга: ${kopecksToRubles(remainingTrancheKop)} ₽)`;

			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "income",
					amountRub: paymentRub,
					amountKopecks: paymentKop,
					balanceBeforeRub: balanceBefore,
					balanceBeforeKopecks: BigInt(beforeKop),
					balanceAfterRub: balanceAfter,
					balanceAfterKopecks: BigInt(afterKop),
					reasonText: operationReasonText,
					patientId: contract.patientId,
					installmentTrancheId: tranche.id,
					operatorId: payData.operatorId ?? null,
					metadata: { idempotencyKey },
				})
				.returning();

			if (!operation) {
				throw new Error("Не удалось создать кассовую операцию оплаты транша");
			}

			const paymentMethodCode = resolveCashBoxPaymentMethod(targetBox);
			const [paymentRecord] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: contract.patientId,
					amountRub: paymentRub,
					amountKopecks: BigInt(paymentKop),
					method: paymentMethodCode,
					status: "paid",
					documentId: contract.id,
					clientMutationId: idempotencyKey,
					note: operationReasonText,
					paidAt: now,
				})
				.returning();

			if (!paymentRecord) {
				throw new Error("Не удалось создать платёж транша рассрочки");
			}

			const trancheFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
				patientId: contract.patientId,
				operationType: "income",
				taxationSystem: "usn_income",
				cashierFullName: "Кассир-администратор",
				customerContact: "",
				totalKopecks: paymentKop,
				cashKopecks: paymentMethodCode === "cash" ? paymentKop : 0,
				electronicCardKopecks: paymentMethodCode === "card" ? paymentKop : 0,
				sbpKopecks: paymentMethodCode === "online" ? paymentKop : 0,
				prepaidKopecks: 0,
				items: [
					{
						name: `Оплата транша №${tranche.trancheNumber} по договору рассрочки ${contract.contractNumber}`,
						priceKopecks: paymentKop,
						quantity: 1,
						amountKopecks: paymentKop,
						subject: "payment",
						method: "credit_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			});

			await tx.insert(fiscalReceiptQueue).values({
				organizationId: orgId,
				paymentId: paymentRecord.id,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					...trancheFfdPayload,
					clientMutationId: idempotencyKey,
					method: paymentMethodCode,
					patientId: contract.patientId,
					contractNumber: contract.contractNumber,
					trancheNumber: tranche.trancheNumber,
					note: operationReasonText,
				},
				retryCount: 0,
			});

			// Номинал amountRub и amountKopecks сохраняются неизменными; факт оплаты фиксируется в paidAmountKopecks
			const [updatedTranche] = await tx
				.update(installmentTranches)
				.set({
					amountRub: tranche.amountRub,
					amountKopecks: BigInt(trancheNominalKop),
					paidAmountKopecks: newPaidKop,
					isPaid: isTrancheFullyPaid,
					paidAt: now,
					status: isTrancheFullyPaid ? "paid" : "partially_paid",
					cashOperationId: operation.id,
				})
				.where(and(eq(installmentTranches.id, tranche.id), eq(installmentTranches.organizationId, orgId)))
				.returning();

			if (!updatedTranche) {
				throw new Error("Не удалось обновить статус транша рассрочки");
			}

			const prevPaidKop = BigInt(resolveSafeKopecks(contract.paidAmountKopecks, contract.paidAmountRub));
			const contractTotalKop = BigInt(resolveSafeKopecks(contract.totalAmountKopecks, contract.totalAmountRub));
			const newPaidKopBigInt = prevPaidKop + BigInt(paymentKop);
			const newRemainingKopBigInt =
				contractTotalKop > newPaidKopBigInt ? contractTotalKop - newPaidKopBigInt : 0n;
			const newPaidAmount = kopecksToRubles(Number(newPaidKopBigInt));
			const newRemaining = kopecksToRubles(Number(newRemainingKopBigInt));
			const isFullyPaid = newRemainingKopBigInt <= 0n;

			const [updatedContract] = await tx
				.update(installmentContracts)
				.set({
					paidAmountRub: newPaidAmount,
					paidAmountKopecks: newPaidKopBigInt,
					remainingAmountRub: newRemaining,
					remainingAmountKopecks: newRemainingKopBigInt,
					status: isFullyPaid ? "completed" : contract.status,
					completedAt: isFullyPaid ? now : null,
					updatedAt: now,
				})
				.where(and(eq(installmentContracts.id, contract.id), eq(installmentContracts.organizationId, orgId)))
				.returning();

			if (!updatedContract) {
				throw new Error("Не удалось обновить баланс договора рассрочки");
			}

			const noteInvoiceMatch = /\[invoice:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/.exec(
				contract.notes || "",
			);
			let linkedInvoiceId = noteInvoiceMatch?.[1];
			if (!linkedInvoiceId) {
				const [contractOp] = await tx
					.select({ invoiceId: cashOperations.invoiceId })
					.from(cashOperations)
					.where(
						and(
							eq(cashOperations.organizationId, orgId),
							sql`${cashOperations.metadata}->>'contractId' = ${contract.id}`,
							sql`${cashOperations.invoiceId} IS NOT NULL`,
						),
					)
					.limit(1);
				linkedInvoiceId = contractOp?.invoiceId ?? undefined;
			}
			if (linkedInvoiceId) {
				await reconcileInvoiceBalanceInDb(tx, orgId, linkedInvoiceId);
			}

			return {
				kind: "ok" as const,
				tranche: updatedTranche,
				contract: updatedContract,
				cashOperation: operation,
				payment: paymentRecord,
				paymentRub,
				isTrancheFullyPaid,
				isReplay: false,
			};
		});

		if (result.kind === "tranche_not_found") {
			return reply.code(404).send({
				error: "TrancheNotFound",
				message: "Транш рассрочки не найден.",
			});
		}
		if (result.kind === "already_paid") {
			return reply.code(400).send({
				error: "AlreadyPaid",
				message: "Данный взнос рассрочки уже оплачен.",
			});
		}
		if (result.kind === "contract_not_found") {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: "Договор рассрочки не найден.",
			});
		}
		if (result.kind === "explicit_box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Указанный кассовый счет не найден.",
			});
		}
		if (result.kind === "no_cash_box") {
			return reply.code(400).send({
				error: "NoCashBox",
				message: "Кассовые счета организации не найдены.",
			});
		}
		if (result.kind !== "ok") {
			return reply.code(500).send({
				error: "InstallmentPayError",
				message: "Не удалось провести оплату транша рассрочки.",
			});
		}

		if (result.isReplay) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
		}

		const remainingTrancheDebtRub = kopecksToRubles(
			Math.max(
				0,
				Number(result.tranche.amountKopecks ?? rublesToKopecks(result.tranche.amountRub)) -
					Number(result.tranche.paidAmountKopecks ?? 0),
			),
		);

		return reply.send({
			success: true,
			message: result.isTrancheFullyPaid
				? `Платеж по рассрочке на сумму ${result.paymentRub} ₽ успешно проведен.`
				: `Частичный платеж на сумму ${result.paymentRub} ₽ принят. Остаток долга по взносу: ${remainingTrancheDebtRub} ₽.`,
			tranche: result.tranche,
			contract: result.contract,
			cashOperation: result.cashOperation,
			payment: result.payment,
			paymentRub: result.paymentRub,
			isFullyPaid: result.isTrancheFullyPaid,
			isDuplicate: result.isReplay,
		});
	};

	const installmentsPayRouteOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description:
				"Pay installment tranche with mandatory RFC 9562 Idempotency-Key and organizationId isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
				},
			},
		},
	};

	app.post<{ Params: { id: string } }>(
		"/api/installments/tranches/:id/pay",
		installmentsPayRouteOptions,
		async (request, reply) => handlePayTranche(request, reply),
	);
	app.post<{ Params: { id: string } }>(
		"/api/installment-payments/:id/pay",
		installmentsPayRouteOptions,
		async (request, reply) => handlePayTranche(request, reply),
	);
}
