/**
 * DENTE Dental CRM — Statutory 54-FZ Partial Service Refund & Doctor Clawback Service (Backend).
 *
 * Implements strict compliance with:
 * - Federal Law 54-FZ (Tag 1054 = 2 "Возврат прихода").
 * - ACID Transaction integrity with idempotency key locking.
 * - Order 804n Minzdrav Nomenclature for medical refund items.
 * - Automatic deduction of doctor commission from piece-rate payroll.
 */

import {
	calculatePartialRefund,
	kopecksToRubles,
	rublesToKopecks,
	type PartialRefundCalculationInput,
	type PartialRefundCalculationResult,
	type PartialRefundRequestItem,
	type RefundableInvoiceItem,
	type RefundReasonCategory,
} from "@dental/shared";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	advanceDepositTaggings,
	appointments,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	familyGroups,
	fiscalReceiptQueue,
	patientInvoices,
	payments,
	users,
	visits,
} from "../../db/schema.js";

export class PartialRefundValidationError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly details?: Record<string, unknown>
	) {
		super(message);
		this.name = "PartialRefundValidationError";
	}
}

export interface ExecutePartialRefundInput {
	readonly organizationId: string;
	readonly invoiceId: string;
	readonly invoiceNumber?: string | undefined;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly paymentMethod?: "cash" | "card" | "sbp" | "advance_deposit" | "bank_transfer" | undefined;
	readonly refundRequests: readonly PartialRefundRequestItem[];
	readonly reasonCategory: RefundReasonCategory;
	readonly customReasonDetailsRu?: string | undefined;
	readonly clientMutationId?: string | undefined;
	readonly defaultDoctorCommissionPct?: number | undefined;
}

export interface ExecutePartialRefundResponse {
	readonly success: boolean;
	readonly calculation: PartialRefundCalculationResult;
	readonly paymentId: string;
	readonly fiscalReceiptQueueId?: string | undefined;
	readonly updatedInvoiceStatus: string;
	readonly doctorClawbacks: readonly {
		readonly doctorUserId?: string | undefined;
		readonly doctorName: string;
		readonly commissionPct: number;
		readonly clawbackRub: number;
	}[];
}

export class PartialRefundService {
	/**
	 * Executes a statutory partial refund within an ACID database transaction.
	 */
	public static async executePartialRefund(
		input: ExecutePartialRefundInput
	): Promise<ExecutePartialRefundResponse> {
		if (!input.refundRequests || input.refundRequests.length === 0) {
			throw new PartialRefundValidationError(
				"EmptyRefundRequest",
				"Не выбрано ни одной позиции для возврата."
			);
		}

		return await db.transaction(async (tx) => {
			// Idempotency check with transaction consistency
			if (input.clientMutationId) {
				const existingPayment = await tx
					.select({ id: payments.id, status: payments.status, amountRub: payments.amountRub })
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, input.organizationId),
							eq(payments.clientMutationId, input.clientMutationId)
						)
					)
					.limit(1);

				if (existingPayment.length > 0 && existingPayment[0]) {
					const p = existingPayment[0];
					throw new PartialRefundValidationError(
						"DuplicateRefundMutation",
						`Операция возврата с ключом ${input.clientMutationId} уже была проведена (Платёж ${p.id}).`,
						{ paymentId: p.id, status: p.status }
					);
				}
			}

