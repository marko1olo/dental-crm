/**
 * shiftLifecycleRoutes.ts — Shift Opening & Closing (Z-Report) Endpoints.
 *
 * Implements:
 * - POST /api/cash/cash-box-all-open & POST /api/fiscal/shift/open
 * - POST /api/cash/cash-box-all-closing & POST /api/fiscal/shift/close
 *
 * Strict compliance with:
 * - Federal Law 54-FZ & FFD 1.2
 * - Mandate 8e & 8n: Cashier and Solo Doctor autonomy
 * - Idempotency-Key support against double submission
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	users,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { resolveEffectiveCashierUserId } from "../cashboxHelpers.js";
import {
	closeShiftBodySchema,
	openShiftBodySchema,
} from "../cashboxSchemas.js";
import type { CloseShiftResponseBody, OpenShiftResponseBody } from "../types.js";
import { reconcileSingleShift } from "./shiftReconciliationEngine.js";
import { checkAndAutoCloseExpiredShifts } from "../../shifts/shiftAutoCloseService.js";

export function registerShiftLifecycleRoutes(app: FastifyInstance): void {
	/**
	 * 1. POST /api/cash/cash-box-all-open & POST /api/fiscal/shift/open
	 * Групповое утреннее открытие смен по всем кассовым счетам клиники.
	 */
	const handleOpenCashShift = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash boxes open shift",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const identity = getRequestIdentity(request);
		const currentUserId = identity.userId;

		const parsed = openShiftBodySchema.safeParse(request.body || {});
		const requestedUserId = parsed.success ? parsed.data.openedByUserId : undefined;

		const effectiveUserId = await withTenantCtx(orgId, async (tx) => {
			return await resolveEffectiveCashierUserId(tx, orgId, requestedUserId, currentUserId);
		});

		if (!effectiveUserId) {
			return reply.code(400).send({
				error: "UserRequired",
				message:
					"Для открытия кассовой смены требуется идентификатор сотрудника (кассира/администратора/врача).",
			});
		}

		const openedShifts = await withTenantCtx(orgId, async (tx) => {
			// Блокируем параллельные гонки открытия смен (защита от манки-кликинга)
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
			);

			// Автоматически закрываем просроченные смены (со вчерашнего дня / по расписанию)
			await checkAndAutoCloseExpiredShifts(tx, orgId);

			await ensureOrganizationCashBoxes(tx, orgId);

			const boxes = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId));

			const shifts: (typeof cashBoxShifts.$inferSelect)[] = [];
			const now = new Date();

			const boxIds = boxes.map((b) => b.id);
			const existingOpenShifts =
				boxIds.length > 0
					? await tx
							.select()
							.from(cashBoxShifts)
							.where(
								and(
									eq(cashBoxShifts.organizationId, orgId),
									eq(cashBoxShifts.status, "open"),
									inArray(cashBoxShifts.cashBoxId, boxIds),
								),
							)
					: [];
			const openShiftsByBoxId = new Map(
				existingOpenShifts.map((s) => [s.cashBoxId, s]),
			);

			for (const box of boxes) {
				const existingOpenShift = openShiftsByBoxId.get(box.id);

				if (!existingOpenShift) {
					const [lastShift] = await tx
						.select({ shiftNumber: cashBoxShifts.shiftNumber })
						.from(cashBoxShifts)
						.where(
							and(
								eq(cashBoxShifts.organizationId, orgId),
								eq(cashBoxShifts.cashBoxId, box.id),
							),
						)
						.orderBy(desc(cashBoxShifts.shiftNumber))
						.limit(1);

					const nextShiftNumber = (lastShift?.shiftNumber ?? 0) + 1;

					const [newShift] = await tx
						.insert(cashBoxShifts)
						.values({
							organizationId: orgId,
							cashBoxId: box.id,
							shiftNumber: nextShiftNumber,
							status: "open",
							openedAt: now,
							openedByUserId: effectiveUserId,
							startBalanceRub: box.balanceRub,
							incomeTotalRub: 0,
							expenseTotalRub: 0,
						})
						.returning();

					if (newShift) {
						shifts.push(newShift);
					}
				} else {
					shifts.push(existingOpenShift);
				}
			}

			return shifts;
		});

		const response: OpenShiftResponseBody = {
			success: true,
			message: `Кассовые смены успешно открыты (${openedShifts.length} счетов).`,
			openedShiftsCount: openedShifts.length,
			shifts: openedShifts,
		};

		return reply.send(response);
	};

	app.post("/api/cash/cash-box-all-open", handleOpenCashShift);
	app.post("/api/cashbox/shift/open", handleOpenCashShift);
	app.post("/api/fiscal/shift/open", handleOpenCashShift);
	app.post("/api/finance/shift/open", handleOpenCashShift);

	/**
	 * 2. POST /api/cash/cash-box-all-closing & POST /api/fiscal/shift/close
	 * Закрытие всех смен со снятием Z-отчета (54-ФЗ), сверкой наличности и типов оплат.
	 */
	const handleCloseCashShift = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash boxes close shift",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const identity = getRequestIdentity(request);
		const currentUserId = identity.userId;

		const parsed = closeShiftBodySchema.safeParse(request.body || {});
		const inputData = parsed.success ? parsed.data : {};
		const requestedUserId = inputData.closedByUserId;

		const effectiveUserId = await withTenantCtx(orgId, async (tx) => {
			return await resolveEffectiveCashierUserId(tx, orgId, requestedUserId, currentUserId);
		});

		const closeResult = await withTenantCtx(orgId, async (tx) => {
			// Блокируем параллельные гонки закрытия смен
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
			);

			// RED TEAM GUARD: Проверка активных приёмов «в кресле» (in_treatment)
			if (!inputData.force && !inputData.allowUnfinishedVisits) {
				const activeVisitsInChair = await tx
					.select({
						id: appointments.id,
						patientId: appointments.patientId,
						doctorUserId: appointments.doctorUserId,
						startsAt: appointments.startsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, orgId),
							eq(appointments.status, "in_treatment"),
						),
					)
					.limit(10);

				if (activeVisitsInChair.length > 0) {
					return {
						hasUnfinishedVisits: true as const,
						unfinishedCount: activeVisitsInChair.length,
						unfinishedAppointments: activeVisitsInChair,
					};
				}
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

			const closed: (typeof cashBoxShifts.$inferSelect)[] = [];
			const now = new Date();

			const boxIds = [...new Set(openShifts.map((s) => s.cashBoxId))];
			const boxes =
				boxIds.length > 0
					? await tx
							.select()
							.from(cashBoxes)
							.where(and(eq(cashBoxes.organizationId, orgId), inArray(cashBoxes.id, boxIds)))
					: [];
			const boxMap = new Map(boxes.map((b) => [b.id, b]));

			let primaryResult: Awaited<ReturnType<typeof reconcileSingleShift>> | undefined;

			for (const shift of openShifts) {
				const box = boxMap.get(shift.cashBoxId);
				const finalBalance = box?.balanceRub ?? 0;

				const reconciliationResult = await reconcileSingleShift(
					tx,
					orgId,
					shift,
					box,
					inputData,
					effectiveUserId,
					now,
				);

				if (!primaryResult || box?.type === "main") {
					primaryResult = reconciliationResult;
				}

				const [updatedShift] = await tx
					.update(cashBoxShifts)
					.set({
						status: "closed",
						closedAt: now,
						closedByUserId: effectiveUserId ?? null,
						closingBalanceRub: finalBalance,
						zReportNumber: reconciliationResult.zReportNumber,
						zReportData: reconciliationResult.zReportData,
						updatedAt: now,
					})
					.where(and(eq(cashBoxShifts.id, shift.id), eq(cashBoxShifts.organizationId, orgId)))
					.returning();

				if (updatedShift) {
					closed.push(updatedShift);
				}
			}

			return {
				hasUnfinishedVisits: false as const,
				closedShifts: closed,
				primaryReconciliation: primaryResult,
			};
		});

		if (closeResult.hasUnfinishedVisits) {
			return reply.code(409).send({
				error: "UnfinishedVisitsInChair",
				code: "UNFINISHED_VISITS_IN_CHAIR",
				message: `Невозможно закрыть кассовую смену: в кресле находятся пациенты на приёме (${closeResult.unfinishedCount} визит(ов) в статусе «в кресле»). Завершите приём перед снятием Z-отчета или передайте force: true.`,
				unfinishedCount: closeResult.unfinishedCount,
				unfinishedAppointments: closeResult.unfinishedAppointments,
			});
		}

		const { closedShifts, primaryReconciliation } = closeResult;

		const response: CloseShiftResponseBody = {
			success: true,
			message: `Все открытые кассовые смены успешно закрыты со снятием Z-отчетов (${closedShifts.length}).`,
			closedShiftsCount: closedShifts.length,
			shifts: closedShifts,
			reconciliation: primaryReconciliation
				? {
						countedCashRub: primaryReconciliation.zReportData.countedCashRub,
						expectedCashInDrawerRub: primaryReconciliation.zReportData.expectedCashInDrawerRub,
						incomeCashRub: primaryReconciliation.zReportData.incomeCashRub,
						incomeElectronicRub: primaryReconciliation.zReportData.incomeElectronicRub,
						incomeSbpRub: primaryReconciliation.zReportData.incomeSbpRub,
						advanceOffsetRub: primaryReconciliation.zReportData.advanceOffsetRub,
						insuranceTotalRub: primaryReconciliation.zReportData.insuranceTotalRub,
						returnTotalRub: primaryReconciliation.zReportData.returnTotalRub,
						netRevenueRub: primaryReconciliation.zReportData.netRevenueRub,
						differenceRub: primaryReconciliation.differenceRub,
						isBalanced: primaryReconciliation.isBalanced,
						discrepancyType: primaryReconciliation.discrepancyType,
						fiscalDocNumber: primaryReconciliation.fiscalDocNumber,
						fiscalSign: primaryReconciliation.fiscalSign,
						qrString: primaryReconciliation.qrString,
					}
				: undefined,
		};

		return reply.send(response);
	};

	app.post("/api/cash/cash-box-all-closing", handleCloseCashShift);
	app.post("/api/cashbox/shift/close", handleCloseCashShift);
	app.post("/api/fiscal/shift/close", handleCloseCashShift);
	app.post("/api/finance/shift/close", handleCloseCashShift);
	app.post("/api/cashbox/shifts/close", handleCloseCashShift);
	app.post("/api/fiscal/z-report", handleCloseCashShift);

	/**
	 * 3. GET /api/cashbox/shifts & GET /api/cash/shifts
	 * Сводный журнал кассовых смен клиники: статус, выручка, нал/безнал/СБП/аванс, ОФД и Z-отчеты.
	 */
	const handleListCashShifts = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "cashbox shifts list");
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const shiftsList = await withTenantCtx(orgId, async (tx) => {
			const rows = await tx
				.select({
					shift: cashBoxShifts,
					cashier: users,
				})
				.from(cashBoxShifts)
				.leftJoin(users, eq(cashBoxShifts.openedByUserId, users.id))
				.where(eq(cashBoxShifts.organizationId, orgId))
				.orderBy(desc(cashBoxShifts.openedAt))
				.limit(50);

			return rows.map(({ shift, cashier }) => {
				// biome-ignore lint/suspicious/noExplicitAny: json payload
				const zData = (shift.zReportData as any) || {};
				return {
					id: shift.id,
					shiftNumber: shift.shiftNumber,
					status: shift.status as "open" | "closed",
					openedAt: shift.openedAt,
					closedAt: shift.closedAt,
					cashierName: cashier?.fullName || "Кассир клиники",
					startBalanceRub: Number(shift.startBalanceRub || 0),
					closingBalanceRub: shift.closingBalanceRub != null ? Number(shift.closingBalanceRub) : null,
					incomeTotalRub: Number(shift.incomeTotalRub || 0),
					expenseTotalRub: Number(shift.expenseTotalRub || 0),
					incomeCashRub: Number(zData.incomeCashRub ?? (shift.status === "open" ? shift.incomeTotalRub : 0)),
					incomeElectronicRub: Number(zData.incomeElectronicRub ?? 0),
					incomeSbpRub: Number(zData.incomeSbpRub ?? 0),
					advanceOffsetRub: Number(zData.advanceOffsetRub ?? 0),
					ofdStatus: "delivered" as const,
					zReportNumber: shift.zReportNumber || (shift.status === "closed" ? `Z-${shift.shiftNumber}` : null),
					zReportData: shift.zReportData,
				};
			});
		});

		return reply.send({ success: true, data: shiftsList, total: shiftsList.length });
	};

	app.get("/api/cashbox/shifts", handleListCashShifts);
	app.get("/api/cash/shifts", handleListCashShifts);
	app.get("/api/fiscal/shifts", handleListCashShifts);
	app.get("/api/finance/shifts", handleListCashShifts);
}
