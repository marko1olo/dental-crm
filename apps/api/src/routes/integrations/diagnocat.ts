import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { diagnocatReports, patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

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

			// 152-ФЗ / 323-ФЗ: Отчеты Diagnocat содержат врачебную тайну (AI-диагностику зубов)
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role);
			if (!access.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "integrations.diagnocat.read",
					role: identity.role,
					message:
						"Доступ к AI-отчетам Diagnocat (врачебная тайна) ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
				});
			}

			const { patientId } = request.params as { patientId: string };

			// 152-ФЗ: Защита архивированного пациента
			const [patient] = await db
				.select({ status: patients.status })
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (patient?.status === "archived" && !access.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.diagnocat",
					role: identity.role,
					message:
						"Отказ в доступе к снимкам и отчетам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13).",
				});
			}

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
