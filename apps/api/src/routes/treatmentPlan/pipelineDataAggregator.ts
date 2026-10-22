import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, patients, portalBudgetTokens, treatmentPlans, users } from "../../db/schema.js";
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

function classifyStage(status: string, budgetStatus: string | null | undefined, hasFuture: boolean, daysInactive: number): PipelineStage {
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

export async function aggregatePipelineData(organizationId: string, filter: TreatmentPlanQuery) {
	const conditions = [eq(treatmentPlans.organizationId, organizationId)];
	if (filter.doctorId) conditions.push(eq(treatmentPlans.doctorId, filter.doctorId));

	const plans = await db.select({
		id: treatmentPlans.id, name: treatmentPlans.name, title: treatmentPlans.title,
		status: treatmentPlans.status, totalPrice: treatmentPlans.totalPrice, totalPriceRub: treatmentPlans.totalPriceRub,
		planDiscountRub: treatmentPlans.planDiscountRub, patientId: treatmentPlans.patientId, doctorId: treatmentPlans.doctorId,
		createdAt: treatmentPlans.createdAt, updatedAt: treatmentPlans.updatedAt, approvedAt: treatmentPlans.approvedAt,
		patientName: patients.fullName, patientPhone: patients.phone, doctorName: users.fullName,
	}).from(treatmentPlans)
		.leftJoin(patients, eq(treatmentPlans.patientId, patients.id))
		.leftJoin(users, eq(treatmentPlans.doctorId, users.id))
		.where(and(...conditions)).orderBy(desc(treatmentPlans.updatedAt));

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

	const budgetTokens = await db.select({
		token: portalBudgetTokens.token, planId: portalBudgetTokens.planId, status: portalBudgetTokens.status,
	}).from(portalBudgetTokens).where(and(eq(portalBudgetTokens.organizationId, organizationId), inArray(portalBudgetTokens.planId, planIds)));
	const budgetMap = new Map(budgetTokens.filter((b) => b.planId).map((b) => [b.planId!, b]));

	const now = new Date();
	const apptRows = await db.select({ patientId: appointments.patientId, startsAt: appointments.startsAt })
		.from(appointments).where(and(eq(appointments.organizationId, organizationId), inArray(appointments.patientId, patientIds), sql`${appointments.status} != 'cancelled'`));

	const futureAppts = new Map<string, string>();
	const pastAppts = new Map<string, string>();
	for (const a of apptRows) {
		if (!a.patientId || !a.startsAt) continue;
		const d = a.startsAt instanceof Date ? a.startsAt : new Date(String(a.startsAt));
		if (isNaN(d.getTime())) continue;
		const iso = d.toISOString();
		if (d >= now) {
			if (!futureAppts.has(a.patientId) || new Date(futureAppts.get(a.patientId)!) > d) {
				futureAppts.set(a.patientId, iso);
			}
		} else {
			if (!pastAppts.has(a.patientId) || new Date(pastAppts.get(a.patientId)!) < d) {
				pastAppts.set(a.patientId, iso);
			}
		}
	}

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
		const totalRub = safeNum(p.totalPriceRub) || safeNum(p.totalPrice);
		const discRub = safeNum(p.planDiscountRub);
		const netRub = Math.max(0, totalRub - discRub);
		const stage = classifyStage(p.status, budget?.status, hasFuture, daysInactive);

		// Анти-отвал: план согласован или в работе, но без записи >= 14 дней
		const isDropoutRisk = (p.status === "Approved" || p.status === "Active" || budget?.status === "accepted") && !hasFuture && daysInactive >= 14;

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
			totalPriceRub: totalRub,
			discountRub: discRub,
			netTotalRub: netRub,
			itemsCount: 1,
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

	const totalsRub = {
		requires_budget: columns.requires_budget.reduce((a, c) => a + c.netTotalRub, 0),
		awaiting_decision: columns.awaiting_decision.reduce((a, c) => a + c.netTotalRub, 0),
		no_appointment: columns.no_appointment.reduce((a, c) => a + c.netTotalRub, 0),
		in_progress_abandoned: columns.in_progress_abandoned.reduce((a, c) => a + c.netTotalRub, 0),
		completed: columns.completed.reduce((a, c) => a + c.netTotalRub, 0),
		total: 0,
	};
	totalsRub.total =
		totalsRub.requires_budget +
		totalsRub.awaiting_decision +
		totalsRub.no_appointment +
		totalsRub.in_progress_abandoned +
		totalsRub.completed;

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
		totalFilteredCount > 0 ? Math.round(totalsRub.total / totalFilteredCount) : 0;
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
}
