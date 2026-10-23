/**
 * DENTE Dental CRM — Application URL & Routing Pure Helpers (Layer 2)
 * Mandate 8b (Pure Engine Functions), Mandate 8e (Doctor Autonomy).
 */

export function hasLocationToken(search: string, hash: string, tokens: string[]): boolean {
	const s = search.toLowerCase();
	const h = hash.toLowerCase();
	return tokens.some((t) => s.includes(t.toLowerCase()) || h.includes(t.toLowerCase()));
}

export function isDemoUrlActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return hasLocationToken(s, h, ["demo=true", "demo=1", "implant_passport", "passport=demo"]);
}

export function isCbctTunerActive(): boolean {
	if (typeof window === "undefined") return false;
	return hasLocationToken(window.location.search || "", window.location.hash || "", ["cbct=tuner"]);
}

export function isCbctDirectActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	if (isCbctTunerActive()) return false;
	return hasLocationToken(s, h, ["cbct=", "cbct=1", "cbct=demo", "cbct"]);
}
