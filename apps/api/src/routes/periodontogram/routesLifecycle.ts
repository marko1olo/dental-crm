import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { periodontogramSnapshots } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { computeSnapshotIndices } from "../../services/periodontogramIndices.js";
import {
	closeSnapshotBodySchema,
	fetchSnapshotTeethAndSites,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerLifecyclePeriodontogramRoutes(app: FastifyInstance) {
	/**
	 * 7. POST /api/periodontogram/snapshots/:id/close
	 * Расчет индексов, заморозка JSONB, перевод в closed
	 */
	app.post("/api/periodontogram/snapshots/:id/close", async (req, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"periodontogram close",
		);
		if (!orgId) return;
		const { id } = req.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({
				error: "InvalidSnapshotId",
				message: "Некорректный идентификатор осмотра",
			});
		}
		const [snapshot] = await db
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
			return reply.code(404).send({
				error: "SnapshotNotFound",
				message: "Осмотр не найден",
			});
		}
		if (snapshot.status === "closed") {
			return reply.code(409).send({
				error: "SnapshotAlreadyClosed",
				message: "Snapshot is already closed",
			});
		}

		const parsed = closeSnapshotBodySchema.safeParse(req.body);
		const notes =
			parsed.success && parsed.data?.notes !== undefined
				? parsed.data.notes
				: snapshot.notes;
		const { teeth, sites, formattedTeeth } = await fetchSnapshotTeethAndSites(id);
		const computedIndices = computeSnapshotIndices(teeth, sites);
		const identity = getRequestIdentity(req);
		const closedByUserId = identity.userId ?? snapshot.recordedByUserId ?? null;

		const [closed] = await db
			.update(periodontogramSnapshots)
			.set({
				status: "closed",
				closedAt: new Date(),
				closedByUserId,
				indices: computedIndices,
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

		return reply.send({ success: true, data: { ...closed, teeth: formattedTeeth } });
	});

	/**
	 * 8. DELETE /api/periodontogram/snapshots/:id
	 * Удаление драфта (удаление закрытого снимка запрещено — 409 Conflict)
	 */
	app.delete("/api/periodontogram/snapshots/:id", async (req, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"periodontogram discard",
		);
		if (!orgId) return;
		const { id } = req.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({
				error: "InvalidSnapshotId",
				message: "Некорректный идентификатор осмотра",
			});
		}
		const [snapshot] = await db
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
			return reply.code(404).send({
				error: "SnapshotNotFound",
				message: "Осмотр не найден",
			});
		}
		if (snapshot.status !== "draft") {
			return reply.code(409).send({
				error: "CannotDiscardClosedSnapshot",
				message: "Only draft snapshots can be discarded",
			});
		}

		await db
			.delete(periodontogramSnapshots)
			.where(
				and(
					eq(periodontogramSnapshots.id, id),
					eq(periodontogramSnapshots.organizationId, orgId),
				),
			);
		return reply.code(204).send();
	});
}
