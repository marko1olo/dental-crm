import { hygieneIndicesSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { visits } from "../../db/schema.js";

export function registerVisitHygieneRoutes(app: FastifyInstance) {
	app.get(
		"/api/patients/:patientId/hygiene-indices/latest",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"patient latest hygiene indices",
			);
			if (!context) return;
			const { patientId } = request.params as { patientId: string };
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

			return {
				latest: (latest?.hygieneIndices as any) ?? null,
				visitId: latest?.id ?? null,
				createdAt: latest?.createdAt ? latest.createdAt.toISOString() : null,
			};
		},
	);

	app.post("/api/visits/:visitId/hygiene-indices", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"update visit hygiene indices",
		);
		if (!context) return;
		const { visitId } = request.params as { visitId: string };
		const parsed = hygieneIndicesSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return { error: "ValidationError", issues: parsed.error.issues };
		}
		const [updated] = await database
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
			ok: true,
			visitId,
			hygieneIndices: updated?.hygieneIndices ?? parsed.data,
		};
	});
}
