/**
 * shiftReconciliationRoutes.ts — Mid-shift X-Reports and Live Reconciliation Endpoints.
 *
 * Implements:
 * - GET & POST /api/cash/x-report & /api/fiscal/x-report (54-FZ X-Report without closing)
 * - GET & POST /api/cash/shift-reconciliation (Pre-closure financial audit)
 *
 * Strict compliance with:
 * - Federal Law 54-FZ (X-Report without shift reset)
 * - KKT hardware I/O strictly outside PostgreSQL transactions
 * - Pure read-only HTTP GET endpoints
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { kopecksToRub, rublesToKopecks } from "@dental/shared";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { cashBoxes, cashBoxShifts } from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { LanKktDriverService } from "../../../services/hardware/lanKktDriverService.js";
import { checkAndAutoCloseExpiredShifts } from "../../shifts/shiftAutoCloseService.js";
import { xReportQueryOrBodySchema } from "../cashboxSchemas.js";
import { calculateShiftTenderTotals } from "./shiftReconciliationEngine.js";

function resolveSafeKopecks(
	kopecksVal: number | null | undefined,
	rubVal: number | null | undefined,
): number {
	const kop = kopecksVal ?? 0;
	const rub = Number(rubVal || 0);
	return kop !== 0 || rub === 0 ? kop : rublesToKopecks(rub);
}

export function registerShiftReconciliationRoutes(app: FastifyInstance): void {
	/**
	 * 1. POST & GET /api/fiscal/x-report & /api/cash/x-report
	 * Промежуточный срез смены без гашения (Х-отчет 54-ФЗ).
	 */
	const handleXReport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "x-report read");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const queryOrBody = (request.method === "POST" ? request.body : request.query) ?? {};
		const parsed = xReportQueryOrBodySchema.safeParse(queryOrBody);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса Х-отчета.",
				details: parsed.error.issues,
			});
		}

		const cashierFullName = parsed.data.cashierFullName || "Кассир / Администратор";

		const dbSnapshot = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId))
				.orderBy(cashBoxes.displayOrder);

			const openShifts = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.status, "open"),
					),
				);

			let totalCashKop = 0;
			let totalIncomeKop = 0;
			let totalExpenseKop = 0;

			for (const b of boxes) {
				if (b.type === "main") {
					totalCashKop += resolveSafeKopecks(b.balanceKopecks, b.balanceRub);
				}
			}

			for (const s of openShifts) {
				totalIncomeKop += resolveSafeKopecks(s.incomeTotalKopecks, s.incomeTotalRub);
				totalExpenseKop += resolveSafeKopecks(s.expenseTotalKopecks, s.expenseTotalRub);
			}

			return {
				boxesCount: boxes.length,
				openShiftsCount: openShifts.length,
				firstShiftNumber: openShifts[0]?.shiftNumber ?? 1,
				openedAt: openShifts[0]?.openedAt,
				totalCashKop,
				totalIncomeKop,
				totalExpenseKop,
			};
		});

		const currentShiftNumber = parsed.data.shiftNumber ?? dbSnapshot.firstShiftNumber;
		const now = new Date();

		// Аппаратный запрос Х-отчета строго ВНЕ транзакции PostgreSQL
		let kktResult: Awaited<ReturnType<typeof LanKktDriverService.printXReport>> | undefined;
		if (request.method === "POST" || parsed.data.print) {
			try {
				kktResult = await LanKktDriverService.printXReport({
					cashierName: cashierFullName,
					shiftNumber: currentShiftNumber,
				});
			} catch (err: unknown) {
				request.log.warn({ err }, "LanKktDriverService.printXReport non-blocking warning");
			}
		}

		return reply.send({
			success: true,
			reportType: "x_report" as const,
			shiftNumber: currentShiftNumber,
			status: (dbSnapshot.openShiftsCount > 0 ? "open" : "closed") as "open" | "closed",
			openedAt: dbSnapshot.openedAt ?? now,
			printedAt: now.toISOString(),
			cashierFullName,
			totalCashInDrawerRub: kopecksToRub(dbSnapshot.totalCashKop),
			totalCashInDrawerKopecks: dbSnapshot.totalCashKop,
			totalIncomeRub: kopecksToRub(dbSnapshot.totalIncomeKop),
			totalIncomeKopecks: dbSnapshot.totalIncomeKop,
			totalExpenseRub: kopecksToRub(dbSnapshot.totalExpenseKop),
			totalExpenseKopecks: dbSnapshot.totalExpenseKop,
			openShiftsCount: dbSnapshot.openShiftsCount,
			boxesCount: dbSnapshot.boxesCount,
			kktResult,
		});
	};

	const reportRouteOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description:
				"Shift X-report and reconciliation with organizationId tenant isolation and optional Idempotency-Key",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};
	const readRouteOptions = { config: { tenantTxSelfManaged: true } };

	app.post("/api/cash/x-report", reportRouteOptions, async (request, reply) => {
		return handleXReport(request, reply);
	});
	app.get("/api/cash/x-report", readRouteOptions, handleXReport);
	app.post("/api/fiscal/x-report", reportRouteOptions, async (request, reply) => {
		return handleXReport(request, reply);
	});
	app.get("/api/fiscal/x-report", readRouteOptions, handleXReport);
	app.post("/api/fiscal/reports/x-report", reportRouteOptions, async (request, reply) => {
		return handleXReport(request, reply);
	});
	app.get("/api/fiscal/reports/x-report", readRouteOptions, handleXReport);
	app.post("/api/finance/reports/x-report", reportRouteOptions, async (request, reply) => {
		return handleXReport(request, reply);
	});
	app.get("/api/finance/reports/x-report", readRouteOptions, handleXReport);

	/**
	 * 2. GET & POST /api/cash/shift-reconciliation
	 * Полный срез сумм по открытой смене перед снятием Z-отчета.
	 */
	const handleShiftReconciliation = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"shift reconciliation pre-audit",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const reconciliationData = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			// HTTP GET строго read-only; автозакрытие просроченных смен запускается только на POST или при открытии смены
			if (request.method !== "GET") {
				await checkAndAutoCloseExpiredShifts(tx, orgId);
			}

			const openShifts = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.status, "open"),
					),
				);

			const mainBox = await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
				.limit(1)
				.then((rows) => rows[0]);

			const primaryShift = openShifts.find((s) => s.cashBoxId === mainBox?.id) || openShifts[0];

			if (!primaryShift) {
				return {
					success: true,
					hasOpenShift: false,
					message: "В клинике нет открытых кассовых смен.",
				};
			}

			const now = new Date();
			const totals = await calculateShiftTenderTotals(tx, orgId, primaryShift, mainBox, now);

			return {
				success: true,
				hasOpenShift: true,
				shiftId: primaryShift.id,
				shiftNumber: primaryShift.shiftNumber,
				openedAt: primaryShift.openedAt,
				cashierId: primaryShift.openedByUserId,
				startingBalanceRub: primaryShift.startBalanceRub,
				expectedCashInDrawerRub: totals.expectedCashInDrawerRub,
				incomeCashRub: totals.incomeCashRub,
				incomeElectronicRub: totals.incomeElectronicRub,
				incomeSbpRub: totals.incomeSbpRub,
				advanceOffsetRub: totals.advanceOffsetRub,
				advanceDepositsRub: totals.advanceDepositsRub,
				insuranceTotalRub: totals.insuranceTotalRub,
				returnTotalRub: totals.returnTotalRub,
				operationalExpenseRub: totals.operationalExpenseRub,
				netRevenueRub: totals.netRevenueRub,
				totalIntroductionsRub: totals.totalIntroductionsRub,
				totalWithdrawalsRub: totals.totalWithdrawalsRub,
			};
		});

		return reply.send(reconciliationData);
	};

	app.get("/api/cash/shift-reconciliation", readRouteOptions, handleShiftReconciliation);
	app.post("/api/cash/shift-reconciliation", reportRouteOptions, async (request, reply) => {
		return handleShiftReconciliation(request, reply);
	});
	app.get("/api/cashbox/shift", readRouteOptions, handleShiftReconciliation);
	app.post("/api/cashbox/shift", reportRouteOptions, async (request, reply) => {
		return handleShiftReconciliation(request, reply);
	});
}
