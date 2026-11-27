import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks, sumKopecks, toExactKopecks } from "@dental/shared";
import { withTenantReadCtx, type TenantDb } from "../../db/rls.js";
import {
	appointments,
	patients,
	portalBudgetTokens,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import type { PipelineCard, PipelineStage, TreatmentPlanQuery } from "./pipelineTypes.js";

function safeIso(d: unknown, fallback: string): string {
	if (!d) return fallback;
	const date = d instanceof Date ? d : new Date(String(d));
	return isNaN(date.getTime()) ? fallback : date.toISOString();
}

function safeNum(val: unknown): number {
	const n = Number(val);
	return Number.isFinite(n) ? n : 0;
}

const VALID_PIPELINE_STAGES = new Set<PipelineStage>([
	"requires_budget",
	"awaiting_decision",
	"no_appointment",
	"in_progress_abandoned",
	"completed",
]);

function classifyStage(
	curatorFunnelStage: string | null | undefined,
	status: string,
	budgetStatus: string | null | undefined,
	hasFuture: boolean,
	daysInactive: number,
): PipelineStage {
	if (curatorFunnelStage && VALID_PIPELINE_STAGES.has(curatorFunnelStage as PipelineStage)) {
		return curatorFunnelStage as PipelineStage;
	}
	if (status === "Completed") return "completed";
	if (status === "Approved" || budgetStatus === "accepted") return hasFuture ? "awaiting_decision" : "no_appointment";
	if (budgetStatus === "sent" || budgetStatus === "viewed") return "awaiting_decision";
	if (status === "Active") {
		if (daysInactive >= 30 && !hasFuture) return "in_progress_abandoned";
		return hasFuture ? "awaiting_decision" : "no_appointment";
	}
	if (daysInactive >= 45 && !hasFuture) return "in_progress_abandoned";
	return "requires_budget";
}

export async function aggregatePipelineData(
	organizationId: string,
	filter: TreatmentPlanQuery,
	tx?: TenantDb,
) {
	const run = async (executor: TenantDb) => {
		const conditions = [eq(treatmentPlans.organizationId, organizationId)];
		if (filter.doctorId) conditions.push(eq(treatmentPlans.doctorId, filter.doctorId));

		const plans = await executor
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				curatorFunnelStage: treatmentPlans.curatorFunnelStage,
				totalPrice: treatmentPlans.totalPrice,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPriceKopecks: treatmentPlans.totalPriceKopecks,
				planDiscountRub: treatmentPlans.planDiscountRub,
				planDiscountKopecks: treatmentPlans.planDiscountKopecks,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
				createdAt: treatmentPlans.createdAt,
				updatedAt: treatmentPlans.updatedAt,
				approvedAt: treatmentPlans.approvedAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
				doctorName: users.fullName,
			})
			.from(treatmentPlans)
			.leftJoin(patients, and(eq(treatmentPlans.patientId, patients.id), eq(patients.organizationId, organizationId)))
			.leftJoin(users, and(eq(treatmentPlans.doctorId, users.id), eq(users.organizationId, organizationId)))
			.where(and(...conditions))
			.orderBy(desc(treatmentPlans.updatedAt));

		const columns: Record<PipelineStage, PipelineCard[]> = {
			requires_budget: [], awaiting_decision: [], no_appointment: [], in_progress_abandoned: [], completed: [],
		};
		if (plans.length === 0) {
			return {
				pipeline: columns,
				summary: {
					counts: { requires_budget: 0, awaiting_decision: 0, no_appointment: 0, in_progress_abandoned: 0, completed: 0, total: 0 },
					totalsRub: { requires_budget: 0, awaiting_decision: 0, no_appointment: 0, in_progress_abandoned: 0, completed: 0, total: 0 },
					analytics: {
						acceptanceRatePercent: 0,
						averagePlanRub: 0,
						totalPipelineRub: 0,
						totalPlansCount: 0,
						dropoutRiskCount: 0,
					},
				},
			};
		}

		const patientIds = Array.from(new Set(plans.map((p) => p.patientId).filter(Boolean)));
		const planIds = plans.map((p) => p.id);

		const [budgetTokens, apptRows, itemCountRows] = await Promise.all([
			executor
				.select({
					token: portalBudgetTokens.token,
					planId: portalBudgetTokens.planId,
					status: portalBudgetTokens.status,
				})
				.from(portalBudgetTokens)
				.where(and(eq(portalBudgetTokens.organizationId, organizationId), inArray(portalBudgetTokens.planId, planIds))),
			executor
				.select({ patientId: appointments.patientId, startsAt: appointments.startsAt })
				.from(appointments)
				.where(and(eq(appointments.organizationId, organizationId), inArray(appointments.patientId, patientIds), sql`${appointments.status} != 'cancelled'`)),
			executor
				.select({
					planId: treatmentPlanItemsNew.planId,
					count: sql<number>`count(*)::int`,
				})
				.from(treatmentPlanItemsNew)
				.where(and(eq(treatmentPlanItemsNew.organizationId, organizationId), inArray(treatmentPlanItemsNew.planId, planIds)))
				.groupBy(treatmentPlanItemsNew.planId),
		]);

		const budgetMap = new Map(
			budgetTokens.flatMap((b) => (b.planId ? [[b.planId, b] as const] : [])),
		);
		const itemsCountMap = new Map(itemCountRows.map((r) => [r.planId, Number(r.count || 0)]));

		const now = new Date();
		const futureAppts = new Map<string, string>();
		const pastAppts = new Map<string, string>();
		for (const a of apptRows) {
			if (!a.patientId || !a.startsAt) continue;
			const d = a.startsAt instanceof Date ? a.startsAt : new Date(String(a.startsAt));
			if (isNaN(d.getTime())) continue;
			const iso = d.toISOString();
			if (d >= now) {
				const existingFuture = futureAppts.get(a.patientId);
				if (!existingFuture || new Date(existingFuture) > d) {
					futureAppts.set(a.patientId, iso);
				}
			} else {
				const existingPast = pastAppts.get(a.patientId);
				if (!existingPast || new Date(existingPast) < d) {
					pastAppts.set(a.patientId, iso);
				}
			}
		}

		const columnTotalsKopecks: Record<PipelineStage, number> = {
			requires_budget: 0,
			awaiting_decision: 0,
			no_appointment: 0,
			in_progress_abandoned: 0,
			completed: 0,
		};

		for (const p of plans) {
			if (filter.search) {
				const s = filter.search.toLowerCase();
				const matchName = (p.patientName || "").toLowerCase().includes(s);
				const matchPhone = (p.patientPhone || "").toLowerCase().includes(s);
				const matchTitle = (p.title || p.name || "").toLowerCase().includes(s);
				if (!matchName && !matchPhone && !matchTitle) continue;
			}

			const budget = budgetMap.get(p.id);
			const hasFuture = futureAppts.has(p.patientId);

			const pastIso = pastAppts.get(p.patientId);
			let lastAct: Date;
			if (pastIso) {
				lastAct = new Date(pastIso);
			} else if (p.approvedAt) {
				lastAct = new Date(p.approvedAt);
			} else if (p.updatedAt) {
				lastAct = new Date(p.updatedAt);
			} else {
				lastAct = now;
			}
			if (isNaN(lastAct.getTime())) lastAct = now;

			const daysInactive = Math.floor(Math.max(0, now.getTime() - lastAct.getTime()) / 86400000);
			const discKopecks =
				p.planDiscountKopecks != null && Number(p.planDiscountKopecks) > 0
					? Number(p.planDiscountKopecks)
					: rublesToKopecks(safeNum(p.planDiscountRub));
			const hasAuthoritativeTotalKopecks =
				p.totalPriceKopecks != null &&
				(Number(p.totalPriceKopecks) > 0 || discKopecks > 0);
			let grossKopecks: number;
			let netKopecks: number;
			if (hasAuthoritativeTotalKopecks) {
				netKopecks = Math.max(0, Number(p.totalPriceKopecks));
				grossKopecks = netKopecks + discKopecks;
			} else {
				grossKopecks = rublesToKopecks(safeNum(p.totalPriceRub) || safeNum(p.totalPrice));
				netKopecks = Math.max(0, grossKopecks - discKopecks);
			}

			const stage = classifyStage(p.curatorFunnelStage, p.status, budget?.status, hasFuture, daysInactive);
			const isDropoutRisk = (p.status === "Approved" || p.status === "Active" || budget?.status === "accepted") && !hasFuture && daysInactive >= 14;

			columnTotalsKopecks[stage] += netKopecks;

			columns[stage].push({
				id: p.id,
				name: p.name || "План лечения",
				title: p.title || p.name || "План лечения",
				status: p.status,
				stage,
				patientId: p.patientId,
				patientName: p.patientName || "Без имени",
				patientPhone: p.patientPhone || null,
				doctorId: p.doctorId || null,
				doctorName: p.doctorName || "Врач не назначен",
				totalPriceRub: kopecksToRubles(grossKopecks),
				discountRub: kopecksToRubles(discKopecks),
				netTotalRub: kopecksToRubles(netKopecks),
				itemsCount: itemsCountMap.get(p.id) ?? 0,
				createdAt: safeIso(p.createdAt, now.toISOString()),
				updatedAt: safeIso(p.updatedAt, now.toISOString()),
				lastActivityAt: lastAct.toISOString(),
				daysSinceLastActivity: daysInactive,
				budgetToken: budget?.token ?? null,
				budgetStatus: budget?.status ?? null,
				hasFutureAppointment: hasFuture,
				nextAppointmentDate: futureAppts.get(p.patientId) || null,
				lastAppointmentDate: pastAppts.get(p.patientId) || null,
				isDropoutRisk,
			});
		}

		const totalFilteredCount =
			columns.requires_budget.length +
			columns.awaiting_decision.length +
			columns.no_appointment.length +
			columns.in_progress_abandoned.length +
			columns.completed.length;

		const totalPipelineKopecks = Number(
			sumKopecks([
				toExactKopecks(columnTotalsKopecks.requires_budget),
				toExactKopecks(columnTotalsKopecks.awaiting_decision),
				toExactKopecks(columnTotalsKopecks.no_appointment),
				toExactKopecks(columnTotalsKopecks.in_progress_abandoned),
				toExactKopecks(columnTotalsKopecks.completed),
			]),
		);

		const totalsRub = {
			requires_budget: kopecksToRubles(columnTotalsKopecks.requires_budget),
			awaiting_decision: kopecksToRubles(columnTotalsKopecks.awaiting_decision),
			no_appointment: kopecksToRubles(columnTotalsKopecks.no_appointment),
			in_progress_abandoned: kopecksToRubles(columnTotalsKopecks.in_progress_abandoned),
			completed: kopecksToRubles(columnTotalsKopecks.completed),
			total: kopecksToRubles(totalPipelineKopecks),
		};

		const counts = {
			requires_budget: columns.requires_budget.length,
			awaiting_decision: columns.awaiting_decision.length,
			no_appointment: columns.no_appointment.length,
			in_progress_abandoned: columns.in_progress_abandoned.length,
			completed: columns.completed.length,
			total: totalFilteredCount,
		};

		const acceptedCount = columns.no_appointment.length + columns.completed.length;
		const acceptanceRatePercent =
			totalFilteredCount > 0 ? Math.round((acceptedCount / totalFilteredCount) * 100) : 0;
		const averagePlanRub =
			totalFilteredCount > 0
				? kopecksToRubles(Math.round(totalPipelineKopecks / totalFilteredCount))
				: 0;
		const dropoutRiskCount = Object.values(columns)
			.flat()
			.filter((c) => c.isDropoutRisk).length;

		return {
			pipeline: columns,
			summary: {
				counts,
				totalsRub,
				analytics: {
					acceptanceRatePercent,
					averagePlanRub,
					totalPipelineRub: totalsRub.total,
					totalPlansCount: totalFilteredCount,
					dropoutRiskCount,
				},
			},
		};
	};
	return tx ? run(tx) : withTenantReadCtx(organizationId, run);
}
