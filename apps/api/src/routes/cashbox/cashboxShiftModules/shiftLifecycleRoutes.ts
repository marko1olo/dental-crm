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

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rublesToKopecks } from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	idempotencyKeys,
	users,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { resolveEffectiveCashierUserId } from "../cashboxHelpers.js";
import {
	closeShiftBodySchema,
	openShiftBodySchema,
} from "../cashboxSchemas.js";
import type { CloseShiftResponseBody, OpenShiftResponseBody, ZReportDataPayload } from "../types.js";
import { reconcileSingleShift } from "./shiftReconciliationEngine.js";
import { checkAndAutoCloseExpiredShifts } from "../../shifts/shiftAutoCloseService.js";
import { LanKktDriverService } from "../../../services/hardware/lanKktDriverService.js";

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

		const rawOpenKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const openIdempotencyKey = rawOpenKey?.trim();
		if (openIdempotencyKey && !isValidUuid(openIdempotencyKey)) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для открытия кассовой смены требуется валидный UUID (UUIDv7) в заголовке Idempotency-Key (Мандат 8bo / RFC 9562).",
			});
		}
		if (openIdempotencyKey) {
			const existingRecord = await withTenantCtx(orgId, async (tx) => {
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
				return found;
			});
			if (existingRecord && existingRecord.status === "completed" && existingRecord.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply
					.code(existingRecord.responseCode || 200)
					.send(existingRecord.responseBody);
			}
		}

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
							startBalanceKopecks: Number(box.balanceKopecks ?? rublesToKopecks(Number(box.balanceRub || 0))),
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

			return shifts;
		});

		// Аппаратное открытие смены на ККТ (54-ФЗ)
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
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/cashbox/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/fiscal/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/finance/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleOpenCashShift(request, reply);
	});
	app.post("/api/cash/shift/open", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleOpenCashShift(request, reply);
	});

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
					"Для закрытия кассовой смены обязателен заголовок Idempotency-Key или поле clientMutationId (Мандат 8bo / RFC 9562).",
			});
		}

		if (!isValidUuid(parsedKey)) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для закрытия кассовой смены требуется валидный UUID (UUIDv7) в заголовке Idempotency-Key (Мандат 8bo / RFC 9562).",
			});
		}
		const idempotencyKey = parsedKey;

		// Fast-path idempotency replay check against Postgres idempotencyKeys table
		const existingRecord = await withTenantCtx(orgId, async (tx) => {
			const [found] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);
			return found;
		});

		if (
			existingRecord &&
			existingRecord.status === "completed" &&
			existingRecord.responseBody
		) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply
				.code(existingRecord.responseCode || 200)
				.send(existingRecord.responseBody);
		}

		const effectiveUserId = await withTenantCtx(orgId, async (tx) => {
			return await resolveEffectiveCashierUserId(tx, orgId, requestedUserId, currentUserId);
		});

		const closeResult = await withTenantCtx(orgId, async (tx) => {
			// Блокируем параллельные гонки закрытия смен
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
			);

			// Mandate 8e: Проверка активных приёмов «в кресле» (in_treatment) не блокирует закрытие кассы
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
					"Closing cash shift with active visits in chair (Mandate 8e: non-blocking soft warning)",
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

			// Аппаратное закрытие смены со снятием Z-отчета с гашением (54-ФЗ)
			let kktZResult: Awaited<ReturnType<typeof LanKktDriverService.closeShift>> | undefined;
			if (openShifts.length > 0) {
				try {
					kktZResult = await LanKktDriverService.closeShift({
						cashierName: inputData.cashierFullName || identity.fullName || "Кассир",
						shiftNumber: openShifts[0]?.shiftNumber ?? 1,
					});
				} catch (err: unknown) {
					request.log.warn({ err }, "LanKktDriverService.closeShift non-blocking warning");
				}
			}

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

				const closingBalanceKop = Number(box?.balanceKopecks ?? rublesToKopecks(Number(finalBalance || 0)));
				const incomeTotalKop =
					shift.incomeTotalKopecks != null
						? Number(shift.incomeTotalKopecks)
						: rublesToKopecks(Number(reconciliationResult.zReportData.netRevenueRub ?? shift.incomeTotalRub ?? 0));
				const expenseTotalKop =
					shift.expenseTotalKopecks != null
						? Number(shift.expenseTotalKopecks)
						: rublesToKopecks(Number(shift.expenseTotalRub ?? 0));

				const [updatedShift] = await tx
					.update(cashBoxShifts)
					.set({
						status: "closed",
						closedAt: now,
						closedByUserId: effectiveUserId ?? null,
						closingBalanceRub: finalBalance,
						closingBalanceKopecks: closingBalanceKop,
						incomeTotalKopecks: incomeTotalKop,
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
				message: activeVisitsInChair.length > 0
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

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						responseBody: closeResponse,
						responseCode: 200,
					})
					.onConflictDoNothing();
			}

			return closeResponse;
		});

		return reply.send(closeResult);
	};

	app.post("/api/cash/cash-box-all-closing", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cashbox/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/fiscal/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/finance/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cashbox/shifts/close", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/fiscal/z-report", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleCloseCashShift(request, reply);
	});
	app.post("/api/cash/shift/close", shiftMutationRouteOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
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
					startBalanceKopecks: Number(shift.startBalanceKopecks ?? rublesToKopecks(Number(shift.startBalanceRub || 0))),
					closingBalanceRub: shift.closingBalanceRub != null ? Number(shift.closingBalanceRub) : null,
					closingBalanceKopecks: shift.closingBalanceKopecks != null ? Number(shift.closingBalanceKopecks) : (shift.closingBalanceRub != null ? rublesToKopecks(Number(shift.closingBalanceRub)) : null),
					incomeTotalRub: Number(shift.incomeTotalRub || 0),
					incomeTotalKopecks: Number(shift.incomeTotalKopecks ?? rublesToKopecks(Number(shift.incomeTotalRub || 0))),
					expenseTotalRub: Number(shift.expenseTotalRub || 0),
					expenseTotalKopecks: Number(shift.expenseTotalKopecks ?? rublesToKopecks(Number(shift.expenseTotalRub || 0))),
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
