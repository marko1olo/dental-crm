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
	classifyPaymentFlowRecord,
	rublesToKopecks,
	splitKopecks,
} from "@dental/shared";
import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import { requireExecutiveAccess } from "./analytics/executiveAccessGuard.js";
import { withTenantReadCtx } from "../db/rls.js";
import {
	clinicTimeZone,
	currentMonthPeriod,
} from "../services/reports/managerReports.js";
import { doctorPayrollReport } from "../services/reports/managerReports/financialExecutiveReports.js";
import { CALENDAR_DATE_PATTERN, resolvePeriodBoundary } from "./reports/reportsShared.js";
import {
	appointments,
	cashOperations,
	chairs,
	clinics,
	inventoryTransactions,
	labOrders,
	payments,
	services,
	treatmentItems,
} from "../db/schema.js";

const periodBoundarySchema = z.union([
	z.string().regex(CALENDAR_DATE_PATTERN),
	z.string().datetime({ offset: true }),
]);

const pnlQuerySchema = z.object({
	from: periodBoundarySchema.optional(),
	to: periodBoundarySchema.optional(),
}).strict();

type PnlCashBoxType = "main" | "extra" | "cashless" | "dms" | "account" | "expenses";

function resolveSplitTenderTenders(
	method: string,
	fiscalReceipt: unknown,
	absPaymentKop: number,
): Array<{ cashBoxType: PnlCashBoxType; kopecks: number }> {
	if (method === "cash") return [{ cashBoxType: "main", kopecks: absPaymentKop }];
	if (method === "insurance") return [{ cashBoxType: "dms", kopecks: absPaymentKop }];
	if (method === "bank_transfer") return [{ cashBoxType: "account", kopecks: absPaymentKop }];
	if (
		method === "deposit" ||
		method === "family_wallet" ||
		method === "advance" ||
		method === "certificate" ||
		method === "other"
	) {
		return [{ cashBoxType: "extra", kopecks: absPaymentKop }];
	}
	if (method !== "split" || !fiscalReceipt || typeof fiscalReceipt !== "object") {
		return [{ cashBoxType: "cashless", kopecks: absPaymentKop }];
	}

	const receipt = fiscalReceipt as Record<string, unknown>;
	const toNonNegInt = (val: unknown): number => {
		const n = Number(val ?? 0);
		return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
	};
	const cashKop = toNonNegInt(receipt.cashKopecks);
	const sbpKop = toNonNegInt(receipt.sbpKopecks);
	const advanceKop = toNonNegInt(receipt.advanceOffsetKopecks ?? receipt.depositKopecks);
	const dmsKop = toNonNegInt(receipt.dmsKopecks);
	const explicitCardKop = receipt.cardKopecks != null || receipt.electronicKopecks != null
		? toNonNegInt(receipt.cardKopecks ?? receipt.electronicKopecks)
		: Math.max(0, absPaymentKop - cashKop - sbpKop - advanceKop - dmsKop);
	const cashlessKop = explicitCardKop + sbpKop;

	const parts: Array<{ cashBoxType: PnlCashBoxType; kopecks: number }> = [];
	if (cashKop > 0) parts.push({ cashBoxType: "main", kopecks: cashKop });
	if (cashlessKop > 0) parts.push({ cashBoxType: "cashless", kopecks: cashlessKop });
	if (advanceKop > 0) parts.push({ cashBoxType: "extra", kopecks: advanceKop });
	if (dmsKop > 0) parts.push({ cashBoxType: "dms", kopecks: dmsKop });
	return parts.length > 0 ? parts : [{ cashBoxType: "cashless", kopecks: absPaymentKop }];
}

