import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, patients, portalBudgetTokens, treatmentPlans, users } from "../../db/schema.js";
import type { PipelineCard, PipelineStage, TreatmentPlanQuery } from "./pipelineTypes.js";

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
	if (plans.length === 0) return { pipeline: columns, summary: { counts: { requires_budget: 0, awaiting_decision: 0, no_appointment: 0, in_progress_abandoned: 0, completed: 0, total: 0 }, totalsRub: { requires_budget: 0, awaiting_decision: 0, no_appointment: 0, in_progress_abandoned: 0, completed: 0, total: 0 } } };

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
		if (!a.patientId) continue;
		const d = new Date(a.startsAt);
		const iso = a.startsAt instanceof Date ? a.startsAt.toISOString() : String(a.startsAt);
		if (d >= now) { if (!futureAppts.has(a.patientId) || new Date(futureAppts.get(a.patientId)!) > d) futureAppts.set(a.patientId, iso); }
		else { if (!pastAppts.has(a.patientId) || new Date(pastAppts.get(a.patientId)!) < d) pastAppts.set(a.patientId, iso); }
	}

	for (const p of plans) {
		if (filter.search) {
			const s = filter.search.toLowerCase();
			if (!(p.patientName || "").toLowerCase().includes(s) && !(p.patientPhone || "").toLowerCase().includes(s) && !(p.title || p.name || "").toLowerCase().includes(s)) continue;
		}
		const budget = budgetMap.get(p.id);
		const hasFuture = futureAppts.has(p.patientId);
		const lastAct = pastAppts.get(p.patientId) ? new Date(pastAppts.get(p.patientId)!) : (p.updatedAt ? new Date(p.updatedAt) : now);
		const daysInactive = Math.floor(Math.max(0, now.getTime() - lastAct.getTime()) / 86400000);
		const totalRub = Number(p.totalPriceRub) || Number(p.totalPrice) || 0;
		const discRub = Number(p.planDiscountRub) || 0;
		const netRub = Math.max(0, totalRub - discRub);
		const stage = classifyStage(p.status, budget?.status, hasFuture, daysInactive);

		columns[stage].push({
			id: p.id, name: p.name, title: p.title || p.name, status: p.status, stage, patientId: p.patientId,
			patientName: p.patientName || "Без имени", patientPhone: p.patientPhone || null, doctorId: p.doctorId || null,
			doctorName: p.doctorName || "Врач не назначен", totalPriceRub: totalRub, discountRub: discRub, netTotalRub: netRub,
			itemsCount: 1, createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
			updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : now.toISOString(), lastActivityAt: lastAct.toISOString(),
			daysSinceLastActivity: daysInactive, budgetToken: budget?.token ?? null, budgetStatus: budget?.status ?? null,
			hasFutureAppointment: hasFuture, nextAppointmentDate: futureAppts.get(p.patientId) || null, lastAppointmentDate: pastAppts.get(p.patientId) || null,
		});
	}

	const counts = { requires_budget: columns.requires_budget.length, awaiting_decision: columns.awaiting_decision.length, no_appointment: columns.no_appointment.length, in_progress_abandoned: columns.in_progress_abandoned.length, completed: columns.completed.length, total: plans.length };
	const totalsRub = {
		requires_budget: columns.requires_budget.reduce((a, c) => a + c.netTotalRub, 0), awaiting_decision: columns.awaiting_decision.reduce((a, c) => a + c.netTotalRub, 0),
		no_appointment: columns.no_appointment.reduce((a, c) => a + c.netTotalRub, 0), in_progress_abandoned: columns.in_progress_abandoned.reduce((a, c) => a + c.netTotalRub, 0),
		completed: columns.completed.reduce((a, c) => a + c.netTotalRub, 0), total: plans.reduce((a, p) => a + (Number(p.totalPriceRub) || Number(p.totalPrice) || 0), 0),
	};
	return { pipeline: columns, summary: { counts, totalsRub } };
}
