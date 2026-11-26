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

const STANDALONE_HASH_TOKENS = new Set([
	"loyalty",
	"bonuses",
	"standalone",
	"cashbox",
	"checkout",
	"cashier",
	"kassa",
	"odontogram",
	"dental-chart",
	"odontogram-gate0",
	"odontogram-32",
	"odontogram-mandible",
	"arch32",
	"appointment_booking",
	"quick_booking",
	"appointment",
	"quick-book",
	"booking-modal",
	"booking",
	"dental_lab",
	"lab",
	"ztl",
	"waitlist",
	"visit_standalone",
	"chairside-visit",
	"inventory",
	"warehouse",
	"mdlp",
	"chestny_znak",
	"inbound",
	"sanpin",
	"sterilization",
	"autoclave",
	"documents",
	"consents",
	"docs-studio",
	"documents_catalog",
	"document_templates",
	"documents-catalog",
	"document-templates",
	"consent-sign-drawer",
	"patient-consent-drawer",
	"radiology",
	"visiograph",
	"rvg",
	"hardware",
	"equipment",
	"implant-passport",
	"implant_passport",
	"implants",
	"surgery",
	"extraction",
	"resection",
	"sinus",
	"copilot_standalone",
	"copilot-standalone",
	"copilot_workspace",
	"copilot-workspace",
	"chairside-hud",
	"hud",
	"copilot",
	"ai",
	"anesthesia",
	"pediatric",
	"children",
	"patient_card",
	"patient-card",
	"patient-studio",
	"express-patient",
	"payroll",
	"salary",
	"earnings",
	"doctor-payout",
	"wallet",
	"telephony",
	"calls",
	"softphone",
	"presenter",
	"treatment-plan",
	"treatment-plans",
	"treatment-studio",
	"plans",
	"estimates",
	"executive-studio",
	"analytics",
	"reports",
	"doctor-payroll-report",
	"executive-payroll",
	"assistant-payroll",
	"leads",
	"recalls",
	"prophylaxis",
	"recall-hub",
	"photo",
	"dsd",
	"smile-design",
	"crm-leads",
	"kanban",
	"settings-studio",
	"pricelist",
	"prices",
	"services-catalog",
	"endo",
	"endodontics",
	"root-canals",
	"rootcanal",
	"insurance",
	"dms",
	"waitlist-matches",
	"waitlist_matches",
	"tomorrow-reminders",
	"tomorrow_reminders",
	"reminders",
	"omnichannel",
	"omnichannel_hub",
	"messaging_hub",
	"communications",
	"ortho",
	"orthodontics",
	"aligners",
	"ceph",
	"trg",
	"settings",
	"access",
	"staff",
	"rbac",
]);

const STANDALONE_SEARCH_KEYS = new Set([
	...STANDALONE_HASH_TOKENS,
	"consent_sign_drawer",
	"patient_consent_drawer",
	"executive_studio",
	"doctor_payroll",
	"executive_payroll",
	"assistant_payroll",
]);

const STANDALONE_STAND_VALUES = new Set([
	...STANDALONE_HASH_TOKENS,
	"module",
]);

const STANDALONE_PATIENT_CARD_HASH_TOKENS = new Set([
	"patient_card",
	"patient-card",
	"patient-studio",
	"express-patient",
]);

const STANDALONE_PATIENT_CARD_STAND_VALUES = new Set([
	"patient_card",
	"patient-card",
	"patient-studio",
	"express-patient",
]);

export function extractHashRouteToken(rawHash: string): string {
	const cleaned = rawHash.trim().replace(/^#+\/?/, "");
	if (!cleaned) return "";
	const [token] = cleaned.split(/[?&=]/, 1);
	return (token ?? "").trim().toLowerCase();
}

export function isStandaloneActive(search?: string, hash?: string): boolean {
	const resolvedSearch =
		search !== undefined ? search : typeof window !== "undefined" ? window.location.search || "" : "";
	const resolvedHash =
		hash !== undefined ? hash : typeof window !== "undefined" ? window.location.hash || "" : "";
	if (!resolvedSearch && !resolvedHash) return false;

	const params = new URLSearchParams(resolvedSearch);
	const standParam = params.get("stand")?.trim().toLowerCase() ?? "";
	if (standParam && STANDALONE_STAND_VALUES.has(standParam)) return true;

	const standaloneParam = params.get("standalone")?.trim().toLowerCase();
	if (standaloneParam !== undefined && standaloneParam !== "0" && standaloneParam !== "false") {
		return true;
	}

	if (params.get("copilot") === "1") return true;
	const analyticsParam = params.get("analytics")?.trim().toLowerCase();
	if (analyticsParam === "direct" || analyticsParam === "1") return true;
	if (params.get("dashboard")?.trim().toLowerCase() === "direct") return true;

	for (const [key, value] of params.entries()) {
		const normalizedKey = key.trim().toLowerCase();
		if (STANDALONE_SEARCH_KEYS.has(normalizedKey)) {
			const normalizedValue = value.trim().toLowerCase();
			if (normalizedValue !== "0" && normalizedValue !== "false") return true;
		}
	}

	const hashToken = extractHashRouteToken(resolvedHash);
	return hashToken !== "" && STANDALONE_HASH_TOKENS.has(hashToken);
}

export function isStandalonePatientCardActive(search?: string, hash?: string): boolean {
	const resolvedSearch =
		search !== undefined ? search : typeof window !== "undefined" ? window.location.search || "" : "";
	const resolvedHash =
		hash !== undefined ? hash : typeof window !== "undefined" ? window.location.hash || "" : "";
	if (!resolvedSearch && !resolvedHash) return false;
	const params = new URLSearchParams(resolvedSearch);
	const standParam = params.get("stand")?.trim().toLowerCase() ?? "";
	if (STANDALONE_PATIENT_CARD_STAND_VALUES.has(standParam)) return true;
	for (const token of STANDALONE_PATIENT_CARD_HASH_TOKENS) {
		const val = params.get(token);
		if (val !== null && val !== "0" && val !== "false") return true;
	}
	const hashToken = extractHashRouteToken(resolvedHash);
	return hashToken !== "" && STANDALONE_PATIENT_CARD_HASH_TOKENS.has(hashToken);
}
