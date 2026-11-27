import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineStreamRoute, defineWebhookRoute } from "../../core/routeFactories.js";
import { withSuperuserBypass, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { patients, radiologyAiReports } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { requireClinicalReadContext } from "../../security/tenantContext.js";
import { verifyWebhookSecret } from "../../security/webhookAuth.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const diagnocatWebhookBodySchema = z
	.object({
		patientId: z.string().regex(UUID_REGEX, "patientId должен быть UUID"),
		reportUrl: z.string().trim().min(1, "reportUrl обязателен"),
		odontogramData: z.unknown().refine((v) => v !== undefined && v !== null, {
			message: "odontogramData обязателен",
		}),
		organizationId: z.string().regex(UUID_REGEX).optional(),
	})
	.passthrough();

const diagnocatReportsParamsSchema = z
	.object({
		patientId: z.string().regex(UUID_REGEX, "patientId должен быть UUID"),
	})
	.strict();

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

		const parsedBody = diagnocatWebhookBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "Missing required fields",
				details: parsedBody.error.issues,
			});
		}
		const body = parsedBody.data;

		const query = (
			request.query && typeof request.query === "object" ? request.query : {}
		) as Record<string, unknown>;
		const headerOrg = request.headers["x-organization-id"];
		const candidateOrgId =
			(typeof body.organizationId === "string" && body.organizationId.trim()
				? body.organizationId.trim()
				: null) ||
			(typeof query.organizationId === "string" && query.organizationId.trim()
				? query.organizationId.trim()
				: null) ||
			(typeof headerOrg === "string" && headerOrg.trim()
				? headerOrg.trim()
				: null);

		const resolvedCandidateOrgId =
			candidateOrgId && UUID_REGEX.test(candidateOrgId) ? candidateOrgId : null;

		const boundEnvOrgId = process.env.DIAGNOCAT_WEBHOOK_ORGANIZATION_ID?.trim() || null;
		if (boundEnvOrgId && resolvedCandidateOrgId && resolvedCandidateOrgId !== boundEnvOrgId) {
			return reply.status(403).send({
				error: "CrossTenantRejected",
				message: "Переданный organizationId не соответствует привязке вебхука Diagnocat",
			});
		}

		// Всегда проверяем принадлежность пациента реальной организации в БД
		const patientOrgId = await withSuperuserBypass(async (tx) => {
			const [patient] = await tx
				.select({ organizationId: patients.organizationId })
				.from(patients)
				.where(eq(patients.id, body.patientId))
				.limit(1);
			return patient?.organizationId ?? null;
		});

		if (resolvedCandidateOrgId && patientOrgId && resolvedCandidateOrgId !== patientOrgId) {
			return reply.status(403).send({
				error: "CrossTenantRejected",
				message: "Идентификатор организации не совпадает с владельцем карты пациента",
			});
		}

		const organizationId = patientOrgId ?? resolvedCandidateOrgId;
		if (!organizationId) {
			return reply.status(400).send({
				error: "MissingOrganizationContext",
				message: "Не удалось определить организацию для входящего отчета Diagnocat",
			});
		}

		// Если для конкретной организации задан персональный секрет в окружении, требуем именно его
		const orgEnvKey = `DIAGNOCAT_WEBHOOK_SECRET_${organizationId.replace(/-/g, "_").toUpperCase()}`;
		const orgSpecificSecret = process.env[orgEnvKey]?.trim();
		if (orgSpecificSecret) {
			const orgVerified = verifyWebhookSecret(request, reply, {
				channel: "diagnocat",
				secretEnvNames: [orgEnvKey],
				extraHeaderNames: [
					"x-diagnocat-api-key",
					"x-diagnocat-secret",
					"x-clinical-ai-api-key",
					"x-api-key",
				],
			});
			if (!orgVerified) return;
		}

		const inserted = await withTenantWriteCtx(organizationId, async (tx) => {
			const [patientRow] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.id, body.patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!patientRow) {
				return null;
			}

			return tx
				.insert(radiologyAiReports)
				.values({
					organizationId,
					patientId: body.patientId,
					reportUrl: body.reportUrl,
					odontogramData: body.odontogramData,
				})
				.returning();
		});

		if (!inserted) {
			return reply.status(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в указанной клинике.",
			});
		}

		return reply.send({ success: true, reportId: inserted[0]?.id });
	};

	const reportsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"integrations.diagnocat.read",
		);
		if (!context) return;
		const { organizationId } = context;

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

		const parsedParams = diagnocatReportsParamsSchema.safeParse(request.params ?? {});
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор пациента должен быть валидным UUID.",
			});
		}
		const { patientId } = parsedParams.data;

		const reports = await withTenantReadCtx(organizationId, async (tx) =>
			tx
				.select()
				.from(radiologyAiReports)
				.where(
					and(
						eq(radiologyAiReports.patientId, patientId),
						eq(radiologyAiReports.organizationId, organizationId),
					),
				)
				.orderBy(radiologyAiReports.createdAt),
		);

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
	defineWebhookRoute(app, {
		method: "POST",
		path: "/api/clinical-ai/webhook",
		handler: async ({ request, reply }) => webhookHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical-ai/reports/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => reportsHandler(request, reply),
	});

	// Legacy compatibility aliases
	defineWebhookRoute(app, {
		method: "POST",
		path: "/api/integrations/diagnocat/webhook",
		handler: async ({ request, reply }) => webhookHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/integrations/diagnocat/reports/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => reportsHandler(request, reply),
	});
}

export const registerDiagnocatRoutes = registerDiagnocatIntegrationRoutes;
export const registerClinicalAiRoutes = registerDiagnocatIntegrationRoutes;
