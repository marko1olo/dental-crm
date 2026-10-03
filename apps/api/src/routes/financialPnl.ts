/**
 * financialPnl.ts — Fastify Routes for Dental Managerial P&L Report.
 *
 * Grounded on 6 isolated cash accounts (`cash_boxes`), 12 canonical expense reasons (`cash_expense_reasons`),
 * bounded query execution by period visits, proportional multi-service department attribution,
 * chair unit economics integration, and Break-Even CVP analysis.
 */

import {
	type CalculateManagerialPnlInput,
	calculateManagerialPnl,
} from "@dental/shared";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
	chairs,
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

		const fromDateStr = fromDate.toISOString().slice(0, 10);
		const toDateStr = toDate.toISOString().slice(0, 10);

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

			// 2. Извлекаем визиты для периода и строго ограничиваем выборку treatmentItems
			const periodVisitIds = Array.from(
				new Set(
					periodPayments
						.map((p) => p.visitId)
						.filter((id): id is string => typeof id === "string" && id.length > 0),
				),
			);

			let visitItems: Array<{
				visitId: string | null;
				category: string | null;
				priceRub: number;
			}> = [];

			if (periodVisitIds.length > 0) {
				visitItems = await tx
					.select({
						visitId: treatmentItems.visitId,
						category: services.category,
						priceRub: treatmentItems.priceRub,
					})
					.from(treatmentItems)
					.innerJoin(services, eq(services.id, treatmentItems.serviceId))
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							inArray(treatmentItems.visitId, periodVisitIds),
						),
					);
			}

			// Группируем услуги по визитам для предотвращения category clobbering
			const visitItemsMap = new Map<string, Array<{ category: string; priceRub: number }>>();
			for (const vi of visitItems) {
				if (vi.visitId && vi.category) {
					let cat = vi.category;
					if (cat === "pediatric_dentistry") cat = "pediatric";
					if (cat === "preventive") cat = "hygiene";

					const list = visitItemsMap.get(vi.visitId) || [];
					list.push({ category: cat, priceRub: Number(vi.priceRub || 0) });
					visitItemsMap.set(vi.visitId, list);
				}
			}

			// Определяем тип кассового счета и пропорционально атрибутируем платеж по направлениям
			const paymentRows: Array<{
				amountRub: number;
				department: string;
				cashBoxType: "main" | "extra" | "cashless" | "dms" | "account" | "expenses";
			}> = [];

			for (const p of periodPayments) {
				let boxType: "main" | "extra" | "cashless" | "dms" | "account" | "expenses" = "cashless";
				if (p.method === "cash") boxType = "main";
				else if (p.method === "insurance") boxType = "dms";
				else if (p.method === "bank_transfer") boxType = "account";

				const items = p.visitId ? visitItemsMap.get(p.visitId) : undefined;
				if (items && items.length > 0) {
					const catTotals = new Map<string, number>();
					let sumPrices = 0;
					for (const it of items) {
						catTotals.set(it.category, (catTotals.get(it.category) || 0) + it.priceRub);
						sumPrices += it.priceRub;
					}

					if (sumPrices > 0) {
						for (const [cat, catPrice] of catTotals.entries()) {
							const share = catPrice / sumPrices;
							paymentRows.push({
								amountRub: Number((p.amountRub * share).toFixed(2)),
								department: cat,
								cashBoxType: boxType,
							});
						}
					} else {
						const equalShare = p.amountRub / catTotals.size;
						for (const cat of catTotals.keys()) {
							paymentRows.push({
								amountRub: Number(equalShare.toFixed(2)),
								department: cat,
								cashBoxType: boxType,
							});
						}
					}
				} else {
					paymentRows.push({
						amountRub: p.amountRub,
						department: "therapy",
						cashBoxType: boxType,
					});
				}
			}

			// 3. Получаем расходы по кассовым операциям с фильтрацией по expenseDate
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
						sql`COALESCE(${cashOperations.metadata}->>'expenseDate', SUBSTRING(${cashOperations.createdAt}::text, 1, 10)) >= ${fromDateStr}`,
						sql`COALESCE(${cashOperations.metadata}->>'expenseDate', SUBSTRING(${cashOperations.createdAt}::text, 1, 10)) <= ${toDateStr}`,
					),
				);

			const expenseRows = expenseOps.map((e) => ({
				reasonId: e.reasonCode || 10,
				amountRub: e.amountRub,
			}));

			// 4. Юнит-экономика кресел: запрашиваем активные кресла и приемы за период
			const activeChairs = await tx
				.select({
					id: chairs.id,
					name: chairs.name,
				})
				.from(chairs)
				.where(
					and(
						eq(chairs.organizationId, orgId),
						eq(chairs.isActive, true),
					),
				);

			const periodAppointments = await tx
				.select({
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						gte(appointments.startsAt, fromDate),
						lte(appointments.startsAt, toDate),
					),
				);

			const chairHoursMap = new Map<string, number>();
			let totalOccupiedHours = 0;
			for (const app of periodAppointments) {
				if (app.status === "completed" || app.status === "in_treatment" || app.status === "planned") {
					const durHours = Math.max(0.25, (app.endsAt.getTime() - app.startsAt.getTime()) / (1000 * 60 * 60));
					if (app.chairId) {
						chairHoursMap.set(app.chairId, (chairHoursMap.get(app.chairId) || 0) + durHours);
					}
					totalOccupiedHours += durHours;
				}
			}

			const chairEconomicsConfig = {
				activeChairsCount: Math.max(1, activeChairs.length),
				occupiedHours: Math.round(totalOccupiedHours),
				chairs: activeChairs.map((c) => ({
					chairId: c.id,
					chairName: c.name,
					occupiedHours: Number((chairHoursMap.get(c.id) || 0).toFixed(1)),
				})),
			};

			const pnlInput: CalculateManagerialPnlInput = {
				period: {
					from: fromDateStr,
					to: toDateStr,
				},
				clinicName: clinic?.name || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				payments: paymentRows,
				expenses: expenseRows,
				chairEconomics: chairEconomicsConfig,
			};

			const pnlReport = calculateManagerialPnl(pnlInput);

			return reply.send({ data: pnlReport });
		});
	});
}
