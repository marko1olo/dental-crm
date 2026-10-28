import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	periodontogramSnapshots,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	computeSnapshotIndices,
	getHygienePlanText,
	getHygieneRecommendations,
} from "../services/periodontogramIndices.js";
import {
	closeSnapshotBodySchema,
	createDraftWithInitialTeeth,
	fetchPatientLatestPeriodontogram,
	fetchSnapshotTeethAndSites,
	upsertPatientFullPeriodontogram,
} from "../services/periodontogramService.js";
import { registerPeriodontogramMutationRoutes } from "./periodontogramMutations.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerPeriodontogramRoutes(app: FastifyInstance) {
	// Register tooth and site mutation routes (5, 5b, 6, 6b)
	registerPeriodontogramMutationRoutes(app);

	/**
	 * 0a. GET /api/periodontogram/:patientId & /api/perio/:patientId
	 * Актуальная пародонтограмма пациента (активный черновик или последний снимок) с рекомендациями гигиены по PSR
	 */
	const handleGetPatientPerio = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		const data = await fetchPatientLatestPeriodontogram(orgId, patientId);
		if (!data) {
			return reply.send({ success: true, data: null });
		}

		const psrCode = Number((data as any).indices?.psr ?? 0);
		const hasAsterisk = Boolean((data as any).indices?.hasAsterisk);
		const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
		const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

		return reply.send({
			success: true,
			data: {
				...data,
				psrCode,
				hygieneRecommendations,
				hygienePlan,
			},
		});
	};

	app.get("/api/periodontogram/:patientId", handleGetPatientPerio);
	app.get("/api/perio/:patientId", handleGetPatientPerio);

	/**
	 * 0b. POST /api/periodontogram/:patientId & /api/perio/:patientId
	 * Создание или сохранение среза пародонтограммы пациента (черновик, зубы, точки, PSR)
	 */
	const handlePostPatientPerio = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"periodontogram patient full upsert",
		);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		const body = (request.body as Record<string, unknown>) || {};
		const identity = getRequestIdentity(request);
		const recordedByUserId = identity.userId ?? null;

		const result = await upsertPatientFullPeriodontogram({
			orgId,
			patientId,
			recordedByUserId,
			teeth: Array.isArray(body.teeth) ? (body.teeth as any) : undefined,
			sites: Array.isArray(body.sites) ? (body.sites as any) : undefined,
			notes: typeof body.notes === "string" ? body.notes : undefined,
			status: body.status === "closed" ? "closed" : "draft",
			autoClose: Boolean(body.autoClose),
		});

		const psrCode = Number((result as any).indices?.psr ?? body.psrCode ?? 0);
		const hasAsterisk = Boolean((result as any).indices?.hasAsterisk ?? body.hasAsterisk);
		const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
		const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

		return reply.send({
			success: true,
			data: {
				...result,
				psrCode,
				hygieneRecommendations,
				hygienePlan,
			},
		});
	};

	app.post("/api/periodontogram/:patientId", handlePostPatientPerio);
	app.post("/api/perio/:patientId", handlePostPatientPerio);
	app.put("/api/periodontogram/:patientId", handlePostPatientPerio);
	app.put("/api/perio/:patientId", handlePostPatientPerio);


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
				.where(
					and(
						eq(periodontogramSnapshots.id, id),
						eq(periodontogramSnapshots.organizationId, orgId),
					),
				)
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
				.where(
					and(
						eq(periodontogramSnapshots.id, id),
						eq(periodontogramSnapshots.organizationId, orgId),
					),
				);

			return reply.code(204).send();
		},
	);
}
