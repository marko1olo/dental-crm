import { computePayloadHash } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { periodontogramTeeth } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import {
	batchUpsertTeeth,
	patchTeethPayloadSchema,
	patchToothBodySchema,
} from "../../services/periodontogramService.js";
import { findDraftSnapshotOrSendError } from "./routesMutationsSites.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerToothMutationRoutes(app: FastifyInstance) {
	/**
	 * 5. PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber
	 * Сохранение параметров зуба (подвижность, фуркации, статус)
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/teeth/:toothNumber",
		async (req, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				req,
				reply,
				"periodontogram tooth patch",
			);
			if (!orgId) return;
			const { id, toothNumber: rawTn } = req.params as {
				id: string;
				toothNumber: string;
			};
			const toothNumber = Number.parseInt(rawTn, 10);
			if (!UUID_REGEX.test(id) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({
					error: "InvalidParameters",
					message: "Некорректные параметры запроса",
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

			const parsed = patchToothBodySchema.safeParse(req.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры зуба",
					details: parsed.error.format(),
				});
			}
			const data = parsed.data;
			const isPresent = data.isPresent ?? data.is_present;
			const isImplant = data.isImplant ?? data.is_implant;
			const furcationBuccal = data.furcationBuccal ?? data.furcation_buccal;
			const furcationLingual = data.furcationLingual ?? data.furcation_lingual;
			const keratinizedGingivaMm =
				data.keratinizedGingivaMm ?? data.keratinized_gingiva_mm;

			const updateValues: Partial<typeof periodontogramTeeth.$inferInsert> = {
				updatedAt: new Date(),
			};
			if (isPresent !== undefined) updateValues.isPresent = isPresent;
			if (isImplant !== undefined) updateValues.isImplant = isImplant;
			if (data.mobility !== undefined) updateValues.mobility = data.mobility;
			if (data.prognosis !== undefined) updateValues.prognosis = data.prognosis;
			if (furcationBuccal !== undefined)
				updateValues.furcationBuccal = furcationBuccal;
			if (furcationLingual !== undefined)
				updateValues.furcationLingual = furcationLingual;
			if (keratinizedGingivaMm !== undefined)
				updateValues.keratinizedGingivaMm = keratinizedGingivaMm;

			const updatedTooth = await db.transaction(async (tx) => {
				const [result] = await tx
					.update(periodontogramTeeth)
					.set(updateValues)
					.where(
						and(
							eq(periodontogramTeeth.snapshotId, id),
							eq(periodontogramTeeth.toothNumber, toothNumber),
						),
					)
					.returning();
				return result;
			});

			if (!updatedTooth) {
				return reply.code(404).send({
					error: "ToothNotFound",
					message: `Зуб ${toothNumber} не найден в данном осмотре`,
				});
			}

			const responsePayload = { success: true, data: updatedTooth };

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

	/**
	 * 5b. PATCH /api/periodontogram/snapshots/:id/teeth
	 * Пакетное сохранение параметров нескольких зубов
	 */
	app.patch("/api/periodontogram/snapshots/:id/teeth", async (req, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"periodontogram batch teeth patch",
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

		const parsed = patchTeethPayloadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры зубов",
				details: parsed.error.format(),
			});
		}
		const rawList = Array.isArray(parsed.data)
			? parsed.data
			: parsed.data.teeth;
		if (rawList.length === 0) return reply.send({ success: true, data: [] });

		const updatedList = await db.transaction(async (tx) => {
			return await batchUpsertTeeth(tx, id, rawList);
		});

		const responsePayload = { success: true, data: updatedList };

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
}
