import {
	computePayloadHash,
	SEPA_SITE_CODES,
	type SepaSiteCode,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import {
	batchUpsertSites,
	patchSitesPayloadSchema,
	siteItemSchema,
	upsertSingleSiteRecord,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findDraftSnapshotOrSendError(
	id: string,
	orgId: string,
	reply: FastifyReply,
) {
	if (!UUID_REGEX.test(id)) {
		reply.code(400).send({
			error: "InvalidSnapshotId",
			message: "Некорректный идентификатор осмотра",
		});
		return null;
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
		reply.code(404).send({
			error: "SnapshotNotFound",
			message: "Осмотр не найден",
		});
		return null;
	}
	if (snapshot.status === "closed") {
		reply.code(409).send({
			error: "SnapshotClosed",
			message: "Snapshot is closed and immutable",
		});
		return null;
	}
	return snapshot;
}

export function registerSiteMutationRoutes(app: FastifyInstance) {
	/**
	 * 6. PATCH /api/periodontogram/snapshots/:id/sites
	 * Пакетное или одиночное сохранение сайтов зондирования
	 */
	app.patch("/api/periodontogram/snapshots/:id/sites", async (req, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"periodontogram sites patch",
		);
		if (!orgId) return;
		const { id } = req.params as { id: string };

		const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
		if (idempotencyKey) {
			if (!UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);

			// Каноническая проверка idempotencyKeys: при сетевом ретрае возвращаем кэшированный ответ
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
			}
		}

		const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
		if (!snapshot) return;

		const parsed = patchSitesPayloadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сайтов зондирования",
				details: parsed.error.format(),
			});
		}

		const rawList = Array.isArray(parsed.data)
			? parsed.data
			: "sites" in parsed.data
				? parsed.data.sites
				: [parsed.data];
		if (rawList.length === 0) return reply.send({ success: true, data: [] });

		const savedSites = await db.transaction(async (tx) => {
			const teethRows = await tx
				.select({
					id: periodontogramTeeth.id,
					toothNumber: periodontogramTeeth.toothNumber,
				})
				.from(periodontogramTeeth)
				.where(eq(periodontogramTeeth.snapshotId, id));

			const toothIdMap = new Map<number, string>(
				teethRows.map((t) => [t.toothNumber, t.id]),
			);

			return await batchUpsertSites(tx, id, rawList, toothIdMap);
		});

		const responsePayload = { success: true, data: savedSites };

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
	 * 6b. PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode
	 * Одиночное сохранение сайта зондирования по REST-пути
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode",
		async (req, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				req,
				reply,
				"periodontogram single site patch",
			);
			if (!orgId) return;
			const {
				id,
				toothNumber: rawTn,
				siteCode,
			} = req.params as {
				id: string;
				toothNumber: string;
				siteCode: string;
			};

			const idempotencyKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
			if (idempotencyKey) {
				if (!UUID_REGEX.test(idempotencyKey)) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
					});
				}
				reply.header("Idempotency-Key", idempotencyKey);

				// Каноническая проверка idempotencyKeys: при сетевом ретрае возвращаем кэшированный ответ
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
				}
			}
			const toothNumber = Number.parseInt(rawTn, 10);
			const rawSiteCode = (siteCode || "").toUpperCase();
			const normalizedSiteCode =
				rawSiteCode === "MB" ? "MV" :
				rawSiteCode === "B" ? "V" :
				rawSiteCode === "DB" ? "DV" : rawSiteCode;

			if (
				!UUID_REGEX.test(id) ||
				Number.isNaN(toothNumber) ||
				!SEPA_SITE_CODES.includes(normalizedSiteCode as SepaSiteCode)
			) {
				return reply.code(400).send({
					error: "InvalidParameters",
					message: "Некорректные параметры сайта",
				});
			}
			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
			if (!snapshot) return;

			const parsed = siteItemSchema.safeParse(req.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры сайта зондирования",
					details: parsed.error.format(),
				});
			}
			const saved = await db.transaction(async (tx) => {
				const [tooth] = await tx
					.select({ id: periodontogramTeeth.id })
					.from(periodontogramTeeth)
					.where(
						and(
							eq(periodontogramTeeth.snapshotId, id),
							eq(periodontogramTeeth.toothNumber, toothNumber),
						),
					)
					.limit(1);

				return await upsertSingleSiteRecord(
					tx,
					id,
					tooth?.id ?? null,
					toothNumber,
					normalizedSiteCode,
					parsed.data,
				);
			});

			const responsePayload = { success: true, data: saved };

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
		},
	);
}
