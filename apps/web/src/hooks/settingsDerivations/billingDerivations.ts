import type {
	ClinicalRule,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	Dashboard,
	ServiceCatalogItem,
	ServiceCategory,
} from "@dental/shared";

export interface BillingDerivationsParams {
	dashboard?: Dashboard | null;
	clinicalRuleActionLabels?: Record<string, string>;
	clinicalRuleSeverityLabels?: Record<string, string>;
	serviceCategoryLabels?: Record<string, string>;
}

export function deriveBillingSettings(params: BillingDerivationsParams) {
	const {
		dashboard,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		serviceCategoryLabels,
	} = params;

	const typedClinicalRuleActionLabels = (clinicalRuleActionLabels ||
		{}) as Record<ClinicalRuleAction, string>;
	const typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels ?? {},
	) as ClinicalRuleAction[];
	const typedClinicalRuleSeverityLabels = (clinicalRuleSeverityLabels ||
		{}) as Record<ClinicalRuleSeverity, string>;
	const typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels,
	) as ClinicalRuleSeverity[];
	const typedClinicalRules = (dashboard?.clinicalRules || []) as ClinicalRule[];
	const typedServiceCatalog = (dashboard?.serviceCatalog ||
		[]) as ServiceCatalogItem[];
	const typedServiceCategoryLabels = (serviceCategoryLabels || {}) as Record<
		ServiceCategory,
		string
	>;
	const typedServiceCategories = Object.keys(
		typedServiceCategoryLabels,
	) as ServiceCategory[];

	return {
		typedClinicalRuleActionLabels,
		typedClinicalRuleActions,
		typedClinicalRuleSeverityLabels,
		typedClinicalRuleSeverities,
		typedClinicalRules,
		typedServiceCatalog,
		typedServiceCategoryLabels,
		typedServiceCategories,
	};
}
