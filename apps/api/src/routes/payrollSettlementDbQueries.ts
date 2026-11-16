/**
 * payrollSettlementDbQueries.ts — Персистенция закрытия расчетных периодов врачей в PostgreSQL.
 * Mandate 8b: строго <= 150 строк на файл.
 * Mandate 8wy: 100% реальный PostgreSQL без моков.
 */

import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import { appointments, doctorPayrollStatements, users } from "../db/schema.js";

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
		let statementRow: typeof doctorPayrollStatements.$inferSelect | undefined;

		const grossKop = params.grossRevenueKopecks ?? Math.round((params.grossRevenueRub ?? 0) * 100);
		const labKop = params.labCostKopecks ?? Math.round((params.labCostRub ?? 0) * 100);
		const matKop = params.materialsCostKopecks ?? Math.round((params.materialsCostRub ?? 0) * 100);
		const netBaseKop = params.netBaseRevenueKopecks ?? Math.max(0, grossKop - labKop - matKop);
		const pieceworkKop = params.calculatedPieceworkKopecks ?? Math.round((params.calculatedPieceworkRub ?? 0) * 100);
		const fixedSalaryKop = params.fixedSalaryKopecks ?? Math.round((params.fixedSalaryRub ?? 0) * 100);
		const serviceSalaryKop = params.serviceSalaryPriceKopecks ?? 0;
		const bonusesKop = params.bonusesTotalKopecks ?? Math.round((params.bonusesTotalRub ?? 0) * 100);
		const penaltiesKop = params.penaltiesTotalKopecks ?? Math.round((params.penaltiesTotalRub ?? 0) * 100);
		const totalAccruedKop = params.totalAccruedKopecks ?? (pieceworkKop + fixedSalaryKop + serviceSalaryKop + bonusesKop - penaltiesKop);
		const ndflKop = params.ndfl13Kopecks ?? Math.round((params.ndfl13Rub ?? 0) * 100);
		const payoutKop = params.netPayoutKopecks ?? Math.max(0, totalAccruedKop - ndflKop);

		const grossRub = params.grossRevenueRub ?? grossKop / 100;
		const labRub = params.labCostRub ?? labKop / 100;
		const matRub = params.materialsCostRub ?? matKop / 100;
		const netBaseRub = params.netBaseRevenueRub ?? netBaseKop / 100;
		const pieceworkRub = params.calculatedPieceworkRub ?? pieceworkKop / 100;
		const fixedSalaryRub = params.fixedSalaryRub ?? fixedSalaryKop / 100;
		const bonusesRub = params.bonusesTotalRub ?? bonusesKop / 100;
		const penaltiesRub = params.penaltiesTotalRub ?? penaltiesKop / 100;
		const totalAccruedRub = params.totalAccruedRub ?? totalAccruedKop / 100;
		const ndflRub = params.ndfl13Rub ?? ndflKop / 100;
		const payoutRub = params.netPayoutRub ?? payoutKop / 100;

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
					serviceSalaryPriceRub: serviceSalaryKop / 100,
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
				.where(eq(doctorPayrollStatements.id, statementId))
				.returning();
			statementRow = updated[0];
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
					serviceSalaryPriceRub: serviceSalaryKop / 100,
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
