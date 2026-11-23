import type { FastifyInstance } from "fastify";
import { computePayloadHash } from "@dental/shared";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { isLockStale, queryDatabaseIdempotencyRecord } from "../../plugins/idempotencyModules/idempotencyStorageEngine.js";
import { requireOrganizationId } from "../../security/identity.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { deductOrthoMaterialsSchema, patientParamsSchema, rebracketSchema, stageAdvanceSchema, type OrthodonticProgressRecord } from "./types.js";

import { resolveMaterialParams } from "./materialParamsResolver.js";
import { resolveOrthoMaterialCost } from "./orthoPricelistResolver.js";

export function registerStageAndMaterialRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/deduct-materials`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const { existingIdemKey, existingSyncRecord } = await queryDatabaseIdempotencyRecord(orgId, idempotencyKey);
			const record = existingIdemKey ?? (existingSyncRecord ? {
				status: existingSyncRecord.action === "completed" ? "completed" : "in_flight",
				responseBody: existingSyncRecord.responseJson,
				responseCode: existingSyncRecord.responseStatus,
				lockedAt: existingSyncRecord.updatedAt,
			} : null);

			if (record) {
				if (record.status === "completed" && record.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(record.responseCode || 200)
						.send(record.responseBody);
				}
				if (record.status === "in_flight" && !isLockStale(record.lockedAt)) {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const parsedParams = patientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента",
			});
		}
		const { patientId } = parsedParams.data;

		const parsedBody = deductOrthoMaterialsSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры списания материалов: " + parsedBody.error.issues.map((i) => i.message).join("; "),
				issues: parsedBody.error.issues,
			});
		}
		const body = parsedBody.data;
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const resolved = await resolveMaterialParams(body, orgId);
		const responsePayload = await db.transaction(async (tx) => {
			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: resolved.pattern,
				defaultItemName: resolved.defaultName,
				category: resolved.category,
				quantity: body.quantity,
				unit: resolved.unit,
				unitCostKopecks: resolved.unitCostKopecks,
				unitCostRub: resolved.unitCostRub,
				visitId: body.visitId ?? null,
				notes: body.notes || `Ортодонтическое списание [${body.action}]`,
				tx,
				logger: request.log,
			});

			const payload: Record<string, unknown> = {
				success: true,
				action: body.action,
				deduction,
				message: `Материал «${deduction.itemName || resolved.defaultName}» успешно списан со склада (мягкий овердрафт).`,
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: payload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: payload,
							responseCode: 200,
						},
					});
			}

			return payload;
		});

		return reply.send(responsePayload);
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/stages/advance`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const { existingIdemKey, existingSyncRecord } = await queryDatabaseIdempotencyRecord(orgId, idempotencyKey);
			const record = existingIdemKey ?? (existingSyncRecord ? {
				status: existingSyncRecord.action === "completed" ? "completed" : "in_flight",
				responseBody: existingSyncRecord.responseJson,
				responseCode: existingSyncRecord.responseStatus,
				lockedAt: existingSyncRecord.updatedAt,
			} : null);

			if (record) {
				if (record.status === "completed" && record.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(record.responseCode || 200)
						.send(record.responseBody);
				}
				if (record.status === "in_flight" && !isLockStale(record.lockedAt)) {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const parsedParams = patientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента",
			});
		}
		const { patientId } = parsedParams.data;

		const parsedBody = stageAdvanceSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры перехода на этап: " + parsedBody.error.issues.map((i) => i.message).join("; "),
				issues: parsedBody.error.issues,
			});
		}
		const body = parsedBody.data;
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
		const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
		const actionSummary = `Переход на этап ${body.nextStage}${body.stageTitle ? `: ${body.stageTitle}` : ""}`;
		const updatedProgress: OrthodonticProgressRecord = {
			...currentProgress,
			currentStage: body.nextStage,
			stageTitle: body.stageTitle || currentProgress.stageTitle,
			applianceId: body.applianceId || currentProgress.applianceId,
			applianceName: body.applianceName || currentProgress.applianceName,
			selectedElasticId: body.selectedElasticId !== undefined ? body.selectedElasticId : currentProgress.selectedElasticId,
			selectedActionIds: body.selectedActionIds || currentProgress.selectedActionIds,
			lastActionDate: new Date().toISOString(),
			lastActionSummary: actionSummary,
		};

		// DEF-ORTHO-01 / Мандат 8bo: Неделимость транзакции при обновлении профиля пациента
		const responsePayload = await db.transaction(async (tx) => {
			await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: updatedProgress }, tx);

			const payload: Record<string, unknown> = {
				success: true,
				currentStage: body.nextStage,
				actionSummary,
				progress: updatedProgress,
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: payload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: payload,
							responseCode: 200,
						},
					});
			}

			return payload;
		});

		return reply.send(responsePayload);
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/rebracket`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const { existingIdemKey, existingSyncRecord } = await queryDatabaseIdempotencyRecord(orgId, idempotencyKey);
			const record = existingIdemKey ?? (existingSyncRecord ? {
				status: existingSyncRecord.action === "completed" ? "completed" : "in_flight",
				responseBody: existingSyncRecord.responseJson,
				responseCode: existingSyncRecord.responseStatus,
				lockedAt: existingSyncRecord.updatedAt,
			} : null);

			if (record) {
				if (record.status === "completed" && record.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(record.responseCode || 200)
						.send(record.responseBody);
				}
				if (record.status === "in_flight" && !isLockStale(record.lockedAt)) {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const parsedParams = patientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента",
			});
		}
		const { patientId } = parsedParams.data;

		const parsedBody = rebracketSchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры повторной фиксации брекета: " + parsedBody.error.issues.map((i) => i.message).join("; "),
				issues: parsedBody.error.issues,
			});
		}
		const body = parsedBody.data;
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
		const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
		const toothLabel = body.toothNumber ? ` на зубе ${body.toothNumber}` : "";
		const actionSummary = `Повторная фиксация брекета (1 шт.)${toothLabel} · ${body.bracketType}${body.note ? ` (${body.note})` : ""}`;
		const updatedProgress: OrthodonticProgressRecord = {
			...currentProgress, lastActionDate: new Date().toISOString(), lastActionSummary: actionSummary,
		};

		// DEF-ORTHO-02: Выбор стоимости из складских остатков клиники
		const rebracketCost = await resolveOrthoMaterialCost({
			organizationId: orgId,
			itemNamePattern: "брекет",
			fallbackCostRub: 1200,
			logger: request.log,
		});

		const responsePayload = await db.transaction(async (tx) => {
			// DEF-ORTHO-01 / Мандат 8bo: Сохраняем структурированный JSONB объект внутри транзакции tx
			await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: updatedProgress }, tx);

			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: "брекет",
				defaultItemName: `Брекет ортодонтический ${body.bracketType}`,
				category: "ortho_bracket",
				quantity: 1,
				unit: "шт.",
				unitCostKopecks: rebracketCost.unitCostKopecks,
				unitCostRub: rebracketCost.unitCostRub,
				notes: actionSummary,
				tx,
				logger: request.log,
			});

			const payload: Record<string, unknown> = {
				success: true,
				actionSummary,
				toothNumber: body.toothNumber,
				progress: updatedProgress,
				deduction,
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: payload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: payload,
							responseCode: 200,
						},
					});
			}

			return payload;
		});

		return reply.send(responsePayload);
	});
}
