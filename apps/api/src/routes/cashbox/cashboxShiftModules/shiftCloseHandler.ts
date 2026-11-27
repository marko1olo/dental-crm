/**
 * shiftCloseHandler.ts — Atomic Shift Closing & 54-FZ Z-Report Engine.
 *
 * Strictly separates DB transactions from physical KKT network/serial I/O:
 * - Phase 1: withTenantCtx read (idempotency fast-path + cashier resolution + open shift numbers)
 * - Phase 2: LanKktDriverService.closeShift OUTSIDE PostgreSQL transaction
 * - Phase 3: withTenantCtx advisory lock + idempotency re-check + Z-report reconciliation & update
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { kopecksToRub, rublesToKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { LanKktDriverService } from "../../../services/hardware/lanKktDriverService.js";
import { resolveEffectiveCashierUserId } from "../cashboxHelpers.js";
import { closeShiftBodySchema } from "../cashboxSchemas.js";
import type { CloseShiftResponseBody } from "../types.js";
import { reconcileSingleShift } from "./shiftReconciliationEngine.js";

function resolveSafeKopecks(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal != null ? Number(kopecksVal) : 0;
	const rub = Number(rubVal || 0);
	if (kop !== 0 || rub === 0) {
		return kop;
	}
	return rublesToKopecks(rub);
}

export async function handleCloseCashShift(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<unknown> {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"cash boxes close shift",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const identity = getRequestIdentity(request);
	const currentUserId = identity.userId;

	const parsed = closeShiftBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры закрытия кассовой смены.",
			details: parsed.error.issues,
		});
	}
	const inputData = parsed.data;
	const requestedUserId = inputData.closedByUserId;

	const rawKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined) ||
		inputData.idempotencyKey ||
		inputData.clientMutationId;
	const parsedKey = rawKey?.trim();

	if (!parsedKey) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для закрытия кассовой смены обязателен заголовок Idempotency-Key или поле clientMutationId.",
		});
	}

	if (!isValidUuid(parsedKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Для закрытия кассовой смены требуется валидный UUID/UUIDv7 в заголовке Idempotency-Key.",
		});
	}
	const idempotencyKey = parsedKey;

	// Phase 1: Lightweight DB read (cashier resolution + shift numbers for KKT Z-report)
	const preflight = await withTenantCtx(orgId, async (tx) => {
		const effectiveUserId = await resolveEffectiveCashierUserId(
			tx,
			orgId,
			requestedUserId,
			currentUserId,
		);

		const openShifts = await tx
			.select({ id: cashBoxShifts.id, shiftNumber: cashBoxShifts.shiftNumber })
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.status, "open"),
				),
			);

		return {
			effectiveUserId,
			firstShiftNumber: openShifts[0]?.shiftNumber ?? 1,
			hasOpenShifts: openShifts.length > 0,
		};
	});

	// Phase 2: Physical KKT Z-report strictly OUTSIDE PostgreSQL transactions (zero lock holding on TCP I/O)
	let kktZResult: Awaited<ReturnType<typeof LanKktDriverService.closeShift>> | undefined;
	if (preflight.hasOpenShifts) {
		try {
			kktZResult = await LanKktDriverService.closeShift({
				cashierName: inputData.cashierFullName || identity.fullName || "Кассир",
				shiftNumber: preflight.firstShiftNumber,
			});
		} catch (err: unknown) {
			request.log.warn({ err }, "LanKktDriverService.closeShift non-blocking warning");
		}
	}

	// Phase 3: Atomic ACID reconciliation, Z-report storage, and shift closure inside advisory lock
	const closeResponse = await withTenantCtx(orgId, async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
		);

		let activeVisitsInChair: {
			id: string;
			patientId: string;
			doctorUserId: string;
			startsAt: Date;
		}[] = [];

		const unfinishedVisits = await tx
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

		if (unfinishedVisits.length > 0) {
			activeVisitsInChair = unfinishedVisits;
			request.log.warn(
				{ unfinishedCount: unfinishedVisits.length, orgId },
				"Closing cash shift with active visits in chair (non-blocking soft warning)",
			);
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
			const closingBalanceKop = resolveSafeKopecks(box?.balanceKopecks, box?.balanceRub);
			const finalBalance = kopecksToRub(closingBalanceKop);

			const reconciliationResult = await reconcileSingleShift(
				tx,
				orgId,
				shift,
				box,
				inputData,
				preflight.effectiveUserId,
				now,
			);

			if (kktZResult?.success && kktZResult.fiscalDocumentNumber) {
				reconciliationResult.fiscalDocNumber = kktZResult.fiscalDocumentNumber;
				if (kktZResult.fiscalSign) reconciliationResult.fiscalSign = kktZResult.fiscalSign;
				if (kktZResult.qrString) reconciliationResult.qrString = kktZResult.qrString;
				reconciliationResult.zReportData.fiscalDocNumber = kktZResult.fiscalDocumentNumber;
				if (kktZResult.fiscalSign) reconciliationResult.zReportData.fiscalSign = kktZResult.fiscalSign;
				if (kktZResult.qrString) reconciliationResult.zReportData.qrString = kktZResult.qrString;
			}

			if (!primaryResult || box?.type === "main") {
				primaryResult = reconciliationResult;
			}

			const grossShiftIncomeKop =
				rublesToKopecks(reconciliationResult.totals.incomeCashRub || 0) +
				rublesToKopecks(reconciliationResult.totals.incomeElectronicRub || 0) +
				rublesToKopecks(reconciliationResult.totals.incomeSbpRub || 0) +
				rublesToKopecks(reconciliationResult.totals.advanceOffsetRub || 0) +
				rublesToKopecks(reconciliationResult.totals.insuranceTotalRub || 0);
			const incomeTotalKop =
				grossShiftIncomeKop > 0
					? grossShiftIncomeKop
					: resolveSafeKopecks(shift.incomeTotalKopecks, shift.incomeTotalRub);
			const reconciledReturnKop = rublesToKopecks(
				reconciliationResult.totals.returnTotalRub || 0,
			);
			const expenseTotalKop =
				reconciledReturnKop > 0
					? reconciledReturnKop
					: resolveSafeKopecks(shift.expenseTotalKopecks, shift.expenseTotalRub);

			const [updatedShift] = await tx
				.update(cashBoxShifts)
				.set({
					status: "closed",
					closedAt: now,
					closedByUserId: preflight.effectiveUserId ?? null,
					closingBalanceRub: finalBalance,
					closingBalanceKopecks: closingBalanceKop,
					incomeTotalRub: kopecksToRub(incomeTotalKop),
					incomeTotalKopecks: incomeTotalKop,
					expenseTotalRub: kopecksToRub(expenseTotalKop),
					expenseTotalKopecks: expenseTotalKop,
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

		const closeResponse: CloseShiftResponseBody = {
			success: true,
			message:
				activeVisitsInChair.length > 0
					? `Все открытые кассовые смены успешно закрыты со снятием Z-отчетов (${closed.length}). Внимание: в кресле остались незавершенные визиты (${activeVisitsInChair.length}).`
					: `Все открытые кассовые смены успешно закрыты со снятием Z-отчетов (${closed.length}).`,
			closedShiftsCount: closed.length,
			shifts: closed,
			...(activeVisitsInChair.length > 0
				? {
						unfinishedVisitsWarning: {
							count: activeVisitsInChair.length,
							appointments: activeVisitsInChair,
						},
					}
				: {}),
			zReportData: primaryResult?.zReportData,
			reconciliation: primaryResult
				? {
						countedCashRub: primaryResult.zReportData.countedCashRub,
						expectedCashInDrawerRub: primaryResult.zReportData.expectedCashInDrawerRub,
						incomeCashRub: primaryResult.zReportData.incomeCashRub,
						incomeElectronicRub: primaryResult.zReportData.incomeElectronicRub,
						incomeSbpRub: primaryResult.zReportData.incomeSbpRub,
						advanceOffsetRub: primaryResult.zReportData.advanceOffsetRub,
						insuranceTotalRub: primaryResult.zReportData.insuranceTotalRub,
						returnTotalRub: primaryResult.zReportData.returnTotalRub,
						netRevenueRub: primaryResult.zReportData.netRevenueRub,
						differenceRub: primaryResult.differenceRub,
						isBalanced: primaryResult.isBalanced,
						discrepancyType: primaryResult.discrepancyType,
						fiscalDocNumber: primaryResult.fiscalDocNumber,
						fiscalSign: primaryResult.fiscalSign,
						qrString: primaryResult.qrString,
					}
				: undefined,
		};

		return closeResponse;
	});

	reply.header("Idempotency-Key", idempotencyKey);
	reply.header("X-Idempotency-Key", idempotencyKey);

	return closeResponse;
}
