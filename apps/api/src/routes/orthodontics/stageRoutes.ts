import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
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

		const { patientId } = patientParamsSchema.parse(request.params);
		const body = deductOrthoMaterialsSchema.parse(request.body);
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const resolved = await resolveMaterialParams(body, orgId);
		const deduction = await db.transaction(async (tx) => {
			return await deductOrthoMaterialSafely({
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
		});

		return reply.send({
			success: true,
			action: body.action,
			deduction,
			message: `Материал «${deduction.itemName || resolved.defaultName}» успешно списан со склада (мягкий овердрафт).`,
		});
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

		const { patientId } = patientParamsSchema.parse(request.params);
		const body = stageAdvanceSchema.parse(request.body);
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
		await db.transaction(async (tx) => {
			await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: updatedProgress }, tx);
		});

		return reply.send({ success: true, currentStage: body.nextStage, actionSummary, progress: updatedProgress });
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

		const { patientId } = patientParamsSchema.parse(request.params);
		const body = rebracketSchema.parse(request.body ?? {});
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

		const deduction = await db.transaction(async (tx) => {
			// DEF-ORTHO-01 / Мандат 8bo: Сохраняем структурированный JSONB объект внутри транзакции tx
			await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: updatedProgress }, tx);

			return await deductOrthoMaterialSafely({
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
		});

		return reply.send({ success: true, actionSummary, toothNumber: body.toothNumber, progress: updatedProgress, deduction });
	});
}
