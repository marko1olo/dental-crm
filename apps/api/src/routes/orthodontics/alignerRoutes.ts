import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { calculateNextDate, createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { linkOrthoServiceToBillingSafely } from "./orthoBillingService.js";
import { resolveOrthoServicePrice } from "./orthoPricelistResolver.js";
import { issueAlignerSetSchema, patientParamsSchema, type OrthodonticProgressRecord } from "./types.js";

export function registerAlignerRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	defineTenantQuery(app, {
		method: "GET",
		path: `${prefix}/:patientId/progress`,
		permission: "clinical.read",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		paramsSchema: patientParamsSchema,
		validationErrorMessage: "Некорректный идентификатор пациента",
		query: async ({ tx, organizationId: orgId, params: { patientId }, reply }) => {
			const [patient] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = parseOrthoData(adminProfile.orthodonticProgress);
			if (!orthoProgress) {
				return {
					hasActiveTreatment: false,
					progress: null,
					patientId,
					patientName: patient.fullName,
				};
			}

			return {
				hasActiveTreatment: true,
				progress: orthoProgress,
				patientId,
				patientName: patient.fullName,
				...orthoProgress,
			};
		},
	});

	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/aligners/issue-set`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: issueAlignerSetSchema,
		validationErrorMessage: "Некорректные параметры выдачи сета элайнеров",
		execute: async ({ tx, organizationId: orgId, params: { patientId }, body, request, reply }) => {
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
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord({
				applianceCategory: "aligners",
				totalAligners: body.totalAligners,
				wearDaysPerAligner: body.wearDaysPerAligner,
			});

			const effectiveTotal = body.totalAligners || currentProgress.totalAligners || 24;
			const fromAligner = (currentProgress.currentAligner && currentProgress.currentAligner > 0 && currentProgress.lastActionSummary)
				? currentProgress.currentAligner + 1
				: (currentProgress.currentAligner || 1);
			const toAligner = Math.min(effectiveTotal, fromAligner + body.alignerCount - 1);
			const totalDays = body.alignerCount * body.wearDaysPerAligner;
			const nextDate = calculateNextDate(totalDays);
			const actionSummary = `Выдан сет элайнеров №${fromAligner}–${toAligner} (+${totalDays} дн. до ${nextDate})`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				applianceId: body.applianceId || currentProgress.applianceId || "clear_aligners",
				applianceName: body.applianceName || currentProgress.applianceName || "Элайнеры (ортодонтические каппы)",
				applianceCategory: "aligners",
				selectedElasticId: body.selectedElasticId !== undefined ? body.selectedElasticId : currentProgress.selectedElasticId,
				selectedActionIds: body.selectedActionIds || currentProgress.selectedActionIds,
				currentAligner: toAligner,
				totalAligners: effectiveTotal,
				wearDaysPerAligner: body.wearDaysPerAligner,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
				...(body.soapSummary ? { lastSoapSummary: body.soapSummary } : {}),
				...(body.angleClass ? { angleClass: body.angleClass } : {}),
				...(body.verticalBite ? { verticalBite: body.verticalBite } : {}),
				...(typeof body.overjetMm === "number" ? { overjetMm: body.overjetMm } : {}),
				...(typeof body.overbitePercent === "number" ? { overbitePercent: body.overbitePercent } : {}),
				...(typeof body.anbAngle === "number" ? { anbAngle: body.anbAngle } : {}),
				...(body.skeletalClass ? { skeletalClass: body.skeletalClass } : {}),
				...(body.treatmentPlanId ? { treatmentPlanId: body.treatmentPlanId } : {}),
				nextVisitRecommendedDate: nextDate,
			};

			const resolvedPrice = await resolveOrthoServicePrice({
				organizationId: orgId,
				serviceCode: "A16.07.046",
				defaultServiceName: `Ортодонтическая коррекция с применением элайнеров (выдача сета №${fromAligner}–${toAligner})`,
				fallbackPriceRub: 3000,
				tx,
				logger: request.log,
			});

			await updatePatientAdministrativeProfileInDb(
				orgId,
				patientId,
				{
					...adminProfile,
					orthodonticProgress: updatedProgress,
				},
				tx,
			);

			if (body.treatmentPlanId) {
				await tx
					.update(treatmentPlans)
					.set({ status: "Approved" })
					.where(
						and(
							eq(treatmentPlans.id, body.treatmentPlanId),
							eq(treatmentPlans.organizationId, orgId),
							eq(treatmentPlans.patientId, patientId),
							eq(treatmentPlans.status, "Draft"),
						),
					);
			}

			const billing = await linkOrthoServiceToBillingSafely({
				organizationId: orgId,
				patientId,
				visitId: body.visitId,
				serviceCode: resolvedPrice.serviceCode,
				serviceName: resolvedPrice.serviceName,
				priceRub: resolvedPrice.priceRub,
				priceKopecks: resolvedPrice.priceKopecks,
				tx,
				logger: request.log,
			});

			return {
				success: true,
				issuedRange: `№${fromAligner}–${toAligner}`,
				nextVisitRecommendedDate: nextDate,
				actionSummary,
				progress: updatedProgress,
				billing,
			};
		},
	});
}
