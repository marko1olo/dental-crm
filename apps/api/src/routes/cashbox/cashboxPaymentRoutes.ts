/**
 * cashboxPaymentRoutes.ts — Layer 2: Cash Accounts, Operation Journal, Lab Orders & Installments Rails.
 *
 * 54-FZ compliant: integer kopecks, idempotency, honest patient attribution.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
} from "../../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../../db/seeds/seed_cash_and_reasons.js";
import { FiscalResilienceService } from "../../services/fiscalResilienceService.js";
import { registerCashInstallmentsRoutes } from "./cashInstallmentsRoutes.js";
import { registerPatientBalanceRoutes } from "./patientBalanceService.js";
import { registerCashLabPaymentRoutes } from "../lab/index.js";
import { processCashboxPayment } from "./cashboxPaymentProcessor.js";
import { cashOperationListQuerySchema } from "./cashboxSchemas.js";

const patchCashBoxParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный UUID кассового аппарата."),
	})
	.strict();

const patchCashBoxBodySchema = z
	.object({
		name: z.string().trim().min(1).max(200).optional(),
		kkmModel: z.string().trim().max(200).nullable().optional(),
		kkmSerialNumber: z.string().trim().max(200).nullable().optional(),
		branchId: z.string().trim().max(200).nullable().optional(),
		kkmActive: z.boolean().optional(),
	})
	.strict();

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
	 * Обновление параметров кассового аппарата (модель, заводской номер, филиал, активность) в PostgreSQL.
	 */
	app.patch(
		"/api/cash/cash-box/:id",
		async (
			request: FastifyRequest<{
				Params: { id: string };
				Body: {
					name?: string;
					kkmModel?: string | null;
					kkmSerialNumber?: string | null;
					branchId?: string | null;
					kkmActive?: boolean;
				};
			}>,
			reply: FastifyReply,
		) => {
			// Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"cash box update",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsedParams = patchCashBoxParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор кассового аппарата.",
					details: parsedParams.error.issues,
				});
			}
			const parsedBody = patchCashBoxBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры обновления кассового аппарата.",
					details: parsedBody.error.issues,
				});
			}

			const { id } = parsedParams.data;
			const body = parsedBody.data;

			const updated = await withTenantCtx(orgId, async (tx) => {
				const setFields: {
					updatedAt: Date;
					name?: string;
					kkmModel?: string | null;
					kkmSerialNumber?: string | null;
					branchId?: string | null;
					kkmActive?: boolean;
				} = { updatedAt: new Date() };
				if (body.name) setFields.name = body.name;
				if (body.kkmModel !== undefined) setFields.kkmModel = body.kkmModel;
				if (body.kkmSerialNumber !== undefined) {
					setFields.kkmSerialNumber = body.kkmSerialNumber;
				}
				if (body.branchId !== undefined) setFields.branchId = body.branchId;
				if (body.kkmActive !== undefined) setFields.kkmActive = body.kkmActive;

				const [row] = await tx
					.update(cashBoxes)
					.set(setFields)
					.where(and(eq(cashBoxes.id, id), eq(cashBoxes.organizationId, orgId)))
					.returning();
				return row ?? null;
			});

			if (!updated) {
				return reply
					.code(404)
					.send({ error: "NotFound", message: "Кассовый аппарат не найден" });
			}
			return reply.send({ data: updated });
		},
	);

	/**
	 * 2. GET /api/cash/expense-reasons & GET /api/cash/expense-reason
	 * 12 регламентированных статей расхода клиники.
	 */
	const handleGetExpenseReasons = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"expense reasons read",
		);
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

	// 4b. Регистрация модульных маршрутов баланса пациента и авансов (Feature #38)
	await registerPatientBalanceRoutes(app);

	/**
	 * 5. GET /api/cash/operation-list
	 * Журнал кассовых ордеров и проводок клиники.
	 */
	app.get(
		"/api/cash/operation-list",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"cash operations read",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsed = cashOperationListQuerySchema.safeParse(request.query || {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса журнала операций.",
					details: parsed.error.issues,
				});
			}
			const filters = parsed.data;
			let fromDate: Date | undefined;
			let toDate: Date | undefined;
			if (filters.dateFrom) {
				fromDate = new Date(filters.dateFrom);
				if (Number.isNaN(fromDate.getTime())) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный формат даты dateFrom.",
					});
				}
			}
			if (filters.dateTo) {
				toDate = new Date(filters.dateTo);
				if (Number.isNaN(toDate.getTime())) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный формат даты dateTo.",
					});
				}
			}

			const ops = await withTenantCtx(orgId, async (tx) => {
				const conditions = [eq(cashOperations.organizationId, orgId)];

				if (filters.cashBoxId) {
					conditions.push(eq(cashOperations.cashBoxId, filters.cashBoxId));
				}
				if (filters.operationType) {
					conditions.push(eq(cashOperations.operationType, filters.operationType));
				}
				if (fromDate) {
					conditions.push(gte(cashOperations.createdAt, fromDate));
				}
				if (toDate) {
					conditions.push(lte(cashOperations.createdAt, toDate));
				}

				return await tx
					.select()
					.from(cashOperations)
					.where(and(...conditions))
					.orderBy(desc(cashOperations.createdAt))
					.limit(100);
			});

			return reply.send({ data: ops, total: ops.length });
		},
	);

	/**
	 * 6. POST /api/cashbox/transactions/:id/retry-fiscalize & POST /api/cash/transactions/:id/retry-fiscalize
	 * Безопасная повторная фискализация чека (54-ФЗ) после восстановления связи/бумаги.
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

	app.post(
		"/api/cashbox/transactions/:id/retry-fiscalize",
		handleRetryFiscalize,
	);
	app.post("/api/cash/transactions/:id/retry-fiscalize", handleRetryFiscalize);

	/**
	 * 7. POST /api/cashbox/payments, POST /api/cash/payments, POST /api/cashbox/receipt, POST /api/cash/receipt
	 * Канонический эндпоинт проведения оплаты через кассу: целочисленные копейки (amountKopecks: bigint),
	 * проводка в кассовый журнал cashOperations, обновление баланса cashBoxes и кассовый чек.
	 */
	const handleCashboxPayment = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cashbox payment process",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const idempotencyKey = extractIdempotencyKey(request);
		if (!idempotencyKey) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Заголовок Idempotency-Key обязателен для проведения кассового платежа (Мандат 8bo).",
			});
		}
		const baseKey = idempotencyKey.includes("#")
			? idempotencyKey.split("#")[0]
			: idempotencyKey;
		if (!isValidUuid(baseKey || "")) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}

		reply.header("Idempotency-Key", idempotencyKey);
		reply.header("X-Idempotency-Key", idempotencyKey);

		const result = await processCashboxPayment(
			orgId,
			request.body,
			idempotencyKey,
			request.log,
		);
		if (
			result.statusCode === 200 &&
			"data" in result.body &&
			typeof result.body.data === "object" &&
			result.body.data !== null &&
			"isReplay" in result.body.data &&
			Boolean((result.body.data as { isReplay?: unknown }).isReplay)
		) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
		}
		return reply.code(result.statusCode).send(result.body);
	};

	const cashboxPaymentRouteOptions = {
		schema: {
			description:
				"Cashbox payment with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
				},
			},
		},
	};

	app.post("/api/cashbox/payments", cashboxPaymentRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashboxPayment(request, reply);
	});
	app.post("/api/cash/payments", cashboxPaymentRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashboxPayment(request, reply);
	});
	app.post("/api/cashbox/receipt", cashboxPaymentRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashboxPayment(request, reply);
	});
	app.post("/api/cash/receipt", cashboxPaymentRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCashboxPayment(request, reply);
	});
}
