import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { db as database } from "../../db/client.js";
import { visitDiaries, visits } from "../../db/schema.js";
import {
	fetchPatientLatestPeriodontogram,
	upsertPatientFullPeriodontogram,
	upsertPatientFullPeriodontogramBodySchema,
	type PatchToothInput,
	type SiteItemInput,
} from "../../services/periodontogramService.js";

export function registerVisitPerioRoutes(app: FastifyInstance) {
	const getHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit perio read",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		const visitIdValidation = z.string().uuid().safeParse(visitId);
		if (!visitIdValidation.success) {
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
				status: visits.status,
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
		const visitIdValidation = z.string().uuid().safeParse(visitId);
		if (!visitIdValidation.success) {
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
				status: visits.status,
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

		if (visit.status === "signed") {
			return reply.code(422).send({
				error: "VISIT_PROTOCOL_LOCKED",
				message: "Протокол приёма подписан и защищён от изменений.",
			});
		}

		const [lockedDiary] = await database
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, context.organizationId),
					eq(visitDiaries.isLocked, true),
				),
			)
			.limit(1);

		if (lockedDiary) {
			return reply.code(422).send({
				error: "VISIT_PROTOCOL_LOCKED",
				message: "Протокол приёма подписан и защищён от изменений.",
			});
		}

		const rawBody = (request.body as Record<string, unknown>) || {};
		const { teethData, psr, ...restBody } = rawBody;
		const normalizedBody = {
			...restBody,
			teeth: Array.isArray(rawBody.teeth)
				? rawBody.teeth
				: Array.isArray(teethData)
					? teethData
					: undefined,
			psrData: (rawBody.psrData ?? psr ?? undefined) as Record<string, unknown> | undefined,
		};
		const parsed = upsertPatientFullPeriodontogramBodySchema.safeParse(normalizedBody);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные данные пародонтограммы",
				details: parsed.error.issues,
			});
		}
		const validData = parsed.data;

		const identity = getRequestIdentity(request);
		const doctorUserId = identity.userId ?? null;

		// Сохраняем в единую каноническую систему periodontogram_snapshots / teeth / sites (ADR 0013)
		const savedSnapshot = await upsertPatientFullPeriodontogram({
			orgId: context.organizationId,
			patientId: visit.patientId,
			visitId: visit.id,
			recordedByUserId: doctorUserId,
			teeth: validData.teeth,
			sites: validData.sites,
			notes: validData.notes ?? null,
			status: validData.status,
			autoClose: validData.autoClose,
			psrData: validData.psrData,
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
