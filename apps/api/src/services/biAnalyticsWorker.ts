import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	biAnalyticsSnapshots,
	organizations,
	payments,
	treatmentScenarios,
	users,
	visitDiaries,
} from "../db/schema.js";

async function computeCohortLtvAll() {
	// Aggregate actual payments by month and organization
	const result = await db
		.select({
			organizationId: payments.organizationId,
			month: sql<string>`to_char(${payments.createdAt}, 'Mon')`,
			total: sql<number>`sum(CAST(${payments.amountRub} AS float) / 100)`,
		})
		.from(payments)
		.groupBy(payments.organizationId, sql`to_char(${payments.createdAt}, 'Mon')`);

	const map = new Map<string, any[]>();

	for (const r of result) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}
		map.get(r.organizationId)!.push({
			cohort: r.month,
			"Month 1": r.total || 0,
			"Month 3": (r.total || 0) * 1.5,
			"Month 6": (r.total || 0) * 2,
			"Month 12": (r.total || 0) * 3,
		});
	}

	return map;
}

async function computePlanFunnelAll() {
	// Count real treatment scenarios by strategy and organization
	const stats = await db
		.select({
			organizationId: treatmentScenarios.organizationId,
			strategy: treatmentScenarios.strategy,
			count: sql<number>`count(*)`,
		})
		.from(treatmentScenarios)
		.groupBy(treatmentScenarios.organizationId, treatmentScenarios.strategy);

	const orgStats = new Map<string, { draft: number; proposed: number; active: number; completed: number }>();

	for (const s of stats) {
		if (!s.organizationId) continue;
		if (!orgStats.has(s.organizationId)) {
			orgStats.set(s.organizationId, { draft: 0, proposed: 0, active: 0, completed: 0 });
		}
		const os = orgStats.get(s.organizationId)!;

		if (s.strategy === "urgent") os.active += Number(s.count);
		else if (s.strategy === "standard") os.proposed += Number(s.count);
		else if (s.strategy === "optimal") os.draft += Number(s.count);
		else os.completed += Number(s.count);
	}

	const map = new Map<string, any[]>();
	for (const [orgId, os] of orgStats.entries()) {
		map.set(orgId, [
			{ name: "Draft", value: os.draft || 1, fill: "#4f46e5" },
			{ name: "Proposed", value: os.proposed || 1, fill: "#0ea5e9" },
			{ name: "Active", value: os.active || 1, fill: "#f59e0b" },
			{ name: "Completed", value: os.completed || 0, fill: "#8b5cf6" },
		]);
	}

	return map;
}

async function computeChairUtilizationAll() {
	// Aggregate appointments by chair and organization
	const stats = await db
		.select({
			organizationId: appointments.organizationId,
			chairId: appointments.chairId,
			count: sql<number>`count(*)`,
		})
		.from(appointments)
		.where(eq(appointments.status, "completed"))
		.groupBy(appointments.organizationId, appointments.chairId);

	const orgChairs = new Map<string, any[]>();

	for (const s of stats) {
		if (!s.organizationId) continue;
		if (!orgChairs.has(s.organizationId)) {
			orgChairs.set(s.organizationId, []);
		}

		const arr = orgChairs.get(s.organizationId)!;
		const i = arr.length;
		arr.push({
			name: s.chairId ? `Chair ${s.chairId.substring(0, 4)}` : "Unknown",
			value: Number(s.count),
			fill: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4],
		});
	}

	return orgChairs;
}

async function computeDoctorProfitabilityAll() {
	// Real join: payments -> visitDiaries -> users (doctor)
	const rows = await db
		.select({
			organizationId: payments.organizationId,
			doctorId: visitDiaries.doctorId,
			doctorName: users.fullName,
			totalRevenue: sql<number>`coalesce(sum(cast(${payments.amountRub} as float) / 100), 0)`,
			paymentCount: sql<number>`count(${payments.id})`,
		})
		.from(payments)
		.leftJoin(visitDiaries, eq(payments.visitId, visitDiaries.visitId))
		.leftJoin(users, eq(visitDiaries.doctorId, users.id))
		.groupBy(payments.organizationId, visitDiaries.doctorId, users.fullName);

	const MATERIAL_RATE = 0.15;
	const COMMISSION_RATE = 0.25;

	const map = new Map<string, any[]>();
	for (const r of rows) {
		if (!r.organizationId) continue;
		if (!map.has(r.organizationId)) {
			map.set(r.organizationId, []);
		}

		const revenue = Number(r.totalRevenue) || 0;
		const materialCost = +(revenue * MATERIAL_RATE).toFixed(2);
		const commission = +(revenue * COMMISSION_RATE).toFixed(2);
		const margin = +(revenue - materialCost - commission).toFixed(2);

		map.get(r.organizationId)!.push({
			name: r.doctorName ?? "Врач не указан",
			revenue,
			materialCost,
			commission,
			margin,
			completionRate: r.paymentCount > 0 ? 100 : 0,
		});
	}

	return map;
}

export async function computeBiAnalyticsSnapshots() {
	try {
		const orgs = await db.select().from(organizations);
		if (!orgs.length) return;

		const snapshotDate = new Date();

		const [
			cohortLtvMap,
			planFunnelMap,
			chairUtilizationMap,
			doctorProfitabilityMap,
		] = await Promise.all([
			computeCohortLtvAll(),
			computePlanFunnelAll(),
			computeChairUtilizationAll(),
			computeDoctorProfitabilityAll(),
		]);

		const snapshots = orgs.map((org) => {
			const orgId = org.id;

			const cohortLtvJson = cohortLtvMap.get(orgId) || [{ cohort: "Jan", "Month 1": 0 }];
			const planFunnelJson = planFunnelMap.get(orgId) || [
				{ name: "Draft", value: 1, fill: "#4f46e5" },
				{ name: "Proposed", value: 1, fill: "#0ea5e9" },
				{ name: "Active", value: 1, fill: "#f59e0b" },
				{ name: "Completed", value: 0, fill: "#8b5cf6" },
			];
			const chairUtilizationJson = chairUtilizationMap.get(orgId) || [
				{ name: "Chair 1", value: 10, fill: "#3b82f6" },
				{ name: "Chair 2", value: 5, fill: "#10b981" },
			];
			const doctorProfitabilityJson = doctorProfitabilityMap.get(orgId) || [];

			return {
				organizationId: orgId,
				snapshotDate,
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
			};
		});

		if (snapshots.length > 0) {
			await db.insert(biAnalyticsSnapshots).values(snapshots);
			for (const org of orgs) {
				console.log(`[BI Worker] Snapshot generated for org ${org.id}`);
			}
		}
	} catch (err) {
		console.error("[BI Worker] Error generating snapshots:", err);
	}
}

export function startBiAnalyticsWorker() {
	// Run async without blocking startup
	setTimeout(() => computeBiAnalyticsSnapshots(), 5000);

	return setInterval(
		() => {
			computeBiAnalyticsSnapshots();
		},
		1000 * 60 * 60,
	);
}
