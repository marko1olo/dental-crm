/**
 * Deep Link Matcher — Декларативное сопоставление URL для автономных глубоких ссылок.
 * Мандат 8b (Sweet Spot <= 150 строк), Мандат 8aq (Монтирование в живой UI), Мандат 8wy.
 */

import React from "react";

export interface DeepLinkMatchCriteria {
	/** Строковые токены, проверяемые толерантно в search или hash */
	tokens?: readonly string[];
	/** Точные значения хеша (например, ['#loyalty', '#bonuses']) */
	exactHashes?: readonly string[];
	/** Префиксы хеша (например, ['#loyalty?', '#loyalty/']) */
	hashPrefixes?: readonly string[];
	/** Подстроки в хеше (например, ['dental-lab', 'dental_lab']) */
	hashIncludes?: readonly string[];
	/** Подстроки в строке запроса search (например, ['loyalty=1', 'standalone=loyalty']) */
	searchIncludes?: readonly string[];
	/** Токены исключения (если любой из них совпал, правило отклоняется) */
	exclude?: readonly string[];
	/** Пользовательский предикат для граничных условий */
	customPredicate?: (context: DeepLinkUrlContext) => boolean;
}

export interface DeepLinkUrlContext {
	search: string;
	hash: string;
	pathname: string;
	searchParams: URLSearchParams;
}

export interface LauncherRegistryEntry<P = unknown> {
	id: string;
	title: string;
	criteria: DeepLinkMatchCriteria;
	render: (props: P) => React.ReactElement | null;
}

export function getDeepLinkUrlContext(): DeepLinkUrlContext | null {
	if (typeof window === "undefined") return null;
	return {
		search: (window.location.search || "").toLowerCase(),
		hash: (window.location.hash || "").toLowerCase(),
		pathname: window.location.pathname || "",
		searchParams: new URLSearchParams(window.location.search || ""),
	};
}

export function matchesDeepLink(
	criteria: DeepLinkMatchCriteria,
	ctx?: DeepLinkUrlContext | null,
): boolean {
	const context = ctx ?? getDeepLinkUrlContext();
	if (!context) return false;

	const { search, hash } = context;

	// 1. Негативный фильтр (Negative Guard / Exclusions)
	if (criteria.exclude && criteria.exclude.length > 0) {
		const isExcluded = criteria.exclude.some((ex) => {
			const lowerEx = ex.toLowerCase();
			return search.includes(lowerEx) || hash.includes(lowerEx);
		});
		if (isExcluded) return false;
	}

	// 2. Точные хеши
	if (
		criteria.exactHashes &&
		criteria.exactHashes.some((h) => hash === h.toLowerCase())
	) {
		return true;
	}

	// 3. Префиксы хешей
	if (
		criteria.hashPrefixes &&
		criteria.hashPrefixes.some((p) => hash.startsWith(p.toLowerCase()))
	) {
		return true;
	}

	// 4. Подстроки хеша
	if (
		criteria.hashIncludes &&
		criteria.hashIncludes.some((inc) => hash.includes(inc.toLowerCase()))
	) {
		return true;
	}

	// 5. Подстроки строки поиска
	if (
		criteria.searchIncludes &&
		criteria.searchIncludes.some((inc) => search.includes(inc.toLowerCase()))
	) {
		return true;
	}

	// 6. Универсальные токены (поиск и в search, и в hash)
	if (
		criteria.tokens &&
		criteria.tokens.some((tok) => {
			const lowerTok = tok.toLowerCase();
			return search.includes(lowerTok) || hash.includes(lowerTok);
		})
	) {
		return true;
	}

	// 7. Пользовательский предикат
	if (criteria.customPredicate && criteria.customPredicate(context)) {
		return true;
	}

	return false;
}

export function evaluateLaunchersRegistry<P>(
	registry: readonly LauncherRegistryEntry<P>[],
	props: P,
	ctx?: DeepLinkUrlContext | null,
): React.ReactElement | null {
	const context = ctx ?? getDeepLinkUrlContext();
	if (!context) return null;

	for (const entry of registry) {
		if (matchesDeepLink(entry.criteria, context)) {
			return entry.render(props);
		}
	}
	return null;
}
