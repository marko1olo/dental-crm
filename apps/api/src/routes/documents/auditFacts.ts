import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { requireOrganizationId } from "../../security/identity.js";
import { apiError, buildDocumentAuditFacts } from "./shared.js";

export async function register(app: FastifyInstance) {
	app.get("/api/documents/:id/audit-facts", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "document audit facts"))
		)
			return;
		const { id } = request.params as { id: string };
		const UUID_REGEX =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!id || !UUID_REGEX.test(id)) {
			return reply
				.code(400)
				.send(
					apiError("Некорректный идентификатор документа (ожидается UUID)"),
				);
		}
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
