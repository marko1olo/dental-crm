/**
 * settlementPeriodDbQueries.ts — Персистенция закрытия расчетных периодов врачей в PostgreSQL.
 * Mandate 8b: строго <= 150 строк на файл.
 * Mandate 8wy: 100% реальный PostgreSQL без моков.
 */

import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { appointments, doctorPayrollStatements, users } from "../../db/schema.js";

export interface SettlementPeriodCloseParams {
	readonly organizationId: string;
	readonly doctorId: string;
	readonly periodKey: string;
	readonly fromDate: Date;
	readonly toDate: Date;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly grossRevenueRub: number;
	readonly labCostRub: number;
	readonly materialsCostRub: number;
	readonly netBaseRevenueRub: number;
	readonly categoryPercent: number;
	readonly calculatedPieceworkRub: number;
	readonly fixedSalaryRub: number;
	readonly bonusesTotalRub: number;
	readonly penaltiesTotalRub: number;
	readonly totalAccruedRub: number;
	readonly ndfl13Rub: number;
	readonly netPayoutRub: number;
	readonly markPaid?: boolean;
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

export async function findPayrollStatement(orgId: string, doctorId: string, periodKey: string) {
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
		console.warn("[settlementPeriodDb] findPayrollStatement error:", err);
		return null;
	}
}

export async function closeSettlementPeriodInDb(params: SettlementPeriodCloseParams) {
	const { organizationId, doctorId, periodKey, fromDate, toDate } = params;

	return await withTenantCtx(organizationId, async (tx) => {
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
		let statementRow: any;

		if (existingRows.length > 0 && existingRows[0]) {
			statementId = existingRows[0].id;
			const updated = await tx
				.update(doctorPayrollStatements)
				.set({
					grossRevenueRub: params.grossRevenueRub,
					labCostRub: params.labCostRub,
					materialsCostRub: params.materialsCostRub,
					netBaseRevenueRub: params.netBaseRevenueRub,
					categoryPercent: params.categoryPercent,
					calculatedPieceworkRub: params.calculatedPieceworkRub,
					fixedSalaryRub: params.fixedSalaryRub,
					serviceSalaryPriceRub: 0,
					bonusesTotalRub: params.bonusesTotalRub,
					penaltiesTotalRub: params.penaltiesTotalRub,
					totalAccruedRub: params.totalAccruedRub,
					ndfl13Rub: params.ndfl13Rub,
					netPayoutRub: params.netPayoutRub,
					isFinalized: true,
					paidAt: params.markPaid ? now : existingRows[0].paidAt,
					updatedAt: now,
				})
				.where(eq(doctorPayrollStatements.id, statementId))
				.returning();
			statementRow = updated[0];
		} else {
			const inserted = await tx
				.insert(doctorPayrollStatements)
				.values({
					organizationId,
					doctorId,
					period: periodKey,
					grossRevenueRub: params.grossRevenueRub,
					labCostRub: params.labCostRub,
					materialsCostRub: params.materialsCostRub,
					netBaseRevenueRub: params.netBaseRevenueRub,
					categoryPercent: params.categoryPercent,
					calculatedPieceworkRub: params.calculatedPieceworkRub,
					fixedSalaryRub: params.fixedSalaryRub,
					serviceSalaryPriceRub: 0,
					bonusesTotalRub: params.bonusesTotalRub,
					penaltiesTotalRub: params.penaltiesTotalRub,
					totalAccruedRub: params.totalAccruedRub,
					ndfl13Rub: params.ndfl13Rub,
					netPayoutRub: params.netPayoutRub,
					isFinalized: true,
					paidAt: params.markPaid ? now : null,
					createdAt: now,
					updatedAt: now,
				})
				.returning();
			statementRow = inserted[0];
			statementId = statementRow.id;
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
	});
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
