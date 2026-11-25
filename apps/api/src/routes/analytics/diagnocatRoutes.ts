import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { radiologyAiFindings, radiologyAiReports } from "../../db/schema.js";

const diagnocatAnalyticsQuerySchema = z
	.object({
		range: z.string().trim().max(40).optional(),
	})
	.strict();

/**
 * Честный подсчет диагностических ИИ-осмотров и скрининга снимков (aiRadiologyFindings / aiDiagnosticReports).
 * Мандат 8ap: Ноль чужих брендов, только нейтральный клинический доменный контракт.
 * Запрещена подмена на visitsWithDiaryRow: если клиника не пользуется ИИ, честно возвращаем 0.
 */
export async function fetchAiDiagnosticStats(
	orgId: string,
	startDate?: Date,
): Promise<{
	reportsCount: number;
	findingsCount: number;
	aiExaminedCount: number;
}> {
	return withTenantCtx(orgId, async (tx) => {
		const [aiReportsRow] = await tx
			.select({ count: sql<number>`count(*)::int` })
			.from(radiologyAiReports)
			.where(
				and(
					eq(radiologyAiReports.organizationId, orgId),
					startDate ? gte(radiologyAiReports.createdAt, startDate) : undefined,
				),
			);

		const [aiFindingsRow] = await tx
			.select({ count: sql<number>`count(distinct ${radiologyAiFindings.id})::int` })
			.from(radiologyAiFindings)
			.where(
				and(
					eq(radiologyAiFindings.organizationId, orgId),
					startDate ? gte(radiologyAiFindings.createdAt, startDate) : undefined,
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
	});
}

/** Алиас для обратной совместимости импортов */
export const fetchDiagnocatStats = fetchAiDiagnosticStats;

export async function registerDiagnocatAnalyticsRoutes(app: FastifyInstance) {
	const handler = async (request: FastifyRequest<{ Querystring: { range?: string } }>, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"ai diagnostics analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"ai diagnostics analytics",
		);
		if (!orgId) return;

		const parsedQuery = diagnocatAnalyticsQuerySchema.safeParse(
			request.query ?? {},
		);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				success: false,
				error: "ValidationError",
				message: "Некорректные параметры фильтра статистики.",
				details: parsedQuery.error.issues,
			});
		}

		try {
			const { range } = parsedQuery.data;
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

			const stats = await fetchAiDiagnosticStats(orgId, startDate);

			return {
				success: true,
				data: stats,
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось загрузить статистику ИИ-диагностики снимков");
			return reply.code(503).send({
				success: false,
				error: "AiDiagnosticsAnalyticsUnavailable",
				message: "Не удалось загрузить аналитику ИИ-диагностики снимков.",
			});
		}
	};

	app.get("/api/analytics/ai-diagnostics", handler);
	app.get("/api/analytics/diagnocat", handler);
}

export const registerDiagnocatRoutes = registerDiagnocatAnalyticsRoutes;
