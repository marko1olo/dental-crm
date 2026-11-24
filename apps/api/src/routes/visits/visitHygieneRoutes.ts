import {
	computePayloadHash,
	generateUuidV7,
	hygieneIndicesSchema,
	type HygieneIndices,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { visitDiaries, visits } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerVisitHygieneRoutes(app: FastifyInstance) {
	app.get<{ Params: { patientId: string } }>(
		"/api/patients/:patientId/hygiene-indices/latest",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"patient latest hygiene indices",
			);
			if (!context) return;
			const { patientId } = request.params;
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}
			const [latest] = await database
				.select({
					id: visits.id,
					hygieneIndices: visits.hygieneIndices,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.patientId, patientId),
						eq(visits.organizationId, context.organizationId),
						sql`${visits.hygieneIndices} IS NOT NULL`,
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(1);

			const parsedLatest: HygieneIndices | null = latest?.hygieneIndices
				? (hygieneIndicesSchema.safeParse(latest.hygieneIndices).data ?? null)
				: null;

			return {
				latest: parsedLatest,
				visitId: latest?.id ?? null,
				createdAt: latest?.createdAt ? latest.createdAt.toISOString() : null,
			};
		},
	);

	app.post<{ Params: { visitId: string } }>("/api/visits/:visitId/hygiene-indices", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"update visit hygiene indices",
		);
		if (!context) return;
		const { visitId } = request.params;
		if (!UUID_REGEX.test(visitId)) {
			return reply.code(400).send({
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма",
			});
		}
		const parsed = hygieneIndicesSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return { error: "ValidationError", issues: parsed.error.issues };
		}

		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: generateUuidV7();

		reply.header("Idempotency-Key", idempotencyKey);

		return await database.transaction(async (tx) => {
			const [existingKeyRecord] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, context.organizationId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingKeyRecord) {
				if (existingKeyRecord.status === "completed" && existingKeyRecord.responseBody) {
					reply.header("idempotency-replayed", "true");
					return reply.code(existingKeyRecord.responseCode || 200).send(existingKeyRecord.responseBody);
				}
				if (existingKeyRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция сохранения индексов гигиены с данным Idempotency-Key уже выполняется.",
					});
				}
			}

			const [visit] = await tx
				.select({
					id: visits.id,
					status: visits.status,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, context.organizationId),
					),
				)
				.for("update")
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
				return reply.code(422).send({
					error: "VISIT_PROTOCOL_LOCKED",
					message: "Протокол приёма подписан и защищён от изменений.",
				});
			}

			const [updated] = await tx
				.update(visits)
				.set({
					hygieneIndices: parsed.data,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, context.organizationId),
					),
				)
				.returning({ id: visits.id, hygieneIndices: visits.hygieneIndices });

			const responseBody = {
				ok: true,
				visitId,
				hygieneIndices: updated?.hygieneIndices ?? parsed.data,
			};

			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: context.organizationId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: responseBody as Record<string, unknown>,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: responseBody as Record<string, unknown>,
						responseCode: 200,
					},
				});

			return responseBody;
		});
	});
}
