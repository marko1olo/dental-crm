import type {
	Dashboard,
	ProcedureSpecificConsentProcedure,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
} from "@dental/shared";
import {
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	serviceCategoryLabels,
} from "../../../workspaceUiLabels";
import { treatmentAcceptanceVariantOptions } from "../../AppointmentHelpers";
import type { MedicalDocumentReleaseChannel } from "./types";
import { taxApplicationRelationshipOptions } from "../../DocumentHelpers";
import {
	xrayPregnancyStatusOptions,
	xrayPriorityOptions,
	xrayStudyTypeOptions,
} from "../../ImagingHelpers";
import { isOptionValue, isRecordKey, isStringUnionValue } from "./validation";
import { defaultUiPreferences } from "../../preferencesUtils";
import {
	isProcedureSpecificConsentProcedurePreference,
	isTaxApplicationDeliveryChannelPreference,
	isTaxApplicationFormPreference,
} from "../uiPreferencesHelpers";
import {
	medicalDocumentReleaseChannelLabels,
	paymentRefundCorrectionActionOptions,
	paymentRefundCorrectionMethodOptions,
} from "./optionsAndLabels";

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized =
		value
			?.trim()
			.toLocaleLowerCase("ru-RU")
			.replaceAll("ё", "е")
			.replace(/[\s_-]+/g, " ") ?? "";
	if (!normalized) return null;
	if (
		[
			"self",
			"patient",
			"пациент",
			"сам пациент",
			"сама пациентка",
			"налогоплательщик",
		].includes(normalized)
	)
		return "self";
	if (
		["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
			normalized,
		)
	)
		return "spouse";
	if (
		[
			"parent",
			"father",
			"mother",
			"родитель",
			"отец",
			"мать",
			"папа",
			"мама",
		].includes(normalized)
	)
		return "parent";
	if (
		[
			"child",
			"son",
			"daughter",
			"ребенок",
			"сын",
			"дочь",
			"усыновленный",
			"усыновленная",
		].includes(normalized)
	)
		return "child";
	if (
		["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
			normalized,
		)
	)
		return "ward";
	return null;
}

export function normalizedTaxApplicationRelationshipSelect(
	value: unknown,
): TaxDeductionApplicationRelationship {
	return isOptionValue<TaxDeductionApplicationRelationship>(
		value,
		taxApplicationRelationshipOptions,
	)
		? value
		: "self";
}

export function normalizedTaxApplicationForm(
	value: unknown,
): TaxDeductionApplicationForm {
	return isTaxApplicationFormPreference(value)
		? value
		: defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(
	value: unknown,
): TaxDeductionApplicationDeliveryChannel {
	return isTaxApplicationDeliveryChannelPreference(value)
		? value
		: defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(
	value: unknown,
): ProcedureSpecificConsentProcedure {
	return isProcedureSpecificConsentProcedurePreference(value)
		? value
		: defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue<TreatmentPlanAcceptanceVariant>(
		value,
		treatmentAcceptanceVariantOptions,
	)
		? value
		: "standard";
}

export function normalizedXrayStudyType(
	value: unknown,
): XrayCbctReferralStudyType {
	return isOptionValue<XrayCbctReferralStudyType>(value, xrayStudyTypeOptions)
		? value
		: "cbct";
}

export function normalizedXrayPriority(
	value: unknown,
): XrayCbctReferralPriority {
	return isStringUnionValue<XrayCbctReferralPriority>(value, xrayPriorityOptions)
		? value
		: "routine";
}

export function normalizedXrayPregnancyStatus(
	value: unknown,
): XrayCbctReferralPregnancyStatus {
	return isOptionValue<XrayCbctReferralPregnancyStatus>(
		value,
		xrayPregnancyStatusOptions,
	)
		? value
		: "unknown";
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return isRecordKey<MedicalDocumentReleaseChannel>(
		value,
		medicalDocumentReleaseChannelLabels,
	)
		? value
		: "paper";
}

export function normalizedPaymentRefundCorrectionAction(
	value: unknown,
): PaymentRefundCorrectionAction {
	return isStringUnionValue<PaymentRefundCorrectionAction>(
		value,
		paymentRefundCorrectionActionOptions,
	)
		? value
		: "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(
	value: unknown,
): PaymentRefundCorrectionMethod {
	return isStringUnionValue<PaymentRefundCorrectionMethod>(
		value,
		paymentRefundCorrectionMethodOptions,
	)
		? value
		: "card";
}

export function normalizedClinicalRuleAction(
	value: unknown,
): Dashboard["clinicalRules"][number]["action"] {
	return isRecordKey<Dashboard["clinicalRules"][number]["action"]>(
		value,
		clinicalRuleActionLabels as Record<
			Dashboard["clinicalRules"][number]["action"],
			unknown
		>,
	)
		? value
		: "add_required_service";
}

export function normalizedClinicalRuleSeverity(
	value: unknown,
): Dashboard["clinicalRules"][number]["severity"] {
	return isRecordKey<Dashboard["clinicalRules"][number]["severity"]>(
		value,
		clinicalRuleSeverityLabels as Record<
			Dashboard["clinicalRules"][number]["severity"],
			unknown
		>,
	)
		? value
		: "warning";
}

export function normalizedServiceCategory(
	value: unknown,
): Dashboard["serviceCatalog"][number]["category"] {
	return isRecordKey<Dashboard["serviceCatalog"][number]["category"]>(
		value,
		serviceCategoryLabels as Record<
			Dashboard["serviceCatalog"][number]["category"],
			unknown
		>,
	)
		? value
		: "therapy";
}
