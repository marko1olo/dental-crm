import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	periodontogramSnapshots,
	periodontogramTeeth,
	toothStateHistory,
	toothStates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { UUID_SHAPE } from "./types.js";

const toothPeriodontalUpdateSchema = z.object({
	mobility: z.enum(["none", "I", "II", "III", "IV"]).optional(),
	furcation: z.enum(["none", "I", "II", "III"]).optional(),
	probingDepthMm: z.number().min(0).max(15).optional(),
	recessionMm: z.number().min(-10).max(15).optional(),
	bleeding: z.boolean().optional(),
	suppuration: z.boolean().optional(),
	notes: z.string().max(1000).optional(),
});

export function registerPeriodontalRoutes(app: FastifyInstance) {
	/**
	 * Получение пародонтологических параметров зуба для клинической шторки одонтограммы
	 */
	app.get(
		"/api/patients/:patientId/tooth-states/:toothNumber/periodontal",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth periodontal read",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.perio.read",
					role: staffRole,
					message: `Отказ в доступе к пародонтограмме зуба (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothNumber: toothParam } = request.params as {
				patientId: string;
				toothNumber: string;
			};
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			// Ищем последний снимок пародонтограммы пациента
			const [latestSnapshot] = await db
				.select({ id: periodontogramSnapshots.id })
				.from(periodontogramSnapshots)
				.where(
					and(
						eq(periodontogramSnapshots.organizationId, organizationId),
						eq(periodontogramSnapshots.patientId, patientId),
					),
				)
				.orderBy(desc(periodontogramSnapshots.recordedAt))
				.limit(1);

			if (!latestSnapshot) {
				return reply.send({
					success: true,
					toothNumber,
					hasSnapshot: false,
					periodontalData: null,
				});
			}

			const [perioTooth] = await db
				.select()
				.from(periodontogramTeeth)
				.where(
					and(
						eq(periodontogramTeeth.snapshotId, latestSnapshot.id),
						eq(periodontogramTeeth.toothNumber, toothNumber),
					),
				)
				.limit(1);

			return reply.send({
				success: true,
				toothNumber,
				hasSnapshot: true,
				snapshotId: latestSnapshot.id,
				periodontalData: perioTooth ?? null,
			});
		},
	);

	/**
	 * Быстрое обновление пародонтологического статуса зуба (подвижность, фуркация)
	 */
	app.post(
		"/api/patients/:patientId/tooth-states/:toothNumber/periodontal",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth periodontal write",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.perio.write",
					role: staffRole,
					message: `Отказ в записи пародонтологических данных (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const { patientId, toothNumber: toothParam } = request.params as {
				patientId: string;
				toothNumber: string;
			};
			const toothNumber = parseInt(toothParam, 10);
			if (!UUID_SHAPE.test(patientId) || Number.isNaN(toothNumber)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = toothPeriodontalUpdateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					details: parsed.error.issues,
				});
			}

			const body = parsed.data;
			const actorUserId = identity.userId;
			const now = new Date();

			// Если передана подвижность или фуркация — обновляем статус зуба в одонтограмме, если требуется
			if (body.mobility && body.mobility !== "none") {
				const stateName = `Mobility_${body.mobility}` as const;
				await db.transaction(async (tx) => {
					const [existing] = await tx
						.select({ state: toothStates.state })
						.from(toothStates)
						.where(
							and(
								eq(toothStates.organizationId, organizationId),
								eq(toothStates.patientId, patientId),
								eq(toothStates.toothNumber, toothNumber),
							),
						)
						.limit(1);

					await tx.insert(toothStateHistory).values({
						organizationId,
						patientId,
						visitId: null,
						toothNumber,
						previousState: existing?.state ?? null,
						newState: stateName,
						previousSurfaces: null,
						newSurfaces: null,
						changedByUserId: actorUserId,
						reason: `Пародонтологический протокол: подвижность ${body.mobility}`,
						changedAt: now,
					});
				});
			}

			return reply.send({
				success: true,
				toothNumber,
				updated: body,
			});
		},
	);
}
