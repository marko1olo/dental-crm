/**
 * deepLinkUrl — утилиты deep-link лаунчеров: чтение токенов и честная очистка URL.
 */

export function clearUrlTokens(tokens: string[], hashTokens: string[] = tokens): void {
	const u = new URL(window.location.href);
	for (const token of tokens) u.searchParams.delete(token);
	const hash = u.hash || "";
	const cleanedHash = hashTokens.reduce((acc, token) => acc.split(token).join(""), hash);
	window.history.replaceState({}, "", u.pathname + (u.search || "") + cleanedHash);
}

/** Есть ли токен в search или hash (толерантно к формам token, token=1, token_x). */
export function hasUrlToken(tokens: string[]): boolean {
	if (typeof window === "undefined") return false;
	const s = (window.location.search || "").toLowerCase();
	const h = (window.location.hash || "").toLowerCase();
	return tokens.some((t) => s.includes(t.toLowerCase()) || h.includes(t.toLowerCase()));
}
