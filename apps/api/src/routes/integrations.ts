import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

export default async function registerIntegrationsRoutes(app: FastifyInstance) {
	/**
	 * GET /api/integrations/egisz-blank-permissions — список разрешений на бланки.
	 *
	 * Фронтенд: EgiszBlankPermissionsWidget.tsx:105.
	 * Контракт из contract-breach-proofs.test.ts.
	 */
	app.get(
		"/api/integrations/egisz-blank-permissions",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"egisz blank permissions",
					))
				)
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				const rows = await db
					.select()
					.from(schema.egiszBlankPermissions)
					.where(eq(schema.egiszBlankPermissions.organizationId, orgId));

				return reply.status(200).send({ permissions: rows });
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Не удалось получить разрешения на бланки ЕГИСЗ",
				});
			}
		},
	);
}
