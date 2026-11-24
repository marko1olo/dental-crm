import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
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

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.orthodontics.write",
					role: staffRole,
					message: `Отказ в фиксации смены дуги: ${evalAccess.reason}`,
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

			const parsedBody = archwireChangeSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры смены дуги: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

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

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductWire = Boolean(body.isWireChange && !isPlate);
			const serviceName = isPlate
				? "Активация съемного ортодонтического аппарата (пластинки)"
				: body.arch === "both"
					? "Активация брекет-системы и замена ортодонтических дуг (ВЧ + НЧ)"
					: `Активация брекет-системы и замена ортодонтической дуги (${archLabel})`;
			const serviceCode = isPlate ? "A16.07.047" : body.arch === "both" ? "A16.07.048.001" : "A16.07.048.002";
			const fallbackPriceRub = isPlate ? 2500 : body.arch === "both" ? 4000 : 3500;

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

				const archwireCost = await resolveOrthoMaterialCost({
					organizationId: orgId,
					itemNamePattern: body.material,
					fallbackCostRub: 1200,
					tx,
					logger: request.log,
				});

				const resolvedPrice = await resolveOrthoServicePrice({
					organizationId: orgId,
					serviceCode,
					defaultServiceName: serviceName,
					fallbackPriceRub,
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

				let deductionRes: OrthoMaterialDeductionResult | null = null;
				if (shouldDeductWire) {
					if (body.arch === "both" && (effectiveUpperMat !== effectiveLowerMat || effectiveUpperSec !== effectiveLowerSec)) {
						const upperCost = await resolveOrthoMaterialCost({
							organizationId: orgId,
							itemNamePattern: effectiveUpperMat,
							fallbackCostRub: 1200,
							tx,
							logger: request.log,
						});
						const lowerCost = await resolveOrthoMaterialCost({
							organizationId: orgId,
							itemNamePattern: effectiveLowerMat,
							fallbackCostRub: 1200,
							tx,
							logger: request.log,
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
							userId: identity.userId ?? null,
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
							userId: identity.userId ?? null,
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
							userId: identity.userId ?? null,
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

				return {
					patientNotFound: false as const,
					payload: {
						success: true,
						archwire: archwireStr,
						upperArchwire,
						lowerArchwire,
						combinedArchwire,
						actionSummary,
						progress: updatedProgress,
						deduction: deductionRes,
						billing: billingRes,
					},
				};
			});

			if (txResult.patientNotFound) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			return reply.send(txResult.payload);
		},
	);

	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/ligatures-activate`,
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
					message: `Отказ в активации лигатур: ${evalAccess.reason}`,
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

			const parsedBody = ligatureActivateSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры активации лигатур: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;
			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductLigatures = !isPlate;

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
					lastActionDate: new Date().toISOString(),
					lastActionSummary: actionSummary,
				};

				const ligatureCost = await resolveOrthoMaterialCost({
					organizationId: orgId,
					itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
					fallbackCostRub: body.powerChain ? 80 : 15,
					tx,
					logger: request.log,
				});

				await updatePatientAdministrativeProfileInDb(orgId, patientId, {
					...adminProfile,
					orthodonticProgress: updatedProgress,
				}, tx);

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
							userId: identity.userId ?? null,
							notes: actionSummary,
							tx,
							logger: request.log,
					  })
					: null;

				return {
					patientNotFound: false as const,
					payload: {
						success: true,
						actionSummary,
						progress: updatedProgress,
						deduction: deductionRes,
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
