import {
	SEPA_SITE_CODES,
	type SepaSiteCode,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { computeSnapshotIndices } from "../services/periodontogramIndices.js";
import {
	closeSnapshotBodySchema,
	createDraftWithInitialTeeth,
	fetchSnapshotTeethAndSites,
	patchSitesPayloadSchema,
	patchToothBodySchema,
	siteItemSchema,
	upsertSingleSiteRecord,
} from "../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerPeriodontogramRoutes(app: FastifyInstance) {
	/**
	 * 1. GET /api/periodontogram/patients/:patientId/snapshots
	 * История закрытых осмотров пациента
	 */
	app.get(
		"/api/periodontogram/patients/:patientId/snapshots",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}

			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			const snapshots = await db
				.select()
				.from(periodontogramSnapshots)
				.where(
					and(
						eq(periodontogramSnapshots.organizationId, orgId),
						eq(periodontogramSnapshots.patientId, patientId),
						eq(periodontogramSnapshots.status, "closed"),
					),
				)
				.orderBy(desc(periodontogramSnapshots.recordedAt));

			return reply.send({ success: true, data: snapshots });
		},
	);

	/**
	 * 2. GET /api/periodontogram/patients/:patientId/draft
	 * Активный драфт пациента с предзагрузкой зубов и сайтов
	 */
	app.get(
		"/api/periodontogram/patients/:patientId/draft",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}

			const [draft] = await db
				.select()
				.from(periodontogramSnapshots)
				.where(
					and(
						eq(periodontogramSnapshots.organizationId, orgId),
						eq(periodontogramSnapshots.patientId, patientId),
						eq(periodontogramSnapshots.status, "draft"),
					),
				)
				.limit(1);

			if (!draft) {
				return reply.send({ success: true, data: null });
			}

			const { formattedTeeth } = await fetchSnapshotTeethAndSites(draft.id);

			return reply.send({
				success: true,
				data: {
					...draft,
					teeth: formattedTeeth,
				},
			});
		},
	);

	/**
	 * 3. POST /api/periodontogram/patients/:patientId/draft
	 * Создание драфта с авто-подтягиванием статуса зубов (is_present, is_implant) из tooth_states
	 */
	app.post(
		"/api/periodontogram/patients/:patientId/draft",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram draft create",
			);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}

			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден",
				});
			}

			// Idempotent: return existing draft if already open
			const [existingDraft] = await db
				.select()
				.from(periodontogramSnapshots)
				.where(
					and(
						eq(periodontogramSnapshots.organizationId, orgId),
						eq(periodontogramSnapshots.patientId, patientId),
						eq(periodontogramSnapshots.status, "draft"),
					),
				)
				.limit(1);

			if (existingDraft) {
				const { formattedTeeth } = await fetchSnapshotTeethAndSites(
					existingDraft.id,
				);

				return reply.send({
					success: true,
					data: {
						...existingDraft,
						teeth: formattedTeeth,
					},
				});
			}

			const identity = getRequestIdentity(request);
			const recordedByUserId = identity.userId ?? null;

			try {
				const result = await createDraftWithInitialTeeth(
					orgId,
					patientId,
					recordedByUserId,
				);
				return reply.code(201).send({ success: true, data: result });
			} catch (err: unknown) {
				const errMsg = String(err);
				if (
					errMsg.includes("uq_perio_snap_one_draft_per_patient") ||
					errMsg.includes("duplicate key")
				) {
					return reply.code(409).send({
						error: "DraftConflict",
						message: "Another draft already exists for this patient",
					});
				}
				throw err;
			}
		},
	);

	/**
	 * 4. GET /api/periodontogram/snapshots/:id
	 * Просмотр конкретного снимка по ID
	 */
	app.get(
		"/api/periodontogram/snapshots/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { id } = request.params as { id: string };
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
					message: "Осмотр пародонтограммы не найден",
				});
			}

			const { formattedTeeth } = await fetchSnapshotTeethAndSites(snapshot.id);

			return reply.send({
				success: true,
				data: {
					...snapshot,
					teeth: formattedTeeth,
				},
			});
		},
	);

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

			if (snapshot.status === "closed") {
				return reply.code(409).send({
					error: "SnapshotClosed",
					message: "Snapshot is closed and immutable",
				});
			}

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

			if (snapshot.status === "closed") {
				return reply.code(409).send({
					error: "SnapshotClosed",
					message: "Snapshot is closed and immutable",
				});
			}

			const parsed = patchSitesPayloadSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры сайтов зондирования",
					details: parsed.error.format(),
				});
			}

			let rawList: z.infer<typeof siteItemSchema>[] = [];
			const payload = parsed.data;
			if (Array.isArray(payload)) {
				rawList = payload;
			} else if ("sites" in payload && Array.isArray(payload.sites)) {
				rawList = payload.sites;
			} else {
				rawList = [payload as z.infer<typeof siteItemSchema>];
			}

			if (rawList.length === 0) {
				return reply.send({ success: true, data: [] });
			}

			const teeth = await db
				.select({
					id: periodontogramTeeth.id,
					toothNumber: periodontogramTeeth.toothNumber,
				})
				.from(periodontogramTeeth)
				.where(eq(periodontogramTeeth.snapshotId, id));

			const toothIdMap = new Map<number, string>();
			for (const t of teeth) {
				toothIdMap.set(t.toothNumber, t.id);
			}

			const savedSites: unknown[] = [];

			await db.transaction(async (tx) => {
				for (const item of rawList) {
					const tn = item.toothNumber ?? item.tooth_number;
					const sc = item.siteCode ?? item.site_code;
					if (!tn || !sc) continue;

					const toothId = toothIdMap.get(tn) ?? null;
					const saved = await upsertSingleSiteRecord(
						tx,
						id,
						toothId,
						tn,
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

			if (snapshot.status === "closed") {
				return reply.code(409).send({
					error: "SnapshotClosed",
					message: "Snapshot is closed and immutable",
				});
			}

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

	/**
	 * 7. POST /api/periodontogram/snapshots/:id/close
	 * Расчет индексов (знаменатель 6 * count(present_teeth)), заморозка JSONB, перевод в closed
	 */
	app.post(
		"/api/periodontogram/snapshots/:id/close",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram close",
			);
			if (!orgId) return;

			const { id } = request.params as { id: string };
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

			const parsed = closeSnapshotBodySchema.safeParse(request.body);
			const notes =
				parsed.success && parsed.data?.notes !== undefined
					? parsed.data.notes
					: snapshot.notes;

			const { teeth, sites, formattedTeeth } =
				await fetchSnapshotTeethAndSites(id);

			const computedIndices = computeSnapshotIndices(teeth, sites);

			const identity = getRequestIdentity(request);
			const closedByUserId =
				identity.userId ?? snapshot.recordedByUserId ?? null;

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
				.where(eq(periodontogramSnapshots.id, id))
				.returning();

			return reply.send({
				success: true,
				data: {
					...closed,
					teeth: formattedTeeth,
				},
			});
		},
	);

	/**
	 * 8. DELETE /api/periodontogram/snapshots/:id
	 * Удаление драфта (удаление закрытого снимка запрещено — 409 Conflict)
	 */
	app.delete(
		"/api/periodontogram/snapshots/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"periodontogram discard",
			);
			if (!orgId) return;

			const { id } = request.params as { id: string };
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

			// CASCADE on foreign keys automatically deletes teeth and sites
			await db
				.delete(periodontogramSnapshots)
				.where(eq(periodontogramSnapshots.id, id));

			return reply.code(204).send();
		},
	);
}
