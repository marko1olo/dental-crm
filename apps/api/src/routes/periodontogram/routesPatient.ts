import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fetchPatientLatestPeriodontogram,
	resolvePerioPatientId,
	upsertPatientFullPeriodontogram,
} from "../../services/periodontogramService.js";
import {
	getHygieneRecommendations,
	getHygienePlanText,
} from "../../services/periodontogramIndices.js";

export async function registerPatientPeriodontogramRoutes(app: FastifyInstance) {
	const handleGet = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId: rawPatientId } = request.params as { patientId: string };
		if (!rawPatientId || typeof rawPatientId !== "string" || !rawPatientId.trim()) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		const patientId = await resolvePerioPatientId(orgId, rawPatientId);
		const data = await fetchPatientLatestPeriodontogram(orgId, patientId);
		if (!data) {
			return reply.send({ success: true, data: null });
		}

		// Связка с рекомендациями гигиены по коду PSR
		const psrCode = Number((data as any).indices?.psr ?? 0);
		const hasAsterisk = Boolean((data as any).indices?.hasAsterisk);
		const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
		const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

		return reply.send({
			success: true,
			data: {
				...data,
				patientId,
				psrCode,
				hygieneRecommendations,
				hygienePlan,
			},
		});
	};

	const handlePost = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"periodontogram patient full upsert",
		);
		if (!orgId) return;

		const { patientId: rawPatientId } = request.params as { patientId: string };
		if (!rawPatientId || typeof rawPatientId !== "string" || !rawPatientId.trim()) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		const patientId = await resolvePerioPatientId(orgId, rawPatientId);
		const body = (request.body as Record<string, unknown>) || {};
		const identity = getRequestIdentity(request);
		const recordedByUserId = identity.userId ?? null;

		const result = await upsertPatientFullPeriodontogram({
			orgId,
			patientId,
			recordedByUserId,
			teeth: Array.isArray(body.teeth) ? (body.teeth as any) : undefined,
			sites: Array.isArray(body.sites) ? (body.sites as any) : undefined,
			notes: typeof body.notes === "string" ? body.notes : undefined,
			status: body.status === "closed" ? "closed" : "draft",
			autoClose: Boolean(body.autoClose),
			psrData: (body.indices as any)?.psrData ?? (body.psrData as any),
		});

		// Расчет рекомендаций гигиены
		const psrCode = Number((result as any).indices?.psr ?? body.psrCode ?? 0);
		const hasAsterisk = Boolean((result as any).indices?.hasAsterisk ?? body.hasAsterisk);
		const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
		const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

		return reply.send({
			success: true,
			data: {
				...result,
				patientId,
				psrCode,
				hygieneRecommendations,
				hygienePlan,
			},
		});
	};

	// Единые SSOT роуты: /api/periodontogram/:patientId и /api/perio/:patientId
	app.get("/api/periodontogram/:patientId", handleGet);
	app.get("/api/perio/:patientId", handleGet);
	app.post("/api/periodontogram/:patientId", handlePost);
	app.post("/api/perio/:patientId", handlePost);
	app.put("/api/periodontogram/:patientId", handlePost);
	app.put("/api/perio/:patientId", handlePost);
}
