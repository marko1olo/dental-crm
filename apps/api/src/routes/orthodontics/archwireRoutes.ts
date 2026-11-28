import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { patients } from "../../db/schema.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { linkOrthoServiceToBillingSafely } from "./orthoBillingService.js";
import { resolveOrthoMaterialCost, resolveOrthoServicePrice } from "./orthoPricelistResolver.js";
import { archwireChangeSchema, ligatureActivateSchema, patientParamsSchema, type OrthodonticProgressRecord, type OrthoMaterialDeductionResult } from "./types.js";

export function registerArchwireRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/archwire-change`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: archwireChangeSchema,
		validationErrorMessage: "Некорректные параметры смены дуги",
		execute: async ({ tx, principal, organizationId: orgId, params: { patientId }, body, request, reply }) => {
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
						userId: principal.userId ?? null,
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
						userId: principal.userId ?? null,
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
						userId: principal.userId ?? null,
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
		},
	});

	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/ligatures-activate`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "required_header",
		paramsSchema: patientParamsSchema,
		bodySchema: ligatureActivateSchema,
		validationErrorMessage: "Некорректные параметры активации лигатур",
		execute: async ({ tx, principal, organizationId: orgId, params: { patientId }, body, request, reply }) => {
			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductLigatures = !isPlate;

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
						userId: principal.userId ?? null,
						notes: actionSummary,
						tx,
						logger: request.log,
				  })
				: null;

			return {
				success: true,
				actionSummary,
				progress: updatedProgress,
				deduction: deductionRes,
			};
		},
	});
}
