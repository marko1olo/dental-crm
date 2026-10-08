import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	bactericidalEquipments,
	emergencyBiohazardLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	sterilizerEquipments,
	temperatureHumidityLogs,
} from "../../db/schema.js";

export function registerSanpinSummaryRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 0. SUMMARY & COMPLIANCE DASHBOARD
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/summary", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin summary read",
		);
		if (!organizationId) return;

		const todayStr = new Date().toISOString().slice(0, 10);
		const startOfDay = new Date(todayStr);

		// 1. PSO checks today
		const [psoStats] = await db
			.select({
				totalToday: sql<number>`count(*)::int`,
				approvedToday: sql<number>`count(*) filter (where ${preSterilizationCleaningLogs.isBatchApproved} = true)::int`,
			})
			.from(preSterilizationCleaningLogs)
			.where(
				and(
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
					gte(preSterilizationCleaningLogs.timestamp, startOfDay),
				),
			);

		// 2. Sterilization cycles today & equipment fleet stats
		const [sterilStats] = await db
			.select({
				totalCyclesToday: sql<number>`count(*)::int`,
				passedToday: sql<number>`count(*) filter (where ${sterilizationLogs.status} = 'passed')::int`,
			})
			.from(sterilizationLogs)
			.where(
				and(
					eq(sterilizationLogs.organizationId, organizationId),
					gte(sterilizationLogs.timestamp, startOfDay),
				),
			);

		const [sterilizerFleetStats] = await db
			.select({
				totalEquipments: sql<number>`count(*)::int`,
				activeEquipments: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'active')::int`,
				inMaintenance: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'in_maintenance')::int`,
				decommissioned: sql<number>`count(*) filter (where ${sterilizerEquipments.status} = 'decommissioned')::int`,
				verificationExpired: sql<number>`count(*) filter (where ${sterilizerEquipments.verificationExpiryDate} < ${todayStr} and ${sterilizerEquipments.status} = 'active')::int`,
			})
			.from(sterilizerEquipments)
			.where(eq(sterilizerEquipments.organizationId, organizationId));

		// 3. Lamps warning / expired
		const [lampStats] = await db
			.select({
				totalEquipments: sql<number>`count(*)::int`,
				warningLamps: sql<number>`count(*) filter (where ${bactericidalEquipments.lampStatus} = 'warning_replace_soon')::int`,
				expiredLamps: sql<number>`count(*) filter (where ${bactericidalEquipments.lampStatus} = 'expired_replace_now')::int`,
			})
			.from(bactericidalEquipments)
			.where(
				and(
					eq(bactericidalEquipments.organizationId, organizationId),
					eq(bactericidalEquipments.isCommissioned, true),
				),
			);

		// 4. Waste month kg
		const startOfMonth = new Date(todayStr.slice(0, 7) + "-01");
		const wasteStats = await db
			.select({
				wasteClass: medicalWasteLogs.wasteClass,
				totalKg: sql<string>`coalesce(sum(${medicalWasteLogs.weightKg}), 0)`,
				totalPackages: sql<number>`coalesce(sum(${medicalWasteLogs.packageCount}), 0)::int`,
			})
			.from(medicalWasteLogs)
			.where(
				and(
					eq(medicalWasteLogs.organizationId, organizationId),
					gte(medicalWasteLogs.logDate, startOfMonth),
				),
			)
			.groupBy(medicalWasteLogs.wasteClass);

		// 5. Temperature deviations today
		const [tempStats] = await db
			.select({
				totalChecksToday: sql<number>`count(*)::int`,
				deviationsToday: sql<number>`count(*) filter (where ${temperatureHumidityLogs.isWithinNorm} = false)::int`,
			})
			.from(temperatureHumidityLogs)
			.where(
				and(
					eq(temperatureHumidityLogs.organizationId, organizationId),
					eq(temperatureHumidityLogs.measurementDate, todayStr),
				),
			);

		// 6. Active emergency incidents
		const [emergencyStats] = await db
			.select({
				totalIncidents: sql<number>`count(*)::int`,
				criticalArvPending: sql<number>`count(*) filter (where ${emergencyBiohazardLogs.arvProphylaxisRecommended} = true and ${emergencyBiohazardLogs.arvProphylaxisStartedWithin72h} = false)::int`,
			})
			.from(emergencyBiohazardLogs)
			.where(eq(emergencyBiohazardLogs.organizationId, organizationId));

		return {
			date: todayStr,
			pso: {
				totalToday: psoStats?.totalToday || 0,
				approvedToday: psoStats?.approvedToday || 0,
			},
			sterilization: {
				totalCyclesToday: sterilStats?.totalCyclesToday || 0,
				passedToday: sterilStats?.passedToday || 0,
				fleet: {
					totalEquipments: sterilizerFleetStats?.totalEquipments || 0,
					activeEquipments: sterilizerFleetStats?.activeEquipments || 0,
					inMaintenance: sterilizerFleetStats?.inMaintenance || 0,
					decommissioned: sterilizerFleetStats?.decommissioned || 0,
					verificationExpired: sterilizerFleetStats?.verificationExpired || 0,
				},
			},
			bactericidal: {
				totalEquipments: lampStats?.totalEquipments || 0,
				warningLamps: lampStats?.warningLamps || 0,
				expiredLamps: lampStats?.expiredLamps || 0,
			},
			wasteMonth: wasteStats.map((w) => ({
				wasteClass: w.wasteClass,
				totalKg: Number(w.totalKg),
				totalPackages: w.totalPackages,
			})),
			temperature: {
				totalChecksToday: tempStats?.totalChecksToday || 0,
				deviationsToday: tempStats?.deviationsToday || 0,
			},
			biohazard: {
				totalIncidents: emergencyStats?.totalIncidents || 0,
				criticalArvPending: emergencyStats?.criticalArvPending || 0,
			},
		};
	});
}
