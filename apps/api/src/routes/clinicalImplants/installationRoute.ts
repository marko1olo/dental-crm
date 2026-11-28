import { createHash } from "node:crypto";
import {
	type CreateImplantInstallationInput,
	type ImplantBatchToothSpec,
	ImplantStabilityCalculator,
	type ResolvedImplantInstallationInput,
	createImplantInstallationSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { onTenantTxCommit } from "../../db/rls.js";
import {
	implantCatalogItems,
	implantIsqMeasurements,
	patientImplantInstallations,
	patients,
	visits,
	warrantyCertificates,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { deductConsumables } from "./deductConsumables.js";
import { deductImplantScrew } from "./deductImplantScrew.js";
import { linkBillingAndOdontogram } from "./installationBillingAndOdontogram.js";

function normalizeBrandString(value: unknown): unknown {
	return typeof value === "string"
		? value.trim().toLowerCase().replace(/[\s-]+/g, "_")
		: value;
}

function collectCandidateTeeth(rawBody: Record<string, unknown>): number[] {
	const result: number[] = [];
	const pushTooth = (val: unknown) => {
		if (typeof val === "number" && !result.includes(val)) {
			result.push(val);
		}
	};
	if (Array.isArray(rawBody.teeth)) {
		for (const t of rawBody.teeth) pushTooth(t);
	}
	pushTooth(rawBody.toothNumberFdi);
	const rawSpecs = Array.isArray(rawBody.installations)
		? rawBody.installations
		: Array.isArray(rawBody.teethSpecs)
			? rawBody.teethSpecs
			: [];
	for (const item of rawSpecs) {
		if (item && typeof item === "object") {
			pushTooth((item as Record<string, unknown>).toothNumberFdi);
		}
	}
	return result;
}

function resolveSingleToothSpec(
	base: CreateImplantInstallationInput,
	toothNumberFdi: number,
	override?: ImplantBatchToothSpec,
): ResolvedImplantInstallationInput {
	const diameter = override?.implantDiameterMm ?? base.implantDiameterMm;
	const length = override?.implantLengthMm ?? base.implantLengthMm;
	const torque = override?.finalInsertionTorqueNcm ?? base.finalInsertionTorqueNcm;
	if (diameter === undefined || length === undefined || torque === undefined) {
		throw new Error("IMPLANT_SPEC_INCOMPLETE");
	}
	return {
		...base,
		toothNumberFdi,
		implantDiameterMm: diameter,
		implantLengthMm: length,
		finalInsertionTorqueNcm: torque,
		implantBrand: override?.implantBrand ?? base.implantBrand,
		connectionType:
			override?.connectionType !== undefined
				? override.connectionType
				: base.connectionType,
		implantConnectionType:
			override?.implantConnectionType !== undefined
				? override.implantConnectionType
				: base.implantConnectionType,
		catalogItemId:
			override?.catalogItemId !== undefined
				? override.catalogItemId
				: base.catalogItemId,
		inventoryItemId:
			override?.inventoryItemId !== undefined
				? override.inventoryItemId
				: base.inventoryItemId,
		lotNumber:
			override?.lotNumber !== undefined
				? override.lotNumber
				: (base.lotNumber ?? null),
		serialNumber:
			override?.serialNumber !== undefined
				? override.serialNumber
				: (base.serialNumber ?? null),
		catalogArticle:
			override?.catalogArticle !== undefined
				? override.catalogArticle
				: base.catalogArticle,
		expirationDate:
			override?.expirationDate !== undefined
				? override.expirationDate
				: base.expirationDate,
		isGuidedSurgery: override?.isGuidedSurgery ?? base.isGuidedSurgery,
		guidedSleeveDiameterMm:
			override?.guidedSleeveDiameterMm !== undefined
				? override.guidedSleeveDiameterMm
				: base.guidedSleeveDiameterMm,
		guidedSleeveOffsetMm:
			override?.guidedSleeveOffsetMm !== undefined
				? override.guidedSleeveOffsetMm
				: base.guidedSleeveOffsetMm,
		surgicalGuideTemplateId:
			override?.surgicalGuideTemplateId !== undefined
				? override.surgicalGuideTemplateId
				: base.surgicalGuideTemplateId,
		boneDensityClass: override?.boneDensityClass ?? base.boneDensityClass,
		averageHounsfieldUnits:
			override?.averageHounsfieldUnits !== undefined
				? override.averageHounsfieldUnits
				: base.averageHounsfieldUnits,
		baselineIsqMesiodistal:
			override?.baselineIsqMesiodistal !== undefined
				? override.baselineIsqMesiodistal
				: base.baselineIsqMesiodistal,
		baselineIsqBuccolingual:
			override?.baselineIsqBuccolingual !== undefined
				? override.baselineIsqBuccolingual
				: base.baselineIsqBuccolingual,
		baselineIsqDistopalatal:
			override?.baselineIsqDistopalatal !== undefined
				? override.baselineIsqDistopalatal
				: base.baselineIsqDistopalatal,
		corticalTapUsed: override?.corticalTapUsed ?? base.corticalTapUsed,
		underdrillingUsed: override?.underdrillingUsed ?? base.underdrillingUsed,
		boneGraftMaterial:
			override?.boneGraftMaterial !== undefined
				? override.boneGraftMaterial
				: base.boneGraftMaterial,
		boneGraftItemId:
			override?.boneGraftItemId !== undefined
				? override.boneGraftItemId
				: base.boneGraftItemId,
		membraneUsed:
			override?.membraneUsed !== undefined
				? override.membraneUsed
				: base.membraneUsed,
		membraneItemId:
			override?.membraneItemId !== undefined
				? override.membraneItemId
				: base.membraneItemId,
		sutureMaterial:
			override?.sutureMaterial !== undefined
				? override.sutureMaterial
				: base.sutureMaterial,
		sutureItemId:
			override?.sutureItemId !== undefined
				? override.sutureItemId
				: base.sutureItemId,
		operationPriceRub:
			override?.operationPriceRub !== undefined
				? override.operationPriceRub
				: base.operationPriceRub,
		operationPriceKopecks:
			override?.operationPriceKopecks !== undefined
				? override.operationPriceKopecks
				: base.operationPriceKopecks,
		notes: override?.notes !== undefined ? override.notes : base.notes,
	};
}

function buildToothSpecsToProcess(
	input: CreateImplantInstallationInput,
	fallbackTeeth: number[],
): ResolvedImplantInstallationInput[] {
	const explicitSpecs = input.installations ?? input.teethSpecs;
	if (explicitSpecs && explicitSpecs.length > 0) {
		return explicitSpecs.map((spec) =>
			resolveSingleToothSpec(input, spec.toothNumberFdi, spec),
		);
	}
	const uniqueTeeth =
		fallbackTeeth.length > 0
			? fallbackTeeth
			: input.toothNumberFdi !== undefined
				? [input.toothNumberFdi]
				: [];
	return uniqueTeeth.map((toothNum) => resolveSingleToothSpec(input, toothNum));
}

export function registerInstallationRoute(app: FastifyInstance) {
	const registerRoute = (path: string) => {
		defineTenantMutation(app, {
			method: "POST",
			path,
			permission: "clinical.write",
			authOptions: {
				allowClinicTokenWithoutStaff: true,
				allowAdminSecretBypass: true,
			},
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId: orgId, request, reply }) => {
				// Нормализация наименования бренда для устойчивости к пробелам и регистрам
				const rawBody: Record<string, unknown> =
					typeof request.body === "object" && request.body !== null
						? { ...(request.body as Record<string, unknown>) }
						: {};
				if (typeof rawBody.implantBrand === "string") {
					rawBody.implantBrand = normalizeBrandString(rawBody.implantBrand);
				}
				for (const key of ["installations", "teethSpecs"] as const) {
					const list = rawBody[key];
					if (Array.isArray(list)) {
						rawBody[key] = list.map((item) => {
							if (item && typeof item === "object") {
								const clone = { ...(item as Record<string, unknown>) };
								if (typeof clone.implantBrand === "string") {
									clone.implantBrand = normalizeBrandString(clone.implantBrand);
								}
								return clone;
							}
							return item;
						});
					}
				}

				// Поддержка множественной имплантации (All-on-4 / пакетная установка)
				const targetTeeth = collectCandidateTeeth(rawBody);

				// [SEV-1] Анатомический гейт: блокировка имплантации в молочные зубы (FDI 51–85)
				for (const toothNum of targetTeeth) {
					if (toothNum >= 51 && toothNum <= 85) {
						return reply.code(422).send({
							error: "DeciduousToothImplantForbidden",
							message: `Установка дентального имплантата в область молочного зуба (#${toothNum}) категорически запрещена анатомическим протоколом`,
						});
					}
				}

				const parsed = createImplantInstallationSchema.safeParse(rawBody);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ImplantInstallationValidationError",
						message: "Некорректные параметры протокола установки имплантата.",
						details: parsed.error.format(),
					});
				}
				const input = parsed.data;
				const specsToProcess = buildToothSpecsToProcess(input, targetTeeth);
				const firstSpec = specsToProcess[0];
				if (!firstSpec) {
					return reply.code(400).send({
						error: "ImplantInstallationValidationError",
						message: "Не указан ни один зуб для установки имплантата.",
					});
				}
				const teethToProcess = specsToProcess.map((s) => s.toothNumberFdi);
				const targetPatientId = input.patientId;
				const effectiveInput = firstSpec;

				const { isqMean, isqAnisotropyDelta } = ImplantStabilityCalculator.calculateMeanIsq(
					effectiveInput.baselineIsqMesiodistal,
					effectiveInput.baselineIsqBuccolingual,
					effectiveInput.baselineIsqDistopalatal,
				);
				const { protocol, decisionRationale } = ImplantStabilityCalculator.evaluateLoadingProtocol(
					isqMean,
					effectiveInput.finalInsertionTorqueNcm,
					0,
				);
				const isImmediateLoadingFeasible =
					(isqMean !== null ? isqMean >= 70 : false) &&
					effectiveInput.finalInsertionTorqueNcm >= 35 &&
					effectiveInput.finalInsertionTorqueNcm <= 55;

				const [patient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.id, targetPatientId), eq(patients.organizationId, orgId)))
					.for("update")
					.limit(1);

				if (!patient) {
					return reply.code(404).send({
						error: "PatientNotFound",
						message: "Пациент не найден в вашей клинике.",
					});
				}

				const explicitSpecs = input.installations ?? input.teethSpecs;
				const installationResults: unknown[] = [];
				const allDeductions: unknown[] = [];
				let primaryFinancials: unknown = null;
				let firstInstallationRecord: typeof patientImplantInstallations.$inferSelect | null = null;
				let firstInventoryDeduction: unknown = null;
				let batchInvoiceId: string | undefined = input.invoiceId ?? undefined;

				for (let specIdx = 0; specIdx < specsToProcess.length; specIdx++) {
					const specItem = specsToProcess[specIdx];
					if (!specItem) continue;
					const toothOverride = explicitSpecs?.[specIdx];
					const toothNum = specItem.toothNumberFdi;
					// Операционные расходники (графт/мембрана/шов) списываем ОДИН РАЗ на операцию, а не N раз в пакете (если не указан персональный оверрайд на зуб)
					const consumableInput: ResolvedImplantInstallationInput =
						specIdx === 0
							? specItem
							: {
									...specItem,
									boneGraftMaterial:
										toothOverride?.boneGraftMaterial !== undefined ? toothOverride.boneGraftMaterial : null,
									boneGraftItemId:
										toothOverride?.boneGraftItemId !== undefined ? toothOverride.boneGraftItemId : null,
									membraneUsed:
										toothOverride?.membraneUsed !== undefined ? toothOverride.membraneUsed : null,
									membraneItemId:
										toothOverride?.membraneItemId !== undefined ? toothOverride.membraneItemId : null,
									sutureMaterial:
										toothOverride?.sutureMaterial !== undefined ? toothOverride.sutureMaterial : null,
									sutureItemId:
										toothOverride?.sutureItemId !== undefined ? toothOverride.sutureItemId : null,
								};

					const currentItemInput: ResolvedImplantInstallationInput = {
						...specItem,
						...(batchInvoiceId ? { invoiceId: batchInvoiceId } : {}),
					};
					const toothStability = ImplantStabilityCalculator.calculateMeanIsq(
						currentItemInput.baselineIsqMesiodistal,
						currentItemInput.baselineIsqBuccolingual,
						currentItemInput.baselineIsqDistopalatal,
					);
					const toothIsqMean = toothStability.isqMean;
					const toothIsqDelta = toothStability.isqAnisotropyDelta;
					const toothEval = ImplantStabilityCalculator.evaluateLoadingProtocol(
						toothIsqMean,
						currentItemInput.finalInsertionTorqueNcm,
						0,
					);
					const toothProtocol = toothEval.protocol;
					const toothDecisionRationale = toothEval.decisionRationale;
					const toothImmediateLoadingFeasible =
						(toothIsqMean !== null ? toothIsqMean >= 70 : false) &&
						currentItemInput.finalInsertionTorqueNcm >= 35 &&
						currentItemInput.finalInsertionTorqueNcm <= 55;

					const screw = await deductImplantScrew(tx, orgId, principal.userId ?? null, currentItemInput);
					const { deductedMaterials, consumablesCostTotalKopecksBigInt } = await deductConsumables(
						tx,
						orgId,
						principal.userId ?? null,
						consumableInput,
					);
				const itemDeductions = [
					{
						name: screw.invItem.name,
						lotNumber: screw.effectiveLotNumber,
						unitCostRub: screw.implantUnitCostRub,
						unitCostKopecks: screw.implantUnitCostKopecks,
						quantity: 1,
						isOverdraft: screw.isOverdraft,
					},
					...deductedMaterials,
				];
				allDeductions.push(...itemDeductions);

				const financials = await linkBillingAndOdontogram(
					tx,
					orgId,
					currentItemInput,
					screw.implantUnitCostKopecksBigInt,
					consumablesCostTotalKopecksBigInt,
					screw.effectiveLotNumber,
					toothIsqMean,
					toothProtocol,
				);
				if (!batchInvoiceId && financials.invoiceId) {
					batchInvoiceId = financials.invoiceId;
				}
				if (!primaryFinancials) {
					primaryFinancials = financials;
				}

				let resolvedImplantCatalogItemId: string | null = null;
				if (currentItemInput.catalogItemId) {
					const [catalogById] = await tx
						.select({ id: implantCatalogItems.id })
						.from(implantCatalogItems)
						.where(
							and(
								eq(implantCatalogItems.id, currentItemInput.catalogItemId),
								eq(implantCatalogItems.organizationId, orgId),
							),
						)
						.limit(1);
					if (catalogById) {
						resolvedImplantCatalogItemId = catalogById.id;
					}
				}
				if (!resolvedImplantCatalogItemId) {
					const [matchedCatalog] = await tx
						.select({ id: implantCatalogItems.id })
						.from(implantCatalogItems)
						.where(
							and(
								eq(implantCatalogItems.organizationId, orgId),
								eq(implantCatalogItems.brand, currentItemInput.implantBrand),
								eq(
									implantCatalogItems.bodyDiameterMm,
									String(currentItemInput.implantDiameterMm),
								),
								eq(
									implantCatalogItems.lengthMm,
									String(currentItemInput.implantLengthMm),
								),
							),
						)
						.limit(1);
					resolvedImplantCatalogItemId = matchedCatalog?.id ?? null;
				}

				const [installation] = await tx
					.insert(patientImplantInstallations)
					.values({
						organizationId: orgId,
						patientId: currentItemInput.patientId,
						surgeonDoctorId: principal.userId ?? null,
						visitId: currentItemInput.visitId ?? null,
						catalogItemId: resolvedImplantCatalogItemId,
						toothNumberFdi: toothNum,
						implantBrand: currentItemInput.implantBrand,
						implantDiameterMm: String(currentItemInput.implantDiameterMm),
						implantLengthMm: String(currentItemInput.implantLengthMm),
						lotNumber: screw.effectiveLotNumber,
						serialNumber: screw.effectiveSerialNumber,
						catalogArticle: screw.invItem.sku ?? currentItemInput.catalogArticle ?? null,
						expirationDate: screw.invItem.expirationDate ?? currentItemInput.expirationDate ?? null,
						connectionType:
							currentItemInput.connectionType ??
							currentItemInput.implantConnectionType ??
							"internal_hex",
						boneDensityClass: currentItemInput.boneDensityClass,
						averageHounsfieldUnits: currentItemInput.averageHounsfieldUnits
							? String(currentItemInput.averageHounsfieldUnits)
							: null,
						finalInsertionTorqueNcm: String(currentItemInput.finalInsertionTorqueNcm),
						baselineIsq: toothIsqMean !== null ? Math.round(toothIsqMean) : null,
						initialProtocol: toothProtocol,
						corticalTapUsed: currentItemInput.corticalTapUsed,
						underdrillingUsed: currentItemInput.underdrillingUsed,
						boneGraftMaterial: currentItemInput.boneGraftMaterial ?? null,
						membraneUsed: currentItemInput.membraneUsed ?? null,
						isGuidedSurgery: Boolean(currentItemInput.isGuidedSurgery),
						guidedSleeveDiameterMm:
							currentItemInput.guidedSleeveDiameterMm != null
								? String(currentItemInput.guidedSleeveDiameterMm)
								: null,
						guidedSleeveOffsetMm:
							currentItemInput.guidedSleeveOffsetMm != null
								? String(currentItemInput.guidedSleeveOffsetMm)
								: null,
						surgicalGuideTemplateId: currentItemInput.surgicalGuideTemplateId ?? null,
						torqueCurveSamplesJson: JSON.stringify(currentItemInput.torqueCurveSamples || []),
						financialsJsonb: {
							financials,
							deductedMaterials: itemDeductions,
							isImmediateLoadingFeasible: toothImmediateLoadingFeasible,
						},
						notes: currentItemInput.notes ?? null,
					})
					.returning();

				if (!installation) throw new Error("Не удалось сохранить протокол установки имплантата.");
				if (!firstInstallationRecord) firstInstallationRecord = installation;

				if (
					currentItemInput.baselineIsqMesiodistal != null &&
					currentItemInput.baselineIsqBuccolingual != null &&
					toothIsqMean != null
				) {
					await tx.insert(implantIsqMeasurements).values({
						organizationId: orgId,
						installationId: installation.id,
						measuredByDoctorId: principal.userId ?? null,
						visitId: currentItemInput.visitId ?? null,
						daysPostOp: 0,
						isqMesiodistal: currentItemInput.baselineIsqMesiodistal,
						isqBuccolingual: currentItemInput.baselineIsqBuccolingual,
						isqDistopalatal: currentItemInput.baselineIsqDistopalatal ?? null,
						isqMean: String(toothIsqMean),
						isqAnisotropyDelta: toothIsqDelta ?? 0,
						stabilityStatus: "primary_mechanical_high",
						recommendedLoadingDecision: toothDecisionRationale,
						isBiologicalDipDetected: false,
					});
				}

				// Сквозная регистрация в гарантийном реестре клиники при установке имплантата (ACID-транзакция, Мандаты 8bo, 8e)
				const canonicalPassportId = `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`;
				const expDate = new Date(installation.installedAt.getTime());
				expDate.setFullYear(expDate.getFullYear() + 10);
				const recallDate = new Date(installation.installedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
				const integritySha256 = createHash("sha256")
					.update(
						JSON.stringify({
							orgId,
							patientId: installation.patientId,
							canonicalPassportId,
							brand: installation.implantBrand,
							lot: installation.lotNumber,
							sn: installation.serialNumber,
							installedAt: installation.installedAt,
						}),
					)
					.digest("hex");

				const implantItemsPayload = [
					{
						toothNumber: String(installation.toothNumberFdi),
						clinicalWorkTitle: `Дентальный имплантат ${installation.implantBrand} Ø${installation.implantDiameterMm}×${installation.implantLengthMm} мм`,
						materialName: "Медицинский титан Grade 4 / Roxolid",
						manufacturer: installation.implantBrand,
						vitaShade: "—",
						lotNumber: installation.lotNumber || "б/н",
						serviceCode804n: "A16.07.054",
					},
				];

				await tx
					.insert(warrantyCertificates)
					.values({
						organizationId: orgId,
						patientId: installation.patientId,
						visitId: installation.visitId || null,
						certificateNumber: canonicalPassportId,
						status: "active",
						itemsJson: implantItemsPayload,
						warrantyMonths: 120,
						serviceLifeMonths: 240,
						issuedAt: installation.installedAt,
						expiresAt: expDate,
						nextRecallDate: recallDate,
						integritySha256,
						notes: `Гарантийный паспорт имплантата ${canonicalPassportId} (${installation.implantBrand} #${installation.toothNumberFdi}).`,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: warrantyCertificates.certificateNumber,
						setWhere: eq(warrantyCertificates.organizationId, orgId),
						set: {
							status: "active",
							itemsJson: implantItemsPayload,
							warrantyMonths: 120,
							serviceLifeMonths: 240,
							expiresAt: expDate,
							nextRecallDate: recallDate,
							integritySha256,
							updatedAt: new Date(),
						},
					});

				const deductionSummary = {
					transactionId: screw.implantTx?.id ?? "",
					itemId: screw.invItem.id,
					itemName: screw.invItem.name,
					previousStock: screw.currentStock,
					newStock: screw.newStock,
					unitCostRub: String(screw.implantUnitCostRub),
					unitCostKopecks: screw.implantUnitCostKopecks,
					isOverdraft: screw.isOverdraft,
				};
				if (!firstInventoryDeduction) firstInventoryDeduction = deductionSummary;

				installationResults.push({
					...installation,
					inventoryDeduction: deductionSummary,
					deductedMaterials: itemDeductions,
					financials,
					isImmediateLoadingFeasible: toothImmediateLoadingFeasible,
				});
			}

			// Трансляция протокола SOAP в медицинскую карту приёма EMR (Мандат 8wy)
			let targetVisitId = effectiveInput.visitId ?? null;
			if (!targetVisitId) {
				const [lastVisit] = await tx
					.select({ id: visits.id, objectiveStatus: visits.objectiveStatus })
					.from(visits)
					.where(and(eq(visits.patientId, targetPatientId), eq(visits.organizationId, orgId)))
					.orderBy(desc(visits.createdAt))
					.limit(1);
				if (lastVisit) targetVisitId = lastVisit.id;
			}

			if (targetVisitId) {
				const [visit] = await tx
					.select()
					.from(visits)
					.where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)))
					.limit(1);
				if (visit) {
					const existingObj = visit.objectiveStatus || "";
					const teethLabel = teethToProcess.join(", #");
					const soapNote =
						effectiveInput.notes ||
						`[ПРОТОКОЛ ИМПЛАНТАЦИИ: Зубы FDI #${teethLabel}]\nУстановлено имплантатов: ${teethToProcess.length} шт. Бренд: ${effectiveInput.implantBrand} Ø${effectiveInput.implantDiameterMm}×${effectiveInput.implantLengthMm} мм. Торк: ${effectiveInput.finalInsertionTorqueNcm} Н·см${isqMean !== null ? `, ISQ: ${Math.round(isqMean)}` : ""}. Протокол: ${protocol}.`;
					const updatedObj = existingObj ? `${existingObj}\n\n${soapNote}` : soapNote;
					await tx
						.update(visits)
						.set({ objectiveStatus: updatedObj, updatedAt: new Date() })
						.where(and(eq(visits.id, visit.id), eq(visits.organizationId, orgId)));
				}
			}

			const primaryInstallation = installationResults[0] ?? firstInstallationRecord;
			const responsePayload: Record<string, unknown> = {
				success: true,
				count: installationResults.length,
				installation: primaryInstallation,
				installations: installationResults,
				inventoryDeduction: firstInventoryDeduction,
				inventoryDeductions: allDeductions,
				financials: primaryFinancials,
				isImmediateLoadingFeasible,
				evaluatedProtocol: protocol,
				decisionRationale,
			};

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(orgId, {
					type: "UPDATE_IMPLANT_RECORD",
					payload: {
						patientId: effectiveInput.patientId,
						toothNumberFdi: effectiveInput.toothNumberFdi,
						teeth: teethToProcess,
						installationId: firstInstallationRecord?.id ?? "",
						inventoryDeduction: firstInventoryDeduction,
						financials: primaryFinancials,
					},
				});
			});

				return reply.code(201).send(responsePayload);
			},
		});
	};

	registerRoute("/api/clinical/implants/installations");
	registerRoute("/api/clinical/implants/installations/batch");
}
