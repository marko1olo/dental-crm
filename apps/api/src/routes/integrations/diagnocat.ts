import { eq, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { diagnocatReports } from "../../db/schema.js";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";

export async function registerDiagnocatRoutes(app: FastifyInstance) {
	app.post("/api/integrations/diagnocat/webhook", async (request, reply) => {
		const body = request.body as {
			patientId?: string;
			reportUrl?: string;
			odontogramData?: unknown;
		};
		if (!body.patientId || !body.reportUrl || !body.odontogramData) {
			return reply.status(400).send({ error: "Missing required fields" });
		}

		const organizationId = await requireOrganizationContext(request, reply);
		if (!organizationId) return;

		const inserted = await db
			.insert(diagnocatReports)
			.values({
				organizationId,
				patientId: body.patientId,
				reportUrl: body.reportUrl,
				odontogramData: body.odontogramData,
			})
			.returning();

		return reply.send({ success: true, reportId: inserted[0]?.id });
	});

	app.get(
		"/api/integrations/diagnocat/reports/:patientId",
		async (request, reply) => {
			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const { patientId } = request.params as { patientId: string };
			const reports = await db
				.select()
				.from(diagnocatReports)
				.where(
					and(
						eq(diagnocatReports.patientId, patientId),
						eq(diagnocatReports.organizationId, organizationId),
					),
				)
				.orderBy(diagnocatReports.createdAt);

			return reply.send({ success: true, reports });
		},
	);
}
