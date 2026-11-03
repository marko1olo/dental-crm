import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients, periodontogramSnapshots } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	createDraftWithInitialTeeth,
	fetchSnapshotTeethAndSites,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerSnapshotPeriodontogramRoutes(app: FastifyInstance) {
	/**
	 * 1. GET /api/periodontogram/patients/:patientId/snapshots
	 * История закрытых осмотров пациента
	 */
	app.get("/api/periodontogram/patients/:patientId/snapshots", async (req, reply) => {
		const orgId = await requireResolvedOrganizationId(req, reply);
		if (!orgId) return;
		const { patientId } = req.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
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
	});

	/**
	 * 2. GET /api/periodontogram/patients/:patientId/draft
	 * Активный драфт пациента с предзагрузкой зубов и сайтов
	 */
	app.get("/api/periodontogram/patients/:patientId/draft", async (req, reply) => {
		const orgId = await requireResolvedOrganizationId(req, reply);
		if (!orgId) return;
		const { patientId } = req.params as { patientId: string };
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
		if (!draft) return reply.send({ success: true, data: null });
		const { formattedTeeth } = await fetchSnapshotTeethAndSites(draft.id);
		return reply.send({ success: true, data: { ...draft, teeth: formattedTeeth } });
	});

	/**
	 * 3. POST /api/periodontogram/patients/:patientId/draft
	 * Создание драфта с авто-подтягиванием статуса зубов
	 */
	app.post("/api/periodontogram/patients/:patientId/draft", async (req, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"periodontogram draft create",
		);
		if (!orgId) return;
		const { patientId } = req.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);
		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден",
			});
		}

		const [existing] = await db
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
		if (existing) {
			const { formattedTeeth } = await fetchSnapshotTeethAndSites(existing.id);
			return reply.send({ success: true, data: { ...existing, teeth: formattedTeeth } });
		}

		const identity = getRequestIdentity(req);
		try {
			const result = await createDraftWithInitialTeeth(
				orgId,
				patientId,
				identity.userId ?? null,
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
	});

	/**
	 * 4. GET /api/periodontogram/snapshots/:id
	 * Просмотр конкретного снимка по ID
	 */
	app.get("/api/periodontogram/snapshots/:id", async (req, reply) => {
		const orgId = await requireResolvedOrganizationId(req, reply);
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
				message: "Осмотр пародонтограммы не найден",
			});
		}
		const { formattedTeeth } = await fetchSnapshotTeethAndSites(snapshot.id);
		return reply.send({ success: true, data: { ...snapshot, teeth: formattedTeeth } });
	});
}
