import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantWriteCtx } from "../../db/rls.js";
import { periodontogramSnapshots } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { computeSnapshotIndices } from "../../services/periodontogramIndices.js";
import {
	closeSnapshotBodySchema,
	fetchSnapshotTeethAndSites,
	resolveExistingPerioUserId,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const snapshotIdParamSchema = z.object({
	id: z.string().regex(UUID_REGEX, "Некорректный идентификатор осмотра"),
});

export async function registerLifecyclePeriodontogramRoutes(app: FastifyInstance) {
	/**
	 * 7. POST /api/periodontogram/snapshots/:id/close
	 * Расчет индексов, заморозка JSONB, перевод в closed
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/periodontogram/snapshots/:id/close",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				req,
				reply,
				"periodontogram close",
			);
			if (!orgId) return reply;
			const paramParsed = snapshotIdParamSchema.safeParse(req.params);
			if (!paramParsed.success) {
				return reply.code(400).send({
					error: "InvalidSnapshotId",
					message: "Некорректный идентификатор осмотра",
				});
			}
			const { id } = paramParsed.data;
			const rawIdemHeader = req.headers["idempotency-key"] ?? req.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawIdemHeader === "string" ? rawIdemHeader : undefined;
			if (idempotencyKey) {
				if (!UUID_REGEX.test(idempotencyKey)) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
					});
				}
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const parsed = closeSnapshotBodySchema.safeParse(req.body);
			const parsedNotes = parsed.success ? parsed.data?.notes : undefined;
			const identity = getRequestIdentity(req);

			const txResult = await withTenantWriteCtx(orgId, async (tx) => {
				const [snapshot] = await tx
					.select()
					.from(periodontogramSnapshots)
					.where(
						and(
							eq(periodontogramSnapshots.id, id),
							eq(periodontogramSnapshots.organizationId, orgId),
						),
					)
					.limit(1);
				if (!snapshot) {
					return { kind: "not_found" as const };
				}
				if (snapshot.status === "closed") {
					return { kind: "already_closed" as const };
				}

				const notes = parsedNotes !== undefined ? parsedNotes : snapshot.notes;
				const rawUserId = identity.userId ?? snapshot.recordedByUserId ?? null;
				const closedByUserId = await resolveExistingPerioUserId(orgId, rawUserId, tx);

				const { teeth, sites, formattedTeeth } = await fetchSnapshotTeethAndSites(id, tx);
				const computedIndices = computeSnapshotIndices(teeth, sites);

				const existingIndices: Record<string, unknown> =
					snapshot.indices && typeof snapshot.indices === "object" && !Array.isArray(snapshot.indices)
						? { ...snapshot.indices }
						: {};

				const [closed] = await tx
					.update(periodontogramSnapshots)
					.set({
						status: "closed",
						closedAt: new Date(),
						closedByUserId,
						indices: {
							...existingIndices,
							...computedIndices,
						},
						notes,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(periodontogramSnapshots.id, id),
							eq(periodontogramSnapshots.organizationId, orgId),
						),
					)
					.returning();
				return { kind: "ok" as const, closed, formattedTeeth };
			});

			if (txResult.kind === "not_found") {
				return reply.code(404).send({
					error: "SnapshotNotFound",
					message: "Осмотр не найден",
				});
			}
			if (txResult.kind === "already_closed") {
				return reply.code(409).send({
					error: "SnapshotAlreadyClosed",
					message: "Snapshot is already closed",
				});
			}

			return reply.send({
				success: true,
				data: { ...txResult.closed, teeth: txResult.formattedTeeth },
			});
		},
	});

	/**
	 * 8. DELETE /api/periodontogram/snapshots/:id
	 * Удаление драфта (удаление закрытого снимка запрещено — 409 Conflict)
	 */
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/periodontogram/snapshots/:id",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				req,
				reply,
				"periodontogram discard",
			);
			if (!orgId) return reply;
			const paramParsed = snapshotIdParamSchema.safeParse(req.params);
			if (!paramParsed.success) {
				return reply.code(400).send({
					error: "InvalidSnapshotId",
					message: "Некорректный идентификатор осмотра",
				});
			}
			const { id } = paramParsed.data;

			const deleteResult = await withTenantWriteCtx(orgId, async (tx) => {
				const [snapshot] = await tx
					.select({
						id: periodontogramSnapshots.id,
						status: periodontogramSnapshots.status,
					})
					.from(periodontogramSnapshots)
					.where(
						and(
							eq(periodontogramSnapshots.id, id),
							eq(periodontogramSnapshots.organizationId, orgId),
						),
					)
					.limit(1);
				if (!snapshot) {
					return { kind: "not_found" as const };
				}
				if (snapshot.status !== "draft") {
					return { kind: "closed" as const };
				}

				await tx
					.delete(periodontogramSnapshots)
					.where(
						and(
							eq(periodontogramSnapshots.id, id),
							eq(periodontogramSnapshots.organizationId, orgId),
						),
					);
				return { kind: "deleted" as const };
			});

			if (deleteResult.kind === "not_found") {
				return reply.code(404).send({
					error: "SnapshotNotFound",
					message: "Осмотр не найден",
				});
			}
			if (deleteResult.kind === "closed") {
				return reply.code(409).send({
					error: "CannotDiscardClosedSnapshot",
					message: "Only draft snapshots can be discarded",
				});
			}

			return reply.code(204).send();
		},
	});
}
