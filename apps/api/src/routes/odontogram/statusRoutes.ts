import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	toothStateHistory,
	toothStates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import {
	UUID_SHAPE,
	batchToothStateSchema,
	parseClinicalDataFromNotes,
} from "./types.js";

export function registerStatusRoutes(app: FastifyInstance) {
	app.get("/api/patients/:patientId/tooth-states", async (request, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"tooth states read",
		);
		if (!organizationId) return;
		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Доступ к зубной формуле и диагнозам разрешен ТОЛЬКО клиническому персоналу
		const identity = getRequestIdentity(request);
		const reqAny = request as unknown as {
			user?: {
				role?: string | null;
				canSignMedicalRecords?: boolean;
				clinicalRole?: string | null;
			};
		};
		// Роль определяется ИСКЛЮЧИТЕЛЬНО из подписанного токена или проверенного контекста request.user.
		const staffRole = identity.role ?? reqAny.user?.role ?? null;

		// Fail-closed: если токен сотрудника отсутствует (голый токен клиники), немедленно 403 Forbidden!
		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка анонимного доступа к зубной формуле без токена медработника (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: null,
				message: "Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole, {
			clinicalRole:
				(identity as unknown as { clinicalRole?: string | null })
					.clinicalRole ??
				reqAny.user?.clinicalRole ??
				null,
			canSignMedicalRecords:
				(identity as unknown as { canSignMedicalRecords?: boolean })
					.canSignMedicalRecords ??
				reqAny.user?.canSignMedicalRecords ??
				false,
		});

		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis: "Попытка несанкционированного доступа к зубной формуле (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: staffRole,
				message: `Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const rawStates = await db
			.select({
				toothNumber: toothStates.toothNumber,
				state: toothStates.state,
				surfaces: toothStates.surfaces,
				notes: toothStates.notes,
				updatedAt: toothStates.updatedAt,
			})
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, organizationId),
					eq(toothStates.patientId, patientId),
				),
			);

		// Фиксация правомерного доступа врача к зубной формуле в журнале аудита (152-ФЗ)
		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_ODONTOGRAM",
			diagnosis: "Зубная формула и одонтограмма (32 зуба)",
		});

		const states = rawStates.map((row) => ({
			toothNumber: row.toothNumber,
			state: row.state,
			surfaces: row.surfaces,
			notes: row.notes,
			updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
			clinicalData: parseClinicalDataFromNotes(row.notes),
		}));

		return reply.send({ success: true, states });
	});

	app.post(
		"/api/patients/:patientId/tooth-states/batch",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth states update",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchToothStateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ToothStateValidationError",
					message: "Ошибка валидации зубной формулы. Проверьте номера зубов и статус.",
					details: parsed.error.format(),
				});
			}

			const toothNumbers: number[] = [
				...new Set<number>(parsed.data.toothNumbers),
			];
			if (toothNumbers.length === 0)
				return reply.send({ success: true, states: [] });

			const actorUserId = getRequestIdentity(request).userId;
			const now = new Date();

			const maxFutureSkewMs = 60 * 1000; // max 1 minute future tolerance for clock drift
			const incomingRawTime = parsed.data.updatedAt
				? new Date(parsed.data.updatedAt).getTime()
				: now.getTime();
			const boundedIncomingTime = Math.min(
				incomingRawTime,
				now.getTime() + maxFutureSkewMs,
			);
			const incomingUpdatedAt = new Date(boundedIncomingTime);
			const incomingVersion = parsed.data.version ?? 1;

			const inserted = await withTenantCtx(organizationId, async (tx) => {
				const previousStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						updatedAt: toothStates.updatedAt,
						version: toothStates.version,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				type PreviousToothState = {
					toothNumber: number;
					state: string;
					surfaces: unknown;
					notes: string | null;
					updatedAt: Date | null;
					version: number | null;
				};
				const previousByTooth = new Map<number, PreviousToothState>(
					(previousStates as PreviousToothState[]).map((row) => [
						row.toothNumber,
						row,
					]),
				);

				const serializedClinicalNotes = parsed.data.clinicalData
					? JSON.stringify(parsed.data.clinicalData)
					: parsed.data.notes;

				for (const toothNumber of toothNumbers) {
					const prev = previousByTooth.get(toothNumber);
					const prevTime = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
					const prevVersion = prev?.version ?? 0;
					const incomingTime = incomingUpdatedAt.getTime();

					const incomingWins =
						!prev ||
						incomingTime > prevTime ||
						(incomingTime === prevTime && incomingVersion >= prevVersion);

					if (incomingWins) {
						// 1. Record transition into append-only tooth state history audit log
						await tx.insert(toothStateHistory).values({
							organizationId,
							patientId,
							visitId: parsed.data.visitId ?? null,
							toothNumber,
							previousState: prev?.state ?? null,
							newState: parsed.data.state,
							previousSurfaces: prev?.surfaces ?? null,
							newSurfaces: parsed.data.surfaces || null,
							changedByUserId: actorUserId,
							reason: parsed.data.clinicalData
								? "Эндодонтический протокол / обработка каналов"
								: (parsed.data.reason || null),
							changedAt: incomingUpdatedAt,
						});

						// 2. Delete and insert winning state in toothStates
						await tx
							.delete(toothStates)
							.where(
								and(
									eq(toothStates.organizationId, organizationId),
									eq(toothStates.patientId, patientId),
									eq(toothStates.toothNumber, toothNumber),
								),
							);

						const effectiveNotes =
							serializedClinicalNotes !== undefined
								? serializedClinicalNotes
								: (prev?.notes ?? null);

						await tx.insert(toothStates).values({
							organizationId,
							patientId,
							toothNumber,
							state: parsed.data.state,
							surfaces: parsed.data.surfaces || null,
							notes: effectiveNotes,
							updatedAt: incomingUpdatedAt,
							isSynced: false,
							version: Math.max(prevVersion + 1, incomingVersion, 1),
						});
					} else {
						// Stale offline mutation: Server active state is newer and wins (LWW),
						// but offline mutation transition is STILL appended to toothStateHistory for full 043/u audit trail!
						await tx.insert(toothStateHistory).values({
							organizationId,
							patientId,
							visitId: parsed.data.visitId ?? null,
							toothNumber,
							previousState: null,
							newState: parsed.data.state,
							previousSurfaces: null,
							newSurfaces: parsed.data.surfaces || null,
							changedByUserId: actorUserId,
							reason:
								parsed.data.reason ||
								"Оффлайн-синхронизация (LWW архив)",
							changedAt: incomingUpdatedAt,
						});
					}
				}

				const currentStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
						notes: toothStates.notes,
						updatedAt: toothStates.updatedAt,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				return currentStates.map((row) => ({
					toothNumber: row.toothNumber,
					state: row.state,
					surfaces: row.surfaces,
					notes: row.notes,
					updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
					clinicalData: parseClinicalDataFromNotes(row.notes),
				}));
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: inserted },
			});
			return reply.send({ success: true, states: inserted });
		},
	);
}
