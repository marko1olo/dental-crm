import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
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

			const { patientId } = patientParamsSchema.parse(request.params);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = parseOrthoData(adminProfile.orthodonticProgress);
			// DEF-ORTHO-06 / Досье a9c64bbc: Чистые пациенты получают 200 OK с hasActiveTreatment: false вместо ложного 404
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

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = issueAlignerSetSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
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
			// DEF-ORTHO-08 / Досье a9c64bbc: Если это не первая выдача, следующий сет начинается с currentAligner + 1
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
				nextVisitRecommendedDate: nextDate,
			};

			// DEF-ORTHO-02 / DEF-ORTHO-05 / Red Team: Выбор стоимости из прейскуранта клиники (A16.07.046) с фоллбеком
			const resolvedPrice = await resolveOrthoServicePrice({
				organizationId: orgId,
				serviceCode: "A16.07.046",
				defaultServiceName: `Ортодонтическая коррекция с применением элайнеров (выдача сета №${fromAligner}–${toAligner})`,
				fallbackPriceRub: 3000,
			});

			const billing = await db.transaction(async (tx) => {
				// DEF-ORTHO-01: Сохраняем структурированный JSONB объект вместо JSON-строки
				await updatePatientAdministrativeProfileInDb(orgId, patientId, {
					...adminProfile,
					orthodonticProgress: updatedProgress,
				});

				return await linkOrthoServiceToBillingSafely({
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
			});

			return reply.send({
				success: true,
				issuedRange: `№${fromAligner}–${toAligner}`,
				nextVisitRecommendedDate: nextDate,
				actionSummary,
				progress: updatedProgress,
				billing,
			});
		},
	);
}
