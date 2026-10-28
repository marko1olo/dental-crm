import type { Dashboard, Payment } from "@dental/shared";
import { resolveTaxDeductionCategoryShared } from "@dental/shared";
import { useMemo } from "react";
import type {
	ClinicalRuleEvaluation,
	TaxDeductionPayment,
	TreatmentPlanItem,
	TreatmentPlanScenario,
} from "../types.js";

export interface UseFinanceTransactionsDataParams {
	readonly activePayments: Payment[];
	readonly activeTreatmentPlanItems: TreatmentPlanItem[];
	readonly activeTreatmentPlanScenarios: TreatmentPlanScenario[];
	readonly clinicalRuleEvaluations: ClinicalRuleEvaluation[];
	readonly clinicalRuleSummary: Dashboard["clinicalRuleSummary"];
}

/**
 * useFinanceTransactionsData — Агрегация данных транзакций, планов лечения и налоговых вычетов.
 */
export function useFinanceTransactionsData(params: UseFinanceTransactionsDataParams) {
	const {
		activePayments,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		clinicalRuleEvaluations,
		clinicalRuleSummary,
	} = params;

	const taxDeductionPayments: TaxDeductionPayment[] = useMemo(() => {
		return (activePayments ?? []).map((p: any) => ({
			id: p.id,
			receiptNumber: p.fiscalReceiptNumber || (p.id ? String(p.id).slice(0, 8) : ""),
			fiscalDocumentNumber: p.fiscalFd || p.fiscalReceiptNumber || "",
			fiscalSign: p.fiscalFpd || "",
			serviceName: p.serviceName || p.description || "Медицинские стоматологические услуги",
			dateIso: p.paidAt || p.createdAt || new Date().toISOString(),
			amountRub: Number(p.amountRub ?? (p.amountKopecks ? p.amountKopecks / 100 : 0)),
			taxCode: (p.taxDeductionCode === "2" || p.taxCode === "2"
				? "2"
				: p.taxDeductionCode === "1" || p.taxCode === "1"
					? "1"
					: resolveTaxDeductionCategoryShared(p.serviceName || p.description || "")) as "1" | "2",
		}));
	}, [activePayments]);

	const hasActiveClinicalRules = Boolean(
		(clinicalRuleSummary &&
			((clinicalRuleSummary.unresolved ?? 0) > 0 ||
				(clinicalRuleSummary.activeRules ?? 0) > 0)) ||
			(clinicalRuleEvaluations && clinicalRuleEvaluations.length > 0),
	);

	return {
		activePayments,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		hasActiveClinicalRules,
		taxDeductionPayments,
	};
}
