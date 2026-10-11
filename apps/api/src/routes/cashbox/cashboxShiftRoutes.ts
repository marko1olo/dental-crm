/**
 * cashboxShiftRoutes.ts — Layer 2: Shift Lifecycle, X/Z-Reports, Cash Introduction & Withdrawal Routes.
 * 
 * Compliant with 54-FZ, StomX Reverse Engineering Bible (Section 6, 8), and Mandates 8e/8n.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	buildZReportDataPayload,
	calculateBalanceAdd,
	calculateBalanceSubtract,
	formatZReportNumber,
	resolveEffectiveCashierUserId,
} from "./cashboxHelpers.js";
import {
	cashIntroductionBodySchema,
	cashWithdrawalBodySchema,
	closeShiftBodySchema,
	openShiftBodySchema,
	xReportQueryOrBodySchema,
} from "./cashboxSchemas.js";

export async function registerCashboxShiftRoutes(app: FastifyInstance): Promise<void> {
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

		let effectiveUserId = await withTenantCtx(orgId, async (tx) => {
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
				// Проверяем, нет ли уже открытой смены
				const existingOpenShift = openShiftsByBoxId.get(box.id);

				if (!existingOpenShift) {
					// Вычисляем следующий номер смены
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

		return reply.send({
			success: true,
			message: `Кассовые смены успешно открыты (${openedShifts.length} счетов).`,
			openedShiftsCount: openedShifts.length,
			shifts: openedShifts,
		});
	};

	app.post("/api/cash/cash-box-all-open", handleOpenCashShift);
	app.post("/api/fiscal/shift/open", handleOpenCashShift);

	/**
	 * 2. POST /api/cash/cash-box-all-closing & POST /api/fiscal/shift/close
	 * Закрытие всех смен со снятием Z-отчета (54-ФЗ).
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
		const requestedUserId = parsed.success ? parsed.data.closedByUserId : undefined;

		const effectiveUserId = await withTenantCtx(orgId, async (tx) => {
			return await resolveEffectiveCashierUserId(tx, orgId, requestedUserId, currentUserId);
		});

		const closedShifts = await withTenantCtx(orgId, async (tx) => {
			// Блокируем параллельные гонки закрытия смен (защита от манки-кликинга)
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cash_box_shifts_lock'))`,
			);

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

			for (const shift of openShifts) {
				const box = boxMap.get(shift.cashBoxId);
				const finalBalance = box?.balanceRub ?? 0;
				const zNumber = formatZReportNumber(
					parsed.success ? parsed.data.zReportNumber : undefined,
					shift.shiftNumber,
					now,
				);

				const zReportData = buildZReportDataPayload({
					now,
					cashierFullName: parsed.success ? parsed.data.cashierFullName ?? null : null,
					startingBalanceRub: shift.startBalanceRub,
					finalBalanceRub: finalBalance,
					incomeTotalRub: shift.incomeTotalRub,
					expenseTotalRub: shift.expenseTotalRub,
					countedCashRub: parsed.success ? parsed.data.countedCashRub : undefined,
					incomeCashRub: parsed.success ? parsed.data.incomeCashRub : null,
					incomeElectronicRub: parsed.success ? parsed.data.incomeElectronicRub : null,
					incomeSbpRub: parsed.success ? parsed.data.incomeSbpRub : null,
					advanceOffsetRub: parsed.success ? parsed.data.advanceOffsetRub : null,
					netRevenueRub: parsed.success ? parsed.data.netRevenueRub : null,
					differenceRub: parsed.success ? parsed.data.differenceRub : undefined,
					isBalanced: parsed.success ? parsed.data.isBalanced : undefined,
					reconciliation: parsed.success ? parsed.data.reconciliation : null,
				});

				const [updatedShift] = await tx
					.update(cashBoxShifts)
					.set({
						status: "closed",
						closedAt: now,
						closedByUserId: effectiveUserId ?? null,
						closingBalanceRub: finalBalance,
						zReportNumber: zNumber,
						zReportData,
						updatedAt: now,
					})
					.where(and(eq(cashBoxShifts.id, shift.id), eq(cashBoxShifts.organizationId, orgId)))
					.returning();

				if (updatedShift) {
					closed.push(updatedShift);
				}
			}

			return closed;
		});

		return reply.send({
			success: true,
			message: `Все открытые кассовые смены успешно закрыты со снятием Z-отчетов (${closedShifts.length}).`,
			closedShiftsCount: closedShifts.length,
			shifts: closedShifts,
			reconciliation: parsed.success
				? {
						countedCashRub: parsed.data.countedCashRub ?? null,
						incomeCashRub: parsed.data.incomeCashRub ?? null,
						incomeElectronicRub: parsed.data.incomeElectronicRub ?? null,
						incomeSbpRub: parsed.data.incomeSbpRub ?? null,
						differenceRub: parsed.data.differenceRub ?? 0,
						isBalanced: parsed.data.isBalanced ?? true,
					}
				: undefined,
		});
	};

	app.post("/api/cash/cash-box-all-closing", handleCloseCashShift);
	app.post("/api/fiscal/shift/close", handleCloseCashShift);

	/**
	 * 3. POST /api/cash/cash-introduction & POST /api/fiscal/cash-in
	 * Служебное внесение наличных/разменной монеты в кассу.
	 */
	const handleCashIntroduction = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash introduction",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashIntroductionBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная сумма внесения (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId } = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (cashBoxId) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.for("update")
					.limit(1);
				targetBox = box;
			} else {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
					.for("update")
					.limit(1);
				targetBox = box;
			}

			if (!targetBox) {
				return { kind: "box_not_found" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			const balanceAfter = calculateBalanceAdd(balanceBefore, amountRub);

			// Находим активную смену
			const [activeShift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, targetBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.for("update")
				.limit(1);

			// Обновляем баланс кассы
			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

			// Обновляем статистику смены
			if (activeShift) {
				const updatedIncome = calculateBalanceAdd(activeShift.incomeTotalRub, amountRub);
				await tx
					.update(cashBoxShifts)
					.set({
						incomeTotalRub: updatedIncome,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			// Регистрируем кассовую проводку
			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "introduction",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText,
					operatorId: operatorId ?? null,
				})
				.returning();

			return { kind: "ok" as const, operation: operation!, cashBox: updatedBox! };
		});

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет для внесения не найден.",
			});
		}

		return reply.send({
			success: true,
			message: `Служебное внесение ${amountRub.toFixed(2)} ₽ успешно проведено.`,
			operation: result.operation,
			cashBox: result.cashBox,
		});
	};

	app.post("/api/cash/cash-introduction", handleCashIntroduction);
	app.post("/api/fiscal/cash-in", handleCashIntroduction);

	/**
	 * 4. POST /api/cash/cash-withdrawal & POST /api/fiscal/cash-out
	 * Служебное изъятие / инкассация наличных из кассы.
	 */
	const handleCashWithdrawal = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"cash withdrawal",
		);
		if (reply.sent) return reply;
		if (!orgId) return reply;

		const parsed = cashWithdrawalBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная сумма изъятия (должна быть больше нуля с точностью до копейки).",
				details: parsed.error.issues,
			});
		}

		const { cashBoxId, amountRub, reasonText, operatorId } = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			await ensureOrganizationCashBoxes(tx, orgId);

			let targetBox: typeof cashBoxes.$inferSelect | undefined;
			if (cashBoxId) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.for("update")
					.limit(1);
				targetBox = box;
			} else {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, "main")))
					.for("update")
					.limit(1);
				targetBox = box;
			}

			if (!targetBox) {
				return { kind: "box_not_found" as const };
			}

			const balanceBefore = targetBox.balanceRub;
			if (balanceBefore < amountRub) {
				return {
					kind: "insufficient_funds" as const,
					balanceBefore,
					requestedAmount: amountRub,
				};
			}

			const balanceAfter = calculateBalanceSubtract(balanceBefore, amountRub);

			const [activeShift] = await tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, targetBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.for("update")
				.limit(1);

			const [updatedBox] = await tx
				.update(cashBoxes)
				.set({
					balanceRub: balanceAfter,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, targetBox.id), eq(cashBoxes.organizationId, orgId)))
				.returning();

			if (activeShift) {
				const updatedExpense = calculateBalanceAdd(activeShift.expenseTotalRub, amountRub);
				await tx
					.update(cashBoxShifts)
					.set({
						expenseTotalRub: updatedExpense,
						updatedAt: new Date(),
					})
					.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
			}

			const [operation] = await tx
				.insert(cashOperations)
				.values({
					organizationId: orgId,
					cashBoxId: targetBox.id,
					shiftId: activeShift?.id ?? null,
					operationType: "withdrawal",
					amountRub,
					balanceBeforeRub: balanceBefore,
					balanceAfterRub: balanceAfter,
					reasonText,
					operatorId: operatorId ?? null,
				})
				.returning();

			return { kind: "ok" as const, operation: operation!, cashBox: updatedBox! };
		});

		if (result.kind === "box_not_found") {
			return reply.code(404).send({
				error: "CashBoxNotFound",
				message: "Кассовый счет не найден.",
			});
		}

		if (result.kind === "insufficient_funds") {
			return reply.code(400).send({
				error: "InsufficientFunds",
				message: `Недостаточно средств в кассе для изъятия. Доступно: ${result.balanceBefore.toFixed(2)} ₽, запрошено: ${result.requestedAmount.toFixed(2)} ₽.`,
			});
		}

		return reply.send({
			success: true,
			message: `Инкассация ${amountRub.toFixed(2)} ₽ успешно завершена.`,
			operation: result.operation,
			cashBox: result.cashBox,
		});
	};

	app.post("/api/cash/cash-withdrawal", handleCashWithdrawal);
	app.post("/api/fiscal/cash-out", handleCashWithdrawal);

	/**
	 * 5. POST & GET /api/fiscal/x-report & /api/cash/x-report
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
}
