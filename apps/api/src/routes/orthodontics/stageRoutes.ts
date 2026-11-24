import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans, treatmentPlanStages } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { deductOrthoMaterialsSchema, patientParamsSchema, rebracketSchema, stageAdvanceSchema, type OrthodonticProgressRecord } from "./types.js";

import { resolveMaterialParams } from "./materialParamsResolver.js";
import { resolveOrthoMaterialCost } from "./orthoPricelistResolver.js";

export function registerStageAndMaterialRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/deduct-materials`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.orthodontics.write",
				role: staffRole,
				message: `Отказ в списании ортодонтических материалов: ${evalAccess.reason}`,
			});
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

		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) return { patientNotFound: true as const };

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
				userId: identity.userId ?? null,
				notes: body.notes || `Ортодонтическое списание [${body.action}]`,
				tx,
				logger: request.log,
			});

			return {
				patientNotFound: false as const,
				payload: {
					success: true,
					action: body.action,
					deduction,
					message: `Материал «${deduction.itemName || resolved.defaultName}» успешно списан со склада (мягкий овердрафт).`,
				},
			};
		});

		if (txResult.patientNotFound) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
		}

		return reply.send(txResult.payload);
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/stages/advance`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.orthodontics.write",
				role: staffRole,
				message: `Отказ в обновлении этапа ортодонтического лечения: ${evalAccess.reason}`,
			});
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
		const actionSummary = `Переход на этап ${body.nextStage}${body.stageTitle ? `: ${body.stageTitle}` : ""}`;

		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({
					id: patients.id,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) return { patientNotFound: true as const };

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

					// DEF-ORTHO-03: Синхронизация прогресса этапа плана лечения строго в рамках тенанта и плана пациента
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
								eq(treatmentPlanStages.stageOrder, body.nextStage),
							),
						);
				}
			}

			return {
				patientNotFound: false as const,
				payload: {
					success: true,
					currentStage: body.nextStage,
					actionSummary,
					progress: updatedProgress,
				},
			};
		});

		if (txResult.patientNotFound) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
		}

		return reply.send(txResult.payload);
	});

	app.post<{ Params: { patientId: string } }>(`${prefix}/:patientId/rebracket`, async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.orthodontics.write",
				role: staffRole,
				message: `Отказ в фиксации повторного брекета: ${evalAccess.reason}`,
			});
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
		const toothLabel = body.toothNumber ? ` на зубе ${body.toothNumber}` : "";
		const actionSummary = `Повторная фиксация брекета (1 шт.)${toothLabel} · ${body.bracketType}${body.note ? ` (${body.note})` : ""}`;

		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({
					id: patients.id,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.for("update")
				.limit(1);
			if (!patient) return { patientNotFound: true as const };

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
				userId: identity.userId ?? null,
				notes: actionSummary,
				tx,
				logger: request.log,
			});

			return {
				patientNotFound: false as const,
				payload: {
					success: true,
					actionSummary,
					toothNumber: body.toothNumber,
					progress: updatedProgress,
					deduction,
				},
			};
		});

		if (txResult.patientNotFound) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
		}

		return reply.send(txResult.payload);
	});
}
