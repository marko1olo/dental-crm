import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { db as database } from "../../db/client.js";
import { visits } from "../../db/schema.js";
import {
	fetchPatientLatestPeriodontogram,
	upsertPatientFullPeriodontogram,
	type PatchToothInput,
	type SiteItemInput,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerVisitPerioRoutes(app: FastifyInstance) {
	const getHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit perio read",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		if (!UUID_REGEX.test(visitId)) {
			return reply.code(400).send({
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма",
			});
		}

		const [visit] = await database
			.select({
				id: visits.id,
				patientId: visits.patientId,
				organizationId: visits.organizationId,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitId),
					eq(visits.organizationId, context.organizationId),
				),
			)
			.limit(1);

		if (!visit) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		// Актуальная пародонтограмма пациента (черновик или последний закрытый снимок — ADR 0013 SSOT)
		const latestPerio = await fetchPatientLatestPeriodontogram(
			context.organizationId,
			visit.patientId,
		);

		return reply.send({
			ok: true,
			success: true,
			visitId: visit.id,
			patientId: visit.patientId,
			data: latestPerio,
		});
	};

	const postHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit perio update",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		if (!UUID_REGEX.test(visitId)) {
			return reply.code(400).send({
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма",
			});
		}

		const [visit] = await database
			.select({
				id: visits.id,
				patientId: visits.patientId,
				organizationId: visits.organizationId,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitId),
					eq(visits.organizationId, context.organizationId),
				),
			)
			.limit(1);

		if (!visit) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		const body = (request.body as Record<string, unknown>) || {};
		const rawTeeth = Array.isArray(body.teeth)
			? body.teeth
			: Array.isArray(body.teethData)
				? body.teethData
				: [];
		const teeth = rawTeeth as PatchToothInput[];
		const sites = (Array.isArray(body.sites) ? body.sites : []) as SiteItemInput[];
		const summary = body.summary ?? body.summaryData ?? {};
		const psr = body.psr ?? body.psrData ?? null;
		const notes = typeof body.notes === "string" ? body.notes : null;
		const status = body.status === "closed" ? "closed" : "draft";
		const autoClose = Boolean(body.autoClose);

		const identity = getRequestIdentity(request);
		const doctorUserId = identity.userId ?? null;

		// Сохраняем в единую каноническую систему periodontogram_snapshots / teeth / sites (ADR 0013)
		const savedSnapshot = await upsertPatientFullPeriodontogram({
			orgId: context.organizationId,
			patientId: visit.patientId,
			recordedByUserId: doctorUserId,
			teeth,
			sites,
			notes,
			status,
			autoClose,
			psrData: ((psr ?? summary) as Record<string, unknown>) || undefined,
		});

		return reply.send({
			ok: true,
			success: true,
			visitId: visit.id,
			patientId: visit.patientId,
			data: savedSnapshot,
		});
	};

	// Регистрация обоих путей: /api/visits/:visitId/perio и /api/clinical/visits/:visitId/perio
	app.get("/api/visits/:visitId/perio", getHandler);
	app.get("/api/clinical/visits/:visitId/perio", getHandler);

	app.post("/api/visits/:visitId/perio", postHandler);
	app.post("/api/clinical/visits/:visitId/perio", postHandler);

	app.put("/api/visits/:visitId/perio", postHandler);
	app.put("/api/clinical/visits/:visitId/perio", postHandler);
}
