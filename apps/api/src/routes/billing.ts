import {
	type CreatePaymentInput,
	createPaymentSchema,
	documentKindMetadata,
	type Payment,
	paymentSchema,
} from "@dental/shared";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import {
	createPaymentInDb,
	findPaymentByClientMutationIdInDb,
	getDocumentForBilling,
	getPatientForBilling,
	getVisitForBilling,
} from "../db/billingQuery.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";

function documentCanReceivePayment(
	documentKind: keyof typeof documentKindMetadata,
): boolean {
	const metadata = documentKindMetadata[documentKind];
	return (
		metadata.group === "payment" &&
		documentKind !== "payment_refund_correction_request"
	);
}

const paymentValidationMessage =
	"Оплата не записана: проверьте сумму, дату, способ оплаты, фискальный чек и явные данные плательщика.";
const billingPaymentScopeError = "BillingPaymentScopeError" as const;

function sendBillingPaymentScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: billingPaymentScopeError,
		message,
	});
}

function cleanPaymentText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}

function normalizedFiscalReceipt(
	input: CreatePaymentInput["fiscalReceipt"],
): Payment["fiscalReceipt"] {
	if (!input) return null;
	const fn = cleanPaymentText(input.fn);
	const fd = cleanPaymentText(input.fd);
	const fpd = cleanPaymentText(input.fpd);
	const cashierName = cleanPaymentText(input.cashierName);
	const receiptUrl = cleanPaymentText(input.receiptUrl);
	if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
	return {
		fn,
		fd,
		fpd,
		cashierName,
		receiptUrl,
		operationType: input.operationType ?? "income",
	};
}

function fiscalReceiptLabel(
	fiscalReceipt: Payment["fiscalReceipt"],
): string | null {
	if (!fiscalReceipt) return null;
	const parts = [
		fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
		fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
		fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null,
	].filter(Boolean);
	return parts.length ? parts.join("; ") : null;
}

function paymentRetrySignatureFromInput(input: CreatePaymentInput) {
	const fiscalReceipt = normalizedFiscalReceipt(input.fiscalReceipt);
	return {
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		documentId: input.documentId ?? null,
		amountRub: input.amountRub,
		method: input.method,
		fiscalReceiptNumber:
			cleanPaymentText(input.fiscalReceiptNumber) ??
			fiscalReceiptLabel(fiscalReceipt),
		fiscalReceiptIssuedAt: cleanPaymentText(input.fiscalReceiptIssuedAt),
		fiscalReceiptUrl:
			cleanPaymentText(input.fiscalReceiptUrl) ??
			cleanPaymentText(fiscalReceipt?.receiptUrl),
		fiscalReceipt,
		payerFullName: cleanPaymentText(input.payerFullName),
		payerInn: cleanPaymentText(input.payerInn),
		payerBirthDate: cleanPaymentText(input.payerBirthDate),
		payerIdentityDocument: cleanPaymentText(input.payerIdentityDocument),
		payerRelationship: cleanPaymentText(input.payerRelationship),
		taxDeductionCode: input.taxDeductionCode ?? null,
		note: input.note ?? null,
	};
}

function paymentRetrySignatureFromPayment(payment: Payment) {
	return {
		patientId: payment.patientId,
		visitId: payment.visitId ?? null,
		documentId: payment.documentId ?? null,
		amountRub: payment.amountRub,
		method: payment.method,
		fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
		fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
		fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
		fiscalReceipt: payment.fiscalReceipt ?? null,
		payerFullName: payment.payerFullName ?? null,
		payerInn: payment.payerInn ?? null,
		payerBirthDate: payment.payerBirthDate ?? null,
		payerIdentityDocument: payment.payerIdentityDocument ?? null,
		payerRelationship: payment.payerRelationship ?? null,
		taxDeductionCode: payment.taxDeductionCode ?? null,
		note: payment.note ?? null,
	};
}

