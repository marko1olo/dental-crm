import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { requireOrganizationId } from "../../security/identity.js";
import { fetchPatientConsentsList, recordPatientConsentEntry } from "./queries.js";
import { generateConsentShareLink } from "./shareLink.js";
import { saveConsentBodySchema, shareConsentLinkSchema } from "./types.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function register(app: FastifyInstance) {
	app.get("/api/patients/:patientId/consents", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "consents read"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		if (!patientId || !UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const consents = await fetchPatientConsentsList(orgId, patientId);
		return reply.send({ consents });
	});

	app.post("/api/patients/:patientId/consents", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "consents save"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		if (!patientId || !UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const parsed = saveConsentBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные данные согласия",
				details: parsed.error.issues,
			});
		}

		const result = await recordPatientConsentEntry(orgId, patientId, parsed.data);
		return reply.code(201).send(result);
	});

	app.post("/api/patients/:patientId/consents/share-link", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "consents share"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		if (!patientId || !UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const parsed = shareConsentLinkSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры ссылки",
				details: parsed.error.issues,
			});
		}

		const host = request.headers.host ?? "127.0.0.1:5173";
		const proto = (request.headers["x-forwarded-proto"] as string) ?? "http";
		const origin = `${proto}://${host}`;

		const result = generateConsentShareLink(origin, patientId, parsed.data);
		return reply.send(result);
	});
}
