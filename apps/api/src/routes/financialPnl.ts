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
	kopecksToRubles,
	rublesToKopecks,
	splitKopecks,
} from "@dental/shared";
import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireExecutiveAccess } from "./analytics/executiveAccessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	clinicTimeZone,
	currentMonthPeriod,
} from "../services/reports/managerReports.js";
import { doctorPayrollReport } from "../services/reports/managerReports/financialExecutiveReports.js";
import { CALENDAR_DATE_PATTERN, resolvePeriodBoundary } from "./reports/reportsShared.js";
import {
	appointments,
	cashBoxes,
	cashExpenseReasons,
	cashOperations,
	chairs,
	clinics,
	inventoryTransactions,
	labOrders,
	payments,
	services,
	treatmentItems,
	visits,
} from "../db/schema.js";

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
		const orgId = await requireExecutiveAccess(req, reply);
		if (!orgId) return;

		const parsed = pnlQuerySchema.safeParse(req.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный диапазон дат отчета P&L",
				issues: parsed.error.issues,
			});
		}

		const orgTimeZone = await clinicTimeZone(orgId);
		const defaultPeriod = currentMonthPeriod(new Date(), orgTimeZone);
		const fromDate = parsed.data.from
			? resolvePeriodBoundary(parsed.data.from, "from", orgTimeZone) ?? defaultPeriod.from
			: defaultPeriod.from;
		const toDate = parsed.data.to
			? resolvePeriodBoundary(parsed.data.to, "to", orgTimeZone) ?? defaultPeriod.to
			: defaultPeriod.to;

		const fromDateStr = parsed.data.from && CALENDAR_DATE_PATTERN.test(parsed.data.from)
			? parsed.data.from
			: fromDate.toISOString().slice(0, 10);
		const toDateStr = parsed.data.to && CALENDAR_DATE_PATTERN.test(parsed.data.to)
			? parsed.data.to
			: toDate.toISOString().slice(0, 10);

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
					amountKopecks: payments.amountKopecks,
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
				priceKopecks: number;
			}> = [];

			if (periodVisitIds.length > 0) {
				visitItems = await tx
					.select({
						visitId: treatmentItems.visitId,
						category: services.category,
						priceKopecks: sql<number>`coalesce(nullif(${treatmentItems.priceKopecks}, 0), round(${treatmentItems.priceRub} * 100)::bigint)::bigint`,
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
			const visitItemsMap = new Map<string, Array<{ category: string; priceKopecks: number }>>();
			for (const vi of visitItems) {
				if (vi.visitId && vi.category) {
					let cat = vi.category;
					if (cat === "pediatric_dentistry") cat = "pediatric";
					if (cat === "preventive") cat = "hygiene";

					const list = visitItemsMap.get(vi.visitId) || [];
					list.push({ category: cat, priceKopecks: Number(vi.priceKopecks || 0) });
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
					const catTotalsKop = new Map<string, number>();
					let sumPricesKop = 0;
					for (const it of items) {
						const itPriceKop = it.priceKopecks;
						catTotalsKop.set(it.category, (catTotalsKop.get(it.category) || 0) + itPriceKop);
						sumPricesKop += itPriceKop;
					}

					const totalPaymentKop = p.amountKopecks != null ? Number(p.amountKopecks) : rublesToKopecks(p.amountRub);
					if (sumPricesKop > 0) {
						let allocatedKop = 0;
						const entries = Array.from(catTotalsKop.entries());
						for (let i = 0; i < entries.length; i++) {
							const [cat, catPriceKop] = entries[i]!;
							const isLast = i === entries.length - 1;
							const catKop = isLast ? (totalPaymentKop - allocatedKop) : Math.round((totalPaymentKop * catPriceKop) / sumPricesKop);
							allocatedKop += catKop;
							paymentRows.push({
								amountRub: kopecksToRubles(catKop),
								department: cat,
								cashBoxType: boxType,
							});
						}
					} else {
						const categories = Array.from(catTotalsKop.keys());
						const count = categories.length;
						const splitParts = splitKopecks(totalPaymentKop, count);
						for (let i = 0; i < count; i++) {
							const cat = categories[i]!;
							const catKop = splitParts[i]!;
							paymentRows.push({
								amountRub: kopecksToRubles(catKop),
								department: cat,
								cashBoxType: boxType,
							});
						}
					}
				} else {
					paymentRows.push({
						amountRub: p.amountKopecks != null ? kopecksToRubles(Number(p.amountKopecks)) : p.amountRub,
						department: "unassigned",
						cashBoxType: boxType,
					});
				}
			}

			// 3. Получаем расходы по кассовым операциям с фильтрацией по expenseDate
			const expenseOps = await tx
				.select({
					amountKopecks: cashOperations.amountKopecks,
					amountRub: cashOperations.amountRub,
					reasonCode: cashOperations.reasonCode,
				})
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, orgId),
						eq(cashOperations.operationType, "expense"),
						sql`COALESCE((${cashOperations.metadata}->>'expenseDate')::date, (${cashOperations.createdAt} AT TIME ZONE COALESCE(${orgTimeZone}, 'Europe/Moscow'))::date) >= ${fromDateStr}::date`,
						sql`COALESCE((${cashOperations.metadata}->>'expenseDate')::date, (${cashOperations.createdAt} AT TIME ZONE COALESCE(${orgTimeZone}, 'Europe/Moscow'))::date) <= ${toDateStr}::date`,
					),
				);

			const expenseRows = expenseOps.map((e) => ({
				reasonId: e.reasonCode || 10,
				amountRub: e.amountKopecks != null ? kopecksToRubles(Number(e.amountKopecks)) : e.amountRub,
			}));

			// 3a. Учитываем фактическую себестоимость заказов ЗТЛ (labCostKopecks), не проведенных через кассовую операцию
			const unpaidLabOrders = await tx
				.select({
					labCostKopecks: labOrders.labCostKopecks,
				})
				.from(labOrders)
				.where(
					and(
						eq(labOrders.organizationId, orgId),
						ne(labOrders.status, "cancelled"),
						eq(labOrders.isWarranty, false),
						sql`${labOrders.paidFromCashOperationId} IS NULL`,
						gte(labOrders.createdAt, fromDate),
						lte(labOrders.createdAt, toDate),
					),
				);

			let unpaidLabKop = 0;
			for (const row of unpaidLabOrders) {
				unpaidLabKop += Number(row.labCostKopecks ?? 0);
			}

			if (unpaidLabKop > 0) {
				expenseRows.push({
					reasonId: 11, // Зуботехническая лаборатория (ЗТЛ)
					amountRub: kopecksToRubles(unpaidLabKop),
				});
			}

			// 3b. Учитываем фактические списания материалов (inventoryTransactions)
			const materialsUsage = await tx
				.select({
					qty: inventoryTransactions.qty,
					quantityChanged: inventoryTransactions.quantityChanged,
					unitCostKopecks: inventoryTransactions.unitCostKopecks,
					unitCostRub: inventoryTransactions.unitCostRub,
				})
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, orgId),
						inArray(inventoryTransactions.transactionType, ["usage", "write_off"]),
						gte(inventoryTransactions.createdAt, fromDate),
						lte(inventoryTransactions.createdAt, toDate),
					),
				);

			let actualMaterialsCostKop = 0;
			for (const row of materialsUsage) {
				const qty = Math.abs(Number(row.qty ?? row.quantityChanged ?? 0));
				const unitCostKop = row.unitCostKopecks != null
					? Number(row.unitCostKopecks)
					: rublesToKopecks(Number(row.unitCostRub ?? 0));
				if (qty > 0 && unitCostKop > 0) {
					actualMaterialsCostKop += Math.round(qty * unitCostKop);
				}
			}

			const cashMaterialsKop = expenseRows
				.filter((e) => e.reasonId === 4 || e.reasonId === 5)
				.reduce((acc, e) => acc + rublesToKopecks(Number(e.amountRub || 0)), 0);
			if (actualMaterialsCostKop > cashMaterialsKop) {
				expenseRows.push({
					reasonId: 4, // Стоматологические материалы
					amountRub: kopecksToRubles(actualMaterialsCostKop - cashMaterialsKop),
				});
			}

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

			let doctorPieceRatePayrollRub = 0;
			try {
				const doctorPayroll = await doctorPayrollReport(
					{
						organizationId: orgId,
						from: fromDate,
						to: toDate,
					},
					undefined,
					req.log,
				);
				doctorPieceRatePayrollRub = Number(doctorPayroll?.totals?.totalClinicPayrollRub || doctorPayroll?.totals?.totalPayoutRub || 0);
			} catch (err) {
				req.log.warn({ err }, "Не удалось рассчитать сдельную зарплату врачей для P&L");
			}

			const pnlInput: CalculateManagerialPnlInput = {
				period: {
					from: fromDateStr,
					to: toDateStr,
				},
				clinicName: clinic?.name || "Стоматологическая клиника",
				payments: paymentRows,
				expenses: expenseRows,
				doctorPieceRatePayrollRub,
				chairEconomics: chairEconomicsConfig,
			};

			const pnlReport = calculateManagerialPnl(pnlInput);

			return reply.send({ data: pnlReport });
		});
	});
}
