import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { periodontogramTeeth } from "../../db/schema.js";
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
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/periodontogram/snapshots/:id/teeth/:toothNumber",
		permission: "clinical.write",
		authOptions: {
			requireStaffToken: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: patchToothBodySchema,
		validationErrorMessage: "Некорректные параметры зуба",
		execute: async ({ tx, organizationId: orgId, body: data, request: req, reply }) => {
			const rawParams = req.params;
			const id =
				typeof rawParams === "object" && rawParams !== null && "id" in rawParams && typeof rawParams.id === "string"
					? rawParams.id
					: "";
			const rawTn =
				typeof rawParams === "object" && rawParams !== null && "toothNumber" in rawParams && typeof rawParams.toothNumber === "string"
					? rawParams.toothNumber
					: "";
			const toothNumber = Number.parseInt(rawTn, 10);
			if (!UUID_REGEX.test(id) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({
					error: "InvalidParameters",
					message: "Некорректные параметры запроса",
				});
			}
			const rawIdem = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawIdem === "string" ? rawIdem : undefined;
			if (idempotencyKey && !UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}

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

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply, tx);
			if (!snapshot) return undefined;

			const [updatedTooth] = await tx
				.update(periodontogramTeeth)
				.set(updateValues)
				.where(
					and(
						eq(periodontogramTeeth.snapshotId, id),
						eq(periodontogramTeeth.toothNumber, toothNumber),
					),
				)
				.returning();

			if (!updatedTooth) {
				return reply.code(404).send({
					error: "ToothNotFound",
					message: `Зуб ${toothNumber} не найден в данном осмотре`,
				});
			}

			return { success: true, data: updatedTooth };
		},
	});

	/**
	 * 5b. PATCH /api/periodontogram/snapshots/:id/teeth
	 * Пакетное сохранение параметров нескольких зубов
	 */
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/periodontogram/snapshots/:id/teeth",
		permission: "clinical.write",
		authOptions: {
			requireStaffToken: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: patchTeethPayloadSchema,
		validationErrorMessage: "Некорректные параметры зубов",
		execute: async ({ tx, organizationId: orgId, body: parsedData, request: req, reply }) => {
			const { id } = req.params as { id: string };

			if (!UUID_REGEX.test(id)) {
				return reply.code(400).send({
					error: "InvalidSnapshotId",
					message: "Некорректный идентификатор осмотра",
				});
			}

			const rawIdem = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawIdem === "string" ? rawIdem : undefined;
			if (idempotencyKey && !UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}

			const rawList = Array.isArray(parsedData)
				? parsedData
				: parsedData.teeth;

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply, tx);
			if (!snapshot) return undefined;
			if (rawList.length === 0) return { success: true, data: [] };
			const updatedList = await batchUpsertTeeth(tx, id, rawList);

			return { success: true, data: updatedList };
		},
	});
}
