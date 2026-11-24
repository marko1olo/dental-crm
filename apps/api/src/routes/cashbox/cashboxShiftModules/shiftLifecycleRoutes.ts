/**
 * shiftLifecycleRoutes.ts — Shift Opening & Shift Journal Endpoints.
 *
 * Implements:
 * - POST /api/cash/cash-box-all-open & POST /api/fiscal/shift/open
 * - POST /api/cash/cash-box-all-closing & POST /api/fiscal/shift/close (delegates to shiftCloseHandler)
 * - GET /api/cashbox/shifts & GET /api/cash/shifts
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rublesToKopecks } from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	idempotencyKeys,
	users,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { LanKktDriverService } from "../../../services/hardware/lanKktDriverService.js";
import { checkAndAutoCloseExpiredShifts } from "../../shifts/shiftAutoCloseService.js";
import { resolveEffectiveCashierUserId } from "../cashboxHelpers.js";
import { openShiftBodySchema } from "../cashboxSchemas.js";
import type { OpenShiftResponseBody, ZReportDataPayload } from "../types.js";
import { handleCloseCashShift } from "./shiftCloseHandler.js";

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

		const parsed = openShiftBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры открытия кассовой смены.",
				details: parsed.error.issues,
			});
		}
		const requestedUserId = parsed.data.openedByUserId;

		const rawOpenKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const openIdempotencyKey = rawOpenKey?.trim();
		const baseOpenKey = openIdempotencyKey?.includes("#")
			? openIdempotencyKey.split("#")[0]
			: openIdempotencyKey;
		if (openIdempotencyKey && !isValidUuid(baseOpenKey || "")) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Для открытия кассовой смены требуется валидный UUID/UUIDv7 в заголовке Idempotency-Key.",
			});
		}

		const effectiveUserId = await withTenantCtx(orgId, async (tx) => {
			if (openIdempotencyKey) {
				const [found] = await tx
					.select()
					.from(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, openIdempotencyKey),
						),
					)
					.limit(1);
				if (found && found.status === "completed" && found.responseBody) {
					return { kind: "replay" as const, record: found };
				}
			}
			const resolved = await resolveEffectiveCashierUserId(tx, orgId, requestedUserId, currentUserId);
			return { kind: "proceed" as const, userId: resolved };
		});

		if (effectiveUserId.kind === "replay") {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply
				.code(effectiveUserId.record.responseCode || 200)
				.send(effectiveUserId.record.responseBody);
		}

		if (!effectiveUserId.userId) {
			return reply.code(400).send({
				error: "UserRequired",
				message:
					"Для открытия кассовой смены требуется идентификатор сотрудника (кассира/администратора/врача).",
			});
		}
		const openedByUserId = effectiveUserId.userId;

		const openTxOutcome = await withTenantCtx(orgId, async (tx) => {
			// Блокируем параллельные гонки открытия смен
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
			);

			if (openIdempotencyKey) {
				const [raceFound] = await tx
					.select()
					.from(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, openIdempotencyKey),
						),
					)
					.limit(1);
				if (raceFound && raceFound.status === "completed" && raceFound.responseBody) {
					return { kind: "replay" as const, record: raceFound };
				}
			}

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
			const openShiftsByBoxId = new Map(existingOpenShifts.map((s) => [s.cashBoxId, s]));

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
					const startBalKop =
						box.balanceKopecks != null && (box.balanceKopecks !== 0 || Number(box.balanceRub || 0) === 0)
							? Number(box.balanceKopecks)
							: rublesToKopecks(Number(box.balanceRub || 0));

					const [newShift] = await tx
						.insert(cashBoxShifts)
						.values({
							organizationId: orgId,
							cashBoxId: box.id,
							shiftNumber: nextShiftNumber,
							status: "open",
							openedAt: now,
							openedByUserId,
							startBalanceRub: box.balanceRub,
							startBalanceKopecks: startBalKop,
							incomeTotalRub: 0,
							incomeTotalKopecks: 0,
							expenseTotalRub: 0,
							expenseTotalKopecks: 0,
						})
						.returning();

					if (newShift) {
						shifts.push(newShift);
					}
				} else {
					shifts.push(existingOpenShift);
				}
			}

			return { kind: "opened" as const, shifts };
		});

		if (openTxOutcome.kind === "replay") {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply
				.code(openTxOutcome.record.responseCode || 200)
				.send(openTxOutcome.record.responseBody);
		}

		const openedShifts = openTxOutcome.shifts;

		// Аппаратное открытие смены на ККТ строго ВНЕ транзакции PostgreSQL
		try {
			await LanKktDriverService.openShift({
				cashierName: identity.fullName || "Кассир клиники",
				shiftNumber: openedShifts[0]?.shiftNumber ?? 1,
			});
		} catch (err: unknown) {
			request.log.warn({ err }, "LanKktDriverService.openShift non-blocking warning");
		}

		const response: OpenShiftResponseBody = {
			success: true,
			message: `Кассовые смены успешно открыты (${openedShifts.length} счетов).`,
			openedShiftsCount: openedShifts.length,
			shifts: openedShifts,
		};

		if (openIdempotencyKey) {
			reply.header("Idempotency-Key", openIdempotencyKey);
			reply.header("X-Idempotency-Key", openIdempotencyKey);
			await withTenantCtx(orgId, async (tx) => {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: openIdempotencyKey,
						status: "completed",
						responseBody: response,
						responseCode: 200,
					})
					.onConflictDoNothing();
			});
		}

		return reply.send(response);
	};

	const shiftMutationRouteOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description:
				"Cashbox shift mutation with mandatory Idempotency-Key header (UUIDv7) and organizationId tenant context",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
				},
			},
		},
	};

	app.post("/api/cash/cash-box-all-open", shiftMutationRouteOptions, async (request, reply) => {
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/cashbox/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/fiscal/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/finance/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/cash/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		return handleOpenCashShift(request, reply);
	});

	app.post("/api/cash/cash-box-all-closing", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cashbox/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/fiscal/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/finance/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cashbox/shifts/close", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/fiscal/z-report", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cash/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		return handleCloseCashShift(request, reply);
	});

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
				const zData: Partial<ZReportDataPayload> =
					shift.zReportData && typeof shift.zReportData === "object"
						? (shift.zReportData as Partial<ZReportDataPayload>)
						: {};
				return {
					id: shift.id,
					shiftNumber: shift.shiftNumber,
					status: shift.status as "open" | "closed",
					openedAt: shift.openedAt,
					closedAt: shift.closedAt,
					cashierName: cashier?.fullName || "Кассир клиники",
					startBalanceRub: Number(shift.startBalanceRub || 0),
					startBalanceKopecks: Number(
						shift.startBalanceKopecks ?? rublesToKopecks(Number(shift.startBalanceRub || 0)),
					),
					closingBalanceRub:
						shift.closingBalanceRub != null ? Number(shift.closingBalanceRub) : null,
					closingBalanceKopecks:
						shift.closingBalanceKopecks != null
							? Number(shift.closingBalanceKopecks)
							: shift.closingBalanceRub != null
								? rublesToKopecks(Number(shift.closingBalanceRub))
								: null,
					incomeTotalRub: Number(shift.incomeTotalRub || 0),
					incomeTotalKopecks: Number(
						shift.incomeTotalKopecks ?? rublesToKopecks(Number(shift.incomeTotalRub || 0)),
					),
					expenseTotalRub: Number(shift.expenseTotalRub || 0),
					expenseTotalKopecks: Number(
						shift.expenseTotalKopecks ?? rublesToKopecks(Number(shift.expenseTotalRub || 0)),
					),
					incomeCashRub: Number(
						zData.incomeCashRub ?? (shift.status === "open" ? shift.incomeTotalRub : 0),
					),
					incomeElectronicRub: Number(zData.incomeElectronicRub ?? 0),
					incomeSbpRub: Number(zData.incomeSbpRub ?? 0),
					advanceOffsetRub: Number(zData.advanceOffsetRub ?? 0),
					ofdStatus: (zData.fiscalDocNumber ? "delivered" : "pending") as "delivered" | "pending",
					zReportNumber:
						shift.zReportNumber ||
						(shift.status === "closed" ? `Z-${shift.shiftNumber}` : null),
					zReportData: shift.zReportData,
				};
			});
		});

		return reply.send({ success: true, data: shiftsList, total: shiftsList.length });
	};

	const listRouteOpts = { config: { tenantTxSelfManaged: true } };
	app.get("/api/cashbox/shifts", listRouteOpts, handleListCashShifts);
	app.get("/api/cash/shifts", listRouteOpts, handleListCashShifts);
	app.get("/api/fiscal/shifts", listRouteOpts, handleListCashShifts);
	app.get("/api/finance/shifts", listRouteOpts, handleListCashShifts);
}
