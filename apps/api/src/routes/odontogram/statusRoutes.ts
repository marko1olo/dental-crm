import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { toothStates } from "../../db/schema.js";
import { getRequestIdentity, type RequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	applyToothStateMutation,
	formatToothStateRow,
	type FormattedToothStateRow,
} from "./odontogramMutationService.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import {
	UUID_SHAPE,
	batchToothStateSchema,
	odontogramStatusMutationSchema,
} from "./types.js";

interface ExtendedRequestIdentity extends RequestIdentity {
	clinicalRole?: string | null;
	canSignMedicalRecords?: boolean;
}

interface AuthenticatedUserContext {
	role?: string | null;
	canSignMedicalRecords?: boolean;
	clinicalRole?: string | null;
}

function extractRequestUser(request: FastifyRequest): AuthenticatedUserContext | undefined {
	if ("user" in request && typeof request.user === "object" && request.user !== null) {
		return request.user as AuthenticatedUserContext;
	}
	return undefined;
}

export function registerStatusRoutes(app: FastifyInstance) {
	const getToothStatesHandler = async (request: FastifyRequest, reply: FastifyReply) => {
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
		const identity = getRequestIdentity(request) as ExtendedRequestIdentity;
		const reqUser = extractRequestUser(request);
		const staffRole = identity.role ?? reqUser?.role ?? null;

		if (!staffRole) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "ACCESS_DENIED_ODONTOGRAM",
				diagnosis:
					"Попытка анонимного доступа к зубной формуле без токена медработника (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.read",
				role: null,
				message:
					"Отказ в доступе к зубной формуле и диагнозам (152-ФЗ / 323-ФЗ ст. 13): требуется авторизованный токен медработника",
			});
		}

		const evalAccess = evaluateClinicalAccess(staffRole, {
			clinicalRole: identity.clinicalRole ?? reqUser?.clinicalRole ?? null,
			canSignMedicalRecords:
				identity.canSignMedicalRecords ?? reqUser?.canSignMedicalRecords ?? false,
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

		const rawStates = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
					notes: toothStates.notes,
					clinicalData: toothStates.clinicalData,
					canalMeasurements: toothStates.canalMeasurements,
					updatedAt: toothStates.updatedAt,
				})
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, organizationId),
						eq(toothStates.patientId, patientId),
					),
				),
		);

		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId,
			action: "VIEW_ODONTOGRAM",
			diagnosis: "Зубная формула и одонтограмма (32 зуба)",
		});

		const states = rawStates.map(formatToothStateRow);
		return reply.send({ success: true, states });
	};

	app.get("/api/patients/:patientId/tooth-states", getToothStatesHandler);
	app.get("/api/patients/:patientId/odontogram", getToothStatesHandler);
	app.get("/api/odontogram/patient/:patientId", getToothStatesHandler);

	const postToothStateMutationHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
		preResolvedOrgId?: string,
		preExtractedIdempotencyKey?: string | null,
	) => {
		const idempotencyKey =
			preExtractedIdempotencyKey !== undefined
				? preExtractedIdempotencyKey
				: extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

		const organizationId =
			preResolvedOrgId ??
			(await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"odontogram status mutation",
			));
		if (!organizationId) return;

		const parsed = odontogramStatusMutationSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ToothStateValidationError",
				message: "Ошибка валидации зубной формулы. Проверьте номер зуба и статус.",
				details: parsed.error.format(),
			});
		}

		const patientId = parsed.data.patientId;
		if (!patientId || !UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Требуется корректный идентификатор пациента (patientId UUID)",
			});
		}

		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		const toothNumbers =
			parsed.data.toothNumbers ??
			(parsed.data.toothNumber !== undefined ? [parsed.data.toothNumber] : []);
		const actorUserId = getRequestIdentity(request).userId;

		const inserted = await applyToothStateMutation(
			organizationId,
			patientId,
			actorUserId,
			{
				...parsed.data,
				toothNumbers,
				surfaces: parsed.data.surfaces as string[] | undefined,
			},
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			states: inserted,
			status: inserted[0]?.state ?? parsed.data.state,
		});
	};

	app.post("/api/odontogram/status", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"odontogram status mutation",
		);
		if (!organizationId) return;
		return postToothStateMutationHandler(
			request,
			reply,
			organizationId,
			idempotencyKey,
		);
	});

	app.post("/api/odontogram/tooth-state", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"odontogram tooth-state mutation",
		);
		if (!organizationId) return;
		return postToothStateMutationHandler(
			request,
			reply,
			organizationId,
			idempotencyKey,
		);
	});

	app.post("/api/patients/:patientId/odontogram/status", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"patient odontogram status mutation",
		);
		if (!organizationId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		const bodyObj =
			typeof request.body === "object" && request.body
				? (request.body as Record<string, unknown>)
				: {};
		const parsed = odontogramStatusMutationSchema.safeParse({
			...bodyObj,
			patientId,
		});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ToothStateValidationError",
				message: "Ошибка валидации зубной формулы.",
				details: parsed.error.format(),
			});
		}

		const toothNumbers =
			parsed.data.toothNumbers ??
			(parsed.data.toothNumber !== undefined ? [parsed.data.toothNumber] : []);
		const actorUserId = getRequestIdentity(request).userId;

		const inserted = await applyToothStateMutation(
			organizationId,
			patientId,
			actorUserId,
			{
				...parsed.data,
				toothNumbers,
				surfaces: parsed.data.surfaces as string[] | undefined,
			},
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			states: inserted,
			status: inserted[0]?.state ?? parsed.data.state,
		});
	});

	app.post("/api/patients/:patientId/tooth-states/batch", async (request, reply) => {
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

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
				message:
					"Ошибка валидации зубной формулы. Проверьте номера зубов и статус.",
				details: parsed.error.format(),
			});
		}

		const actorUserId = getRequestIdentity(request).userId;

		const updates = parsed.data.updates;
		if (updates && updates.length > 0) {
			const sortedUpdates = [...updates].sort(
				(a, b) => a.toothNumber - b.toothNumber,
			);
			const allInserted = await withTenantCtx(organizationId, async (tx) => {
				const collected: FormattedToothStateRow[] = [];
				for (const u of sortedUpdates) {
					const res = await applyToothStateMutation(
						organizationId,
						patientId,
						actorUserId,
						{
							toothNumbers: [u.toothNumber],
							state: u.state ?? "Healthy",
							surfaces: u.surfaces,
							resorptionStage: u.resorptionStage,
							mobility: u.mobility ?? u.mobilityDegree,
							mobilityDegree: u.mobilityDegree ?? u.mobility,
							isPrimaryPediatric:
								u.isPrimaryPediatric ??
								(u.toothNumber >= 51 && u.toothNumber <= 85),
							notes: u.notes,
							visitId: parsed.data.visitId,
							updatedAt: parsed.data.updatedAt,
							reason:
								parsed.data.reason ||
								"Резорбция корней / подвижность молочного зуба",
						},
						true,
						tx,
					);
					collected.push(...res);
				}
				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "UPDATE_ODONTOGRAM",
						payload: { patientId, states: collected },
					});
				});
				return collected;
			});
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}
			return reply.send({ success: true, states: allInserted });
		}

		const toothNumbers =
			parsed.data.toothNumbers && parsed.data.toothNumbers.length > 0
				? parsed.data.toothNumbers
				: [];

		const inserted = await applyToothStateMutation(
			organizationId,
			patientId,
			actorUserId,
			{
				...parsed.data,
				toothNumbers,
				surfaces: parsed.data.surfaces as string[] | undefined,
			},
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return reply.send({ success: true, states: inserted });
	});
}
