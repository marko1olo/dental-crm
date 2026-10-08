import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	toothStateHistory,
	toothStates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import {
	type EndoToothClinicalData,
	UUID_SHAPE,
	parseClinicalDataFromNotes,
	toothEndoUpsertSchema,
} from "./types.js";

export function registerSurfaceRoutes(app: FastifyInstance) {
	app.get(
		"/api/patients/:patientId/tooth-states/:toothNumber/endo",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth endo read",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: Эндодонтические данные — врачебная тайна
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.endo.read",
					role: staffRole,
					message: `Отказ в доступе к эндодонтической карте (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
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

			const [tooth] = await db
				.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
					notes: toothStates.notes,
				})
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, organizationId),
						eq(toothStates.patientId, patientId),
						eq(toothStates.toothNumber, toothNumber),
					),
				)
				.limit(1);

			if (!tooth) {
				return reply.send({
					success: true,
					toothNumber,
					state: "Healthy",
					clinicalData: null,
				});
			}

			return reply.send({
				success: true,
				toothNumber: tooth.toothNumber,
				state: tooth.state,
				surfaces: tooth.surfaces,
				notes: tooth.notes,
				clinicalData: parseClinicalDataFromNotes(tooth.notes),
			});
		},
	);

	app.post(
		"/api/patients/:patientId/tooth-states/:toothNumber/endo",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth endo save",
			);
			if (!organizationId) return;

			// 152-ФЗ / 323-ФЗ: Запись эндодонтических данных разрешена только клиническому персоналу
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.endo.write",
					role: staffRole,
					message: `Отказ в изменении эндодонтических данных (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
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

			const parsed = toothEndoUpsertSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "EndoValidationError",
					message: "Некорректные параметры корневых каналов.",
					details: parsed.error.format(),
				});
			}

			const actorUserId = getRequestIdentity(request).userId;
			const now = new Date();

			const clinicalData: EndoToothClinicalData = {
				canals: parsed.data.canals,
				irrigation: parsed.data.irrigation,
				radiologyControl: parsed.data.radiologyControl,
				updatedAt: now.toISOString(),
			};

			const serializedNotes = JSON.stringify(clinicalData);

			const updated = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					)
					.limit(1);

				const targetState = parsed.data.state || existing?.state || "Pulpitis";
				const targetSurfaces = parsed.data.surfaces || existing?.surfaces || null;

				await tx
					.delete(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							eq(toothStates.toothNumber, toothNumber),
						),
					);

				await tx.insert(toothStateHistory).values({
					organizationId,
					patientId,
					visitId: parsed.data.visitId ?? null,
					toothNumber,
					previousState: existing?.state ?? null,
					newState: targetState,
					previousSurfaces: existing?.surfaces ?? null,
					newSurfaces: targetSurfaces,
					changedByUserId: actorUserId,
					reason: "Эндодонтический протокол / обработка каналов",
					changedAt: now,
				});

				const [insertedRow] = await tx
					.insert(toothStates)
					.values({
						organizationId,
						patientId,
						toothNumber,
						state: targetState,
						surfaces: targetSurfaces,
						notes: serializedNotes,
						updatedAt: now,
						isSynced: false,
						version: 1,
					})
					.returning({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
					});

				return {
					toothNumber: insertedRow?.toothNumber ?? toothNumber,
					state: insertedRow?.state ?? targetState,
					surfaces: insertedRow?.surfaces ?? targetSurfaces,
					notes: insertedRow?.notes ?? serializedNotes,
					clinicalData,
				};
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: [updated] },
			});

			return reply.send({ success: true, ...updated });
		},
	);
}
