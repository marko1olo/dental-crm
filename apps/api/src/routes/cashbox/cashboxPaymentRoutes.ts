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
} from "../../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../../db/seeds/seed_cash_and_reasons.js";
import { FiscalResilienceService } from "../../services/fiscalResilienceService.js";
import { registerCashInstallmentsRoutes } from "../cashInstallmentsRoutes.js";
import { registerCashLabPaymentRoutes } from "../cashLabPaymentRoutes.js";
import { cashOperationListQuerySchema } from "./cashboxSchemas.js";

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
}