function paymentRetryMatchesExisting(
	existingPayment: Payment,
	input: CreatePaymentInput,
): boolean {
	return (
		JSON.stringify(paymentRetrySignatureFromPayment(existingPayment)) ===
		JSON.stringify(paymentRetrySignatureFromInput(input))
	);
}

export async function registerBillingRoutes(app: FastifyInstance) {
	app.post("/api/billing/payments", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"billing payment create",
		);
		if (!orgId) return;
		const parsedInput = createPaymentSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: paymentValidationMessage,
			});
		}
		const input: CreatePaymentInput = parsedInput.data;
		const existingPayment = await findPaymentByClientMutationIdInDb(
			orgId,
			input.clientMutationId,
		);
		let paymentInput = input;
		const patient = await getPatientForBilling(orgId, input.patientId);
		if (!patient) {
			return sendBillingPaymentScopeError(
				reply,
				404,
				"Пациент для оплаты не найден.",
			);
		}
		if (input.visitId) {
			const visit = await getVisitForBilling(orgId, input.visitId);
			if (!visit) {
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Прием для оплаты не найден.",
				);
			}
			if (visit.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Прием оплаты относится к другому пациенту.",
				);
			}
		}
		if (input.documentId) {
			const document = await getDocumentForBilling(orgId, input.documentId);
			if (!document) {
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Документ для оплаты не найден.",
				);
			}
			if (document.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Документ оплаты относится к другому пациенту.",
				);
			}
			if (
				document.visitId &&
				input.visitId &&
				document.visitId !== input.visitId
			) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Документ оплаты относится к другому приему.",
				);
			}
			if (document.visitId && !input.visitId) {
				const visit = await getVisitForBilling(orgId, document.visitId);
				if (!visit) {
					return sendBillingPaymentScopeError(
						reply,
						404,
						"Прием документа для оплаты не найден.",
					);
				}
				if (visit.patientId !== input.patientId) {
					return sendBillingPaymentScopeError(
						reply,
						409,
						"Прием документа относится к другому пациенту.",
					);
				}
				paymentInput = { ...input, visitId: document.visitId };
			}
			if (document.status === "voided") {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"К аннулированному документу нельзя привязать оплату.",
				);
			}
			if (document.kind === "payment_refund_correction_request") {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Заявление на возврат или коррекцию не принимает новую оплату. Оформите документ коррекции без повторной записи оплаты.",
				);
			}
			if (!documentCanReceivePayment(document.kind as any)) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Выберите финансовый документ для оплаты: договор, счет, акт, квитанцию, смету или рассрочку.",
				);
			}
		}
		if (existingPayment) {
			if (
				existingPayment.patientId !== paymentInput.patientId ||
				!paymentRetryMatchesExisting(existingPayment, paymentInput)
			) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
				);
			}
			return reply.code(200).send(paymentSchema.parse(existingPayment));
		}
		const payment = await createPaymentInDb(orgId, paymentInput);
		return reply.code(201).send(paymentSchema.parse(payment));
	});
}

