/**
 * apps/web/src/components/treatment-plans/pricing/planSuggestionsResolver.ts
 *
 * Подбор услуг прайса клиники под предложения одонтограммы.
 */

import type { ToothState } from "../../odontogram/ToothChart";
import type { PlanPriceCatalogItem } from "../planDriftAudit";
import { PLAN_SERVICE_RULES, type PlanSuggestionInput } from "./planServiceRules";

export type PlanPriceIssueKind =
	| "catalog_empty"
	| "not_in_catalog"
	| "ambiguous"
	| "no_rule";

export interface PlanPriceIssue {
	kind: PlanPriceIssueKind;
	humanName: string;
	matches: number;
}

export interface ResolvedPlanRow {
	toothNumber: number;
	state: string;
	serviceId: string | null;
	serviceTitle: string | null;
	priceRub: number | null;
	issue: PlanPriceIssue | null;
}

function normalizeTitle(title: string): string {
	return title.toLowerCase().replace(/ё/g, "е");
}

export function resolvePlanSuggestions(
	suggestions: readonly PlanSuggestionInput[],
	catalog: readonly PlanPriceCatalogItem[],
): ResolvedPlanRow[] {
	const activeCatalog = catalog.filter((service) => service.active);
	const rows: ResolvedPlanRow[] = [];

	for (const suggestion of suggestions) {
		const rule = PLAN_SERVICE_RULES[suggestion.state as ToothState];
		if (!rule) {
			rows.push({
				toothNumber: suggestion.toothNumber,
				state: suggestion.state,
				serviceId: null,
				serviceTitle: null,
				priceRub: null,
				issue: { kind: "no_rule", humanName: suggestion.state, matches: 0 },
			});
			continue;
		}

		const matches = activeCatalog.filter((service) => {
			if (service.category !== rule.category) return false;
			const title = normalizeTitle(service.title);
			return rule.keywords.some((keyword) => title.includes(normalizeTitle(keyword)));
		});

		if (matches.length === 1) {
			const service = matches[0]!;
			rows.push({
				toothNumber: suggestion.toothNumber,
				state: suggestion.state,
				serviceId: service.id,
				serviceTitle: service.title,
				priceRub: Number.isFinite(service.basePriceRub) ? service.basePriceRub : null,
				issue: Number.isFinite(service.basePriceRub)
					? null
					: { kind: "not_in_catalog", humanName: rule.humanName, matches: 1 },
			});
			continue;
		}

		rows.push({
			toothNumber: suggestion.toothNumber,
			state: suggestion.state,
			serviceId: null,
			serviceTitle: null,
			priceRub: null,
			issue: {
				kind:
					matches.length > 1
						? "ambiguous"
						: activeCatalog.length === 0
							? "catalog_empty"
							: "not_in_catalog",
				humanName: rule.humanName,
				matches: matches.length,
			},
		});
	}

	return rows;
}

export { planPriceIssueMessages } from "./planPriceIssueMessages";