export async function registerFinancialPnlRoutes(app: FastifyInstance) {
	/**
	 * GET /api/reports/pnl — Управленческий отчет о прибылях и убытках (P&L)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/pnl",
		permission: "public",
		handler: async ({ request: req, reply }) => {
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

			return withTenantReadCtx(orgId, async (tx) => {
			const orgTimeZone = await clinicTimeZone(orgId, tx);
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

			const [clinic] = await tx
				.select({ name: clinics.name })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);

			// 1. Получаем все оплаченные и возвращенные платежи за период, исключая аннулированные счета
			const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
			const periodPayments = await tx
				.select({
					id: payments.id,
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
					method: payments.method,
					status: payments.status,
					fiscalReceipt: payments.fiscalReceipt,
					visitId: payments.visitId,
					paidAt: payments.paidAt,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						inArray(payments.status, ["paid", "refunded"]),
						gte(paymentTimestamp, fromDate),
						lte(paymentTimestamp, toDate),
						sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
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

			let visitItemsRaw: Array<{
				visitId: string | null;
				category: string | null;
				priceKopecks: number | bigint | null;
				priceRub: number | string | null;
				discountKopecks: number | bigint | null;
			}> = [];

			if (periodVisitIds.length > 0) {
				visitItemsRaw = await tx
					.select({
						visitId: treatmentItems.visitId,
						category: services.category,
						priceKopecks: treatmentItems.priceKopecks,
						priceRub: treatmentItems.priceRub,
						discountKopecks: treatmentItems.discountKopecks,
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
			for (const vi of visitItemsRaw) {
				if (vi.visitId && vi.category) {
					let cat = vi.category;
					if (cat === "pediatric_dentistry") cat = "pediatric";
					if (cat === "preventive") cat = "hygiene";

					const grossKop =
						vi.priceKopecks != null && Number(vi.priceKopecks) !== 0
							? Number(vi.priceKopecks)
							: rublesToKopecks(Number(vi.priceRub ?? 0));
					const netKop = Math.max(0, grossKop - Number(vi.discountKopecks ?? 0));

					const list = visitItemsMap.get(vi.visitId) || [];
					list.push({ category: cat, priceKopecks: netKop });
					visitItemsMap.set(vi.visitId, list);
				}
			}

			// Определяем тип кассового счета, распаковываем split-чеки, сальдируем возвраты
			const aggregatedPaymentBuckets = new Map<
				string,
				{ department: string; cashBoxType: PnlCashBoxType; netKopecks: number }
			>();
			const addBucketKopecks = (department: string, cashBoxType: PnlCashBoxType, signedKop: number) => {
				if (signedKop === 0) return;
				const key = `${department}::${cashBoxType}`;
				const existing = aggregatedPaymentBuckets.get(key);
				if (existing) {
					existing.netKopecks += signedKop;
				} else {
					aggregatedPaymentBuckets.set(key, { department, cashBoxType, netKopecks: signedKop });
				}
			};

			for (const p of periodPayments) {
				const flow = classifyPaymentFlowRecord(p, "flow");
				if (flow.kind === "ignored") continue;
				const absPaymentKop = Number(flow.absKopecks);
				const sign = flow.kind === "refund" ? -1 : 1;
				const tenders = resolveSplitTenderTenders(p.method, p.fiscalReceipt, absPaymentKop);
				const items = p.visitId ? visitItemsMap.get(p.visitId) : undefined;

				for (const tender of tenders) {
					const totalSignedKop = sign * tender.kopecks;
					if (items && items.length > 0) {
						const catTotalsKop = new Map<string, number>();
						let sumPricesKop = 0;
						for (const it of items) {
							catTotalsKop.set(it.category, (catTotalsKop.get(it.category) || 0) + it.priceKopecks);
							sumPricesKop += it.priceKopecks;
						}

						if (sumPricesKop > 0) {
							let allocatedKop = 0;
							const entries = Array.from(catTotalsKop.entries());
							for (let i = 0; i < entries.length; i++) {
								const entry = entries[i];
								if (!entry) continue;
								const [cat, catPriceKop] = entry;
								const isLast = i === entries.length - 1;
								const catKop = isLast
									? totalSignedKop - allocatedKop
									: Math.round((totalSignedKop * catPriceKop) / sumPricesKop);
								allocatedKop += catKop;
								addBucketKopecks(cat, tender.cashBoxType, catKop);
							}
						} else {
							const categories = Array.from(catTotalsKop.keys());
							const splitParts = splitKopecks(Math.abs(totalSignedKop), categories.length);
							for (let i = 0; i < categories.length; i++) {
								const cat = categories[i];
								const catKop = splitParts[i];
								if (cat === undefined || catKop === undefined) continue;
								addBucketKopecks(cat, tender.cashBoxType, sign * catKop);
							}
						}
					} else {
						addBucketKopecks("unassigned", tender.cashBoxType, totalSignedKop);
					}
				}
			}

			const paymentRows: Array<{
				amountRub: number;
				department: string;
				cashBoxType: PnlCashBoxType;
			}> = [];
			for (const bucket of aggregatedPaymentBuckets.values()) {
				if (bucket.netKopecks > 0) {
					paymentRows.push({
						amountRub: kopecksToRubles(bucket.netKopecks),
						department: bucket.department,
						cashBoxType: bucket.cashBoxType,
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
						timeZone: orgTimeZone,
					},
					undefined,
					req.log,
					tx,
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
		},
	});
}
