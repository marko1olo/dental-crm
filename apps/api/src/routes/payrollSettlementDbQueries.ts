/**
 * payrollSettlementDbQueries.ts — Персистенция закрытия расчетных периодов врачей в PostgreSQL.
 * Mandate 8wy: 100% реальный PostgreSQL без моков и без raw SQL float.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	doctorPayrollStatements,
	users,
} from "../db/schema.js";
import { createApiLogger } from "../observability/logger.js";

export interface SettlementPeriodCloseParams {
	readonly organizationId: string;
	readonly doctorId: string;
	readonly periodKey: string;
	readonly fromDate: Date;
	readonly toDate: Date;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly grossRevenueKopecks?: number | undefined;
	readonly labCostKopecks?: number | undefined;
	readonly materialsCostKopecks?: number | undefined;
	readonly netBaseRevenueKopecks?: number | undefined;
	readonly categoryPercent: number;
	readonly calculatedPieceworkKopecks?: number | undefined;
	readonly fixedSalaryKopecks?: number | undefined;
	readonly serviceSalaryPriceKopecks?: number | undefined;
	readonly bonusesTotalKopecks?: number | undefined;
	readonly penaltiesTotalKopecks?: number | undefined;
	readonly totalAccruedKopecks?: number | undefined;
	readonly ndfl13Kopecks?: number | undefined;
	readonly netPayoutKopecks?: number | undefined;
	readonly grossRevenueRub?: number | undefined;
	readonly labCostRub?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly netBaseRevenueRub?: number | undefined;
	readonly calculatedPieceworkRub?: number | undefined;
	readonly fixedSalaryRub?: number | undefined;
	readonly bonusesTotalRub?: number | undefined;
	readonly penaltiesTotalRub?: number | undefined;
	readonly totalAccruedRub?: number | undefined;
	readonly ndfl13Rub?: number | undefined;
	readonly netPayoutRub?: number | undefined;
	readonly markPaid?: boolean | undefined;
	readonly rkoNumber?: string | undefined;
}

function resolveBoxBalanceKopecks(box: {
	balanceKopecks: number | bigint | null | undefined;
	balanceRub: number | string | null | undefined;
}): number {
	const kop = box.balanceKopecks != null ? Number(box.balanceKopecks) : 0;
	const rubKop = rublesToKopecks(Number(box.balanceRub || 0));
	if (kop !== 0 || rubKop === 0) {
		return kop;
	}
	return rubKop;
}

function resolveShiftExpenseKopecks(shift: {
	expenseTotalKopecks: number | bigint | null | undefined;
	expenseTotalRub: number | string | null | undefined;
}): number {
	const kop = shift.expenseTotalKopecks != null ? Number(shift.expenseTotalKopecks) : 0;
	const rubKop = rublesToKopecks(Number(shift.expenseTotalRub || 0));
	if (kop !== 0 || rubKop === 0) {
		return kop;
	}
	return rubKop;
}

export async function resolveDoctorUserUuid(
	orgId: string,
	doctorIdOrSolo: string,
	fallbackUserId?: string | null,
	logger?: FastifyBaseLogger | undefined,
): Promise<string | null> {
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorIdOrSolo);
	const targetId = (isUuid && doctorIdOrSolo !== "solo-doctor")
		? doctorIdOrSolo
		: (fallbackUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fallbackUserId) ? fallbackUserId : null);

	if (!targetId) {
		return null;
	}

	try {
		const docUser = await withTenantCtx(orgId, async (tx) => {
			return await tx
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.id, targetId),
						eq(users.organizationId, orgId),
					),
				)
				.limit(1);
		});
		return docUser[0]?.id ?? null;
	} catch (err) {
		const log = logger ?? createApiLogger("payroll");
		log.error({ err, orgId, targetId }, "[resolveDoctorUserUuid] DB query failed");
		throw err;
	}
}

export async function findPayrollStatement(
	orgId: string,
	doctorId: string,
	periodKey: string,
	logger?: FastifyBaseLogger,
) {
	try {
		return await withTenantCtx(orgId, async (tx) => {
			const rows = await tx
				.select()
				.from(doctorPayrollStatements)
				.where(
					and(
						eq(doctorPayrollStatements.organizationId, orgId),
						eq(doctorPayrollStatements.doctorId, doctorId),
						eq(doctorPayrollStatements.period, periodKey),
					),
				)
				.limit(1);
			return rows[0] ?? null;
		});
	} catch (err) {
		logger?.error(
			{ err, orgId, doctorId, periodKey },
			"[settlementPeriodDb] findPayrollStatement error",
		);
		throw err;
	}
}

export async function closeSettlementPeriodInDb(
	params: SettlementPeriodCloseParams,
	externalTx?: TenantDb,
) {
	const { organizationId, doctorId, periodKey, fromDate, toDate } = params;

	const executeWithTx = async (tx: TenantDb) => {
		const existingRows = await tx
			.select()
			.from(doctorPayrollStatements)
			.where(
				and(
					eq(doctorPayrollStatements.organizationId, organizationId),
					eq(doctorPayrollStatements.doctorId, doctorId),
					eq(doctorPayrollStatements.period, periodKey),
				),
			)
			.for("update")
			.limit(1);

		const now = new Date();
		let statementId: string;
		let statementRow: typeof doctorPayrollStatements.$inferSelect | undefined;

		const grossKop = params.grossRevenueKopecks ?? rublesToKopecks(params.grossRevenueRub ?? 0);
		const labKop = params.labCostKopecks ?? rublesToKopecks(params.labCostRub ?? 0);
		const matKop = params.materialsCostKopecks ?? rublesToKopecks(params.materialsCostRub ?? 0);
		const netBaseKop = params.netBaseRevenueKopecks ?? Math.max(0, grossKop - labKop - matKop);
		const pieceworkKop = params.calculatedPieceworkKopecks ?? rublesToKopecks(params.calculatedPieceworkRub ?? 0);
		const fixedSalaryKop = params.fixedSalaryKopecks ?? rublesToKopecks(params.fixedSalaryRub ?? 0);
		const serviceSalaryKop = params.serviceSalaryPriceKopecks ?? 0;
		const bonusesKop = params.bonusesTotalKopecks ?? rublesToKopecks(params.bonusesTotalRub ?? 0);
		const penaltiesKop = params.penaltiesTotalKopecks ?? rublesToKopecks(params.penaltiesTotalRub ?? 0);
		const totalAccruedKop = params.totalAccruedKopecks ?? (pieceworkKop + fixedSalaryKop + serviceSalaryKop + bonusesKop - penaltiesKop);
		const ndflKop = params.ndfl13Kopecks ?? rublesToKopecks(params.ndfl13Rub ?? 0);
		const payoutKop = params.netPayoutKopecks ?? Math.max(0, totalAccruedKop - ndflKop);

		const grossRub = params.grossRevenueRub ?? kopecksToRubles(grossKop);
		const labRub = params.labCostRub ?? kopecksToRubles(labKop);
		const matRub = params.materialsCostRub ?? kopecksToRubles(matKop);
		const netBaseRub = params.netBaseRevenueRub ?? kopecksToRubles(netBaseKop);
		const pieceworkRub = params.calculatedPieceworkRub ?? kopecksToRubles(pieceworkKop);
		const fixedSalaryRub = params.fixedSalaryRub ?? kopecksToRubles(fixedSalaryKop);
		const bonusesRub = params.bonusesTotalRub ?? kopecksToRubles(bonusesKop);
		const penaltiesRub = params.penaltiesTotalRub ?? kopecksToRubles(penaltiesKop);
		const totalAccruedRub = params.totalAccruedRub ?? kopecksToRubles(totalAccruedKop);
		const ndflRub = params.ndfl13Rub ?? kopecksToRubles(ndflKop);
		const payoutRub = params.netPayoutRub ?? kopecksToRubles(payoutKop);

		if (existingRows.length > 0 && existingRows[0]) {
			statementId = existingRows[0].id;
			const rkoNumber = params.rkoNumber || existingRows[0].rkoNumber || `РКО-${statementId.slice(0, 8).toUpperCase()}`;
			const updated = await tx
				.update(doctorPayrollStatements)
				.set({
					grossRevenueRub: grossRub,
					grossRevenueKopecks: grossKop,
					labCostRub: labRub,
					labCostKopecks: labKop,
					materialsCostRub: matRub,
					materialsCostKopecks: matKop,
					netBaseRevenueRub: netBaseRub,
					netBaseRevenueKopecks: netBaseKop,
					categoryPercent: params.categoryPercent,
					calculatedPieceworkRub: pieceworkRub,
					calculatedPieceworkKopecks: pieceworkKop,
					fixedSalaryRub: fixedSalaryRub,
					fixedSalaryKopecks: fixedSalaryKop,
					serviceSalaryPriceRub: kopecksToRubles(serviceSalaryKop),
					serviceSalaryPriceKopecks: serviceSalaryKop,
					bonusesTotalRub: bonusesRub,
					bonusesTotalKopecks: bonusesKop,
					penaltiesTotalRub: penaltiesRub,
					penaltiesTotalKopecks: penaltiesKop,
					totalAccruedRub: totalAccruedRub,
					totalAccruedKopecks: totalAccruedKop,
					ndfl13Rub: ndflRub,
					ndfl13Kopecks: ndflKop,
					netPayoutRub: payoutRub,
					netPayoutKopecks: payoutKop,
					isFinalized: true,
					rkoNumber: rkoNumber,
					paidAt: params.markPaid ? now : existingRows[0].paidAt,
					updatedAt: now,
				})
				.where(
					and(
						eq(doctorPayrollStatements.id, statementId),
						eq(doctorPayrollStatements.organizationId, organizationId),
					),
				)
				.returning();
			statementRow = updated[0];
			if (!statementRow) {
				throw new Error("Не удалось обновить ведомость начисления");
			}
		} else {
			const tempId = crypto.randomUUID();
			const rkoNumber = params.rkoNumber || `РКО-${tempId.slice(0, 8).toUpperCase()}`;
			const inserted = await tx
				.insert(doctorPayrollStatements)
				.values({
					id: tempId,
					organizationId,
					doctorId,
					period: periodKey,
					grossRevenueRub: grossRub,
					grossRevenueKopecks: grossKop,
					labCostRub: labRub,
					labCostKopecks: labKop,
					materialsCostRub: matRub,
					materialsCostKopecks: matKop,
					netBaseRevenueRub: netBaseRub,
					netBaseRevenueKopecks: netBaseKop,
					categoryPercent: params.categoryPercent,
					calculatedPieceworkRub: pieceworkRub,
					calculatedPieceworkKopecks: pieceworkKop,
					fixedSalaryRub: fixedSalaryRub,
					fixedSalaryKopecks: fixedSalaryKop,
					serviceSalaryPriceRub: kopecksToRubles(serviceSalaryKop),
					serviceSalaryPriceKopecks: serviceSalaryKop,
					bonusesTotalRub: bonusesRub,
					bonusesTotalKopecks: bonusesKop,
					penaltiesTotalRub: penaltiesRub,
					penaltiesTotalKopecks: penaltiesKop,
					totalAccruedRub: totalAccruedRub,
					totalAccruedKopecks: totalAccruedKop,
					ndfl13Rub: ndflRub,
					ndfl13Kopecks: ndflKop,
					netPayoutRub: payoutRub,
					netPayoutKopecks: payoutKop,
					isFinalized: true,
					rkoNumber: rkoNumber,
					paidAt: params.markPaid ? now : null,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			statementRow = inserted[0];
			if (!statementRow) {
				throw new Error("Не удалось создать ведомость начисления");
			}
			statementId = statementRow.id;
		}

		// Кассовая дисциплина 54-ФЗ: при markPaid: true создаем проводку в cash_operations и синхронизируем смену
		const effectiveRkoNumber = statementRow.rkoNumber || params.rkoNumber || `РКО-${statementId.slice(0, 8).toUpperCase()}`;
		if (params.markPaid && payoutKop > 0) {
			const existingCashOps = await tx
				.select()
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, organizationId),
						sql`${cashOperations.metadata}->>'statementId' = ${statementId}`,
						sql`coalesce(${cashOperations.metadata}->>'isAnnulled', 'false') != 'true'`,
						sql`coalesce(${cashOperations.metadata}->>'isStorno', 'false') != 'true'`,
					),
				)
				.for("update")
				.limit(1);

			if (existingCashOps.length === 0) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(
						and(
							eq(cashBoxes.organizationId, organizationId),
							eq(cashBoxes.isLocked, false),
						),
					)
					.orderBy(sql`${cashBoxes.isMain} desc, ${cashBoxes.displayOrder} asc`)
					.limit(1)
					.for("update");

				if (box) {
					const curBalanceKop = resolveBoxBalanceKopecks(box);
					const newBalanceKop = curBalanceKop - payoutKop;
					const newBalanceRub = kopecksToRubles(newBalanceKop);

					const [activeShift] = await tx
						.select()
						.from(cashBoxShifts)
						.where(
							and(
								eq(cashBoxShifts.organizationId, organizationId),
								eq(cashBoxShifts.cashBoxId, box.id),
								eq(cashBoxShifts.status, "open"),
							),
						)
						.for("update")
						.limit(1);

					await tx
						.update(cashBoxes)
						.set({
							balanceKopecks: newBalanceKop,
							balanceRub: newBalanceRub,
							updatedAt: now,
						})
						.where(and(eq(cashBoxes.id, box.id), eq(cashBoxes.organizationId, organizationId)));

					if (activeShift) {
						const prevExpenseKop = resolveShiftExpenseKopecks(activeShift);
						const nextExpenseKop = prevExpenseKop + payoutKop;
						await tx
							.update(cashBoxShifts)
							.set({
								expenseTotalKopecks: nextExpenseKop,
								expenseTotalRub: kopecksToRubles(nextExpenseKop),
								updatedAt: now,
							})
							.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, organizationId)));
					}

					await tx.insert(cashOperations).values({
						organizationId,
						cashBoxId: box.id,
						shiftId: activeShift?.id ?? null,
						operationType: "expense",
						amountRub: payoutRub,
						amountKopecks: payoutKop,
						balanceBeforeRub: kopecksToRubles(curBalanceKop),
						balanceBeforeKopecks: BigInt(curBalanceKop),
						balanceAfterRub: newBalanceRub,
						balanceAfterKopecks: BigInt(newBalanceKop),
						reasonCode: 1, // Зарплата персонала
						reasonText: `Выплата заработной платы по ведомости ${statementRow.period || periodKey} (${effectiveRkoNumber})`,
						operatorId: null,
						operatorName: "Система начисления заработной платы",
						metadata: {
							category: "payroll",
							statementId: statementId,
							rkoNumber: effectiveRkoNumber,
							doctorId: doctorId,
							period: periodKey,
						},
					});
				}
			} else {
				// Актуализировать сумму РКО при повторном закрытии ведомости с блокировкой кассы и смены
				const existingOp = existingCashOps[0];
				if (existingOp) {
					const prevKop = existingOp.amountKopecks != null && existingOp.amountKopecks !== 0
						? Number(existingOp.amountKopecks)
						: rublesToKopecks(Number(existingOp.amountRub || 0));
					const deltaKop = payoutKop - prevKop;
					if (deltaKop !== 0) {
						const [lockedBox] = await tx
							.select()
							.from(cashBoxes)
							.where(and(eq(cashBoxes.id, existingOp.cashBoxId), eq(cashBoxes.organizationId, organizationId)))
							.for("update")
							.limit(1);

						let nextBoxBalKop = 0;
						if (lockedBox) {
							const curBoxKop = resolveBoxBalanceKopecks(lockedBox);
							nextBoxBalKop = curBoxKop - deltaKop;
							await tx
								.update(cashBoxes)
								.set({
									balanceKopecks: nextBoxBalKop,
									balanceRub: kopecksToRubles(nextBoxBalKop),
									updatedAt: now,
								})
								.where(and(eq(cashBoxes.id, lockedBox.id), eq(cashBoxes.organizationId, organizationId)));
						}

						if (existingOp.shiftId) {
							const [openShift] = await tx
								.select()
								.from(cashBoxShifts)
								.where(
									and(
										eq(cashBoxShifts.id, existingOp.shiftId),
										eq(cashBoxShifts.organizationId, organizationId),
										eq(cashBoxShifts.status, "open"),
									),
								)
								.for("update")
								.limit(1);
							if (openShift) {
								const prevExpKop = resolveShiftExpenseKopecks(openShift);
								const nextExpKop = Math.max(0, prevExpKop + deltaKop);
								await tx
									.update(cashBoxShifts)
									.set({
										expenseTotalKopecks: nextExpKop,
										expenseTotalRub: kopecksToRubles(nextExpKop),
										updatedAt: now,
									})
									.where(and(eq(cashBoxShifts.id, openShift.id), eq(cashBoxShifts.organizationId, organizationId)));
							}
						}

						const prevBeforeKop = existingOp.balanceBeforeKopecks != null
							? Number(existingOp.balanceBeforeKopecks)
							: rublesToKopecks(Number(existingOp.balanceBeforeRub || 0));
						const updatedAfterKop = lockedBox ? nextBoxBalKop : prevBeforeKop - payoutKop;

						const metaObj = (existingOp.metadata && typeof existingOp.metadata === "object") ? existingOp.metadata : {};
						await tx
							.update(cashOperations)
							.set({
								amountRub: payoutRub,
								amountKopecks: payoutKop,
								balanceAfterRub: kopecksToRubles(updatedAfterKop),
								balanceAfterKopecks: BigInt(updatedAfterKop),
								reasonText: `Выплата заработной платы по ведомости ${statementRow.period || periodKey} (${effectiveRkoNumber})`,
								metadata: {
									...metaObj,
									rkoNumber: effectiveRkoNumber,
									updatedAt: now.toISOString(),
								},
							})
							.where(
								and(
									eq(cashOperations.id, existingOp.id),
									eq(cashOperations.organizationId, organizationId),
								),
							);
					}
				}
			}
		}

		// Подсчет завершенных приемов врача за период
		const closedAppts = await tx
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.doctorUserId, doctorId),
					gte(appointments.startsAt, fromDate),
					lte(appointments.startsAt, toDate),
				),
			);

		return {
			statement: statementRow,
			statementId,
			closedAppointmentsCount: closedAppts.length,
		};
	};

	if (externalTx) {
		return await executeWithTx(externalTx);
	}
	return await withTenantCtx(organizationId, executeWithTx);
}

export async function reopenSettlementPeriodInDb(orgId: string, doctorId: string, periodKey: string) {
	return await withTenantCtx(orgId, async (tx) => {
		// Защита от гонок и параллельного переоткрытия: атомарная блокировка FOR UPDATE (Мандат 8bo)
		const existingStatements = await tx
			.select()
			.from(doctorPayrollStatements)
			.where(
				and(
					eq(doctorPayrollStatements.organizationId, orgId),
					eq(doctorPayrollStatements.doctorId, doctorId),
					eq(doctorPayrollStatements.period, periodKey),
				),
			)
			.for("update");

		if (existingStatements.length === 0) {
			return null;
		}

		const updated = await tx
			.update(doctorPayrollStatements)
			.set({
				isFinalized: false,
				paidAt: null,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(doctorPayrollStatements.organizationId, orgId),
					eq(doctorPayrollStatements.doctorId, doctorId),
					eq(doctorPayrollStatements.period, periodKey),
				),
			)
			.returning();

		const statement = updated[0];
		if (!statement) {
			return null;
		}

		// Сторнирование связанных кассовых расходных операций с созданием новой компенсирующей записи (без затирания истории)
		const linkedCashOps = await tx
			.select()
			.from(cashOperations)
			.where(
				and(
					eq(cashOperations.organizationId, orgId),
					sql`${cashOperations.metadata}->>'statementId' = ${statement.id}`,
					sql`coalesce(${cashOperations.metadata}->>'isAnnulled', 'false') != 'true'`,
					sql`coalesce(${cashOperations.metadata}->>'isStorno', 'false') != 'true'`,
				),
			)
			.for("update");

		const now = new Date();
		for (const op of linkedCashOps) {
			const opKop = op.amountKopecks != null && op.amountKopecks !== 0
				? Number(op.amountKopecks)
				: rublesToKopecks(Number(op.amountRub || 0));

			if (opKop > 0) {
				const [box] = await tx
					.select()
					.from(cashBoxes)
					.where(and(eq(cashBoxes.id, op.cashBoxId), eq(cashBoxes.organizationId, orgId)))
					.for("update")
					.limit(1);

				if (box) {
					const curBalanceKop = resolveBoxBalanceKopecks(box);
					const newBalanceKop = curBalanceKop + opKop;
					const curBalanceRub = kopecksToRubles(curBalanceKop);
					const newBalanceRub = kopecksToRubles(newBalanceKop);

					await tx
						.update(cashBoxes)
						.set({
							balanceKopecks: newBalanceKop,
							balanceRub: newBalanceRub,
							updatedAt: now,
						})
						.where(and(eq(cashBoxes.id, box.id), eq(cashBoxes.organizationId, orgId)));

					let activeShiftId: string | null = null;
					if (op.shiftId) {
						const [openShift] = await tx
							.select()
							.from(cashBoxShifts)
							.where(
								and(
									eq(cashBoxShifts.id, op.shiftId),
									eq(cashBoxShifts.organizationId, orgId),
									eq(cashBoxShifts.status, "open"),
								),
							)
							.for("update")
							.limit(1);
						if (openShift) {
							activeShiftId = openShift.id;
							const prevExpKop = resolveShiftExpenseKopecks(openShift);
							const nextExpKop = Math.max(0, prevExpKop - opKop);
							await tx
								.update(cashBoxShifts)
								.set({
									expenseTotalKopecks: nextExpKop,
									expenseTotalRub: kopecksToRubles(nextExpKop),
									updatedAt: now,
								})
								.where(and(eq(cashBoxShifts.id, openShift.id), eq(cashBoxShifts.organizationId, orgId)));
						}
					}

					await tx.insert(cashOperations).values({
						organizationId: orgId,
						cashBoxId: box.id,
						shiftId: activeShiftId,
						operationType: "introduction",
						amountRub: kopecksToRubles(opKop),
						amountKopecks: opKop,
						balanceBeforeRub: curBalanceRub,
						balanceBeforeKopecks: BigInt(curBalanceKop),
						balanceAfterRub: newBalanceRub,
						balanceAfterKopecks: BigInt(newBalanceKop),
						reasonCode: 1,
						reasonText: `Сторно выплаты по ведомости ${statement.period || periodKey} (${statement.rkoNumber || op.id.slice(0, 8)})`,
						operatorId: null,
						operatorName: "Система начисления заработной платы",
						metadata: {
							category: "payroll_storno",
							isStorno: true,
							originalCashOperationId: op.id,
							statementId: statement.id,
							doctorId,
							period: periodKey,
						},
					});
				}
			}

			// Отмечаем исходную проводку как сторнированную в metadata без искажения её исторических сумм
			const prevMeta = (op.metadata && typeof op.metadata === "object") ? op.metadata : {};
			await tx
				.update(cashOperations)
				.set({
					metadata: {
						...prevMeta,
						isAnnulled: true,
						isStorno: true,
						annulledAt: now.toISOString(),
						annulledReason: "reopen_settlement_period",
					},
				})
				.where(
					and(
						eq(cashOperations.id, op.id),
						eq(cashOperations.organizationId, orgId),
					),
				);
		}

		return statement;
	});
}
