/**
 * shiftReconciliationRoutes.ts — Mid-shift X-Reports and Live Reconciliation Endpoints.
 *
 * Implements:
 * - GET & POST /api/cash/x-report & /api/fiscal/x-report (54-FZ X-Report without closing)
 * - GET & POST /api/cash/shift-reconciliation (Pre-closure financial audit)
 *
 * Strict compliance with:
 * - Federal Law 54-FZ (X-Report without shift reset)
 * - SSOT tender aggregation via shiftReconciliationEngine
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { xReportQueryOrBodySchema } from "../cashboxSchemas.js";
import { calculateShiftTenderTotals } from "./shiftReconciliationEngine.js";
import { checkAndAutoCloseExpiredShifts } from "../../shifts/shiftAutoCloseService.js";

export function registerShiftReconciliationRoutes(app: FastifyInstance): void {
	/**
	 * 1. POST & GET /api/fiscal/x-report & /api/cash/x-report
	 * Промежуточный срез смены без гашения (Х-отчет 54-ФЗ).
	 */
	const handleXReport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "x-report read");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const queryOrBody = (request.method === "POST" ? request.body : request.query) || {};
		const parsed = xReportQueryOrBodySchema.safeParse(queryOrBody);
		const cashierFullName =
			parsed.success && parsed.data.cashierFullName
				? parsed.data.cashierFullName
				: "Кассир / Администратор";

		const reportData = await withTenantCtx(orgId, async (tx) => {
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

			let totalCashRub = 0;
			let totalIncomeRub = 0;
			let totalExpenseRub = 0;

			for (const b of boxes) {
				if (b.type === "main") {
					totalCashRub += b.balanceRub;
				}
			}

			for (const s of openShifts) {
				totalIncomeRub += s.incomeTotalRub;
				totalExpenseRub += s.expenseTotalRub;
			}

			const currentShiftNumber =
				parsed.success && parsed.data.shiftNumber
					? parsed.data.shiftNumber
					: (openShifts[0]?.shiftNumber ?? 1);

			const now = new Date();

			return {
				success: true,
				reportType: "x_report" as const,
				shiftNumber: currentShiftNumber,
				status: (openShifts.length > 0 ? "open" : "closed") as "open" | "closed",
				openedAt: openShifts[0]?.openedAt ?? now,
				printedAt: now.toISOString(),
				cashierFullName,
				totalCashInDrawerRub: totalCashRub,
				totalIncomeRub,
				totalExpenseRub,
				openShiftsCount: openShifts.length,
				boxesCount: boxes.length,
			};
		});

		return reply.send(reportData);
	};

	app.post("/api/cash/x-report", handleXReport);
	app.get("/api/cash/x-report", handleXReport);
	app.post("/api/fiscal/x-report", handleXReport);
	app.get("/api/fiscal/x-report", handleXReport);
	app.post("/api/fiscal/reports/x-report", handleXReport);
	app.get("/api/fiscal/reports/x-report", handleXReport);
	app.post("/api/finance/reports/x-report", handleXReport);
	app.get("/api/finance/reports/x-report", handleXReport);

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

			// Автоматически закрываем просроченные смены (со вчерашнего дня / по расписанию)
			await checkAndAutoCloseExpiredShifts(tx, orgId);

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
				insuranceTotalRub: totals.insuranceTotalRub,
				returnTotalRub: totals.returnTotalRub,
				netRevenueRub: totals.netRevenueRub,
				totalIntroductionsRub: totals.totalIntroductionsRub,
				totalWithdrawalsRub: totals.totalWithdrawalsRub,
			};
		});

		return reply.send(reconciliationData);
	};

	app.get("/api/cash/shift-reconciliation", handleShiftReconciliation);
	app.post("/api/cash/shift-reconciliation", handleShiftReconciliation);
}
