import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients, radiologyAiReports } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { verifyWebhookSecret } from "../../security/webhookAuth.js";

export async function registerDiagnocatIntegrationRoutes(app: FastifyInstance) {
	const webhookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const isAuthorized = verifyWebhookSecret(request, reply, {
			channel: "diagnocat",
			secretEnvNames: [
				"DIAGNOCAT_WEBHOOK_SECRET",
				"CLINICAL_AI_WEBHOOK_SECRET",
				"DENTE_WEBHOOK_SECRET",
			],
			extraHeaderNames: [
				"x-diagnocat-api-key",
				"x-diagnocat-secret",
				"x-clinical-ai-api-key",
				"x-api-key",
			],
		});
		if (!isAuthorized) return;

		const body = request.body as {
			patientId?: string;
			reportUrl?: string;
			odontogramData?: unknown;
			organizationId?: string;
		};
		if (!body.patientId || !body.reportUrl || !body.odontogramData) {
			return reply.status(400).send({ error: "Missing required fields" });
		}

		const query = request.query as Record<string, unknown> | undefined;
		const headerOrg = request.headers["x-organization-id"];
		let organizationId =
			(typeof body.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null) ||
			(typeof query?.organizationId === "string" && query.organizationId.trim() ? query.organizationId.trim() : null) ||
			(typeof headerOrg === "string" && headerOrg.trim() ? headerOrg.trim() : null);

		if (!organizationId && body.patientId) {
			const [patient] = await db
				.select({ organizationId: patients.organizationId })
				.from(patients)
				.where(eq(patients.id, body.patientId))
				.limit(1);
			if (patient?.organizationId) {
				organizationId = patient.organizationId;
			}
		}

		if (!organizationId) {
			return reply.status(400).send({
				error: "MissingOrganizationContext",
				message: "Не удалось определить организацию для входящего отчета Diagnocat",
			});
		}

		const inserted = await db
			.insert(radiologyAiReports)
			.values({
				organizationId,
				patientId: body.patientId,
				reportUrl: body.reportUrl,
				odontogramData: body.odontogramData,
			})
			.returning();

		return reply.send({ success: true, reportId: inserted[0]?.id });
	};

	const reportsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireOrganizationContext(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Отчеты Clinical AI содержат врачебную тайну (AI-диагностику зубов)
		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role);
		if (!access.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "integrations.diagnocat.read",
				role: identity.role,
				message:
					"Доступ к AI-отчетам (врачебная тайна) ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
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
			.from(radiologyAiReports)
			.where(
				and(
					eq(radiologyAiReports.patientId, patientId),
					eq(radiologyAiReports.organizationId, organizationId),
				),
			)
			.orderBy(radiologyAiReports.createdAt);

		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_DIAGNOSIS",
			metadata: {
				resourceType: "clinical_ai_report",
				justification: "Просмотр радиологического AI-отчета",
			},
		});

		return reply.send({ success: true, reports });
	};

	// Canonical neutral routes (Mandate 8ap)
	app.post("/api/clinical-ai/webhook", webhookHandler);
	app.get("/api/clinical-ai/reports/:patientId", reportsHandler);

	// Legacy compatibility aliases
	app.post("/api/integrations/diagnocat/webhook", webhookHandler);
	app.get("/api/integrations/diagnocat/reports/:patientId", reportsHandler);
}

export const registerDiagnocatRoutes = registerDiagnocatIntegrationRoutes;
export const registerClinicalAiRoutes = registerDiagnocatIntegrationRoutes;
