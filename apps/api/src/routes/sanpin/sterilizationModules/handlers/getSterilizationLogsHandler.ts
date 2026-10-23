/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/getSterilizationLogsHandler.ts
 *
 * Обработчик получения журнала стерилизации и циклов автоклавирования.
 * Мандат 8b: строго <= 120 строк.
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizationLogs, users } from "../../../../db/schema.js";

export async function handleGetSterilizationLogs(
	req: FastifyRequest<{
		Querystring: {
			period?: "day" | "week" | "month" | "all";
			autoclaveId?: string;
			search?: string;
		};
	}>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilization read",
	);
	if (!organizationId) return;

	const { period, autoclaveId, search } = req.query || {};
	const now = new Date();
	let dateThreshold: Date | null = null;

	if (period === "day") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	} else if (period === "week") {
		dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (period === "month") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
	}

	const conditions = [eq(sterilizationLogs.organizationId, organizationId)];

	if (dateThreshold) {
		conditions.push(gte(sterilizationLogs.timestamp, dateThreshold));
	}

	if (autoclaveId && autoclaveId !== "all") {
		conditions.push(eq(sterilizationLogs.autoclaveId, autoclaveId));
	}

	const logs = await db
		.select({
			id: sterilizationLogs.id,
			organizationId: sterilizationLogs.organizationId,
			deviceName: sterilizationLogs.deviceName,
			autoclaveId: sterilizationLogs.autoclaveId,
			serialNumber: sterilizationLogs.autoclaveId,
			cycleNumber: sterilizationLogs.cycleNumber,
			temperatureCelsius: sterilizationLogs.temperatureCelsius,
			pressureBar: sterilizationLogs.pressureBar,
			itemsDescription: sql<string>`coalesce(nullif(split_part(${sterilizationLogs.itemsDescription}, ' | ', 1), ''), ${sterilizationLogs.itemsDescription})`,
			operatorId: sterilizationLogs.operatorId,
			operatorName: sql<string>`coalesce(${users.fullName}, 'Медсестра ЦСО')`,
			barcode: sterilizationLogs.barcode,
			status: sterilizationLogs.status,
			passedIndicator: sterilizationLogs.passedIndicator,
			packagingType: sterilizationLogs.packagingType,
			expiresAt: sterilizationLogs.expiresAt,
			indicatorType: sterilizationLogs.indicatorType,
			cycleMode: sterilizationLogs.cycleMode,
			temperatureSet: sterilizationLogs.temperatureSet,
			pressureSet: sterilizationLogs.pressureSet,
			durationMin: sterilizationLogs.durationMin,
			notes: sql<string | null>`case when position(' | ' in coalesce(${sterilizationLogs.itemsDescription}, '')) > 0 then substring(${sterilizationLogs.itemsDescription} from position(' | ' in ${sterilizationLogs.itemsDescription}) + 3) else null end`,
			timestamp: sterilizationLogs.timestamp,
			createdAt: sterilizationLogs.createdAt,
		})
		.from(sterilizationLogs)
		.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
		.where(and(...conditions))
		.orderBy(desc(sterilizationLogs.timestamp));

	if (search && search.trim()) {
		const q = search.trim().toLowerCase();
		return logs.filter(
			(l) =>
				l.barcode?.toLowerCase().includes(q) ||
				l.itemsDescription?.toLowerCase().includes(q) ||
				l.deviceName?.toLowerCase().includes(q) ||
				l.operatorName?.toLowerCase().includes(q),
		);
	}

	return logs;
}

export async function handleGetSanpinCycles(req: FastifyRequest, reply: FastifyReply) {
	return handleGetSterilizationLogs(req as any, reply);
}
