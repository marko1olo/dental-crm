import { createHash } from "node:crypto";
import {
	ImplantStabilityCalculator,
	createImplantInstallationSchema,
	computePayloadHash,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	implantIsqMeasurements,
	patientImplantInstallations,
	patients,
	visits,
	warrantyCertificates,
} from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { deductConsumables } from "./deductConsumables.js";
import { deductImplantScrew } from "./deductImplantScrew.js";
import { linkBillingAndOdontogram } from "./installationBillingAndOdontogram.js";

export function registerInstallationRoute(app: FastifyInstance) {
	const handleInstallation = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в регистрации протокола имплантации (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		// Дедупликация и проверка Idempotency-Key (Мандаты 8d, 8bo, 8zp)
		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotence-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: null;

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const existingRecord = await withTenantCtx(orgId, async (tx) => {
				const [rec] = await tx
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);
				return rec ?? null;
			});

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция регистрации имплантата с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		// Нормализация наименования бренда для устойчивости к пробелам и регистрам
		const rawBody: Record<string, unknown> =
			typeof request.body === "object" && request.body !== null
				? { ...(request.body as Record<string, unknown>) }
				: {};
		if (typeof rawBody.implantBrand === "string") {
			rawBody.implantBrand = rawBody.implantBrand.trim().toLowerCase().replace(/[\s-]+/g, "_");
		}

		// Поддержка множественной имплантации (All-on-4 / пакетная установка)
		const targetTeeth: number[] = [];
		if (Array.isArray(rawBody.teeth)) {
			for (const t of rawBody.teeth) {
				if (typeof t === "number" && !targetTeeth.includes(t)) {
					targetTeeth.push(t);
				}
			}
		}
		if (typeof rawBody.toothNumberFdi === "number" && !targetTeeth.includes(rawBody.toothNumberFdi)) {
			targetTeeth.push(rawBody.toothNumberFdi);
		}

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

		// Автономный фоллбек пациента (Мандат 8e: врач никогда не блокируется из-за нестыковки id)
		let targetPatientId = input.patientId;
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, targetPatientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в вашей клинике.",
			});
		}

		const effectiveInput = { ...input, patientId: targetPatientId };

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

		const teethToProcess = targetTeeth.length > 0 ? targetTeeth : [effectiveInput.toothNumberFdi];

		// Единая неделимая ACID транзакция для всех имплантатов пакета (Мандаты 8bo, All-on-4)
		const txResult = await withTenantCtx(orgId, async (tx) => {
			const installationResults: unknown[] = [];
			const allDeductions: unknown[] = [];
			let primaryFinancials: unknown = null;
			let firstInstallationRecord: typeof patientImplantInstallations.$inferSelect | null = null;
			let firstInventoryDeduction: unknown = null;

			for (const toothNum of teethToProcess) {
				const toothLot =
					teethToProcess.length > 1
						? `${effectiveInput.lotNumber || "LOT"}-T${toothNum}`
						: effectiveInput.lotNumber;
				const currentItemInput = {
					...effectiveInput,
					toothNumberFdi: toothNum,
					lotNumber: toothLot,
				};

				const screw = await deductImplantScrew(tx, orgId, identity.userId ?? null, currentItemInput);
				const { deductedMaterials, consumablesCostTotal } = await deductConsumables(
					tx,
					orgId,
					identity.userId ?? null,
					currentItemInput,
				);
				const itemDeductions = [
					{
						name: screw.invItem.name,
						lotNumber: screw.effectiveLotNumber,
						unitCostRub: screw.implantUnitCostRub,
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
					screw.implantUnitCostRub,
					consumablesCostTotal,
					screw.effectiveLotNumber,
					isqMean,
					protocol,
				);
				if (!primaryFinancials) {
					primaryFinancials = financials;
				}

				const [installation] = await tx
					.insert(patientImplantInstallations)
					.values({
						organizationId: orgId,
						patientId: currentItemInput.patientId,
						surgeonDoctorId: identity.userId ?? null,
						visitId: currentItemInput.visitId ?? null,
						catalogItemId: null,
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
						baselineIsq: isqMean !== null ? Math.round(isqMean) : null,
						initialProtocol: protocol,
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
							isImmediateLoadingFeasible,
						},
						notes: currentItemInput.notes ?? null,
					})
					.returning();

				if (!installation) throw new Error("Не удалось сохранить протокол установки имплантата.");
				if (!firstInstallationRecord) firstInstallationRecord = installation;

				if (
					currentItemInput.baselineIsqMesiodistal != null &&
					currentItemInput.baselineIsqBuccolingual != null &&
					isqMean != null
				) {
					await tx.insert(implantIsqMeasurements).values({
						organizationId: orgId,
						installationId: installation.id,
						measuredByDoctorId: identity.userId ?? null,
						visitId: currentItemInput.visitId ?? null,
						daysPostOp: 0,
						isqMesiodistal: currentItemInput.baselineIsqMesiodistal,
						isqBuccolingual: currentItemInput.baselineIsqBuccolingual,
						isqDistopalatal: currentItemInput.baselineIsqDistopalatal ?? null,
						isqMean: String(isqMean),
						isqAnisotropyDelta: isqAnisotropyDelta ?? 0,
						stabilityStatus: "primary_mechanical_high",
						recommendedLoadingDecision: decisionRationale,
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
					isImmediateLoadingFeasible,
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

			return {
				firstInstallationRecord,
				firstInventoryDeduction,
				installationResults,
				allDeductions,
				primaryFinancials,
			};
		});

		const primaryInstallation = txResult.installationResults[0] ?? txResult.firstInstallationRecord;

		wsBroker.broadcastToOrganization(orgId, {
			type: "UPDATE_IMPLANT_RECORD",
			payload: {
				patientId: effectiveInput.patientId,
				toothNumberFdi: effectiveInput.toothNumberFdi,
				teeth: teethToProcess,
				installationId: txResult.firstInstallationRecord?.id ?? "",
				inventoryDeduction: txResult.firstInventoryDeduction,
				financials: txResult.primaryFinancials,
			},
		});

		const responsePayload: Record<string, unknown> = {
			success: true,
			count: txResult.installationResults.length,
			installation: primaryInstallation,
			installations: txResult.installationResults,
			inventoryDeduction: txResult.firstInventoryDeduction,
			inventoryDeductions: txResult.allDeductions,
			financials: txResult.primaryFinancials,
			isImmediateLoadingFeasible,
			evaluatedProtocol: protocol,
			decisionRationale,
		};

		// Запись в таблицу idempotencyKeys для атомарного кэширования
		if (idempotencyKey) {
			await withTenantCtx(orgId, async (tx) => {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 201,
						},
					});
			});
		}

		return reply.code(201).send(responsePayload);
	};

	app.post("/api/clinical/implants/installations", handleInstallation);
	app.post("/api/clinical/implants/installations/batch", handleInstallation);
}
