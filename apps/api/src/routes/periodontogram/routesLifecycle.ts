import { computePayloadHash } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { periodontogramSnapshots } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { computeSnapshotIndices } from "../../services/periodontogramIndices.js";
import {
	closeSnapshotBodySchema,
	fetchSnapshotTeethAndSites,
	resolveExistingPerioUserId,
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
		const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
		if (idempotencyKey) {
			if (!UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);

			// Каноническая проверка idempotencyKeys: при сетевом ретрае закрытия возвращаем кэшированный 200 OK
			const [existingRecord] = await db
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
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
						message: "Операция закрытия осмотра пародонтограммы с данным Idempotency-Key уже выполняется.",
					});
				}
			}
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
		const identity = getRequestIdentity(req);
		const rawUserId = identity.userId ?? snapshot.recordedByUserId ?? null;
		const closedByUserId = await resolveExistingPerioUserId(orgId, rawUserId);

		// Дефект 2: атомарная транзакция закрытия снимка periodontogram_snapshots
		// Чтение fetchSnapshotTeethAndSites(id, tx) перенесено внутрь единой транзакции
		const { closed, formattedTeeth } = await db.transaction(async (tx) => {
			const { teeth, sites, formattedTeeth } = await fetchSnapshotTeethAndSites(id, tx);
			const computedIndices = computeSnapshotIndices(teeth, sites);

			const [result] = await tx
				.update(periodontogramSnapshots)
				.set({
					status: "closed",
					closedAt: new Date(),
					closedByUserId,
					indices: {
						...((snapshot.indices as Record<string, unknown>) || {}),
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
			return { closed: result, formattedTeeth };
		});

		const responsePayload = { success: true, data: { ...closed, teeth: formattedTeeth } };

		if (idempotencyKey) {
			try {
				await db
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(req.body ?? {}),
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
				req.log.warn(
					{ err: idemErr, idempotencyKey, orgId },
					"[periodontogram] Не удалось сохранить ключ идемпотентности",
				);
			}
		}

		return reply.send(responsePayload);
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
