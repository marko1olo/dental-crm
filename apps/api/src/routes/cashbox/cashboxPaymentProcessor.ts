/**
 * apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts
 *
 * Dedicated Cashbox Payment Transaction Processor (54-FZ & Clinical Autonomy).
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (100% warranty discounts, no hard blocks).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict integer kopecks (amountKopecks: bigint).
 * - Idempotency & Financial Resilience: clientMutationId & idempotencyKey.
 */

import { and, eq } from "drizzle-orm";
import { kopecksToRub, normalizePaymentMethod, rubToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import {
	cashBoxes,
	cashOperations,
	patientInvoices,
	payments,
	patients,
	visits,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { cashboxPaymentRequestSchema } from "./cashboxSchemas.js";

export type CashboxPaymentOutcome =
	| {
			statusCode: 200;
			body: {
				success: true;
				data: Record<string, unknown>;
			};
	  }
	| {
			statusCode: 400;
			body: {
				error: string;
				message: string;
				details?: unknown;
			};
	  };

export async function processCashboxPayment(
	orgId: string,
	rawBody: unknown,
	headerIdemp?: string,
): Promise<CashboxPaymentOutcome> {
	const parsed = cashboxPaymentRequestSchema.safeParse(rawBody || {});
	if (!parsed.success) {
		return {
			statusCode: 400,
			body: {
				error: "ValidationError",
				message: "Некорректные параметры платежа",
				details: parsed.error.issues,
			},
		};
	}

	const body = parsed.data;
	const effectiveMutationId =
		body.clientMutationId?.trim() ||
		body.idempotencyKey?.trim() ||
		headerIdemp?.trim() ||
		`cbx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// Честная сумма: платеж без суммы невозможен, за исключением 100% гарантии врача (Мандаты 8e п. 7, 8n).
	// Гарантийный расчёт оформляется закрытием счёта без фискального чека.
	const isWarrantyPayment =
		body.method === "warranty" ||
		body.isWarranty === true ||
		Boolean(
			body.note &&
				/(гаранти|передел|скидк.*100|100%|безвозмездн|warranty)/i.test(body.note),
		);

	let totalKopecks = 0n;
	if (body.amountKopecks !== undefined) {
		totalKopecks = BigInt(body.amountKopecks);
	} else if (body.amountRub !== undefined) {
		totalKopecks = BigInt(Math.round(body.amountRub * 100));
	}
	if (totalKopecks <= 0n && !isWarrantyPayment) {
		return {
			statusCode: 400,
			body: {
				error: "ZeroAmountPayment",
				message:
					"Сумма платежа обязана быть больше нуля. Для гарантийной переделки со скидкой 100% укажите метод «warranty» или передайте флаг isWarranty.",
			},
		};
	}
	if (isWarrantyPayment && totalKopecks <= 0n) {
		totalKopecks = 0n;
	}

	// Честная атрибуция: платеж проводится строго на выбранного пациента.
	// Молчаливое списание на «первого попавшегося» пациента клиники запрещено.
	if (!body.patientId) {
		return {
			statusCode: 400,
			body: {
				error: "PatientRequired",
				message:
					"Укажите пациента для проведения платежа. Безличные продажи регистрируйте через внесение в кассу.",
			},
		};
	}
	const requestedPatientId: string = body.patientId;
	const amountRubNumber = Number(totalKopecks) / 100;

	const result = await withTenantCtx(orgId, async (tx) => {
		// Проверка идемпотентности
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, effectiveMutationId),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				id: existingPayment.id,
				amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
				amountRub: Number(existingPayment.amountRub),
				method: existingPayment.method,
				status: existingPayment.status,
				fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
				clientMutationId: existingPayment.clientMutationId,
			};
		}

		// Проверка существования пациента в этой клинике: при отсутствии — честный 400
		const [patientExists] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, requestedPatientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patientExists) {
			return {
				kind: "patient_not_found" as const,
			};
		}
		const resolvedPatientId = requestedPatientId;

		// Генерируем номер кассового чека (при гарантии 100% чек не пробивается)
		const receiptNumber = isWarrantyPayment ? null : `ФД-${Date.now().toString().slice(-6)}`;
		const issuedAt = isWarrantyPayment ? null : new Date().toISOString();

		// 1. Фиксация платежа в таблице payments
		const [newPayment] = await tx
			.insert(payments)
			.values({
				organizationId: orgId,
				patientId: resolvedPatientId,
				visitId: body.visitId || null,
				clientMutationId: effectiveMutationId,
				amountRub: amountRubNumber,
				method: normalizePaymentMethod(body.method),
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: receiptNumber,
				fiscalReceiptIssuedAt: issuedAt,
				payerFullName: body.cashierFullName || "Кассир",
				note:
					body.note ||
					(isWarrantyPayment
						? "Гарантийный расчёт (скидка 100%)"
						: `Оплата через кассу (${body.method || "card"})`),
			})
			.returning();

		if (!newPayment) {
			throw new Error("Не удалось зафиксировать платёж в базе данных");
		}

		// 2. Списание счетов и визита в статус paid_warranty при гарантийном закрытии
		if (isWarrantyPayment) {
			if (body.invoiceId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.id, body.invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}
			if (body.visitId) {
				await tx
					.update(patientInvoices)
					.set({
						status: "paid_warranty",
						paidAt: new Date(),
					})
					.where(
						and(
							eq(patientInvoices.visitId, body.visitId),
							eq(patientInvoices.organizationId, orgId),
						),
					);

				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(and(eq(visits.id, body.visitId), eq(visits.organizationId, orgId)));
			}

			return {
				id: newPayment.id,
				amountKopecks: 0,
				amountRub: 0,
				method: "warranty",
				status: "paid_warranty",
				isWarranty: true,
				fiscalReceiptNumber: null,
				clientMutationId: effectiveMutationId,
				note: newPayment.note,
			};
		}

		// Если передан invoiceId или visitId для обычного платежа — закрываем счёт со статусом paid
		if (body.invoiceId) {
			await tx
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: new Date(),
				})
				.where(
					and(
						eq(patientInvoices.id, body.invoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}
		if (body.visitId) {
			await tx
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: new Date(),
				})
				.where(
					and(
						eq(patientInvoices.visitId, body.visitId),
						eq(patientInvoices.organizationId, orgId),
					),
				);

			await tx
				.update(visits)
				.set({ updatedAt: new Date() })
				.where(and(eq(visits.id, body.visitId), eq(visits.organizationId, orgId)));
		}

		// 3. Инициализируем и находим кассовые счета клиники
		await ensureOrganizationCashBoxes(tx, orgId);
		const boxes = await tx
			.select()
			.from(cashBoxes)
			.where(eq(cashBoxes.organizationId, orgId));

		const cashDeskBox =
			boxes.find((b) => b.type === "cash_desk" || !b.isCashless) || boxes[0];
		const cashlessBox =
			boxes.find((b) => b.type === "bank_account" || b.isCashless) ||
			boxes[1] ||
			cashDeskBox;

		// 4. Кассовые проводки в cashOperations
		const resolvedCashKop =
			body.cashAmountKopecks ??
			(body.method === "cash" ? Number(totalKopecks) : 0);
		const resolvedElecKop =
			body.electronicAmountKopecks ??
			(["card", "sbp", "online"].includes(body.method || "")
				? Number(totalKopecks)
				: 0);

		if (resolvedCashKop > 0 && cashDeskBox) {
			const curBalKop = rubToKopecks(cashDeskBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedCashKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedCashKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Приход наличных в кассу: оплата стоматологических услуг (${receiptNumber})`,
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({ balanceRub: newBal, updatedAt: new Date() })
				.where(eq(cashBoxes.id, cashDeskBox.id));
		}

		if (resolvedElecKop > 0 && cashlessBox) {
			const curBalKop = rubToKopecks(cashlessBox.balanceRub || 0);
			const newBalKop = curBalKop + resolvedElecKop;
			const curBal = kopecksToRub(curBalKop);
			const addRub = kopecksToRub(resolvedElecKop);
			const newBal = kopecksToRub(newBalKop);

			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashlessBox.id,
				operationType: "income",
				amountRub: addRub,
				balanceBeforeRub: curBal,
				balanceAfterRub: newBal,
				patientId: resolvedPatientId,
				kkmDocNumber: receiptNumber,
				reasonText: `Безналичное поступление: оплата стоматологических услуг (${receiptNumber})`,
				operatorName: body.cashierFullName || "Кассир",
			});

			await tx
				.update(cashBoxes)
				.set({ balanceRub: newBal, updatedAt: new Date() })
				.where(eq(cashBoxes.id, cashlessBox.id));
		}

		return {
			id: newPayment.id,
			amountKopecks: Number(totalKopecks),
			amountRub: amountRubNumber,
			method: newPayment.method,
			status: "paid",
			fiscalReceiptNumber: receiptNumber,
			clientMutationId: effectiveMutationId,
		};
	});

	if ("kind" in result && result.kind === "patient_not_found") {
		return {
			statusCode: 400,
			body: {
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике — платёж не проведён.",
			},
		};
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			data: result,
		},
	};
}
