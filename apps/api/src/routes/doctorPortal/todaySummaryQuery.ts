import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import {
	basisPointsFromPercent,
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	percentageOfKopecks,
	rublesToKopecks,
	type DoctorTodayEarningsSummary,
} from "@dental/shared";
import type { TenantDb } from "../../db/rls.js";
import {
	appointments,
	doctorCommissions,
	pricelistDoctorPayrolls,
	treatmentPlans,
} from "../../db/schema.js";
import { fetchDoctorPayrollDataset } from "../doctorPayrollDbQueries.js";

const PLANNED_APPOINTMENT_STATUSES = new Set([
	"planned",
	"confirmed",
	"arrived",
	"waiting",
	"in_chair",
	"in_progress",
]);

export interface ComputeDoctorTodayEarningsParams {
	readonly tx: TenantDb;
	readonly organizationId: string;
	readonly doctorId: string;
	readonly dateIso: string;
	readonly visitIdForDelta?: string | undefined;
}

export interface ComputeDoctorTodayEarningsResult {
	readonly summary: DoctorTodayEarningsSummary;
	readonly visitEarningsDeltaKopecks: number;
}

function resolvePositivePercent(raw: unknown): number | null {
	const num = Number(raw);
	if (!Number.isFinite(num) || num <= 0 || num > 100) {
		return null;
	}
	return num;
}

function resolveTreatmentPlanTotalKopecks(plan: {
	totalPriceKopecks: bigint | number | null;
	totalPriceRub: string | number | null;
	totalPrice: string | number | null;
}): number {
	if (plan.totalPriceKopecks != null) {
		const kop = Number(plan.totalPriceKopecks);
		if (Number.isFinite(kop) && kop > 0) return Math.round(kop);
	}
	const rub = Number(plan.totalPriceRub ?? plan.totalPrice ?? 0);
	if (Number.isFinite(rub) && rub > 0) {
		return rublesToKopecks(rub);
	}
	return 0;
}

