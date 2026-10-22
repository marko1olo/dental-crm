/**
 * apps/api/src/routes/odontogram/extendedRoutes.ts
 *
 * Маршруты расширенных клинических состояний одонтограммы:
 * - Вторичный кариес под пломбой (ПС)
 * - Подвижность зуба (0..4 степень)
 * - Детские коронки на молочных зубах
 *
 * Реляционная целостность: строго patientId (UUID), привязка к организации (152-ФЗ),
 * исключение текстового patientName как первичного ключа.
 */

import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { extendedOdontogramStates, patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { UUID_SHAPE } from "./types.js";

export const extendedToothStateItemSchema = z.object({
	toothNumber: z.number().int().min(11).max(85),
	isPrimaryPediatric: z.boolean().optional().default(false),
	secondaryCariesUnderFilling: z.boolean().optional().default(false),
	mobilityDegree: z.number().int().min(0).max(4).optional().default(0),
	pediatricCrownPresent: z.boolean().optional().default(false),
	notes: z.string().max(2000).optional().default(""),
	patientName: z.string().max(255).optional(),
});

export const batchExtendedToothStatesSchema = z.object({
	states: z.array(extendedToothStateItemSchema).min(1).max(64),
});

export type ExtendedToothStateItem = z.infer<typeof extendedToothStateItemSchema>;

export function registerExtendedOdontogramRoutes(app: FastifyInstance): void {
	/**
	 * GET /api/patients/:patientId/extended-tooth-states
	 * Получение всех расширенных состояний зубов пациента
	 */
	app.get(
		"/api/patients/:patientId/extended-tooth-states",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"extended tooth states read",
			);
			if (!organizationId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			// 152-ФЗ: проверка прав медработника
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;

			if (!staffRole) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.read",
					message: "Требуется авторизованный токен медработника",
				});
			}

			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.read",
					role: staffRole,
					message: `Отказ в доступе (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			const rows = await db
				.select({
					id: extendedOdontogramStates.id,
					patientId: extendedOdontogramStates.patientId,
					patientName: extendedOdontogramStates.patientName,
					toothNumber: extendedOdontogramStates.toothNumber,
					isPrimaryPediatric: extendedOdontogramStates.isPrimaryPediatric,
					secondaryCariesUnderFilling:
						extendedOdontogramStates.secondaryCariesUnderFilling,
					mobilityDegree: extendedOdontogramStates.mobilityDegree,
					pediatricCrownPresent:
						extendedOdontogramStates.pediatricCrownPresent,
					notes: extendedOdontogramStates.notes,
					createdAt: extendedOdontogramStates.createdAt,
				})
				.from(extendedOdontogramStates)
				.where(
					and(
						eq(extendedOdontogramStates.organizationId, organizationId),
						eq(extendedOdontogramStates.patientId, patientId),
					),
				);

			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "VIEW_EXTENDED_ODONTOGRAM",
				diagnosis: "Расширенные состояния одонтограммы",
			});

			return reply.send({ success: true, states: rows });
		},
	);

	/**
	 * GET /api/patients/:patientId/extended-tooth-states/:toothNumber
	 * Получение расширенного состояния конкретного зуба
	 */
	app.get(
		"/api/patients/:patientId/extended-tooth-states/:toothNumber",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"single extended tooth state read",
			);
			if (!organizationId) return;

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

			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			if (!staffRole) {
				return reply.code(403).send({ error: "PermissionDenied" });
			}

			const [row] = await db
				.select()
				.from(extendedOdontogramStates)
				.where(
					and(
						eq(extendedOdontogramStates.organizationId, organizationId),
						eq(extendedOdontogramStates.patientId, patientId),
						eq(extendedOdontogramStates.toothNumber, toothNumber),
					),
				)
				.limit(1);

			return reply.send({
				success: true,
				toothNumber,
				state: row ?? null,
			});
		},
	);

	/**
	 * POST /api/patients/:patientId/extended-tooth-states/batch
	 * Пакетное сохранение расширенных состояний зубов (ПС, подвижность, детские коронки)
	 */
	app.post(
		"/api/patients/:patientId/extended-tooth-states/batch",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"batch extended tooth states write",
			);
			if (!organizationId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchExtendedToothStatesSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры расширенных состояний зубов",
					details: parsed.error.issues,
				});
			}

			// Получаем имя пациента из базы для поддержания обратной совместимости поля patientName
			const [patientRow] = await db
				.select({ fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.id, patientId),
					),
				)
				.limit(1);

			const effectivePatientName =
				patientRow?.fullName || "Пациент";

			const toothNumbers = parsed.data.states.map((s) => s.toothNumber);

			const result = await withTenantCtx(organizationId, async (tx) => {
				// Удаляем предыдущие записи для этих зубов
				await tx
					.delete(extendedOdontogramStates)
					.where(
						and(
							eq(extendedOdontogramStates.organizationId, organizationId),
							eq(extendedOdontogramStates.patientId, patientId),
							inArray(extendedOdontogramStates.toothNumber, toothNumbers),
						),
					);

				// Вставляем новые строки с patientId
				const toInsert = parsed.data.states.map((item) => ({
					organizationId,
					patientId,
					patientName: item.patientName || effectivePatientName,
					toothNumber: item.toothNumber,
					isPrimaryPediatric: item.isPrimaryPediatric ?? false,
					secondaryCariesUnderFilling:
						item.secondaryCariesUnderFilling ?? false,
					mobilityDegree: item.mobilityDegree ?? 0,
					pediatricCrownPresent: item.pediatricCrownPresent ?? false,
					notes: item.notes ?? "",
				}));

				return await tx
					.insert(extendedOdontogramStates)
					.values(toInsert)
					.returning();
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_EXTENDED_ODONTOGRAM",
				payload: { patientId, states: result },
			});

			return reply.send({ success: true, states: result });
		},
	);
}

export default registerExtendedOdontogramRoutes;
