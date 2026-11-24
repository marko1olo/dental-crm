import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import { visitDiaries, visits } from "../../db/schema.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	fetchPatientLatestPeriodontogram,
	upsertPatientFullPeriodontogram,
	upsertPatientFullPeriodontogramBodySchema,
} from "../../services/periodontogramService.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

		const latestPerio = await withTenantCtx(context.organizationId, async (tx) => {
			const [visit] = await tx
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
				return null;
			}

			const data = await fetchPatientLatestPeriodontogram(
				context.organizationId,
				visit.patientId,
			);
			return { visit, data };
		});

		if (!latestPerio) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		return reply.send({
			ok: true,
			success: true,
			visitId: latestPerio.visit.id,
			patientId: latestPerio.visit.patientId,
			data: latestPerio.data,
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const rawBody = isPlainRecord(request.body) ? request.body : {};
		const teeth = Array.isArray(rawBody.teeth)
			? rawBody.teeth
			: Array.isArray(rawBody.teethData)
				? rawBody.teethData
				: undefined;
		const psrData = isPlainRecord(rawBody.psrData)
			? rawBody.psrData
			: isPlainRecord(rawBody.psr)
				? rawBody.psr
				: undefined;

		const normalizedBody: Record<string, unknown> = {};
		if (rawBody.visitId !== undefined) normalizedBody.visitId = rawBody.visitId;
		if (teeth !== undefined) normalizedBody.teeth = teeth;
		if (rawBody.sites !== undefined) normalizedBody.sites = rawBody.sites;
		if (rawBody.notes !== undefined) normalizedBody.notes = rawBody.notes;
		if (rawBody.status !== undefined) normalizedBody.status = rawBody.status;
		if (rawBody.autoClose !== undefined) normalizedBody.autoClose = rawBody.autoClose;
		if (psrData !== undefined) normalizedBody.psrData = psrData;
		if (rawBody.psrCode !== undefined) normalizedBody.psrCode = rawBody.psrCode;
		if (rawBody.hasAsterisk !== undefined) normalizedBody.hasAsterisk = rawBody.hasAsterisk;
		if (rawBody.indices !== undefined) normalizedBody.indices = rawBody.indices;

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

		const txResult = await withTenantCtx(context.organizationId, async (tx) => {
			const [visit] = await tx
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
				return { kind: "not_found" as const };
			}

			if (visit.status === "signed") {
				return { kind: "locked" as const };
			}

			const [lockedDiary] = await tx
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
				return { kind: "locked" as const };
			}

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

			return { kind: "ok" as const, visit, savedSnapshot };
		});

		if (txResult.kind === "not_found") {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		if (txResult.kind === "locked") {
			return reply.code(422).send({
				error: "VISIT_PROTOCOL_LOCKED",
				message: "Протокол приёма подписан и защищён от изменений.",
			});
		}

		return reply.send({
			ok: true,
			success: true,
			visitId: txResult.visit.id,
			patientId: txResult.visit.patientId,
			data: txResult.savedSnapshot,
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
