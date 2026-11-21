/**
 * payrollSettlementDbQueries.ts — Персистенция закрытия расчетных периодов врачей в PostgreSQL.
 * Mandate 8b: строго <= 150 строк на файл.
 * Mandate 8wy: 100% реальный PostgreSQL без моков.
 */

import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../db/rls.js";
import { appointments, cashBoxes, cashOperations, doctorPayrollStatements, users } from "../db/schema.js";

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

export async function resolveDoctorUserUuid(orgId: string, doctorIdOrSolo: string, fallbackUserId?: string | null): Promise<string | null> {
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorIdOrSolo);
	if (isUuid && doctorIdOrSolo !== "solo-doctor") {
		return doctorIdOrSolo;
	}
	if (fallbackUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fallbackUserId)) {
		return fallbackUserId;
	}
	try {
		const docUser = await withTenantCtx(orgId, async (tx) => {
			return await tx
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						or(eq(users.role, "doctor"), eq(users.role, "owner")),
					),
				)
				.limit(1);
		});
		return docUser[0]?.id ?? null;
	} catch {
		return null;
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
		logger?.warn(
			{ err, orgId, doctorId, periodKey },
			"[settlementPeriodDb] findPayrollStatement error",
		);
		return null;
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

		// Кассовая дисциплина 54-ФЗ: при markPaid: true создаем проводку в cash_operations (DEF-PAYROLL-RKO-01)
		const effectiveRkoNumber = statementRow.rkoNumber || params.rkoNumber || `РКО-${statementId.slice(0, 8).toUpperCase()}`;
		if (params.markPaid && payoutKop > 0) {
			const existingCashOp = await tx
				.select({ id: cashOperations.id })
				.from(cashOperations)
				.where(
					and(
						eq(cashOperations.organizationId, organizationId),
						sql`${cashOperations.metadata}->>'statementId' = ${statementId}`,
					),
				)
				.limit(1);

			if (existingCashOp.length === 0) {
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
					.limit(1);

				if (box) {
					const curBalanceKop = box.balanceKopecks != null
						? Number(box.balanceKopecks)
						: rublesToKopecks(Number(box.balanceRub || 0));
					const newBalanceKop = curBalanceKop - payoutKop;
					const newBalanceRub = kopecksToRubles(newBalanceKop);

					await tx
						.update(cashBoxes)
						.set({
							balanceKopecks: newBalanceKop,
							balanceRub: newBalanceRub,
							updatedAt: now,
						})
						.where(and(eq(cashBoxes.id, box.id), eq(cashBoxes.organizationId, organizationId)));

					await tx.insert(cashOperations).values({
						organizationId,
						cashBoxId: box.id,
						operationType: "expense",
						amountRub: payoutRub,
						amountKopecks: payoutKop,
						balanceBeforeRub: kopecksToRubles(curBalanceKop),
						balanceAfterRub: newBalanceRub,
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
		const updated = await tx
			.update(doctorPayrollStatements)
			.set({
				isFinalized: false,
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
		return updated[0] ?? null;
	});
}
