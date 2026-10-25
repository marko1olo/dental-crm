/**
 * treatmentPlanAppendix1DataBuilder.ts — Подготовка данных для бланка Приложения №1.
 */

import type {
	PlanTierKey,
	MultiOptionTreatmentPlan,
	TreatmentPlanAppendix1DocumentData,
} from "./types.js";
import {
	formatRublesFromKopecks,
	convertKopecksToRussianWords,
} from "./treatmentPlanFormatters.js";

export function buildTreatmentPlanAppendix1Data(
	plan: MultiOptionTreatmentPlan,
	selectedTierKey?: PlanTierKey,
): TreatmentPlanAppendix1DocumentData {
	const tierKey = selectedTierKey || plan.selectedTierKey;
	const tier = plan.tiers[tierKey];

	const createdDate = new Date(plan.createdAtIso);
	const documentDateRu = createdDate.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const contractNumber = `ДОГ-${createdDate.getFullYear()}-${plan.patientId.slice(0, 6).toUpperCase()}`;
	const licenseText = `Лицензия № ${plan.clinicRequisites.medicalLicenseNumber} от ${plan.clinicRequisites.medicalLicenseDate}, выданная ${plan.clinicRequisites.medicalLicenseIssuer}`;

	return {
		planNumber: plan.planNumber,
		contractNumber,
		documentDateRu,
		clinicFullName: plan.clinicRequisites.clinicFullName,
		clinicInn: plan.clinicRequisites.clinicInn,
		clinicOgrn: plan.clinicRequisites.clinicOgrn,
		clinicAddress: plan.clinicRequisites.clinicAddress,
		clinicLicense: licenseText,
		patientFullName: plan.patientFullName,
		patientBirthDate: plan.patientBirthDate,
		patientPhone: plan.patientPhone,
		doctorFullName: plan.doctorFullName,
		doctorSpecialty: plan.doctorSpecialty,
		clinicalDiagnosisRu: plan.clinicalDiagnosisRu,
		selectedTierNameRu: tier.tierNameRu,
		selectedTierBadgeRu: tier.badgeRu,
		stages: tier.stages,
		totalGrossCostRu: formatRublesFromKopecks(tier.grossCostKopecks),
		totalDiscountRu: formatRublesFromKopecks(tier.discountKopecks),
		totalLaborCostRu: formatRublesFromKopecks(tier.laborKopecks),
		totalMaterialsCostRu: formatRublesFromKopecks(tier.materialsKopecks),
		totalCostKopecks: tier.totalCostKopecks,
		totalCostRu: formatRublesFromKopecks(tier.totalCostKopecks),
		totalCostInWordsRu: convertKopecksToRussianWords(tier.totalCostKopecks),
		warrantyPeriodRu: typeof tier.warrantyYears === "number" ? `${tier.warrantyYears} года (лет)` : String(tier.warrantyYears),
		ndflRefundRu: tier.ndflDeduction.refundRu,
		installment12Ru: tier.installments[12]?.monthlyPaymentRu || "0 ₽",
		termsAndConditionsAccepted: true,
	};
}
