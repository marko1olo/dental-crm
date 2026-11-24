import {
	hygieneIndicesSchema,
	isValidUuid,
	type HygieneIndices,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { visitDiaries, visits } from "../../db/schema.js";
import { extractIdempotencyKey } from "../../utils/httpIdempotency.js";

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
			const latest = await withTenantCtx(context.organizationId, async (tx) => {
				const [row] = await tx
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
				return row ?? null;
			});

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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "InvalidIdempotencyKey",
					message:
						"Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const txResult = await withTenantCtx(context.organizationId, async (tx) => {
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

			return {
				kind: "ok" as const,
				hygieneIndices: updated?.hygieneIndices ?? parsed.data,
			};
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

		return {
			ok: true,
			visitId,
			hygieneIndices: txResult.hygieneIndices,
		};
	});
}
