import { ImplantStabilityCalculator, createImplantInstallationSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { implantIsqMeasurements, patientImplantInstallations, patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { deductConsumables } from "./deductConsumables.js";
import { deductImplantScrew } from "./deductImplantScrew.js";
import { linkBillingAndOdontogram } from "./installationBillingAndOdontogram.js";

export function registerInstallationRoute(app: FastifyInstance) {
	app.post("/api/clinical/implants/installations", async (request, reply) => {
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

		const parsed = createImplantInstallationSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ImplantInstallationValidationError",
				message: "Некорректные параметры протокола установки имплантата.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const [patient] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId))).limit(1);
		if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в вашей клинике." });

		const { isqMean, isqAnisotropyDelta } = ImplantStabilityCalculator.calculateMeanIsq(input.baselineIsqMesiodistal, input.baselineIsqBuccolingual, input.baselineIsqDistopalatal);
		const { protocol, decisionRationale } = ImplantStabilityCalculator.evaluateLoadingProtocol(isqMean, input.finalInsertionTorqueNcm, 0);
		const isImmediateLoadingFeasible = (isqMean !== null ? isqMean >= 70 : false) && input.finalInsertionTorqueNcm >= 35 && input.finalInsertionTorqueNcm <= 55;

		const result = await db.transaction(async (tx) => {
			const screw = await deductImplantScrew(tx, orgId, identity.userId ?? null, input);
			const { deductedMaterials, consumablesCostTotal } = await deductConsumables(tx, orgId, identity.userId ?? null, input);
			const allDeductions = [{ name: screw.invItem.name, lotNumber: screw.effectiveLotNumber, unitCostRub: screw.implantUnitCostRub, quantity: 1, isOverdraft: screw.isOverdraft }, ...deductedMaterials];
			const financials = await linkBillingAndOdontogram(tx, orgId, input, screw.implantUnitCostRub, consumablesCostTotal, screw.effectiveLotNumber, isqMean, protocol);

			const [installation] = await tx.insert(patientImplantInstallations).values({
				organizationId: orgId,
				patientId: input.patientId,
				surgeonDoctorId: identity.userId ?? null,
				visitId: input.visitId ?? null,
				catalogItemId: null,
				toothNumberFdi: input.toothNumberFdi,
				implantBrand: input.implantBrand,
				implantDiameterMm: String(input.implantDiameterMm),
				implantLengthMm: String(input.implantLengthMm),
				lotNumber: screw.effectiveLotNumber,
				serialNumber: screw.effectiveSerialNumber,
				boneDensityClass: input.boneDensityClass,
				averageHounsfieldUnits: input.averageHounsfieldUnits ? String(input.averageHounsfieldUnits) : null,
				finalInsertionTorqueNcm: String(input.finalInsertionTorqueNcm),
				baselineIsq: isqMean !== null ? Math.round(isqMean) : 70,
				initialProtocol: protocol,
				corticalTapUsed: input.corticalTapUsed,
				underdrillingUsed: input.underdrillingUsed,
				boneGraftMaterial: input.boneGraftMaterial ?? null,
				membraneUsed: input.membraneUsed ?? null,
				torqueCurveSamplesJson: JSON.stringify(input.torqueCurveSamples || []),
				notes: JSON.stringify({ userNotes: input.notes ?? null, expirationDate: screw.invItem.expirationDate ?? input.expirationDate, sku: screw.invItem.sku, financials, deductedMaterials: allDeductions, isImmediateLoadingFeasible }),
			}).returning();

			if (!installation) throw new Error("Не удалось сохранить протокол установки имплантата.");

			if (input.baselineIsqMesiodistal != null && input.baselineIsqBuccolingual != null && isqMean != null) {
				await tx.insert(implantIsqMeasurements).values({
					organizationId: orgId, installationId: installation.id, measuredByDoctorId: identity.userId ?? null, visitId: input.visitId ?? null, daysPostOp: 0, isqMesiodistal: input.baselineIsqMesiodistal, isqBuccolingual: input.baselineIsqBuccolingual, isqDistopalatal: input.baselineIsqDistopalatal ?? null, isqMean: String(isqMean), isqAnisotropyDelta: isqAnisotropyDelta ?? 0, stabilityStatus: "primary_mechanical_high", recommendedLoadingDecision: decisionRationale, isBiologicalDipDetected: false,
				});
			}

			return {
				...installation,
				inventoryDeduction: { transactionId: screw.implantTx?.id ?? "", itemId: screw.invItem.id, itemName: screw.invItem.name, previousStock: screw.currentStock, newStock: screw.newStock, unitCostRub: String(screw.implantUnitCostRub), isOverdraft: screw.isOverdraft },
				deductedMaterials: allDeductions,
				financials,
				isImmediateLoadingFeasible,
			};
		});

		wsBroker.broadcastToOrganization(orgId, { type: "UPDATE_IMPLANT_RECORD", payload: { patientId: input.patientId, toothNumberFdi: input.toothNumberFdi, installationId: result.id, inventoryDeduction: result.inventoryDeduction, financials: result.financials } });

		return reply.code(201).send({ success: true, installation: result, inventoryDeduction: result.inventoryDeduction, inventoryDeductions: result.deductedMaterials, financials: result.financials, isImmediateLoadingFeasible: result.isImmediateLoadingFeasible, evaluatedProtocol: protocol, decisionRationale });
	});
}
