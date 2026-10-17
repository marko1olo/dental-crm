import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
import { parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { deductOrthoMaterialsSchema, patientParamsSchema, rebracketSchema, stageAdvanceSchema, type OrthodonticProgressRecord } from "./types.js";

import { resolveMaterialParams } from "./materialParamsResolver.js";

export function registerStageAndMaterialRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/deduct-materials`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = patientParamsSchema.parse(request.params);
		const body = deductOrthoMaterialsSchema.parse(request.body);
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const resolved = resolveMaterialParams(body);
		const deduction = await deductOrthoMaterialSafely({
			organizationId: orgId, patientId, itemNamePattern: resolved.pattern, defaultItemName: resolved.defaultName,
			category: resolved.category, quantity: body.quantity, unit: resolved.unit, unitCostRub: resolved.unitCostRub,
			visitId: body.visitId ?? null, notes: body.notes || `Ортодонтическое списание [${body.action}]`,
		});

		return reply.send({
			success: true, action: body.action, deduction,
			message: `Материал «${deduction.itemName || resolved.defaultName}» успешно списан со склада (мягкий овердрафт).`,
		});
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/stages/advance`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = patientParamsSchema.parse(request.params);
		const body = stageAdvanceSchema.parse(request.body);
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
		const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);
		const actionSummary = `Переход на этап ${body.nextStage}${body.stageTitle ? `: ${body.stageTitle}` : ""}`;
		const updatedProgress: OrthodonticProgressRecord = {
			...currentProgress, currentStage: body.nextStage, stageTitle: body.stageTitle || currentProgress.stageTitle,
			lastActionDate: new Date().toISOString(), lastActionSummary: actionSummary,
		};

		await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: JSON.stringify(updatedProgress) });
		return reply.send({ success: true, currentStage: body.nextStage, actionSummary, progress: updatedProgress });
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/rebracket`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = patientParamsSchema.parse(request.params);
		const body = rebracketSchema.parse(request.body ?? {});
		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

		const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
		const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);
		const toothLabel = body.toothNumber ? ` на зубе ${body.toothNumber}` : "";
		const actionSummary = `Повторная фиксация брекета (1 шт.)${toothLabel} · ${body.bracketType}${body.note ? ` (${body.note})` : ""}`;
		const updatedProgress: OrthodonticProgressRecord = {
			...currentProgress, lastActionDate: new Date().toISOString(), lastActionSummary: actionSummary,
		};

		await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: JSON.stringify(updatedProgress) });
		const deduction = await deductOrthoMaterialSafely({
			organizationId: orgId, patientId, itemNamePattern: "брекет", defaultItemName: `Брекет ортодонтический ${body.bracketType}`,
			category: "ortho_bracket", quantity: 1, unit: "шт.", unitCostRub: 1200, notes: actionSummary,
		});

		return reply.send({ success: true, actionSummary, toothNumber: body.toothNumber, progress: updatedProgress, deduction });
	});
}
