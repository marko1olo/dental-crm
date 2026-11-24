import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { calculateNextDate, createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { linkOrthoServiceToBillingSafely } from "./orthoBillingService.js";
import { resolveOrthoServicePrice } from "./orthoPricelistResolver.js";
import { issueAlignerSetSchema, patientParamsSchema, type OrthodonticProgressRecord } from "./types.js";

export function registerAlignerRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.get<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/progress`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.orthodontics.read",
					role: staffRole,
					message: `Отказ в доступе к ортодонтическому прогрессу: ${evalAccess.reason}`,
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

			const patient = await withTenantCtx(orgId, async (tx) => {
				const [row] = await tx
					.select({
						id: patients.id,
						fullName: patients.fullName,
						administrativeProfile: patients.administrativeProfile,
					})
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.limit(1);
				return row ?? null;
			});
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = parseOrthoData(adminProfile.orthodonticProgress);
			if (!orthoProgress) {
				return reply.send({
					hasActiveTreatment: false,
					progress: null,
					patientId,
					patientName: patient.fullName,
				});
			}

			return reply.send({
				hasActiveTreatment: true,
				progress: orthoProgress,
				patientId,
				patientName: patient.fullName,
				...orthoProgress,
			});
		},
	);

	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/aligners/issue-set`,
		async (request, reply) => {
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
					message: `Отказ в выдаче комплекта элайнеров: ${evalAccess.reason}`,
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

			const parsedBody = issueAlignerSetSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры выдачи сета элайнеров: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

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
				if (!patient) {
					return { patientNotFound: true as const };
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
					patientNotFound: false as const,
					payload: {
						success: true,
						issuedRange: `№${fromAligner}–${toAligner}`,
						nextVisitRecommendedDate: nextDate,
						actionSummary,
						progress: updatedProgress,
						billing,
					},
				};
			});

			if (txResult.patientNotFound) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			return reply.send(txResult.payload);
		},
	);
}