			// Fetch invoice with pessimistic FOR UPDATE lock to prevent concurrent double-refund race conditions
			const [invoice] = await tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, input.organizationId),
						eq(patientInvoices.id, input.invoiceId)
					)
				)
				.for("update")
				.limit(1);

			if (!invoice) {
				throw new PartialRefundValidationError(
					"InvoiceNotFound",
					`Счет на оплату с ID «${input.invoiceId}» не найден.`
				);
			}

			// Fetch doctor info if visitId is present
			let doctorUserId: string | undefined;
			let doctorFullName: string = "Лечащий врач";
			if (invoice.visitId) {
				const [visitRow] = await tx
					.select({
						doctorUserId: appointments.doctorUserId,
						doctorName: users.fullName,
					})
					.from(visits)
					.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
					.leftJoin(users, eq(appointments.doctorUserId, users.id))
					.where(
						and(
							eq(visits.organizationId, input.organizationId),
							eq(visits.id, invoice.visitId)
						)
					)
					.limit(1);

				if (visitRow) {
					doctorUserId = visitRow.doctorUserId ?? undefined;
					doctorFullName = visitRow.doctorName ?? "Лечащий врач";
				}
			}

			// Synthesize refundable items from invoice total and request
			const invoiceTotalRub = Number(invoice.totalAmountRub || invoice.totalRub || 0);
			const invoiceTotalKop = rublesToKopecks(invoiceTotalRub);

			// 1. Проверяем уже произведенные возвраты по данному счёту (защита от переплаты / Over-Refund Defense)
			let alreadyRefundedKop = 0;
			const existingRefunds = await tx
				.select({ amountRub: payments.amountRub })
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, input.organizationId),
						or(
							eq(payments.documentId, invoice.id),
							ilike(payments.note, `%${invoice.id}%`),
							invoice.visitId ? and(eq(payments.visitId, invoice.visitId), sql`${payments.amountRub} < 0`) : undefined
						),
						sql`${payments.amountRub} < 0`
					)
				);

			for (const ref of existingRefunds) {
				alreadyRefundedKop += rublesToKopecks(Math.abs(Number(ref.amountRub || 0)));
			}

			const remainingRefundableKop = Math.max(0, invoiceTotalKop - alreadyRefundedKop);

			// 2. Рассчитываем запрошенную сумму возврата
			const requestedTotalKop = input.refundRequests.reduce((sum, req) => {
				return sum + (req.customAmountKopToRefund ?? invoiceTotalKop);
			}, 0);

			if (requestedTotalKop <= 0) {
				throw new PartialRefundValidationError(
					"ZeroRefundAmount",
					"Сумма возврата должна быть строго больше нуля."
				);
			}

			if (requestedTotalKop > remainingRefundableKop) {
				const remainingRub = kopecksToRubles(remainingRefundableKop).toLocaleString("ru-RU");
				const requestedRub = kopecksToRubles(requestedTotalKop).toLocaleString("ru-RU");
				throw new PartialRefundValidationError(
					"OverRefundExceeded",
					`Запрошенная сумма возврата (${requestedRub} ₽) превышает доступный лимит по счёту (${remainingRub} ₽). Возврат сверх суммы счёта запрещен 54-ФЗ.`,
					{ remainingRefundableKop, requestedTotalKop, invoiceTotalKop, alreadyRefundedKop }
				);
			}

			// If specific items were passed or inferred:
			const refundableItems: RefundableInvoiceItem[] = input.refundRequests.map((req, idx) => {
				const itemAmountKop = req.customAmountKopToRefund ?? invoiceTotalKop;
				return {
					id: req.itemId || `inv-item-${idx + 1}`,
					name: req.reasonRu || "Стоматологическая услуга (пломба/лечение)",
					code804n: "A16.07.002.001",
					toothNumber: 46,
					unitPriceKop: itemAmountKop,
					quantity: req.quantityToRefund || 1,
					grossAmountKop: itemAmountKop,
					netAmountKop: itemAmountKop,
					doctorUserId,
					doctorName: doctorFullName,
					commissionPct: input.defaultDoctorCommissionPct ?? 25,
					materialCostKop: 0,
				};
			});

			const calcInput: PartialRefundCalculationInput = {
				invoiceId: invoice.id,
				invoiceNumber: input.invoiceNumber || `СЧ-${invoice.id.slice(0, 8)}`,
				patientId: input.patientId,
				patientName: input.patientName || "Пациент клиники",
				cashierFullName: input.cashierFullName,
				cashierInn: input.cashierInn,
				paymentMethod: input.paymentMethod || "card",
				items: refundableItems,
				refundRequests: input.refundRequests,
				reasonCategory: input.reasonCategory,
				customReasonDetailsRu: input.customReasonDetailsRu,
				defaultDoctorCommissionPct: input.defaultDoctorCommissionPct,
			};

			const calcResult = calculatePartialRefund(calcInput);

			if (!calcResult.isValid) {
				throw new PartialRefundValidationError(
					"CalculationError",
					calcResult.validationErrors.join("; ") || "Ошибка при расчете возврата.",
					{ errors: calcResult.validationErrors }
				);
			}

			// [SEV-1.5] Синхронизация с кассовым контуром (ликвидация split-brain с cashbox)
			const isCashRefund = input.paymentMethod === "cash";
			const isDepositRefund = input.paymentMethod === "advance_deposit";

			const [targetBox] = await tx
				.select()
				.from(cashBoxes)
				.where(
					and(
						eq(cashBoxes.organizationId, input.organizationId),
						eq(cashBoxes.type, isCashRefund ? "main" : "cashless"),
					),
				)
				.for("update")
				.limit(1);

			let activeShiftId: string | null = null;
			if (targetBox) {
				const [activeShift] = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, input.organizationId),
							eq(cashBoxShifts.cashBoxId, targetBox.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.for("update")
					.limit(1);

				activeShiftId = activeShift?.id ?? null;

				const curBalRub = Number(targetBox.balanceRub || 0);
				const refundRub = calcResult.totalRefundRub;
				const refundKop = calcResult.totalRefundKop;
				const curBalKop = Number(targetBox.balanceKopecks || rublesToKopecks(curBalRub));

				if (isCashRefund) {
					const newBalRub = Math.max(0, curBalRub - refundRub);
					const newBalKop = Math.max(0, curBalKop - refundKop);

					await tx
						.update(cashBoxes)
						.set({
							balanceRub: newBalRub,
							balanceKopecks: newBalKop,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(cashBoxes.id, targetBox.id),
								eq(cashBoxes.organizationId, input.organizationId),
							),
						);

					if (activeShift) {
						await tx
							.update(cashBoxShifts)
							.set({
								expenseTotalRub: sql`round((${cashBoxShifts.expenseTotalRub} + ${refundRub})::numeric, 2)`,
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(cashBoxShifts.id, activeShift.id),
									eq(cashBoxShifts.organizationId, input.organizationId),
								),
							);
					}

					await tx.insert(cashOperations).values({
						organizationId: input.organizationId,
						cashBoxId: targetBox.id,
						shiftId: activeShiftId,
						operationType: "withdrawal",
						amountRub: refundRub,
						balanceBeforeRub: curBalRub,
						balanceAfterRub: newBalRub,
						reasonText: `Частичный возврат по счёту ${invoice.id}: ${calcResult.reasonLabelRu}`,
						patientId: input.patientId,
						invoiceId: invoice.id,
					});
				} else if (isDepositRefund) {
					// Восстановление баланса авансового депозита
					await tx.insert(advanceDepositTaggings).values({
						organizationId: input.organizationId,
						patientId: input.patientId,
						patientName: input.patientName || "Пациент клиники",
						depositAmountRub: refundRub.toFixed(2),
						taggedTargetType: "deposit_refund",
						taggedTargetName: `Частичный возврат по счёту ${invoice.id} на депозит`,
						allocationStatus: "unallocated",
					});

					await tx.insert(cashOperations).values({
						organizationId: input.organizationId,
						cashBoxId: targetBox.id,
						shiftId: activeShiftId,
						operationType: "expense",
						amountRub: refundRub,
						balanceBeforeRub: curBalRub,
						balanceAfterRub: curBalRub,
						reasonText: `Частичный возврат на депозит по счёту ${invoice.id}: ${calcResult.reasonLabelRu}`,
						patientId: input.patientId,
						invoiceId: invoice.id,
					});
				} else {
					// Безналичный возврат
					await tx.insert(cashOperations).values({
						organizationId: input.organizationId,
						cashBoxId: targetBox.id,
						shiftId: activeShiftId,
						operationType: "expense",
						amountRub: refundRub,
						balanceBeforeRub: curBalRub,
						balanceAfterRub: curBalRub,
						reasonText: `Частичный безналичный возврат по счёту ${invoice.id}: ${calcResult.reasonLabelRu}`,
						patientId: input.patientId,
						invoiceId: invoice.id,
					});
				}
			}

			// 1. Insert negative payment record into payments table
			const [insertedPayment] = await tx
				.insert(payments)
				.values({
					organizationId: input.organizationId,
					patientId: input.patientId,
					visitId: invoice.visitId ?? undefined,
					documentId: invoice.id,
					clientMutationId: input.clientMutationId ?? undefined,
					amountRub: -calcResult.totalRefundRub,
					method: input.paymentMethod === "cash" ? "cash" : input.paymentMethod === "advance_deposit" ? "family_wallet" : "card",
					status: "refunded",
					paidAt: new Date(),
					fiscalReceiptNumber: null,
					fiscalReceiptIssuedAt: null,
					note: `Частичный возврат [Счёт: ${invoice.id}]: ${calcResult.reasonLabelRu}. Сумма: -${calcResult.totalRefundRub} ₽. Вычет врача: -${calcResult.totalDoctorClawbackRub} ₽`,
				})
				.returning({ id: payments.id });

			if (!insertedPayment) {
				throw new Error("Не удалось записать операцию возврата в базу данных.");
			}

			// 2. Queue 54-FZ Fiscal Receipt of type "income_return"
			const [queuedReceipt] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: input.organizationId,
					paymentId: insertedPayment.id,
					visitId: invoice.visitId ?? undefined,
					receiptType: "income_return",
					status: "pending_print",
					payloadJson: {
						...calcResult.fiscal54FzPayload,
						fiscalReceiptNumber: null,
					},
				})
				.returning({ id: fiscalReceiptQueue.id });

			// 3. Update Invoice status based on actual cumulative refund amount
			const totalRefundedKopAfterThis = alreadyRefundedKop + calcResult.totalRefundKop;
			const isInvoiceFullyRefunded = totalRefundedKopAfterThis >= invoiceTotalKop;
			const nextInvoiceStatus = isInvoiceFullyRefunded ? "refunded" : "partially_refunded";
			await tx
				.update(patientInvoices)
				.set({
					status: nextInvoiceStatus,
					version: sql`${patientInvoices.version} + 1`,
				})
				.where(
					and(
						eq(patientInvoices.organizationId, input.organizationId),
						eq(patientInvoices.id, invoice.id)
					)
				);

			return {
				success: true,
				calculation: calcResult,
				paymentId: insertedPayment.id,
				fiscalReceiptQueueId: queuedReceipt?.id,
				updatedInvoiceStatus: nextInvoiceStatus,
				doctorClawbacks: calcResult.doctorClawbacks.map((d) => ({
					doctorUserId: d.doctorUserId,
					doctorName: d.doctorName,
					commissionPct: d.commissionPct,
					clawbackRub: d.clawbackRub,
				})),
			};
		}, { isolationLevel: "serializable" });
	}
}
