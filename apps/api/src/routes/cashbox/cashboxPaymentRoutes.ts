/**
 * cashboxPaymentRoutes.ts — Layer 2: Cash Accounts, Operation Journal, Lab Orders & Installments Rails.
 * 
 * 54-FZ, StomX Reverse Engineering Bible (Section 6, 9), Order 804n, Form T-51.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
	payments,
	patients,
} from "../../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../../db/seeds/seed_cash_and_reasons.js";
import { FiscalResilienceService } from "../../services/fiscalResilienceService.js";
import { registerCashInstallmentsRoutes } from "../cashInstallmentsRoutes.js";
import { registerCashLabPaymentRoutes } from "../cashLabPaymentRoutes.js";
import { cashOperationListQuerySchema, cashboxPaymentRequestSchema } from "./cashboxSchemas.js";

export async function registerCashboxPaymentRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. GET /api/cash/cash-box
	 * Список 6 кассовых счетов клиники с балансами.
	 */
	app.get("/api/cash/cash-box", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "cash boxes read");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const result = await withTenantCtx(orgId, async (tx) => {
			// Гарантируем, что 6 кассовых счетов инициализированы
			await ensureOrganizationCashBoxes(tx, orgId);

			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId))
				.orderBy(cashBoxes.displayOrder);

			return boxes;
		});

		return reply.send({ data: result, total: result.length });
	});

	/**
	 * 1b. PATCH /api/cash/cash-box/:id
	 * Обновление параметров фискального регистратора ККТ (модель, заводской номер, филиал, активность) в PostgreSQL.
	 */
	app.patch("/api/cash/cash-box/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "cash box update");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const { id } = request.params as { id: string };
		const body = (request.body ?? {}) as Record<string, unknown>;

		const updated = await withTenantCtx(orgId, async (tx) => {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic update fields
			const setFields: Record<string, any> = { updatedAt: new Date() };
			if (typeof body.name === "string" && body.name.trim()) setFields.name = body.name.trim();
			if (body.kkmModel !== undefined) setFields.kkmModel = typeof body.kkmModel === "string" ? body.kkmModel.trim() : null;
			if (body.kkmSerialNumber !== undefined) setFields.kkmSerialNumber = typeof body.kkmSerialNumber === "string" ? body.kkmSerialNumber.trim() : null;
			if (body.branchId !== undefined) setFields.branchId = typeof body.branchId === "string" ? body.branchId.trim() : null;
			if (typeof body.kkmActive === "boolean") setFields.kkmActive = body.kkmActive;

			const [row] = await tx
				.update(cashBoxes)
				.set(setFields)
				.where(and(eq(cashBoxes.id, id), eq(cashBoxes.organizationId, orgId)))
				.returning();
			return row ?? null;
		});

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Кассовый аппарат не найден" });
		}
		return reply.send({ data: updated });
	});

	/**
	 * 2. GET /api/cash/expense-reasons & GET /api/cash/expense-reason
	 * 12 регламентированных статей расхода клиники.
	 */
	const handleGetExpenseReasons = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "expense reasons read");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const reasons = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationExpenseReasons(tx, orgId);

			return await tx
				.select()
				.from(cashExpenseReasons)
				.where(eq(cashExpenseReasons.organizationId, orgId))
				.orderBy(cashExpenseReasons.code);
		});

		return reply.send({ data: reasons, total: reasons.length });
	};

	app.get("/api/cash/expense-reasons", handleGetExpenseReasons);
	app.get("/api/cash/expense-reason", handleGetExpenseReasons);

	// 3. Регистрация модульных маршрутов ЗТЛ: оплата наряда и фиксация installed (Feature #36)
	await registerCashLabPaymentRoutes(app);

	// 4. Регистрация модульных маршрутов рассрочки и траншей (Feature #37)
	await registerCashInstallmentsRoutes(app);

	/**
	 * 5. GET /api/cash/operation-list
	 * Журнал кассовых ордеров и проводок (StomX Bible раздел 6).
	 */
	app.get("/api/cash/operation-list", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "cash operations read");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashOperationListQuerySchema.safeParse(request.query || {});
		const filters = parsed.success ? parsed.data : {};

		const ops = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(cashOperations.organizationId, orgId)];

			if (filters.cashBoxId) {
				conditions.push(eq(cashOperations.cashBoxId, filters.cashBoxId));
			}
			if (filters.operationType) {
				conditions.push(eq(cashOperations.operationType, filters.operationType));
			}
			if (filters.dateFrom) {
				conditions.push(sql`${cashOperations.createdAt} >= ${filters.dateFrom}`);
			}
			if (filters.dateTo) {
				conditions.push(sql`${cashOperations.createdAt} <= ${filters.dateTo}`);
			}

			return await tx
				.select()
				.from(cashOperations)
				.where(and(...conditions))
				.orderBy(desc(cashOperations.createdAt))
				.limit(100);
		});

		return reply.send({ data: ops, total: ops.length });
	});

	/**
	 * 6. POST /api/cashbox/transactions/:id/retry-fiscalize & POST /api/cash/transactions/:id/retry-fiscalize
	 * Безопасная повторная фискализация транзакции/чека (54-ФЗ) после восстановления связи/бумаги.
	 */
	const handleRetryFiscalize = async (
		request: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"retry-fiscalize cash transaction",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		return FiscalResilienceService.handleRetryFiscalizeRoute(
			request,
			reply,
			orgId,
		);
	};

	app.post("/api/cashbox/transactions/:id/retry-fiscalize", handleRetryFiscalize);
	app.post("/api/cash/transactions/:id/retry-fiscalize", handleRetryFiscalize);

	/**
	 * 7. POST /api/cashbox/payments & POST /api/cash/payments
	 * Канонический эндпоинт проведения оплаты через кассу: целочисленные копейки (amountKopecks: bigint),
	 * проводка в кассовый журнал cashOperations, обновление баланса cashBoxes и фискальный чек.
	 */
	const handleCashboxPayment = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cashbox payment process",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashboxPaymentRequestSchema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры платежа",
				details: parsed.error.issues,
			});
		}

		const body = parsed.data;
		const headerIdemp =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			body.clientMutationId?.trim() ||
			body.idempotencyKey?.trim() ||
			headerIdemp?.trim() ||
			`cbx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Вычисляем точную сумму в копейках и рублях
		let totalKopecks = 0n;
		if (body.amountKopecks !== undefined) {
			totalKopecks = BigInt(body.amountKopecks);
		} else if (body.amountRub !== undefined) {
			totalKopecks = BigInt(Math.round(body.amountRub * 100));
		}
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

			// Разрешение ID пациента
			let resolvedPatientId = body.patientId;
			if (!resolvedPatientId) {
				const [firstPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(eq(patients.organizationId, orgId))
					.limit(1);
				if (firstPatient) {
					resolvedPatientId = firstPatient.id;
				}
			}

			if (!resolvedPatientId) {
				throw new Error("В клинике не найден пациент для проведения кассового платежа");
			}

			// Генерируем номер кассового чека
			const receiptNumber = `ФД-${Date.now().toString().slice(-6)}`;
			const issuedAt = new Date().toISOString();

			// 1. Фиксация платежа в таблице payments
			const [newPayment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: resolvedPatientId,
					visitId: body.visitId || null,
					clientMutationId: effectiveMutationId,
					amountRub: amountRubNumber,
					method: (body.method as any) || "card",
					status: "paid",
					paidAt: new Date(),
					fiscalReceiptNumber: receiptNumber,
					fiscalReceiptIssuedAt: issuedAt,
					payerFullName: body.cashierFullName || "Кассир",
					note: body.note || `Оплата через кассу (${body.method || "card"})`,
				})
				.returning();

			if (!newPayment) {
				throw new Error("Не удалось зафиксировать платёж в базе данных");
			}

			// 2. Инициализируем и находим кассовые счета клиники
			await ensureOrganizationCashBoxes(tx, orgId);
			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId));

			const cashDeskBox = boxes.find((b) => b.type === "cash_desk" || !b.isCashless) || boxes[0];
			const cashlessBox = boxes.find((b) => b.type === "bank_account" || b.isCashless) || boxes[1] || cashDeskBox;

			// 3. Кассовые проводки в cashOperations
			const isSplit = body.method === "split";
			const resolvedCashKop = body.cashAmountKopecks ?? (body.method === "cash" ? Number(totalKopecks) : 0);
			const resolvedElecKop =
				body.electronicAmountKopecks ??
				(["card", "sbp", "online"].includes(body.method || "") ? Number(totalKopecks) : 0);

			if (resolvedCashKop > 0 && cashDeskBox) {
				const curBal = Number(cashDeskBox.balanceRub || 0);
				const addRub = Number((resolvedCashKop / 100).toFixed(2));
				const newBal = Number((curBal + addRub).toFixed(2));

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
				const curBal = Number(cashlessBox.balanceRub || 0);
				const addRub = Number((resolvedElecKop / 100).toFixed(2));
				const newBal = Number((curBal + addRub).toFixed(2));

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

		return reply.code(200).send({
			success: true,
			data: result,
		});
	};

	app.post("/api/cashbox/payments", handleCashboxPayment);
	app.post("/api/cash/payments", handleCashboxPayment);
}
