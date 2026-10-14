import {
	SEPA_SITE_CODES,
	type SepaSiteCode,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../db/schema.js";
import {
	patchSitesPayloadSchema,
	patchTeethPayloadSchema,
	patchToothBodySchema,
	siteItemSchema,
	upsertSingleSiteRecord,
} from "../services/periodontogramService.js";

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

export function registerPeriodontogramMutationRoutes(app: FastifyInstance) {
	/**
	 * 5. PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber
	 * Сохранение параметров зуба (подвижность, фуркации, статус)
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/teeth/:toothNumber",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram tooth patch",
			);
			if (!orgId) return;

			const { id, toothNumber: rawToothNumber } = request.params as {
				id: string;
				toothNumber: string;
			};
			const toothNumber = Number.parseInt(rawToothNumber, 10);
			if (!UUID_REGEX.test(id) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({
					error: "InvalidParameters",
					message: "Некорректные параметры запроса",
				});
			}

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
			if (!snapshot) return;

			const parsed = patchToothBodySchema.safeParse(request.body);
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

			const [updatedTooth] = await db
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

			return reply.send({ success: true, data: updatedTooth });
		},
	);

	/**
	 * 5b. PATCH /api/periodontogram/snapshots/:id/teeth
	 * Пакетное сохранение параметров нескольких зубов
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/teeth",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram batch teeth patch",
			);
			if (!orgId) return;

			const { id } = request.params as { id: string };
			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
			if (!snapshot) return;

			const parsed = patchTeethPayloadSchema.safeParse(request.body);
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

			if (rawList.length === 0) {
				return reply.send({ success: true, data: [] });
			}

			const updatedList: Array<typeof periodontogramTeeth.$inferSelect> = [];

			await db.transaction(async (tx) => {
				for (const item of rawList) {
					const tNum = item.toothNumber ?? item.tooth_number;
					if (!tNum) continue;

					const isPresent = item.isPresent ?? item.is_present;
					const isImplant = item.isImplant ?? item.is_implant;
					const furcationBuccal =
						item.furcationBuccal ?? item.furcation_buccal;
					const furcationLingual =
						item.furcationLingual ?? item.furcation_lingual;
					const keratinizedGingivaMm =
						item.keratinizedGingivaMm ?? item.keratinized_gingiva_mm;

					const updateValues: Partial<typeof periodontogramTeeth.$inferInsert> = {
						updatedAt: new Date(),
					};
					if (isPresent !== undefined) updateValues.isPresent = isPresent;
					if (isImplant !== undefined) updateValues.isImplant = isImplant;
					if (item.mobility !== undefined) updateValues.mobility = item.mobility;
					if (item.prognosis !== undefined)
						updateValues.prognosis = item.prognosis;
					if (furcationBuccal !== undefined)
						updateValues.furcationBuccal = furcationBuccal;
					if (furcationLingual !== undefined)
						updateValues.furcationLingual = furcationLingual;
					if (keratinizedGingivaMm !== undefined)
						updateValues.keratinizedGingivaMm = keratinizedGingivaMm;

					const [saved] = await tx
						.update(periodontogramTeeth)
						.set(updateValues)
						.where(
							and(
								eq(periodontogramTeeth.snapshotId, id),
								eq(periodontogramTeeth.toothNumber, tNum),
							),
						)
						.returning();

					if (saved) updatedList.push(saved);
				}
			});

			return reply.send({ success: true, data: updatedList });
		},
	);

	/**
	 * 6. PATCH /api/periodontogram/snapshots/:id/sites
	 * Пакетное или одиночное сохранение сайтов зондирования
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/sites",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram sites patch",
			);
			if (!orgId) return;

			const { id } = request.params as { id: string };
			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
			if (!snapshot) return;

			const parsed = patchSitesPayloadSchema.safeParse(request.body);
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

			if (rawList.length === 0) {
				return reply.send({ success: true, data: [] });
			}

			const teethRows = await db
				.select({
					id: periodontogramTeeth.id,
					toothNumber: periodontogramTeeth.toothNumber,
				})
				.from(periodontogramTeeth)
				.where(eq(periodontogramTeeth.snapshotId, id));

			const toothIdMap = new Map<number, string>();
			for (const tr of teethRows) {
				toothIdMap.set(tr.toothNumber, tr.id);
			}

			const savedSites: Array<typeof periodontogramSites.$inferSelect> = [];

			await db.transaction(async (tx) => {
				for (const item of rawList) {
					const tNum = item.toothNumber ?? item.tooth_number;
					const sc = item.siteCode ?? item.site_code;
					if (!tNum || !sc) continue;

					const toothId = toothIdMap.get(tNum) ?? null;
					const saved = await upsertSingleSiteRecord(
						tx,
						id,
						toothId,
						tNum,
						sc,
						item,
					);
					if (saved) savedSites.push(saved);
				}
			});

			return reply.send({ success: true, data: savedSites });
		},
	);

	/**
	 * 6b. PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode
	 * Одиночное сохранение сайта зондирования по REST-пути
	 */
	app.patch(
		"/api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram single site patch",
			);
			if (!orgId) return;

			const {
				id,
				toothNumber: rawTn,
				siteCode,
			} = request.params as {
				id: string;
				toothNumber: string;
				siteCode: string;
			};
			const toothNumber = Number.parseInt(rawTn, 10);
			if (
				!UUID_REGEX.test(id) ||
				Number.isNaN(toothNumber) ||
				!SEPA_SITE_CODES.includes(siteCode as SepaSiteCode)
			) {
				return reply.code(400).send({
					error: "InvalidParameters",
					message: "Некорректные параметры сайта",
				});
			}

			const snapshot = await findDraftSnapshotOrSendError(id, orgId, reply);
			if (!snapshot) return;

			const parsed = siteItemSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры сайта зондирования",
					details: parsed.error.format(),
				});
			}

			const [tooth] = await db
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
				db,
				id,
				tooth?.id ?? null,
				toothNumber,
				siteCode,
				parsed.data,
			);

			return reply.send({ success: true, data: saved });
		},
	);
}
