import {
	PRICE_LOCK_POLICY_CONFIGS,
	calculatePriceLockStatus,
	kopecksToRubles,
	priceLockPolicyKindSchema,
	renderSupplementaryAgreementHtml,
	toExactKopecks,
	validatePlanToInvoice,
	type PriceLockPolicyKind,
	type SupplementaryAgreementDraft,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { getServiceCatalogForOrganization } from "../../../db/pricelistQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
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

	const planCreatedAtIso = data.planCreatedAtIso || targetPlan?.createdAt?.toISOString() || new Date().toISOString();
	const freezePolicyCandidate = freezeToken && "policyKind" in freezeToken
		? (freezeToken as { policyKind?: unknown }).policyKind
		: undefined;
	const parsedPolicyKind = priceLockPolicyKindSchema.safeParse(freezePolicyCandidate);
	const resolvedPolicyKind: PriceLockPolicyKind = parsedPolicyKind.success ? parsedPolicyKind.data : "standard_30_days";
	const policyConfig = PRICE_LOCK_POLICY_CONFIGS[resolvedPolicyKind];
	const isSignedOrApproved = Boolean(data.isSignedWithPatient === true || data.approvedAtIso || targetPlan?.status === "Approved");
	const priceLockStatus = calculatePriceLockStatus(planCreatedAtIso, policyConfig, isSignedOrApproved);

	const isPriceLockedFinal = freezeToken
		? freezeToken.isPriceLocked
		: priceLockStatus.isLocked || isSignedOrApproved;

	const discountViolation = findDiscountLimitViolation(data.items, catalogRows, targetPlanDbItems);
	if (discountViolation) {
		return reply.code(422).send({
			error: "InvalidDiscountError",
			code: "DiscountLimitExceededError",
			message: `Сумма скидки (${discountViolation.discountRub} ₽) по позиции «${discountViolation.nameRu}» превышает 100% стоимости услуги (${discountViolation.lineGrossRub} ₽). Скидка не может быть больше стоимости позиции.`,
		});
	}

	const planItemsForVal = buildPlanItemsForValidation({ items: data.items, catalogRows, freezeToken, targetPlanDbItems, targetPlan, isPriceLockedFinal, isAdminOverrideVerified });
	const effectiveValidityDaysLimit = freezeToken ? freezeToken.daysRemaining || policyConfig.validityDays : policyConfig.validityDays;
	const effectiveInflationThreshold = freezeToken?.inflationThresholdPercent ?? policyConfig.inflationThresholdPercent;
	const effectiveItemResolutionOverrides = buildEffectiveItemResolutionOverrides(data.items);

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? "";
	const isDoctor = staffRole === "doctor" || staffRole === "dentist";
	const isCashierOrAdmin =
		staffRole === "admin" ||
		staffRole === "administrator" ||
		staffRole === "receptionist" ||
		staffRole === "cashier" ||
		staffRole === "chief_doctor";
	const isApprovedPlan = Boolean(isPriceLockedFinal || targetPlan?.status === "Approved" || data.approvedAtIso);

	// Мандат 8e / Касса: Администратор и кассир имеют право выставлять счета по утвержденным планам
	const canBypassArchivedCheck = isDoctor || isCashierOrAdmin || isApprovedPlan;

	const validationReport = validatePlanToInvoice({
		planId: data.planId || targetPlan?.id || "PLAN-CUSTOM",
		planNumber: data.planNumber,
		patientId: data.patientId,
		patientName: patient.fullName,
		planCreatedAtIso,
		approvedAtIso: data.approvedAtIso || targetPlan?.approvedAt?.toISOString(),
		isSignedWithPatient: isPriceLockedFinal,
		isPlanExpired: freezeToken?.isExpired === true ? true : priceLockStatus.isExpired ? true : undefined,
		validityDaysLimit: effectiveValidityDaysLimit,
		inflationThresholdPercent: effectiveInflationThreshold,
		items: planItemsForVal,
		catalog: catalogLookup,
		itemResolutionOverrides: effectiveItemResolutionOverrides,
		adminOverrideAuthorized: isAdminOverrideVerified || canBypassArchivedCheck,
		adminOverrideStaffName: adminStaffName || identity.fullName || (isCashierOrAdmin ? "Администратор" : undefined),
		adminOverrideReason: data.adminOverrideReason || (isApprovedPlan ? "Автоматическое разрешение для утвержденного плана лечения" : undefined),
		isDoctorAutonomy: isDoctor || canBypassArchivedCheck,
	});

	if (!validationReport.canGenerateWorkOrder && !canBypassArchivedCheck) {
		return reply.code(400).send({
			error: "BlockedArchivedServiceError",
			message: "Оформление наряда заблокировано: смета содержит архивные, исключенные из прайса услуги или недействительные цены.",
			blockingReasons: validationReport.blockingReasons,
			report: validationReport,
		});
	}

	const invoiceNumber = formatInvoiceNumber(data.documentType, patient.id);
	const totalNetRub = kopecksToRubles(validationReport.effectiveInvoiceNetKopecks);

	const { invoiceId, createdItemIds } = await executeGenerateInvoiceTransaction({
		orgId,
		data,
		totalNetRub,
		invoiceNumber,
		validationReport,
		catalogRows,
		targetPlanDbItems,
	});

	const changedItems = validationReport.items.filter((item) => item.unitPriceDeltaKopecks !== 0);
	let supplementaryAgreementHtml: string | null = null;
	if (validationReport.supplementaryAgreementNeeded || changedItems.length > 0) {
		const agreementDraft: SupplementaryAgreementDraft = {
			agreementNumber: `DS-${invoiceNumber}`,
			agreementDateIso: new Date().toISOString(),
			contractNumber: data.planNumber || targetPlan?.id?.slice(0, 8).toUpperCase() || invoiceNumber,
			contractDateIso: planCreatedAtIso,
			planNumber: data.planNumber || targetPlan?.id || "PLAN-CUSTOM",
			patientFullName: patient.fullName,
			clinicBrandName: "DENTE",
			clinicLegalName: "Стоматологическая клиника DENTE",
			clinicAddress: "Согласно реквизитам договора",
			clinicInn: "—",
			clinicOgrn: "—",
			doctorFullName: identity.fullName || "Лечащий врач",
			modifiedItems: changedItems.map((item) => ({
				toothNumber: item.toothNumber,
				code804n: item.code804n,
				serviceTitle: item.nameRu,
				quantity: item.quantity,
				oldUnitPriceKopecks: item.planUnitPriceKopecks,
				newUnitPriceKopecks: item.effectiveUnitPriceKopecks,
				deltaUnitPriceKopecks: toExactKopecks(item.effectiveUnitPriceKopecks - item.planUnitPriceKopecks),
				lineOldTotalKopecks: toExactKopecks(Math.round(item.planUnitPriceKopecks * item.quantity)),
				lineNewTotalKopecks: toExactKopecks(Math.round(item.effectiveUnitPriceKopecks * item.quantity)),
				changeReasonRu: item.statusDescriptionRu,
			})),
			previousPlanTotalKopecks: validationReport.originalPlanNetKopecks,
			newPlanTotalKopecks: validationReport.effectiveInvoiceNetKopecks,
			deltaKopecks: toExactKopecks(validationReport.effectiveInvoiceNetKopecks - validationReport.originalPlanNetKopecks),
			isClinicAbsorption: validationReport.totalClinicAbsorptionKopecks > 0,
			clinicAbsorptionKopecks: validationReport.totalClinicAbsorptionKopecks,
			patientPayableDeltaKopecks: validationReport.totalPatientSurchargeKopecks,
			justificationRu: priceLockStatus.badgeText,
		};
		supplementaryAgreementHtml = renderSupplementaryAgreementHtml(agreementDraft);
	}

	return reply.code(201).send({
		success: true,
		invoiceId,
		invoiceNumber,
		documentType: data.documentType,
		patientId: data.patientId,
		totalGrossRub: kopecksToRubles(validationReport.effectiveInvoiceGrossKopecks),
		totalDiscountRub: kopecksToRubles(validationReport.effectiveInvoiceDiscountKopecks),
		totalNetRub,
		clinicAbsorptionRub: kopecksToRubles(validationReport.totalClinicAbsorptionKopecks),
		createdTreatmentItemIds: createdItemIds,
		isPriceLocked: validationReport.isPriceLocked,
		priceLockStatus,
		supplementaryAgreement: {
			needed: validationReport.supplementaryAgreementNeeded,
			html: supplementaryAgreementHtml,
		},
		validationReport,
		issuedAt: new Date().toISOString(),
	});
}
