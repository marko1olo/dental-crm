import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { periodontogramSnapshots } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	createDraftWithInitialTeeth,
	fetchSnapshotTeethAndSites,
	resolvePerioPatientId,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patientIdParamSchema = z.object({
	patientId: z.string().trim().min(1),
});

const snapshotIdParamSchema = z.object({
	id: z.string().regex(UUID_REGEX, "Некорректный идентификатор осмотра"),
});

function readPerioErrorInfo(err: unknown): {
	statusCode?: number | undefined;
	code?: string | undefined;
	message?: string | undefined;
} {
	if (!err || typeof err !== "object") return {};
	const rec = err as Record<string, unknown>;
	return {
		statusCode: typeof rec.statusCode === "number" ? rec.statusCode : undefined,
		code: typeof rec.code === "string" ? rec.code : undefined,
		message: typeof rec.message === "string" ? rec.message : undefined,
	};
}

export async function registerSnapshotPeriodontogramRoutes(app: FastifyInstance) {
	/**
	 * 1. GET /api/periodontogram/patients/:patientId/snapshots
	 * История закрытых осмотров пациента
	 */
	app.get("/api/periodontogram/patients/:patientId/snapshots", async (req, reply) => {
		const orgId = await requireResolvedOrganizationId(req, reply);
		if (!orgId) return;
		const paramParsed = patientIdParamSchema.safeParse(req.params);
		if (!paramParsed.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const rawPatientId = paramParsed.data.patientId;
		try {
			const snapshots = await withTenantCtx(orgId, async (tx) => {
				const patientId = await resolvePerioPatientId(orgId, rawPatientId, tx);
				return tx
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
			});
			return reply.send({ success: true, data: snapshots });
		} catch (err: unknown) {
			const e = readPerioErrorInfo(err);
			if (e.statusCode === 404 || e.code === "PatientNotFound") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: e.message || "Пациент не найден в данной организации",
				});
			}
			if (e.statusCode === 400 || e.code === "InvalidPatientId") {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: e.message || "Некорректный идентификатор пациента",
				});
			}
			throw err;
		}
	});

	/**
	 * 2. GET /api/periodontogram/patients/:patientId/draft
	 * Активный драфт пациента с предзагрузкой зубов и сайтов
	 */
	app.get("/api/periodontogram/patients/:patientId/draft", async (req, reply) => {
		const orgId = await requireResolvedOrganizationId(req, reply);
		if (!orgId) return;
		const paramParsed = patientIdParamSchema.safeParse(req.params);
		if (!paramParsed.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const rawPatientId = paramParsed.data.patientId;
		try {
			const data = await withTenantCtx(orgId, async (tx) => {
				const patientId = await resolvePerioPatientId(orgId, rawPatientId, tx);
				const [draft] = await tx
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
				if (!draft) return null;
				const { formattedTeeth } = await fetchSnapshotTeethAndSites(draft.id, tx);
				return { ...draft, teeth: formattedTeeth };
			});
			return reply.send({ success: true, data });
		} catch (err: unknown) {
			const e = readPerioErrorInfo(err);
			if (e.statusCode === 404 || e.code === "PatientNotFound") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: e.message || "Пациент не найден в данной организации",
				});
			}
			if (e.statusCode === 400 || e.code === "InvalidPatientId") {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: e.message || "Некорректный идентификатор пациента",
				});
			}
			throw err;
		}
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
		const paramParsed = patientIdParamSchema.safeParse(req.params);
		if (!paramParsed.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const rawPatientId = paramParsed.data.patientId;
		const identity = getRequestIdentity(req);
		try {
			const txOutcome = await withTenantCtx(orgId, async (tx) => {
				const patientId = await resolvePerioPatientId(orgId, rawPatientId, tx);
				const [existing] = await tx
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
					const { formattedTeeth } = await fetchSnapshotTeethAndSites(existing.id, tx);
					return { created: false as const, data: { ...existing, teeth: formattedTeeth } };
				}
				const created = await createDraftWithInitialTeeth(
					orgId,
					patientId,
					identity.userId ?? null,
					null,
					rawPatientId,
					tx,
				);
				return { created: true as const, data: created };
			});
			return reply.code(txOutcome.created ? 201 : 200).send({
				success: true,
				data: txOutcome.data,
			});
		} catch (err: unknown) {
			const e = readPerioErrorInfo(err);
			if (e.statusCode === 404 || e.code === "PatientNotFound") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: e.message || "Пациент не найден в данной организации",
				});
			}
			if (e.statusCode === 400 || e.code === "InvalidPatientId") {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: e.message || "Некорректный идентификатор пациента",
				});
			}
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
		const paramParsed = snapshotIdParamSchema.safeParse(req.params);
		if (!paramParsed.success) {
			return reply.code(400).send({
				error: "InvalidSnapshotId",
				message: "Некорректный идентификатор осмотра",
			});
		}
		const { id } = paramParsed.data;
		const data = await withTenantCtx(orgId, async (tx) => {
			const [snapshot] = await tx
				.select()
				.from(periodontogramSnapshots)
				.where(
					and(
						eq(periodontogramSnapshots.id, id),
						eq(periodontogramSnapshots.organizationId, orgId),
					),
				)
				.limit(1);
			if (!snapshot) return null;
			const { formattedTeeth } = await fetchSnapshotTeethAndSites(snapshot.id, tx);
			return { ...snapshot, teeth: formattedTeeth };
		});
		if (!data) {
			return reply.code(404).send({
				error: "SnapshotNotFound",
				message: "Осмотр пародонтограммы не найден",
			});
		}
		return reply.send({ success: true, data });
	});
}