export async function computeDoctorTodayEarningsInTx(
	params: ComputeDoctorTodayEarningsParams,
): Promise<ComputeDoctorTodayEarningsResult> {
	const { tx, organizationId, doctorId, dateIso, visitIdForDelta } = params;
	const dayStr = dateIso.slice(0, 10);
	const fromDate = new Date(`${dayStr}T00:00:00.000Z`);
	const toDate = new Date(`${dayStr}T23:59:59.999Z`);
	const defaultPercent = DEFAULT_CATEGORY_COMMISSION_PERCENT.therapy ?? 25;

	const [commRecords, pricelistRows, dataset, todayAppointments] =
		await Promise.all([
			tx
				.select({
					serviceCategory: doctorCommissions.serviceCategory,
					commissionPct: doctorCommissions.commissionPct,
					commissionPercent: doctorCommissions.commissionPercent,
					effectiveFrom: doctorCommissions.effectiveFrom,
				})
				.from(doctorCommissions)
				.where(
					and(
						eq(doctorCommissions.organizationId, organizationId),
						or(
							eq(doctorCommissions.userId, doctorId),
							eq(doctorCommissions.doctorId, doctorId),
						),
						eq(doctorCommissions.isActive, true),
					),
				)
				.orderBy(sql`${doctorCommissions.effectiveFrom} desc`),
			tx
				.select({
					serviceCode: pricelistDoctorPayrolls.serviceCode,
					serviceName: pricelistDoctorPayrolls.serviceName,
					doctorPayrollPercent: pricelistDoctorPayrolls.doctorPayrollPercent,
				})
				.from(pricelistDoctorPayrolls)
				.where(eq(pricelistDoctorPayrolls.organizationId, organizationId)),
			fetchDoctorPayrollDataset({
				orgId: organizationId,
				resolvedDocId: doctorId,
				fromStr: dayStr,
				toStr: dayStr,
				fromDate,
				toDate,
				tx,
			}),
			tx
				.select({
					id: appointments.id,
					status: appointments.status,
					treatmentPlanId: appointments.treatmentPlanId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						eq(appointments.doctorUserId, doctorId),
						gte(appointments.startsAt, fromDate),
						lte(appointments.startsAt, toDate),
					),
				),
		]);

	const categoryRatesMap = new Map<string, number>();
	let baseCommissionPercent: number | null = null;

	for (const comm of commRecords) {
		const pct =
			resolvePositivePercent(comm.commissionPercent) ??
			resolvePositivePercent(comm.commissionPct);
		if (pct === null) continue;
		if (comm.serviceCategory) {
			const key = comm.serviceCategory.toLowerCase();
			if (!categoryRatesMap.has(key)) {
				categoryRatesMap.set(key, pct);
			}
		} else if (baseCommissionPercent === null) {
			baseCommissionPercent = pct;
		}
	}

	if (baseCommissionPercent === null) {
		const firstCategoryRate = categoryRatesMap.values().next().value;
		baseCommissionPercent =
			typeof firstCategoryRate === "number" ? firstCategoryRate : defaultPercent;
	}

	const pricelistPercentByCode = new Map<string, number>();
	const pricelistPercentByName = new Map<string, number>();
	for (const pr of pricelistRows) {
		const pct = resolvePositivePercent(pr.doctorPayrollPercent);
		if (pct === null) continue;
		if (pr.serviceCode) {
			pricelistPercentByCode.set(pr.serviceCode.trim().toLowerCase(), pct);
		}
		if (pr.serviceName) {
			pricelistPercentByName.set(pr.serviceName.trim().toLowerCase(), pct);
		}
	}

	const resolveItemCommissionPercent = (
		category: string,
		serviceName?: string,
		serviceCode?: string,
	): number => {
		if (serviceCode) {
			const codePct = pricelistPercentByCode.get(serviceCode.trim().toLowerCase());
			if (codePct !== undefined) return codePct;
		}
		if (serviceName) {
			const namePct = pricelistPercentByName.get(serviceName.trim().toLowerCase());
			if (namePct !== undefined) return namePct;
		}
		const catPct = categoryRatesMap.get(category.toLowerCase());
		if (catPct !== undefined) return catPct;
		return baseCommissionPercent ?? defaultPercent;
	};

	let grossTodayKopecks = 0;
	let earnedTodayKopecks = 0;
	let visitEarningsDeltaKopecks = 0;
	const completedVisitIds = new Set<string>();

	for (const order of dataset.orders) {
		const itemGross = Math.max(0, Math.round(order.grossKopecks));
		const pct = resolveItemCommissionPercent(
			order.category,
			order.serviceNameRu,
			order.serviceCode,
		);
		const itemEarned = percentageOfKopecks(
			itemGross,
			basisPointsFromPercent(pct),
		);
		grossTodayKopecks += itemGross;
		earnedTodayKopecks += itemEarned;
		if (visitIdForDelta && order.visitId === visitIdForDelta) {
			visitEarningsDeltaKopecks += itemEarned;
		}
		if (order.visitId) {
			completedVisitIds.add(order.visitId);
		}
	}

	const completedAppointmentCount = todayAppointments.filter(
		(a) => a.status === "completed",
	).length;
	const completedVisitsCount = Math.max(
		completedAppointmentCount,
		completedVisitIds.size,
	);

	const plannedPlanIds = Array.from(
		new Set(
			todayAppointments
				.filter(
					(a) =>
						PLANNED_APPOINTMENT_STATUSES.has(a.status) &&
						typeof a.treatmentPlanId === "string" &&
						a.treatmentPlanId.length > 0,
				)
				.map((a) => a.treatmentPlanId as string),
		),
	);

	let plannedEarningsKopecks = 0;
	if (plannedPlanIds.length > 0) {
		const plans = await tx
			.select({
				id: treatmentPlans.id,
				totalPriceKopecks: treatmentPlans.totalPriceKopecks,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, organizationId),
					inArray(treatmentPlans.id, plannedPlanIds),
				),
			);

		const planTotalById = new Map<string, number>();
		for (const plan of plans) {
			planTotalById.set(plan.id, resolveTreatmentPlanTotalKopecks(plan));
		}

		const baseBps = basisPointsFromPercent(baseCommissionPercent);
		for (const appt of todayAppointments) {
			if (!PLANNED_APPOINTMENT_STATUSES.has(appt.status) || !appt.treatmentPlanId) {
				continue;
			}
			const planGrossKop = planTotalById.get(appt.treatmentPlanId) ?? 0;
			if (planGrossKop > 0) {
				plannedEarningsKopecks += percentageOfKopecks(planGrossKop, baseBps);
			}
		}
	}

	return {
		summary: {
			earnedTodayKopecks: Math.max(0, Math.round(earnedTodayKopecks)),
			grossTodayKopecks: Math.max(0, Math.round(grossTodayKopecks)),
			commissionPercent: baseCommissionPercent,
			completedVisitsCount,
			plannedEarningsKopecks: Math.max(0, Math.round(plannedEarningsKopecks)),
		},
		visitEarningsDeltaKopecks: Math.max(0, Math.round(visitEarningsDeltaKopecks)),
	};
}
