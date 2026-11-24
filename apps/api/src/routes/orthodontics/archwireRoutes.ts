import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash, rublesToKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { isLockStale, queryDatabaseIdempotencyRecord } from "../../plugins/idempotencyModules/idempotencyStorageEngine.js";
import { requireOrganizationId } from "../../security/identity.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { linkOrthoServiceToBillingSafely } from "./orthoBillingService.js";
import { resolveOrthoMaterialCost, resolveOrthoServicePrice } from "./orthoPricelistResolver.js";
import { archwireChangeSchema, ligatureActivateSchema, patientParamsSchema, type OrthodonticProgressRecord, type OrthoMaterialDeductionResult } from "./types.js";

export function registerArchwireRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/archwire-change`,
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

			const parsedBody = archwireChangeSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры смены дуги: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
			const effectiveUpperMat = body.upperMaterial || body.material;
			const effectiveUpperSec = body.upperSection || body.section;
			const effectiveLowerMat = body.lowerMaterial || body.material;
			const effectiveLowerSec = body.lowerSection || body.section;

			const archLabel = body.arch === "upper" ? "ВЧ" : body.arch === "lower" ? "НЧ" : "ВЧ + НЧ";
			const wireSpec = `${body.material} ${body.section}"`;
			const archwireStr = body.arch === "both" && (effectiveUpperMat !== effectiveLowerMat || effectiveUpperSec !== effectiveLowerSec)
				? `ВЧ: ${effectiveUpperMat} ${effectiveUpperSec}", НЧ: ${effectiveLowerMat} ${effectiveLowerSec}"`
				: `${wireSpec} (${archLabel})`;
			const actionSummary = `Смена дуги: ${archwireStr}${body.note ? ` · ${body.note}` : ""}`;

			// DEF-ORTHO-01 / Досье a9c64bbc: Раздельное хранение дуг ВЧ и НЧ (исключение взаимного затирания)
			let upperArchwire = currentProgress.upperArchwire;
			let lowerArchwire = currentProgress.lowerArchwire;

			if (body.arch === "upper") {
				upperArchwire = `${wireSpec} (ВЧ)`;
			} else if (body.arch === "lower") {
				lowerArchwire = `${wireSpec} (НЧ)`;
			} else {
				upperArchwire = `${effectiveUpperMat} ${effectiveUpperSec}" (ВЧ)`;
				lowerArchwire = `${effectiveLowerMat} ${effectiveLowerSec}" (НЧ)`;
			}

			let combinedArchwire = archwireStr;
			if (body.arch === "both") {
				if (effectiveUpperMat !== effectiveLowerMat || effectiveUpperSec !== effectiveLowerSec) {
					combinedArchwire = `${upperArchwire} / ${lowerArchwire}`;
				} else {
					combinedArchwire = archwireStr;
				}
			} else if (upperArchwire && lowerArchwire) {
				combinedArchwire = `${upperArchwire} / ${lowerArchwire}`;
			} else {
				combinedArchwire = upperArchwire || lowerArchwire || archwireStr;
			}

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				applianceId: body.applianceId || currentProgress.applianceId,
				applianceName: body.applianceName || currentProgress.applianceName,
				applianceCategory: body.applianceCategory || currentProgress.applianceCategory || "brackets",
				selectedElasticId: body.selectedElasticId !== undefined ? body.selectedElasticId : currentProgress.selectedElasticId,
				selectedActionIds: body.selectedActionIds || currentProgress.selectedActionIds,
				upperArchwire,
				lowerArchwire,
				archwire: combinedArchwire,
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
			};

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductWire = Boolean(body.isWireChange && !isPlate);

			// DEF-ORTHO-02 / DEF-ORTHO-06 / DEF-ORTHO-10: Расчет стоимости из остатков склада
			const archwireCost = await resolveOrthoMaterialCost({
				organizationId: orgId,
				itemNamePattern: body.material,
				fallbackCostRub: 1200,
			});

			// DEF-ORTHO-02 / DEF-ORTHO-05 / Red Team: Выбор цены услуги из прейскуранта клиники
			// Мандат 8bm: A16.07.048.001 при смене обеих дуг (4000 руб единым тарифом вместо двух счетов по 3500 руб)
			const serviceName = isPlate
				? "Активация съемного ортодонтического аппарата (пластинки)"
				: body.arch === "both"
					? "Активация брекет-системы и замена ортодонтических дуг (ВЧ + НЧ)"
					: `Активация брекет-системы и замена ортодонтической дуги (${archLabel})`;
			const serviceCode = isPlate ? "A16.07.047" : body.arch === "both" ? "A16.07.048.001" : "A16.07.048.002";
			const fallbackPriceRub = isPlate ? 2500 : body.arch === "both" ? 4000 : 3500;

			const resolvedPrice = await resolveOrthoServicePrice({
				organizationId: orgId,
				serviceCode,
				defaultServiceName: serviceName,
				fallbackPriceRub,
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

				let deductionRes: OrthoMaterialDeductionResult | null = null;
				if (shouldDeductWire) {
					if (body.arch === "both" && (effectiveUpperMat !== effectiveLowerMat || effectiveUpperSec !== effectiveLowerSec)) {
						// Списание разных материалов для ВЧ и НЧ раздельно по BOM
						const upperCost = await resolveOrthoMaterialCost({
							organizationId: orgId,
							itemNamePattern: effectiveUpperMat,
							fallbackCostRub: 1200,
						});
						const lowerCost = await resolveOrthoMaterialCost({
							organizationId: orgId,
							itemNamePattern: effectiveLowerMat,
							fallbackCostRub: 1200,
						});
						const upperDeduct = await deductOrthoMaterialSafely({
							organizationId: orgId,
							patientId,
							itemNamePattern: effectiveUpperMat,
							defaultItemName: `Дуга ортодонтическая ${effectiveUpperMat} ${effectiveUpperSec}" (ВЧ)`,
							category: "ortho_archwire",
							quantity: 1,
							unit: "шт.",
							unitCostKopecks: upperCost.unitCostKopecks,
							unitCostRub: upperCost.unitCostRub,
							notes: `Смена дуги ВЧ: ${effectiveUpperMat} ${effectiveUpperSec}"`,
							visitId: body.visitId,
							tx,
							logger: request.log,
						});
						const lowerDeduct = await deductOrthoMaterialSafely({
							organizationId: orgId,
							patientId,
							itemNamePattern: effectiveLowerMat,
							defaultItemName: `Дуга ортодонтическая ${effectiveLowerMat} ${effectiveLowerSec}" (НЧ)`,
							category: "ortho_archwire",
							quantity: 1,
							unit: "шт.",
							unitCostKopecks: lowerCost.unitCostKopecks,
							unitCostRub: lowerCost.unitCostRub,
							notes: `Смена дуги НЧ: ${effectiveLowerMat} ${effectiveLowerSec}"`,
							visitId: body.visitId,
							tx,
							logger: request.log,
						});
						deductionRes = upperDeduct || lowerDeduct;
					} else {
						const archwireQty = body.arch === "both" ? 2 : 1;
						deductionRes = await deductOrthoMaterialSafely({
							organizationId: orgId,
							patientId,
							itemNamePattern: body.material,
							defaultItemName: `Дуга ортодонтическая ${body.material} ${body.section}"`,
							category: "ortho_archwire",
							quantity: archwireQty,
							unit: "шт.",
							unitCostKopecks: archwireCost.unitCostKopecks,
							unitCostRub: archwireCost.unitCostRub,
							notes: `Смена дуги: ${archwireStr}`,
							visitId: body.visitId,
							tx,
							logger: request.log,
						});
					}
				}

				const billingRes = await linkOrthoServiceToBillingSafely({
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
					archwire: archwireStr,
					upperArchwire,
					lowerArchwire,
					combinedArchwire,
					actionSummary,
					progress: updatedProgress,
					deduction: deductionRes,
					billing: billingRes,
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

	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/ligatures-activate`,
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

			const parsedBody = ligatureActivateSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры активации лигатур: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductLigatures = !isPlate;

			// DEF-ORTHO-02 / DEF-ORTHO-06: Расчет стоимости из складских остатков клиники
			const ligatureCost = await resolveOrthoMaterialCost({
				organizationId: orgId,
				itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
				fallbackCostRub: body.powerChain ? 80 : 15,
			});

			const responsePayload = await db.transaction(async (tx) => {
				// DEF-ORTHO-01: Сохраняем структурированный JSONB объект вместо JSON-строки
				await updatePatientAdministrativeProfileInDb(orgId, patientId, {
					...adminProfile,
					orthodonticProgress: updatedProgress,
				}, tx);

				// Списание материалов отключается для съемных пластинок (plate)
				const deductionRes = shouldDeductLigatures
					? await deductOrthoMaterialSafely({
							organizationId: orgId,
							patientId,
							itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
							defaultItemName: body.powerChain
								? "Эластическая цепочка Power Chain"
								: "Эластические лигатуры цветные/прозрачные",
							category: body.powerChain ? "ortho_archwire" : "other",
							quantity: body.powerChain ? 1 : 10,
							unit: body.powerChain ? "см" : "шт.",
							unitCostKopecks: ligatureCost.unitCostKopecks,
							unitCostRub: ligatureCost.unitCostRub,
							notes: actionSummary,
							tx,
							logger: request.log,
					  })
					: null;

				const payload: Record<string, unknown> = {
					success: true,
					actionSummary,
					progress: updatedProgress,
					deduction: deductionRes,
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
