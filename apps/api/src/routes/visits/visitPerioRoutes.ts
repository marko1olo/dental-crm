import { computePayloadHash } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { db as database } from "../../db/client.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { visitDiaries, visits } from "../../db/schema.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);

			// Каноническая проверка idempotencyKeys: при сетевом ретрае возвращаем кэшированный ответ
			const [existingRecord] = await database
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, context.organizationId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(existingRecord.responseCode || 200)
						.send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция сохранения пародонтограммы с данным Idempotency-Key уже выполняется.",
					});
				}
			}
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

		const rawBody = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;
		const teeth = Array.isArray(rawBody.teeth)
			? rawBody.teeth
			: Array.isArray(rawBody.teethData)
				? rawBody.teethData
				: undefined;
		const psrData = (rawBody.psrData ?? rawBody.psr ?? undefined) as Record<string, unknown> | undefined;

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

		const responsePayload = {
			ok: true,
			success: true,
			visitId: visit.id,
			patientId: visit.patientId,
			data: savedSnapshot,
		};

		if (idempotencyKey) {
			try {
				await database
					.insert(idempotencyKeys)
					.values({
						clinicId: context.organizationId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 200,
							lockedAt: new Date(),
						},
					});
			} catch (idemErr) {
				request.log.warn(
					{ err: idemErr, idempotencyKey, orgId: context.organizationId },
					"[visitPerio] Не удалось сохранить ключ идемпотентности",
				);
			}
		}

		return reply.send(responsePayload);
	};

	// Регистрация обоих путей: /api/visits/:visitId/perio и /api/clinical/visits/:visitId/perio
	app.get("/api/visits/:visitId/perio", getHandler);
	app.get("/api/clinical/visits/:visitId/perio", getHandler);

	app.post("/api/visits/:visitId/perio", postHandler);
	app.post("/api/clinical/visits/:visitId/perio", postHandler);

	app.put("/api/visits/:visitId/perio", postHandler);
	app.put("/api/clinical/visits/:visitId/perio", postHandler);
}
