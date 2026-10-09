/**
 * invalidationHub.ts — Layer 2: Реестр правил и диспетчер автоматической инвалидации кэша.
 *
 * Сопоставляет сетевые мутации (POST/PUT/PATCH/DELETE) с паттернами затронутых справочников
 * и вычисляет перечень регулярных выражений для очистки устаревших данных.
 */

import type { MutationInvalidationRule } from "./types";
import { normalizeApiUrl } from "./cacheKeyAndTiming";

/**
 * Правила автоматической инвалидации кэша при сохранении или изменении данных.
 */
export const DEFAULT_MUTATION_RULES: readonly MutationInvalidationRule[] = [
	{
		mutationPattern: /^\/api\/settings\/staff(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/settings\/staff/i, /^\/api\/hr\/doctors/i],
	},
	{
		mutationPattern: /^\/api\/(?:settings\/clinic|settings\/branches|workspace\/profile)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/settings\/clinic/i,
			/^\/api\/settings\/branches/i,
			/^\/api\/workspace\/profile/i,
		],
	},
	{
		mutationPattern: /^\/api\/(?:settings\/price|catalog|price-lists)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/settings\/price/i,
			/^\/api\/catalog/i,
			/^\/api\/price-lists/i,
		],
	},
	{
		mutationPattern: /^\/api\/(?:templates|document-templates|emr\/templates|somatic)(?:\/|\?|$)/i,
		invalidatePatterns: [
			/^\/api\/templates/i,
			/^\/api\/document-templates/i,
			/^\/api\/emr\/templates/i,
			/^\/api\/somatic/i,
		],
	},
	{
		mutationPattern: /^\/api\/crm\/custom-task-types(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/crm\/custom-task-types/i],
	},
	{
		mutationPattern: /^\/api\/clinical\/rules(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/clinical\/rules/i],
	},
	{
		mutationPattern: /^\/api\/clinical\/phase-completions(?:\/|\?|$)/i,
		invalidatePatterns: [/^\/api\/clinical\/phase-completions/i],
	},
	{
		mutationPattern: /^\/api\/inventory(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/inventory/i],
	},
	{
		mutationPattern: /^\/api\/lab(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/lab/i],
	},
	{
		mutationPattern: /^\/api\/insurance(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/insurance/i],
	},
	{
		mutationPattern: /^\/api\/marketing(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/marketing/i],
	},
	{
		mutationPattern: /^\/api\/pharmacology(?:\/|$)/i,
		invalidatePatterns: [/^\/api\/pharmacology/i],
	},
] as const;

/**
 * Определяет список регулярных выражений для инвалидации на основе мутирующего URL и HTTP-метода.
 */
export function findInvalidationPatternsForMutation(
	rawUrl: string,
	method: string,
	rules: readonly MutationInvalidationRule[] = DEFAULT_MUTATION_RULES,
): readonly RegExp[] {
	const normalizedMethod = method.toUpperCase();
	if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
		return [];
	}

	const normalizedUrl = normalizeApiUrl(rawUrl);
	const matchedPatterns: RegExp[] = [];

	for (const rule of rules) {
		if (rule.mutationPattern.test(normalizedUrl)) {
			for (const pattern of rule.invalidatePatterns) {
				matchedPatterns.push(pattern);
			}
		}
	}

	return matchedPatterns;
}
