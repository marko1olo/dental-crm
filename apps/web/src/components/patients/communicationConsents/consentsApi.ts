import {
	CHANNELS,
	cellKey,
	type Channel,
	type ConsentMatrix,
	type ConsentRow,
	type ConsentState,
	type Scope,
} from "./types";

export function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	if (typeof raw !== "string" || !raw.trim()) return null;
	try {
		const p: unknown = JSON.parse(raw.trim());
		return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
	} catch { return null; }
}

export function buildMatrix(consents: ConsentRow[], defaults: { service: ConsentState; marketing: ConsentState }): ConsentMatrix {
	const m: ConsentMatrix = {};
	for (const ch of CHANNELS) {
		m[cellKey(ch.value, "service")] = defaults.service;
		m[cellKey(ch.value, "marketing")] = defaults.marketing;
	}
	for (const row of consents) {
		if (!CHANNELS.some((c) => c.value === row.channel)) continue;
		if (row.scope !== "service" && row.scope !== "marketing") continue;
		if (row.state !== "granted" && row.state !== "revoked") continue;
		m[cellKey(row.channel, row.scope)] = row.state;
	}
	return m;
}

export function parseConsentRows(rawConsents: unknown): ConsentRow[] {
	if (!Array.isArray(rawConsents)) return [];
	return rawConsents
		.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
		.map((r) => ({
			channel: String(r.channel ?? "") as Channel,
			scope: String(r.scope ?? "") as Scope,
			state: (r.state === "granted" ? "granted" : "revoked") as ConsentState,
			source: typeof r.source === "string" ? r.source : undefined,
			evidence: r.evidence as any,
			decidedAt: r.decidedAt as any,
		}));
}
