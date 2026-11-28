import type { FastifyInstance } from "fastify";
import { and, eq, lt, lte } from "drizzle-orm";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans, treatmentPlanStages } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { deductOrthoMaterialsSchema, patientParamsSchema, rebracketSchema, stageAdvanceSchema, type OrthodonticProgressRecord } from "./types.js";

import { resolveMaterialParams } from "./materialParamsResolver.js";
import { resolveOrthoMaterialCost } from "./orthoPricelistResolver.js";

export function registerStageAndMaterialRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/deduct-materials`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: deductOrthoMaterialsSchema,
		validationErrorMessage: "Некорректные параметры списания материалов",
		execute: async ({ tx, principal, organizationId: orgId, params: { patientId }, body, request, reply }) => {
			const [patient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const resolved = await resolveMaterialParams(body, orgId, tx);
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
				userId: principal.userId ?? null,
				notes: body.notes || `Ортодонтическое списание [${body.action}]`,
				tx,
				logger: request.log,
			});

			return {
				success: true,
				action: body.action,
				deduction,
				message: `Материал «${deduction.itemName || resolved.defaultName}» успешно списан со склада (мягкий овердрафт).`,
			};
		},
	});

	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/stages/advance`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: stageAdvanceSchema,
		validationErrorMessage: "Некорректные параметры перехода на этап",
		execute: async ({ tx, organizationId: orgId, params: { patientId }, body, reply }) => {
			const actionSummary = `Переход на этап ${body.nextStage}${body.stageTitle ? `: ${body.stageTitle}` : ""}`;

			const [patient] = await tx
				.select({
					id: patients.id,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
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
				...(body.angleClass ? { angleClass: body.angleClass } : {}),
				...(body.verticalBite ? { verticalBite: body.verticalBite } : {}),
				...(typeof body.overjetMm === "number" ? { overjetMm: body.overjetMm } : {}),
				...(typeof body.overbitePercent === "number" ? { overbitePercent: body.overbitePercent } : {}),
				...(typeof body.anbAngle === "number" ? { anbAngle: body.anbAngle } : {}),
				...(body.skeletalClass ? { skeletalClass: body.skeletalClass } : {}),
				...(body.treatmentPlanId ? { treatmentPlanId: body.treatmentPlanId } : {}),
			};

			await updatePatientAdministrativeProfileInDb(orgId, patientId, { ...adminProfile, orthodonticProgress: updatedProgress }, tx);

			if (body.treatmentPlanId) {
				const [ownedPlan] = await tx
					.select({ id: treatmentPlans.id, status: treatmentPlans.status })
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, body.treatmentPlanId),
							eq(treatmentPlans.organizationId, orgId),
							eq(treatmentPlans.patientId, patientId),
						),
					)
					.for("update")
					.limit(1);

				if (ownedPlan) {
					if (ownedPlan.status === "Draft") {
						await tx
							.update(treatmentPlans)
							.set({ status: "Approved" })
							.where(
								and(
									eq(treatmentPlans.id, ownedPlan.id),
									eq(treatmentPlans.organizationId, orgId),
									eq(treatmentPlans.patientId, patientId),
								),
							);
					}

					const archiveCondition =
						body.completedStage !== undefined
							? lte(treatmentPlanStages.stageOrder, body.completedStage)
							: lt(treatmentPlanStages.stageOrder, body.nextStage);

					await tx
						.update(treatmentPlanStages)
						.set({
							completionPercentage: 100,
							autoArchived: true,
							archivedAt: new Date(),
						})
						.where(
							and(
								eq(treatmentPlanStages.planId, ownedPlan.id),
								eq(treatmentPlanStages.organizationId, orgId),
								archiveCondition,
							),
						);
				}
			}

			return {
				success: true,
				currentStage: body.nextStage,
				actionSummary,
				progress: updatedProgress,
			};
		},
	});

	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/rebracket`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: rebracketSchema,
		validationErrorMessage: "Некорректные параметры повторной фиксации брекета",
		execute: async ({ tx, principal, organizationId: orgId, params: { patientId }, body, request, reply }) => {
			const toothLabel = body.toothNumber ? ` на зубе ${body.toothNumber}` : "";
			const actionSummary = `Повторная фиксация брекета (1 шт.)${toothLabel} · ${body.bracketType}${body.note ? ` (${body.note})` : ""}`;

			const [patient] = await tx
				.select({
					id: patients.id,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress, lastActionDate: new Date().toISOString(), lastActionSummary: actionSummary,
			};

			const rebracketCost = await resolveOrthoMaterialCost({
				organizationId: orgId,
				itemNamePattern: "брекет",
				fallbackCostRub: 1200,
				tx,
				logger: request.log,
			});

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
				userId: principal.userId ?? null,
				notes: actionSummary,
				tx,
				logger: request.log,
			});

			return {
				success: true,
				actionSummary,
				toothNumber: body.toothNumber,
				progress: updatedProgress,
				deduction,
			};
		},
	});
}
