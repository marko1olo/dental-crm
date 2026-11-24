import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash } from "@dental/shared";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { isLockStale, queryDatabaseIdempotencyRecord } from "../../plugins/idempotencyModules/idempotencyStorageEngine.js";
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

			const parsedBody = issueAlignerSetSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры выдачи сета элайнеров: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

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
				...(body.angleClass ? { angleClass: body.angleClass } : {}),
				...(body.verticalBite ? { verticalBite: body.verticalBite } : {}),
				...(typeof body.overjetMm === "number" ? { overjetMm: body.overjetMm } : {}),
				...(typeof body.overbitePercent === "number" ? { overbitePercent: body.overbitePercent } : {}),
				...(typeof body.anbAngle === "number" ? { anbAngle: body.anbAngle } : {}),
				...(body.skeletalClass ? { skeletalClass: body.skeletalClass } : {}),
				...(body.treatmentPlanId ? { treatmentPlanId: body.treatmentPlanId } : {}),
				nextVisitRecommendedDate: nextDate,
			};

			// DEF-ORTHO-02 / DEF-ORTHO-05 / Red Team: Выбор стоимости из прейскуранта клиники (A16.07.046) с фоллбеком
			const resolvedPrice = await resolveOrthoServicePrice({
				organizationId: orgId,
				serviceCode: "A16.07.046",
				defaultServiceName: `Ортодонтическая коррекция с применением элайнеров (выдача сета №${fromAligner}–${toAligner})`,
				fallbackPriceRub: 3000,
				logger: request.log,
			});

			const responsePayload = await db.transaction(async (tx) => {
				// DEF-ORTHO-01 / Мандат 8bo: Сохраняем структурированный JSONB объект внутри транзакции tx
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

				const payload: Record<string, unknown> = {
					success: true,
					issuedRange: `№${fromAligner}–${toAligner}`,
					nextVisitRecommendedDate: nextDate,
					actionSummary,
					progress: updatedProgress,
					billing,
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
		},
	);
}
