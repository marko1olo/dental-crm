/**
 * financialPnl.ts — Fastify Routes for Dental Managerial P&L Report.
 *
 * Grounded on 6 isolated cash accounts (`cash_boxes`), 12 canonical expense reasons (`cash_expense_reasons`),
 * revenue breakdown by medical departments, and exact EBITDA / Net Profit calculations.
 */

import {
	type CalculateManagerialPnlInput,
	calculateManagerialPnl,
} from "@dental/shared";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
	clinics,
	payments,
	services,
	treatmentItems,
	visits,
} from "../db/schema.js";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const periodBoundarySchema = z.union([
	z.string().regex(CALENDAR_DATE_PATTERN),
	z.string().datetime({ offset: true }),
]);

const pnlQuerySchema = z.object({
	from: periodBoundarySchema.optional(),
	to: periodBoundarySchema.optional(),
});

export async function registerFinancialPnlRoutes(app: FastifyInstance) {
	/**
	 * GET /api/reports/pnl — Управленческий отчет о прибылях и убытках (P&L)
	 */
	app.get("/api/reports/pnl", async (req: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(req, reply, "financial pnl read");
		if (!orgId) return;

		const parsed = pnlQuerySchema.safeParse(req.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный диапазон дат отчета P&L",
				issues: parsed.error.issues,
			});
		}

		const now = new Date();
		const defaultFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
		const defaultTo = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

		const fromDate = parsed.data.from ? new Date(parsed.data.from) : defaultFrom;
		const toDate = parsed.data.to ? new Date(parsed.data.to) : defaultTo;

		if (toDate.getUTCHours() === 0 && toDate.getUTCMinutes() === 0) {
			toDate.setUTCHours(23, 59, 59, 999);
		}

		return withTenantCtx(orgId, async (tx) => {
			const [clinic] = await tx
				.select({ name: clinics.name })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);

			// 1. Получаем все оплаченные платежи за период
			const periodPayments = await tx
				.select({
					id: payments.id,
					amountRub: payments.amountRub,
					method: payments.method,
					visitId: payments.visitId,
					paidAt: payments.paidAt,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.status, "paid"),
						gte(payments.paidAt, fromDate),
						lte(payments.paidAt, toDate),
					),
				);

			// Для каждого визита определяем категорию лечения (направление)
			const visitCategories = await tx
				.select({
					visitId: treatmentItems.visitId,
					category: services.category,
				})
				.from(treatmentItems)
				.innerJoin(services, eq(services.id, treatmentItems.serviceId))
				.where(eq(treatmentItems.organizationId, orgId));

			const visitCategoryMap = new Map<string, string>();
			for (const vc of visitCategories) {
				if (vc.visitId && vc.category) {
					visitCategoryMap.set(vc.visitId, vc.category);
				}
			}

			// Определяем тип кассового счета по методу оплаты
			const paymentRows = periodPayments.map((p) => {
				let dept = p.visitId ? visitCategoryMap.get(p.visitId) || "therapy" : "therapy";
				// Нормализация категории
				if (dept === "pediatric_dentistry") dept = "pediatric";
				if (dept === "preventive") dept = "hygiene";

				let boxType: "main" | "extra" | "cashless" | "dms" | "account" | "expenses" = "cashless";
				if (p.method === "cash") boxType = "main";
				else if (p.method === "insurance") boxType = "dms";
				else if (p.method === "bank_transfer") boxType = "account";

				return {
					amountRub: p.amountRub,
					department: dept,
					cashBoxType: boxType,
				};
			});

			// 2. Получаем расходы по кассовым операциям
			const expenseOps = await tx
				.select({
					amountRub: cashOperations.amountRub,
					reasonCode: cashOperations.reasonCode,
				})
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						eq(cashOperations.operationType, "expense"),
						gte(cashOperations.createdAt, fromDate),
						lte(cashOperations.createdAt, toDate),
					),
				);

			const expenseRows = expenseOps.map((e) => ({
				reasonId: e.reasonCode || 10, // по умолчанию хознужды, если не указано
				amountRub: e.amountRub,
			}));

			const pnlInput: CalculateManagerialPnlInput = {
				period: {
					from: fromDate.toISOString().split("T")[0]!,
					to: toDate.toISOString().split("T")[0]!,
				},
				clinicName: clinic?.name || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				payments: paymentRows,
				expenses: expenseRows,
			};

			const pnlReport = calculateManagerialPnl(pnlInput);

			return reply.send({ data: pnlReport });
		});
	});
}
