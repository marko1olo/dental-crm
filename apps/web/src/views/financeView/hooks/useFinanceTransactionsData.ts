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
		return (activePayments ?? []).map((p) => {
			const ext = p as Payment & {
				fiscalFd?: string | undefined;
				fiscalFpd?: string | undefined;
				serviceName?: string | undefined;
				description?: string | undefined;
				amountKopecks?: number | undefined;
				taxDeductionCode?: string | null | undefined;
				taxCode?: string | null | undefined;
			};
			return {
				id: ext.id,
				receiptNumber: ext.fiscalReceiptNumber || (ext.id ? String(ext.id).slice(0, 8) : ""),
				fiscalDocumentNumber: ext.fiscalFd || ext.fiscalReceiptNumber || "",
				fiscalSign: ext.fiscalFpd || "",
				serviceName: ext.serviceName || ext.description || "Медицинские стоматологические услуги",
				dateIso: ext.paidAt || ext.createdAt || new Date().toISOString(),
				amountRub: Number(ext.amountRub ?? (ext.amountKopecks ? ext.amountKopecks / 100 : 0)),
				taxCode: (ext.taxDeductionCode === "2" || ext.taxCode === "2"
					? "2"
					: ext.taxDeductionCode === "1" || ext.taxCode === "1"
						? "1"
						: resolveTaxDeductionCategoryShared(ext.serviceName || ext.description || "")) as "1" | "2",
			};
		});
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
