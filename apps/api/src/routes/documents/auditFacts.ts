import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { requireOrganizationId } from "../../security/identity.js";
import { apiError, buildDocumentAuditFacts } from "./shared.js";

const documentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export async function register(app: FastifyInstance) {
	app.get("/api/documents/:id/audit-facts", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "document audit facts"))
		)
			return;
		const parsedParams = documentIdParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply
				.code(400)
				.send(
					apiError("Некорректный идентификатор документа (ожидается UUID)"),
				);
		}
		const { id } = parsedParams.data;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		return withTenantCtx(orgId, async () => {
			const document = await getDocumentById(orgId, id);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			if (!patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

			return reply.send(await buildDocumentAuditFacts(document, patient));
		});
	});
}
