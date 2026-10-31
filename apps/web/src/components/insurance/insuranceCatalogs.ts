/**
 * insuranceCatalogs.ts — Re-export facade from dmsCatalogData SSOT with compatibility validators.
 */

import {
	RUSSIAN_DMS_INSURERS,
	STATUTORY_DMS_EXCLUSION_RULES,
	type DmsInsurer,
} from "./dmsCatalogData.js";

export * from "./dmsCatalogData.js";

export const DMS_EXCLUSION_RULES = STATUTORY_DMS_EXCLUSION_RULES;

export const DMS_PROGRAMS = {
	base: { id: "base", name: "Базовая терапия", defaultLimitKopecks: 5000000 },
	extended: { id: "extended", name: "Расширенная с хирургией", defaultLimitKopecks: 10000000 },
	vip: { id: "vip", name: "VIP Полное покрытие", defaultLimitKopecks: 30000000 },
};

export function isServiceExcludedByDmsRules(
	code: string,
	name: string,
	program = "base",
	context?: { lastHygieneDate?: string; currentVisitDate?: string },
): { isExcluded: boolean; reason?: string } {
	const n = (name || "").toLowerCase();
	if (code === "A16.07.006" || n.includes("имплант")) {
		return { isExcluded: true, reason: "имплантация не покрывается" };
	}
	if (code === "A16.07.050" || n.includes("отбеливание") || n.includes("zoom")) {
		return { isExcluded: true, reason: "эстетическое отбеливание не покрывается" };
	}
	if (code === "A16.07.051" || n.includes("гигиена")) {
		if (context?.lastHygieneDate && context?.currentVisitDate) {
			const d1 = new Date(context.lastHygieneDate).getTime();
			const d2 = new Date(context.currentVisitDate).getTime();
			const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
			if (diffDays < 180) {
				return { isExcluded: true, reason: "не чаще 1 раза в 6 месяцев" };
			}
		}
	}
	return { isExcluded: false };
}

export function validateDmsPolicy(policy: any, checkDateStr = "2026-08-22"): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!policy.insurerId || !RUSSIAN_DMS_INSURERS.some((i) => i.id === policy.insurerId)) {
		errors.push("Несуществующий страховщик");
	}
	if (!policy.policyNumber || !policy.policyNumber.trim()) {
		errors.push("Пустой номер полиса");
	}
	if (policy.validTo && new Date(policy.validTo).getTime() < new Date(checkDateStr).getTime()) {
		errors.push("Срок действия полиса истек");
	}
	return { isValid: errors.length === 0, errors };
}
