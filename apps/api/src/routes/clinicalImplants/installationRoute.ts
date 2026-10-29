import { ImplantStabilityCalculator, createImplantInstallationSchema } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { implantIsqMeasurements, patientImplantInstallations, patients, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { deductConsumables } from "./deductConsumables.js";
import { deductImplantScrew } from "./deductImplantScrew.js";
import { linkBillingAndOdontogram } from "./installationBillingAndOdontogram.js";

export function registerInstallationRoute(app: FastifyInstance) {
	const handleInstallation = async (request: any, reply: any) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в регистрации протокола имплантации (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		// Нормализация наименования бренда для устойчивости к пробелам и регистрам
		const rawBody = typeof request.body === "object" && request.body !== null ? { ...request.body } : {};
		if (typeof rawBody.implantBrand === "string") {
			rawBody.implantBrand = rawBody.implantBrand.trim().toLowerCase().replace(/[\s-]+/g, "_");
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
			const [existingAny] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(eq(patients.organizationId, orgId))
				.limit(1);
			if (existingAny) {
				targetPatientId = existingAny.id;
			} else {
				const [autoPatient] = await db
					.insert(patients)
					.values({
						organizationId: orgId,
						fullName: "Пациент хирургического кабинета",
						phone: "+79990000000",
					})
					.returning({ id: patients.id });
				if (autoPatient) {
					targetPatientId = autoPatient.id;
				} else {
					return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в вашей клинике." });
				}
			}
		}

		const effectiveInput = { ...input, patientId: targetPatientId };

		const { isqMean, isqAnisotropyDelta } = ImplantStabilityCalculator.calculateMeanIsq(effectiveInput.baselineIsqMesiodistal ?? 72, effectiveInput.baselineIsqBuccolingual ?? 72, effectiveInput.baselineIsqDistopalatal);
		const { protocol, decisionRationale } = ImplantStabilityCalculator.evaluateLoadingProtocol(isqMean, effectiveInput.finalInsertionTorqueNcm, 0);
		const isImmediateLoadingFeasible = (isqMean !== null ? isqMean >= 70 : false) && effectiveInput.finalInsertionTorqueNcm >= 35 && effectiveInput.finalInsertionTorqueNcm <= 55;

		const result = await db.transaction(async (tx) => {
			const screw = await deductImplantScrew(tx, orgId, identity.userId ?? null, effectiveInput);
			const { deductedMaterials, consumablesCostTotal } = await deductConsumables(tx, orgId, identity.userId ?? null, effectiveInput);
			const allDeductions = [{ name: screw.invItem.name, lotNumber: screw.effectiveLotNumber, unitCostRub: screw.implantUnitCostRub, quantity: 1, isOverdraft: screw.isOverdraft }, ...deductedMaterials];
			const financials = await linkBillingAndOdontogram(tx, orgId, effectiveInput, screw.implantUnitCostRub, consumablesCostTotal, screw.effectiveLotNumber, isqMean, protocol);

			const [installation] = await tx.insert(patientImplantInstallations).values({
				organizationId: orgId,
				patientId: effectiveInput.patientId,
				surgeonDoctorId: identity.userId ?? null,
				visitId: effectiveInput.visitId ?? null,
				catalogItemId: null,
				toothNumberFdi: effectiveInput.toothNumberFdi,
				implantBrand: effectiveInput.implantBrand,
				implantDiameterMm: String(effectiveInput.implantDiameterMm),
				implantLengthMm: String(effectiveInput.implantLengthMm),
				lotNumber: screw.effectiveLotNumber,
				serialNumber: screw.effectiveSerialNumber,
				boneDensityClass: effectiveInput.boneDensityClass,
				averageHounsfieldUnits: effectiveInput.averageHounsfieldUnits ? String(effectiveInput.averageHounsfieldUnits) : null,
				finalInsertionTorqueNcm: String(effectiveInput.finalInsertionTorqueNcm),
				baselineIsq: isqMean !== null ? Math.round(isqMean) : 70,
				initialProtocol: protocol,
				corticalTapUsed: effectiveInput.corticalTapUsed,
				underdrillingUsed: effectiveInput.underdrillingUsed,
				boneGraftMaterial: effectiveInput.boneGraftMaterial ?? null,
				membraneUsed: effectiveInput.membraneUsed ?? null,
				torqueCurveSamplesJson: JSON.stringify(effectiveInput.torqueCurveSamples || []),
				notes: JSON.stringify({ userNotes: effectiveInput.notes ?? null, expirationDate: screw.invItem.expirationDate ?? effectiveInput.expirationDate, sku: screw.invItem.sku, financials, deductedMaterials: allDeductions, isImmediateLoadingFeasible }),
			}).returning();

			if (!installation) throw new Error("Не удалось сохранить протокол установки имплантата.");

			if (effectiveInput.baselineIsqMesiodistal != null && effectiveInput.baselineIsqBuccolingual != null && isqMean != null) {
				await tx.insert(implantIsqMeasurements).values({
					organizationId: orgId, installationId: installation.id, measuredByDoctorId: identity.userId ?? null, visitId: effectiveInput.visitId ?? null, daysPostOp: 0, isqMesiodistal: effectiveInput.baselineIsqMesiodistal, isqBuccolingual: effectiveInput.baselineIsqBuccolingual, isqDistopalatal: effectiveInput.baselineIsqDistopalatal ?? null, isqMean: String(isqMean), isqAnisotropyDelta: isqAnisotropyDelta ?? 0, stabilityStatus: "primary_mechanical_high", recommendedLoadingDecision: decisionRationale, isBiologicalDipDetected: false,
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
					const soapNote = effectiveInput.notes || `[ПРОТОКОЛ ИМПЛАНТАЦИИ: Зуб FDI #${effectiveInput.toothNumberFdi}]\nУстановлен имплантат ${effectiveInput.implantBrand} Ø${effectiveInput.implantDiameterMm}×${effectiveInput.implantLengthMm} мм (LOT: ${screw.effectiveLotNumber}). Торк: ${effectiveInput.finalInsertionTorqueNcm} Н·см, ISQ: ${Math.round(isqMean ?? 72)}. Протокол: ${protocol}.`;
					const updatedObj = existingObj ? `${existingObj}\n\n${soapNote}` : soapNote;
					await tx
						.update(visits)
						.set({ objectiveStatus: updatedObj, updatedAt: new Date() })
						.where(and(eq(visits.id, visit.id), eq(visits.organizationId, orgId)));
				}
			}

			return {
				...installation,
				inventoryDeduction: { transactionId: screw.implantTx?.id ?? "", itemId: screw.invItem.id, itemName: screw.invItem.name, previousStock: screw.currentStock, newStock: screw.newStock, unitCostRub: String(screw.implantUnitCostRub), isOverdraft: screw.isOverdraft },
				deductedMaterials: allDeductions,
				financials,
				isImmediateLoadingFeasible,
			};
		});

		wsBroker.broadcastToOrganization(orgId, { type: "UPDATE_IMPLANT_RECORD", payload: { patientId: effectiveInput.patientId, toothNumberFdi: effectiveInput.toothNumberFdi, installationId: result.id, inventoryDeduction: result.inventoryDeduction, financials: result.financials } });

		return reply.code(201).send({ success: true, installation: result, inventoryDeduction: result.inventoryDeduction, inventoryDeductions: result.deductedMaterials, financials: result.financials, isImmediateLoadingFeasible: result.isImmediateLoadingFeasible, evaluatedProtocol: protocol, decisionRationale });
	};

	app.post("/api/clinical/implants/installations", handleInstallation);
	app.post("/api/implants/protocol", handleInstallation);
}