// New routes for Invoice and Split Payments
export async function registerAdvancedBillingRoutes(app: FastifyInstance) {
	app.post("/api/billing/invoice", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"billing invoice create",
		);
		if (!orgId) return;
		const { patientId, visitId, items, totalAmount } = request.body as any;
		if (!patientId || totalAmount == null || Number(totalAmount) <= 0) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: "Укажите пациента и положительную сумму счета.",
			});
		}
		const patient = await getPatientForBilling(orgId, patientId);
		if (!patient)
			return sendBillingPaymentScopeError(
				reply,
				404,
				"Пациент для счета не найден.",
			);
		if (visitId) {
			const visit = await getVisitForBilling(orgId, visitId);
			if (!visit)
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Прием для счета не найден.",
				);
			if (visit.patientId !== patientId)
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Прием счета относится к другому пациенту.",
				);
		}

		let totalInsuranceAmount = 0;
		let totalPatientAmount = 0;

		let insuranceContract: any = null;
		if (patient.insuranceContractId) {
			const [contract] = await db
				.select()
				.from(schema.insuranceContracts)
				.where(eq(schema.insuranceContracts.id, patient.insuranceContractId));
			if (contract?.isActive) insuranceContract = contract;
		}

		if (Array.isArray(items)) {
			for (const item of items) {
				const itemTotal = Number(item.price) * Number(item.quantity || 1);
				let insurancePct = 0;
				// Warning: category isn't passed in items currently, defaulting to 0 for manual without backend refetch
				const covered = itemTotal * (insurancePct / 100);
				totalInsuranceAmount += covered;
				totalPatientAmount += (itemTotal - covered);
			}
		} else {
			totalPatientAmount = Number(totalAmount);
		}

		const [invoice] = await db
			.insert(schema.patientInvoices)
			.values({
				organizationId: orgId,
				patientId,
				visitId: visitId || null,
				itemsJson: Array.isArray(items) ? items : [],
				totalAmountRub: String(totalAmount),
				insuranceAmountRub: String(totalInsuranceAmount),
				patientAmountRub: String(totalPatientAmount),
				status: "unpaid",
			})
			.returning();

		return reply.code(201).send(invoice);
	});

	app.post("/api/billing/split-pay", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"billing split payment",
		);
		if (!orgId) return;
		const { invoiceId, payments, operatorId } = request.body as any;
		if (!invoiceId || !Array.isArray(payments) || payments.length === 0) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: "Укажите счет и хотя бы одну оплату.",
			});
		}

		const result = await db.transaction(async (tx) => {
			const [invoice] = await tx
				.select()
				.from(schema.patientInvoices)
				.where(
					and(
						eq(schema.patientInvoices.id, invoiceId),
						eq(schema.patientInvoices.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
			if (!invoice) throw new Error("Invoice not found");

			const existingLedger = await tx
				.select()
				.from(schema.cashLedger)
				.where(eq(schema.cashLedger.invoiceId, invoiceId));
			let totalPaidBefore = 0;
			for (const e of existingLedger) totalPaidBefore += Number(e.amountRub);

			let newPaymentsSum = 0;
			for (const p of payments) {
				const amount = Number(p.amount);
				if (!p.method || !Number.isFinite(amount) || amount <= 0)
					throw new Error("Invalid split payment");
				await tx.insert(schema.cashLedger).values({
					invoiceId,
					paymentMethod: p.method,
					amountRub: amount.toString(),
					operatorId: operatorId || null,
				});
				newPaymentsSum += amount;
			}

			const totalPaid = totalPaidBefore + newPaymentsSum;
			const currentTotal = Number(invoice.totalAmountRub);

			if (totalPaid > currentTotal) {
				const err = new Error("Payment exceeds invoice total");
				(err as any).statusCode = 400;
				throw err;
			}

			let newStatus: "unpaid" | "partially_paid" | "paid" = "partially_paid";
			if (totalPaid >= currentTotal) newStatus = "paid";

			await tx
				.update(schema.patientInvoices)
				.set({ status: newStatus })
				.where(
					and(
						eq(schema.patientInvoices.id, invoiceId),
						eq(schema.patientInvoices.organizationId, orgId),
					),
				);

			return { success: true, status: newStatus, totalPaid };
		});

		return reply.code(200).send(result);
	});

	app.get("/api/billing/payouts", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"billing payouts read",
		);
		if (!orgId) return;

		// Join invoices → visits → doctor user to resolve real doctor name
		const rows = await db
			.select({
				id: schema.patientInvoices.id,
				visitId: schema.patientInvoices.visitId,
				totalAmountRub: schema.patientInvoices.totalAmountRub,
				status: schema.patientInvoices.status,
				createdAt: schema.patientInvoices.createdAt,
				doctorId: schema.visitDiaries.doctorId,
				doctorName: schema.users.fullName,
				commissionPct: schema.doctorCommissions.commissionPct,
			})
			.from(schema.patientInvoices)
			.leftJoin(
				schema.visitDiaries,
				eq(schema.patientInvoices.visitId, schema.visitDiaries.visitId),
			)
			.leftJoin(schema.users, eq(schema.visitDiaries.doctorId, schema.users.id))
			.leftJoin(
				schema.doctorCommissions,
				and(
					eq(schema.doctorCommissions.userId, schema.visitDiaries.doctorId),
					eq(schema.doctorCommissions.isActive, true),
				),
			)
			.where(
				and(
					eq(schema.patientInvoices.status, "paid"),
					eq(schema.patientInvoices.organizationId, orgId),
				),
			)
			.orderBy(schema.patientInvoices.createdAt);

		const visitIds = rows.map((r) => r.visitId).filter(Boolean) as string[];
		let materialCostsByVisit: Record<string, number> = {};

		if (visitIds.length > 0) {
			const { inArray } = await import("drizzle-orm");
			const txs = await db
				.select({
					visitId: schema.inventoryTransactions.visitId,
					quantityChanged: schema.inventoryTransactions.quantityChanged,
					unitCostRub: schema.inventoryTransactions.unitCostRub,
				})
				.from(schema.inventoryTransactions)
				.where(
					and(
						inArray(schema.inventoryTransactions.visitId, visitIds),
						eq(schema.inventoryTransactions.organizationId, orgId),
					)
				);

			for (const t of txs) {
				if (!t.visitId) continue;
				// deductions are negative quantityChanged, so Math.abs gives the consumed amount
				const cost = Math.abs(t.quantityChanged) * parseFloat(String(t.unitCostRub));
				materialCostsByVisit[t.visitId] = (materialCostsByVisit[t.visitId] || 0) + cost;
			}
		}

		const payouts = rows.map((row) => {
			const revenue = parseFloat(String(row.totalAmountRub ?? 0));
			const realMaterialCost = row.visitId ? (materialCostsByVisit[row.visitId] || 0) : 0;
			const materialCost = +(realMaterialCost).toFixed(2);
			const netBase = revenue - materialCost;
			const docCommissionPct =
				row.commissionPct != null
					? parseFloat(String(row.commissionPct))
					: 30.0;
			const commissionRate = docCommissionPct / 100;
			const netPayout = +(netBase * commissionRate).toFixed(2);
			return {
				id: row.id,
				visitId: row.visitId,
				doctorId: row.doctorId ?? null,
				doctorName: row.doctorName ?? "Врач не указан",
				revenue,
				materialCost,
				commissionRate: docCommissionPct,
				netPayout,
				date: row.createdAt,
			};
		});

		return reply.code(200).send({ payouts });
	});

	app.post("/api/finance/shift/open", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"finance shift open",
		);
		if (!orgId) return;
		const { startingBalance, userId } = request.body as any;
		if (!userId)
			return reply.code(400).send({
				error: "FinanceValidationError",
				message: "Укажите сотрудника, открывающего смену.",
			});
		const [operator] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, userId),
					eq(schema.users.organizationId, orgId),
				),
			)
			.limit(1);
		if (!operator)
			return reply.code(404).send({
				error: "UserNotFound",
				message: "Сотрудник кассовой смены не найден в этой организации.",
			});

		const [shift] = await db
			.insert(schema.cash_shifts)
			.values({
				organizationId: orgId,
				openedByUserId: userId,
				openedAt: new Date(),
				startingBalance: Number(startingBalance) || 0,
				status: "Open",
			})
			.returning();

		return reply.code(200).send(shift);
	});

	app.post("/api/finance/shift/close", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"finance shift close",
		);
		if (!orgId) return;
		const { shiftId, actualClosingBalance, discrepancyReason } =
			request.body as any;

		const shiftOpt = await db
			.select()
			.from(schema.cash_shifts)
			.where(
				and(
					eq(schema.cash_shifts.id, shiftId),
					eq(schema.cash_shifts.organizationId, orgId),
				),
			)
			.limit(1);
		if (!shiftOpt || shiftOpt.length === 0)
			return reply.code(404).send({ error: "Shift not found" });
		const shift = shiftOpt[0];
		if (!shift) return reply.code(404).send({ error: "Shift not found" });

		// Calculate expected balance: startingBalance + sum of all cash payments since openedAt
		const paymentsResult = await db
			.select({ total: sum(schema.payments.amountRub) })
			.from(schema.payments)
			.where(
				and(
					eq(schema.payments.organizationId, orgId),
					eq(schema.payments.method, "cash"),
					eq(schema.payments.status, "paid"),
					gte(schema.payments.createdAt, shift.openedAt),
				),
			);

		const cashSales = paymentsResult[0]?.total
			? Number(paymentsResult[0].total)
			: 0;
		const expectedClosingBalance = shift.startingBalance + cashSales;

		const actualClosingBalanceNumber = Number(actualClosingBalance);
		if (!Number.isFinite(actualClosingBalanceNumber)) {
			return reply.code(400).send({
				error: "FinanceValidationError",
				message: "Укажите фактический остаток кассы.",
			});
		}

		if (
			actualClosingBalanceNumber !== expectedClosingBalance &&
			!discrepancyReason
		) {
			// BLIND CLOSE: We DO NOT return expectedClosingBalance to the client to prevent fraud
			return reply.code(400).send({
				error: "Discrepancy detected",
				message:
					"Сумма в кассе не совпадает с расчетной. Требуется указать причину расхождения (Discrepancy Reason) перед закрытием смены.",
			});
		}

		const newStatus =
			actualClosingBalanceNumber === expectedClosingBalance
				? "Closed"
				: "Discrepancy";

		const [closedShift] = await db
			.update(schema.cash_shifts)
			.set({
				closedAt: new Date(),
				expectedClosingBalance,
				actualClosingBalance: actualClosingBalanceNumber,
				status: newStatus,
				discrepancyReason: discrepancyReason || null,
			})
			.where(
				and(
					eq(schema.cash_shifts.id, shiftId),
					eq(schema.cash_shifts.organizationId, orgId),
				),
			)
			.returning();

		return reply.code(200).send(closedShift);
	});

	app.get<{ Params: { patientId: string } }>(
		"/api/patients/:patientId/installments",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
			);
			if (!orgId) return;

			const { patientId } = request.params;
			const rows = await db
				.select()
				.from(schema.paymentInstallments)
				.where(
					and(
						eq(schema.paymentInstallments.patientId, patientId),
						eq(schema.paymentInstallments.status, "pending")
					)
				)
				.orderBy(schema.paymentInstallments.dueDate);

			return reply.code(200).send(rows);
		}
	);

	app.post("/api/patients/:patientId/installments", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"billing installment create",
		);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		const { installments, treatmentPlanId } = request.body as any;

		if (!Array.isArray(installments) || installments.length === 0) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: "Передайте список платежей рассрочки.",
			});
		}

		const patient = await getPatientForBilling(orgId, patientId);
		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент для рассрочки не найден.",
			});
		}

		// Delete existing pending installments for this patient
		await db.transaction(async (tx) => {
			await tx
				.delete(schema.paymentInstallments)
				.where(
					and(
						eq(schema.paymentInstallments.patientId, patientId),
						eq(schema.paymentInstallments.status, "pending"),
					),
				);

			// Insert new installments
			for (const inst of installments) {
				const amount = parseFloat(String(inst.amount));
				const dueDate = new Date(inst.dueDate);
				if (
					!Number.isFinite(amount) ||
					amount <= 0 ||
					!Number.isFinite(dueDate.getTime())
				) {
					throw new Error("Неверные параметры платежа рассрочки.");
				}

				await tx.insert(schema.paymentInstallments).values({
					patientId,
					treatmentPlanId:
						treatmentPlanId || "00000000-0000-0000-0000-000000000000",
					amountRub: amount.toString(),
					dueDate,
					status: "pending",
				});
			}
		});

		return reply.code(200).send({ success: true });
	});
}
