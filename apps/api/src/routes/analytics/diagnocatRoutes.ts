import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { diagnocatAiFindings, diagnocatReports } from "../../db/schema.js";

/**
 * Честный подсчет диагностических ИИ-осмотров Diagnocat AI.
 * Запрещена подмена на visitsWithDiaryRow: если клиника не пользуется ИИ, честно возвращаем 0.
 */
export async function fetchDiagnocatStats(
	orgId: string,
	startDate?: Date,
): Promise<{
	reportsCount: number;
	findingsCount: number;
	aiExaminedCount: number;
}> {
	const [aiReportsRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(diagnocatReports)
		.where(
			and(
				eq(diagnocatReports.organizationId, orgId),
				startDate ? gte(diagnocatReports.createdAt, startDate) : undefined,
			),
		);

	const [aiFindingsRow] = await db
		.select({ count: sql<number>`count(distinct ${diagnocatAiFindings.id})::int` })
		.from(diagnocatAiFindings)
		.where(
			and(
				eq(diagnocatAiFindings.organizationId, orgId),
				startDate ? gte(diagnocatAiFindings.createdAt, startDate) : undefined,
			),
		);

	const reportsCount = Number(aiReportsRow?.count || 0);
	const findingsCount = Number(aiFindingsRow?.count || 0);
	const aiExaminedCount = Math.max(reportsCount, findingsCount);

	return {
		reportsCount,
		findingsCount,
		aiExaminedCount,
	};
}

export async function registerDiagnocatRoutes(app: FastifyInstance) {
	app.get("/api/analytics/diagnocat", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"diagnocat analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"diagnocat analytics",
		);
		if (!orgId) return;

		try {
			const { range } = request.query as { range?: string };
			let startDate: Date | undefined;
			const now = new Date();

			if (range === "today") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (range === "week") {
				const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
			} else if (range === "month" || range === "last_month") {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			} else if (range === "quarter" || range === "last_3_months") {
				const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
			} else if (range === "year" || range === "this_year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			}

			const stats = await fetchDiagnocatStats(orgId, startDate);

			return {
				success: true,
				data: stats,
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось загрузить статистику Diagnocat AI");
			return reply.code(503).send({
				success: false,
				error: "DiagnocatAnalyticsUnavailable",
				message: "Не удалось загрузить аналитику Diagnocat AI.",
			});
		}
	});
}
