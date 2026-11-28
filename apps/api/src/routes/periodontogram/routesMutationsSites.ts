import { SEPA_SITE_CODES, type SepaSiteCode } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { type TenantDb } from "../../db/rls.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../../db/schema.js";
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
	txDb: TenantDb,
) {
	if (!UUID_REGEX.test(id)) {
		reply.code(400).send({
			error: "InvalidSnapshotId",
			message: "Некорректный идентификатор осмотра",
		});
		return null;
	}
	const [snapshot] = await txDb
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
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/periodontogram/snapshots/:id/sites",
		permission: "clinical.write",
		authOptions: {
			requireStaffToken: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: patchSitesPayloadSchema,
		validationErrorMessage: "Некорректные параметры сайтов зондирования",
		execute: async ({ tx, organizationId: orgId, body: parsedData, request: req, reply }) => {
			const rawParams = req.params;
			const id =
				typeof rawParams === "object" && rawParams !== null && "id" in rawParams && typeof rawParams.id === "string"
					? rawParams.id
					: "";

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
				: "sites" in parsedData
					? parsedData.sites
					: [parsedData];

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply, tx);
			if (!snapshot) return undefined;
			if (rawList.length === 0) return { success: true, data: [] };

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

			const savedSites = await batchUpsertSites(tx, id, rawList, toothIdMap);

			return { success: true, data: savedSites };
		},
	});

	/**
	 * 6b. PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode
	 * Одиночное сохранение сайта зондирования по REST-пути
	 */
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode",
		permission: "clinical.write",
		authOptions: {
			requireStaffToken: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		bodySchema: siteItemSchema,
		validationErrorMessage: "Некорректные параметры сайта зондирования",
		execute: async ({ tx, organizationId: orgId, body: parsedData, request: req, reply }) => {
			const rawParams = req.params;
			const id =
				typeof rawParams === "object" && rawParams !== null && "id" in rawParams && typeof rawParams.id === "string"
					? rawParams.id
					: "";
			const rawTn =
				typeof rawParams === "object" && rawParams !== null && "toothNumber" in rawParams && typeof rawParams.toothNumber === "string"
					? rawParams.toothNumber
					: "";
			const siteCode =
				typeof rawParams === "object" && rawParams !== null && "siteCode" in rawParams && typeof rawParams.siteCode === "string"
					? rawParams.siteCode
					: "";

			const rawIdem = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
			const idempotencyKey = typeof rawIdem === "string" ? rawIdem : undefined;
			if (idempotencyKey && !UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
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

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply, tx);
			if (!snapshot) return undefined;

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

			const saved = await upsertSingleSiteRecord(
				tx,
				id,
				tooth?.id ?? null,
				toothNumber,
				normalizedSiteCode,
				parsedData,
			);

			return { success: true, data: saved };
		},
	});
}
