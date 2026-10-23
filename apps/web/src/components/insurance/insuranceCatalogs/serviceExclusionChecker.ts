/**
 * serviceExclusionChecker.ts — Проверка попадания услуги под исключения программы ДМС
 */

import { DMS_EXCLUSION_RULES } from "./exclusionRulesCatalog.js";
import { DMS_PROGRAMS } from "./programsCatalog.js";
import type { DmsExclusionRule, DmsProgramType } from "./types.js";

export function isServiceExcludedByDmsRules(
	serviceCode: string,
	serviceName: string,
	program: DmsProgramType,
	historyContext?: {
		lastHygieneDate?: string | undefined;
		currentVisitDate?: string | undefined;
	} | undefined,
): {
	isExcluded: boolean;
	rule?: DmsExclusionRule | undefined;
	reason?: string | undefined;
} {
	const lowerName = typeof serviceName === "string" ? serviceName.toLowerCase() : "";
	const cleanCode = typeof serviceCode === "string" ? serviceCode.trim().toUpperCase() : "";

	for (const rule of DMS_EXCLUSION_RULES) {
		if (!rule.appliesToPrograms.includes(program)) {
			continue;
		}

		if (rule.id === "excl_frequent_hygiene") {
			const isHygiene =
				rule.matchingNomenclaturePrefixes.some((p) => cleanCode.startsWith(p)) ||
				rule.matchingKeywords.some((kw) => lowerName.includes(kw));

			if (isHygiene && historyContext?.lastHygieneDate) {
				const last = new Date(historyContext.lastHygieneDate).getTime();
				const now = new Date(historyContext.currentVisitDate || new Date().toISOString()).getTime();
				const monthsDiff = (now - last) / (1000 * 60 * 60 * 24 * 30.4375);

				const minMonths = program === "base" ? 12 : 6;
				if (monthsDiff < minMonths) {
					return {
						isExcluded: true,
						rule,
						reason: `Профгигиена не покрывается: прошло ${monthsDiff.toFixed(1)} мес. с прошлого раза (лимит программы «${DMS_PROGRAMS[program].name}» — не чаще 1 раза в ${minMonths} мес).`,
					};
				}
			}
			continue;
		}

		const matchesPrefix = rule.matchingNomenclaturePrefixes.some((prefix) => cleanCode.startsWith(prefix));
		const matchesKeyword = rule.matchingKeywords.some((kw) => lowerName.includes(kw));

		if (matchesPrefix || matchesKeyword) {
			return {
				isExcluded: true,
				rule,
				reason: `Услуга «${serviceName}» входит в список исключений ДМС: ${rule.title} (${rule.code}).`,
			};
		}
	}

	return { isExcluded: false };
}
