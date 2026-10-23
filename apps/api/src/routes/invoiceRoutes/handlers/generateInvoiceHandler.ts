import { validatePlanToInvoice } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { getServiceCatalogForOrganization } from "../../../db/pricelistQuery.js";
import {
	buildEffectiveItemResolutionOverrides,
	buildPlanItemsForValidation,
	findDiscountLimitViolation,
	formatInvoiceNumber,
	mapCatalogRowsToLookup,
} from "../invoiceCalculationHelpers.js";
import { generateInvoiceFromPlanSchema } from "../types.js";
import { verifyGenerateInvoiceCompliance } from "./generateInvoiceComplianceGates.js";
import { executeGenerateInvoiceTransaction } from "./generateInvoiceTransaction.js";
import { fetchTargetPlanAndFreezeToken } from "./targetPlanQueryHelper.js";

/** POST /api/invoices/generate-from-plan */
export async function handleGenerateInvoiceFromPlan(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalMutationContext(request, reply, "generate invoice from plan");
	if (!context) return;
	const orgId = context.organizationId;

	const parsed = generateInvoiceFromPlanSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "InvalidGenerateInvoicePayload", message: "Некорректные параметры создания наряда/счета из плана лечения.", details: parsed.error.issues });
	}
	const data = parsed.data;

	const compliance = await verifyGenerateInvoiceCompliance({ db, orgId, data, request, reply });
	if (!compliance) return;
	const { patient, approvedPlanIds, isAdminOverrideVerified, adminStaffName } = compliance;

	const catalogRows = await getServiceCatalogForOrganization(orgId);
	const catalogLookup = mapCatalogRowsToLookup(catalogRows);

	const targetPlanId = data.planId || approvedPlanIds[0];
	const { targetPlan, freezeToken, targetPlanDbItems } = await fetchTargetPlanAndFreezeToken({ db, orgId, targetPlanId });

	const isPriceLockedFinal = freezeToken ? freezeToken.isPriceLocked : Boolean(data.isSignedWithPatient === true || data.approvedAtIso || targetPlan?.status === "Approved");

	const discountViolation = findDiscountLimitViolation(data.items, catalogRows, targetPlanDbItems);
	if (discountViolation) {
		return reply.code(422).send({
			error: "InvalidDiscountError",
			code: "Decree659DiscountLimitExceededError",
			message: `Сумма скидки (${discountViolation.discountRub} ₽) по позиции «${discountViolation.nameRu}» превышает 100% стоимости услуги (${discountViolation.lineGrossRub} ₽). Скидка не может быть больше стоимости позиции.`,
		});
	}

	const planItemsForVal = buildPlanItemsForValidation({ items: data.items, catalogRows, freezeToken, targetPlanDbItems, targetPlan, isPriceLockedFinal, isAdminOverrideVerified });
	const effectiveValidityDaysLimit = freezeToken ? freezeToken.daysRemaining || 30 : data.planCreatedAtIso ? 30 : undefined;
	const effectiveInflationThreshold = freezeToken?.inflationThresholdPercent ?? 10;
	const effectiveItemResolutionOverrides = buildEffectiveItemResolutionOverrides(data.items);

	const validationReport = validatePlanToInvoice({
		planId: data.planId || targetPlan?.id || "PLAN-CUSTOM",
		planNumber: data.planNumber,
		patientId: data.patientId,
		patientName: patient.fullName,
		planCreatedAtIso: data.planCreatedAtIso || targetPlan?.createdAt?.toISOString() || new Date().toISOString(),
		approvedAtIso: data.approvedAtIso || targetPlan?.approvedAt?.toISOString(),
		isSignedWithPatient: isPriceLockedFinal,
		isPlanExpired: freezeToken?.isExpired === true ? true : undefined,
		validityDaysLimit: effectiveValidityDaysLimit,
		inflationThresholdPercent: effectiveInflationThreshold,
		items: planItemsForVal,
		catalog: catalogLookup,
		itemResolutionOverrides: effectiveItemResolutionOverrides,
		adminOverrideAuthorized: isAdminOverrideVerified,
		adminOverrideStaffName: adminStaffName,
		adminOverrideReason: data.adminOverrideReason,
	});

	if (!validationReport.canGenerateWorkOrder) {
		return reply.code(400).send({
			error: "BlockedArchivedServiceError",
			message: "Оформление наряда заблокировано: смета содержит архивные, исключенные из прайса услуги или недействительные цены.",
			blockingReasons: validationReport.blockingReasons,
			report: validationReport,
		});
	}

	const invoiceNumber = formatInvoiceNumber(data.documentType, patient.id);
	const totalNetRub = Number((validationReport.effectiveInvoiceNetKopecks / 100).toFixed(2));

	const { invoiceId, createdItemIds } = await executeGenerateInvoiceTransaction({
		orgId,
		data,
		totalNetRub,
		invoiceNumber,
		validationReport,
		catalogRows,
		targetPlanDbItems,
	});

	return reply.code(201).send({
		success: true,
		invoiceId,
		invoiceNumber,
		documentType: data.documentType,
		patientId: data.patientId,
		totalGrossRub: Number((validationReport.effectiveInvoiceGrossKopecks / 100).toFixed(2)),
		totalDiscountRub: Number((validationReport.effectiveInvoiceDiscountKopecks / 100).toFixed(2)),
		totalNetRub,
		clinicAbsorptionRub: Number((validationReport.totalClinicAbsorptionKopecks / 100).toFixed(2)),
		createdTreatmentItemIds: createdItemIds,
		isPriceLocked: validationReport.isPriceLocked,
		validationReport,
		issuedAt: new Date().toISOString(),
	});
}
