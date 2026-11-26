/**
 * apps/web/src/router/routeResolver.ts
 *
 * Единственный источник правды (SSOT) маршрутизации DENTE CRM.
 * Заменяет 18 веток `else if` в main.tsx и 125 токенов `isStandaloneActive()` в appRoutingHelpers.ts.
 * Обеспечивает работу единого каркаса `ClinicWorkspaceShell` + наложенных студий глубины depth = 1.
 */

import type {
	PrimaryWorkspaceView,
	ResolvedClinicRoute,
	TopLevelSurface,
	WorkspaceOverlayStudio,
} from "@dental/shared";
import { publicPortalRouteFromHash } from "../lib/publicPortalRoute.js";
import type { AppView } from "../utils/routeUtils.js";

interface LocationInput {
	readonly pathname?: string | undefined;
	readonly search?: string | undefined;
	readonly hash?: string | undefined;
}

const TRUTH_FLAGS = new Set(["1", "true", "yes", "studio", "direct", "open"]);

function extractTokenAndParams(rawSearch: string, rawHash: string): {
	token: string;
	params: URLSearchParams;
	hashRaw: string;
} {
	const cleanedHash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
	const qIndex = cleanedHash.indexOf("?");
	const aIndex = cleanedHash.indexOf("&");
	const splitAt = qIndex >= 0 ? qIndex : aIndex;

	const rawTokenPart = splitAt >= 0 ? cleanedHash.slice(0, splitAt) : cleanedHash;
	const slashIndex = rawTokenPart.indexOf("/");
	const token = (slashIndex >= 0 ? rawTokenPart.slice(0, slashIndex) : rawTokenPart)
		.replace(/^\/+/, "")
		.toLowerCase();
	const subFromPath = slashIndex >= 0 ? rawTokenPart.slice(slashIndex + 1).toLowerCase() : "";

	const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
	if (splitAt >= 0) {
		const hashQuery = cleanedHash.slice(splitAt + 1);
		const hp = new URLSearchParams(hashQuery);
		hp.forEach((value, key) => {
			if (!params.has(key)) params.set(key, value);
		});
	}
	if (subFromPath && !params.has("subTab")) {
		params.set("subTab", subFromPath);
	}

	return { token, params, hashRaw: cleanedHash.toLowerCase() };
}

function isTruthyParam(params: URLSearchParams, ...keys: readonly string[]): boolean {
	for (const key of keys) {
		const val = params.get(key)?.trim().toLowerCase();
		if (val && TRUTH_FLAGS.has(val)) return true;
	}
	return false;
}

function getOptionalParam(params: URLSearchParams, ...keys: readonly string[]): string | undefined {
	for (const key of keys) {
		const val = params.get(key)?.trim();
		if (val) return val;
	}
	return undefined;
}

function parseOptionalInt(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function resolvePrimaryViewFromToken(
	token: string,
	params: URLSearchParams,
): { view: PrimaryWorkspaceView; subTab?: string | undefined; entityId?: string | undefined } | null {
	const explicitTab = params.get("tab")?.trim().toLowerCase();
	const explicitView = params.get("view")?.trim().toLowerCase();
	const explicitStudio = params.get("studio")?.trim().toLowerCase();
	const stand = params.get("stand")?.trim().toLowerCase() || params.get("standalone")?.trim().toLowerCase();
	const labFlag = isTruthyParam(params, "lab", "dental_lab") ? "lab" : "";
	const execFlag = isTruthyParam(params, "executive_studio") ? "executive-studio" : "";
	const key = token || stand || explicitView || explicitTab || explicitStudio || labFlag || execFlag || "";
	const subTab = getOptionalParam(params, "subTab", "section");
	const entityId = getOptionalParam(params, "patientId", "patient_id", "id");

	switch (key) {
		case "":
		case "shift":
		case "today":
		case "smena":
		case "shift-studio":
			return { view: "shift", subTab, entityId };
		case "schedule":
		case "calendar":
		case "appointments":
			return { view: "schedule", subTab, entityId };
		case "visit":
		case "emk":
		case "chart":
		case "diary":
		case "soap":
		case "chairside":
			return { view: "visit", subTab, entityId };
		case "patients":
		case "patients-list":
			return { view: "patients", subTab, entityId };
		case "treatment-plans":
		case "treatment-plan":
		case "plans":
		case "pipeline":
		case "estimates":
		case "presenter":
		case "plan-presenter":
		case "treatment-studio":
			return { view: "treatment_plans", subTab, entityId };
		case "finance":
		case "billing":
		case "invoices":
		case "payments":
		case "reports":
			return { view: "finance", subTab, entityId };
		case "warehouse":
		case "inventory":
		case "stock":
		case "warehouse-studio":
		case "inventory-hub":
		case "warehouse-hub":
		case "mdlp":
			return { view: "warehouse", subTab: key === "mdlp" ? "mdlp" : subTab, entityId };
		case "lab":
		case "dental-lab":
		case "dental_lab":
		case "lab-orders":
		case "lab_order":
		case "lab_hub":
		case "ztl":
		case "lab-studio":
			return { view: "lab", subTab: subTab ?? (key === "lab_order" ? "new_order" : undefined), entityId };
		case "imaging":
		case "radiology":
		case "radiology-standalone":
		case "visiograph":
		case "xray-viewer":
		case "study-viewer":
		case "scanner":
		case "3d-viewer":
			return { view: "imaging", subTab, entityId };
		case "documents":
		case "docs":
		case "docs-studio":
		case "documents-studio":
		case "contract":
		case "tax-certificate":
			return {
				view: "documents",
				subTab:
					key === "tax-certificate"
						? "tax_certificate"
						: key === "contract"
							? "contract"
							: subTab,
				entityId,
			};
		case "communications":
		case "chat":
		case "whatsapp":
		case "telegram":
		case "omnichannel":
			return { view: "communications", subTab, entityId };
		case "leads":
		case "crm":
		case "funnel":
			return { view: "leads", subTab, entityId };
		case "analytics":
		case "executive":
		case "executive-studio":
		case "clinic-analytics-studio":
		case "marketing":
		case "romi":
		case "roi":
		case "campaigns":
		case "cohorts":
		case "marketing-cohorts":
			return {
				view: "analytics",
				subTab:
					key === "cohorts" || key === "marketing-cohorts"
						? "cohorts"
						: key === "romi" || key === "roi"
							? "romi"
							: key === "marketing" || key === "campaigns"
								? "marketing"
								: subTab,
				entityId,
			};
		case "pricelist":
		case "prices":
		case "services-catalog":
		case "catalog":
			return { view: "pricelist", subTab, entityId };
		case "settings":
		case "access":
		case "rbac":
		case "roles":
		case "permissions":
		case "staff":
		case "doctors":
		case "hardware":
		case "equipment":
		case "sensor-gateway":
		case "hardware-studio":
		case "messengers":
		case "clinic":
			return {
				view: "settings",
				subTab:
					key === "access" || key === "rbac" || key === "roles" || key === "permissions"
						? "access"
						: key === "staff" || key === "doctors"
							? "staff"
							: key === "hardware" || key === "equipment" || key === "sensor-gateway" || key === "hardware-studio"
								? "hardware"
								: key === "messengers"
									? "messengers"
									: subTab ?? "clinic",
				entityId,
			};
		default:
			return null;
	}
}

function resolveStudioOverlay(
	token: string,
	params: URLSearchParams,
	hashRaw: string,
): { studio: WorkspaceOverlayStudio; preferredView: PrimaryWorkspaceView } | null {
	const stand = (params.get("stand") || params.get("standalone") || "").trim().toLowerCase();
	const key = token || stand;
	const patientId = getOptionalParam(params, "patientId", "patient_id", "id");
	const patientName = getOptionalParam(params, "patientName", "patient_name");
	const visitId = getOptionalParam(params, "visitId", "visit_id");
	const toothFdi = parseOptionalInt(getOptionalParam(params, "toothFdi", "toothNumber", "tooth"));

	// 1. Patient Card
	if (
		key === "patient-card" ||
		key === "patient_card" ||
		key === "patient-profile" ||
		key === "edit-patient" ||
		key === "new-patient" ||
		isTruthyParam(params, "patientCard", "patient_card")
	) {
		return {
			preferredView: "patients",
			studio: {
				kind: "patient_card",
				patientId,
				initialTab: getOptionalParam(params, "patientTab", "subTab"),
				mode: key === "new-patient" ? "create" : key === "edit-patient" ? "edit" : "view",
			},
		};
	}

	// 2. Cashbox & Checkout
	if (
		key === "cashbox" ||
		key === "cashbox_ssot" ||
		key === "cash-register" ||
		key === "cash_register" ||
		key === "kassa" ||
		key === "cashier" ||
		key === "checkout" ||
		key === "payment" ||
		key === "fast-checkout" ||
		key === "quick-checkout" ||
		key === "bonus-payment" ||
		key === "cashbox-pay" ||
		key === "receipt" ||
		isTruthyParam(params, "cashbox", "cashbox_ssot", "checkout", "kassa", "cashier")
	) {
		const isCheckout =
			key === "checkout" ||
			key === "payment" ||
			key === "fast-checkout" ||
			key === "quick-checkout" ||
			key === "bonus-payment" ||
			key === "cashbox-pay" ||
			isTruthyParam(params, "checkout");
		const amountRubStr = getOptionalParam(params, "amountRub", "amount_rub", "amount", "totalDueRub");
		const parsedRub = amountRubStr ? Number.parseFloat(amountRubStr) : Number.NaN;
		return {
			preferredView: "finance",
			studio: {
				kind: "cashbox",
				mode: isCheckout ? "checkout" : "studio",
				patientId,
				patientName,
				invoiceId: getOptionalParam(params, "invoiceId", "invoice_id"),
				amountKopecks: Number.isFinite(parsedRub) ? Math.round(parsedRub * 100) : undefined,
				doctorName: getOptionalParam(params, "doctorFullName", "doctorName", "doctor"),
				serviceTitle: getOptionalParam(params, "serviceTitle", "service"),
			},
		};
	}

	// 3. Quick Booking
	if (
		key === "quick-booking" ||
		key === "quick_booking" ||
		key === "booking-drawer" ||
		isTruthyParam(params, "quickBooking", "quick_booking")
	) {
		return {
			preferredView: "schedule",
			studio: {
				kind: "quick_booking",
				patientId,
				slotIso: getOptionalParam(params, "startsAt"),
				chairId: getOptionalParam(params, "chairId"),
				doctorId: getOptionalParam(params, "doctorId", "doctorUserId"),
				emergency: isTruthyParam(params, "emergency", "cito"),
			},
		};
	}

	// 4. EMR / Outpatient Card
	if (
		key === "outpatient-card" ||
		key === "emk-card" ||
		key === "emr-record" ||
		key === "medical-record" ||
		isTruthyParam(params, "outpatient_card", "emr_record")
	) {
		return {
			preferredView: "visit",
			studio: {
				kind: "emr_record",
				patientId,
				visitId,
				initialTab: getOptionalParam(params, "emrTab", "subTab"),
			},
		};
	}

	// 5. Odontogram fullscreen
	if (
		key === "odontogram" ||
		key === "odontogram-fullscreen" ||
		key === "dental-formula" ||
		key === "formula-studio" ||
		isTruthyParam(params, "odontogram")
	) {
		return {
			preferredView: "visit",
			studio: {
				kind: "odontogram_fullscreen",
				patientId,
				dentitionMode:
					params.get("dentition") === "pediatric" || params.get("dentition") === "mixed"
						? (params.get("dentition") as "pediatric" | "mixed")
						: "adult",
			},
		};
	}

	// 6. Perio
	if (key === "perio" || key === "psr" || key === "periodontics" || isTruthyParam(params, "perio", "psr")) {
		return { preferredView: "visit", studio: { kind: "perio", patientId } };
	}

	// 7. Endodontics
	if (
		key === "endo" ||
		key === "endodontics" ||
		key === "root-canals" ||
		key === "rootcanal" ||
		key === "endo-studio" ||
		key === "endo-quickbar" ||
		isTruthyParam(params, "endo", "endodontics", "root_canals")
	) {
		return {
			preferredView: "visit",
			studio: {
				kind: "endo",
				patientId,
				toothFdi,
				quickbar: key === "endo-quickbar" || isTruthyParam(params, "quickbar"),
			},
		};
	}

	// 8. Surgery / Implantology
	if (
		key === "surgery" ||
		key === "implant" ||
		key === "implant-passport" ||
		key === "extraction" ||
		key === "resection" ||
		key === "sinus" ||
		isTruthyParam(params, "surgery", "implant")
	) {
		const scenario =
			key === "extraction"
				? "extraction"
				: key === "resection"
					? "resection_periostotomy"
					: key === "sinus"
						? "sinus_gbr"
						: "implant";
		return {
			preferredView: "visit",
			studio: {
				kind: "surgery",
				patientId,
				toothFdi,
				scenario,
				initialTab: hashRaw.includes("passport") || isTruthyParam(params, "passport") ? "passport" : "protocol",
			},
		};
	}

	// 9. Orthopedics / Crowns
	if (
		key === "orthopedics" ||
		key === "crowns" ||
		isTruthyParam(params, "orthopedics", "crowns")
	) {
		return { preferredView: "visit", studio: { kind: "orthopedics", patientId, toothFdi } };
	}

	// 10. Orthodontics
	if (
		key === "ortho" ||
		key === "orthodontics" ||
		key === "ortho-studio" ||
		key === "ortho-protocol" ||
		isTruthyParam(params, "ortho", "orthodontics")
	) {
		return { preferredView: "visit", studio: { kind: "orthodontics", patientId } };
	}

	// 11. Hygiene
	if (
		key === "hygiene" ||
		key === "cleaning" ||
		key === "prophy" ||
		key === "hygiene-studio" ||
		isTruthyParam(params, "hygiene", "cleaning")
	) {
		return { preferredView: "visit", studio: { kind: "hygiene", patientId, visitId } };
	}

	// 12. Pediatric
	if (
		key === "pediatric" ||
		key === "children" ||
		key === "pediatric-studio" ||
		key === "diploma" ||
		key === "bravery-diploma" ||
		key === "pediatric-diploma" ||
		isTruthyParam(params, "pediatric", "children", "diploma", "bravery")
	) {
		const isDiploma =
			key.includes("diploma") || isTruthyParam(params, "diploma", "bravery");
		return {
			preferredView: "visit",
			studio: { kind: "pediatric", patientId, mode: isDiploma ? "diploma" : "dentition" },
		};
	}

	// 13. Photo protocol & DSD
	if (
		key === "photo" ||
		key === "photo-protocol" ||
		key === "photo-qr" ||
		key === "dsd" ||
		key === "smile-design" ||
		isTruthyParam(params, "photo", "photo-protocol", "photo-qr", "dsd", "smile-design")
	) {
		return {
			preferredView: "visit",
			studio: {
				kind: "photo_protocol",
				patientId,
				mode: key === "dsd" || key === "smile-design" || isTruthyParam(params, "dsd")
					? "dsd"
					: key === "photo-qr" || isTruthyParam(params, "photo-qr")
						? "qr"
						: "grid",
			},
		};
	}

	// 14. RVG capture
	if (
		key === "rvg-capture" ||
		key === "direct-rvg" ||
		key === "rvg-hardware" ||
		key === "rvg" ||
		key === "xray-capture" ||
		key === "visiograph" ||
		isTruthyParam(params, "rvg-capture", "direct-rvg", "rvg")
	) {
		return { preferredView: "imaging", studio: { kind: "rvg_capture", patientId, toothFdi } };
	}

	// 15. Shift close
	if (key === "shift-close" || key === "shift_closing" || key === "z-report" || isTruthyParam(params, "shift_close")) {
		return {
			preferredView: "shift",
			studio: { kind: "shift_close", shiftId: getOptionalParam(params, "shiftId") },
		};
	}

	// 16. Copilot
	if (key === "copilot" || key === "ai-assistant" || isTruthyParam(params, "copilot")) {
		const rawTab = params.get("copilotTab");
		return {
			preferredView: "visit",
			studio: {
				kind: "copilot",
				patientId,
				initialTab: rawTab === "actions" || rawTab === "memory" ? rawTab : "dialog",
			},
		};
	}

	// 17. Domain overlays (preserving clean navigation)
	if (key === "prescriptions" || key === "prescription" || key === "rx" || key === "prescription-studio" || isTruthyParam(params, "rx", "prescriptions", "prescription")) {
		return { preferredView: "visit", studio: { kind: "prescriptions", patientId } };
	}
	if (key === "recalls" || key === "prophylaxis" || key === "recall-hub" || isTruthyParam(params, "recalls")) {
		return { preferredView: "communications", studio: { kind: "recalls", patientId } };
	}
	if (key === "warranty" || key === "warranty-passport" || key === "warranty-studio" || isTruthyParam(params, "warranty", "warranty-passport", "warranty_passport")) {
		return { preferredView: "patients", studio: { kind: "warranty", patientId } };
	}
	if (key === "consents" || key === "consent" || key === "consent-studio" || isTruthyParam(params, "consents", "consent")) {
		return {
			preferredView: "documents",
			studio: { kind: "consents", patientId, docId: getOptionalParam(params, "docId") },
		};
	}
	if (key === "ukep" || key === "cryptopro" || isTruthyParam(params, "ukep", "cryptopro")) {
		return { preferredView: "documents", studio: { kind: "ukep", patientId } };
	}
	if (key === "insurance" || key === "dms" || isTruthyParam(params, "insurance", "dms")) {
		return { preferredView: "finance", studio: { kind: "dms", patientId } };
	}
	if (key === "loyalty" || key === "bonuses" || key === "points" || key === "family-pool" || key === "loyalty-studio" || isTruthyParam(params, "loyalty", "bonuses")) {
		return { preferredView: "finance", studio: { kind: "loyalty", patientId } };
	}
	if (key === "sanpin" || key === "sterilization" || key === "autoclave" || key === "sterilizer" || isTruthyParam(params, "sanpin", "sterilization", "autoclave")) {
		return {
			preferredView: "warehouse",
			studio: {
				kind: "sanpin",
				initialTab: hashRaw.includes("kraft") ? "kraft" : hashRaw.includes("cleaning") ? "cleaning" : "autoclave",
			},
		};
	}
	if (key === "telephony" || key === "calls" || key === "softphone" || key === "incoming" || isTruthyParam(params, "telephony", "calls", "softphone", "incoming")) {
		return {
			preferredView: "communications",
			studio: { kind: "telephony", incoming: key === "incoming" || isTruthyParam(params, "incoming") },
		};
	}
	if (key === "knowledge_base" || key === "knowledge-base" || key === "help" || isTruthyParam(params, "knowledge_base", "knowledge-base", "help")) {
		return { preferredView: "shift", studio: { kind: "knowledge_base" } };
	}
	if (key === "waitlist-matches" || key === "waitlist_matches" || isTruthyParam(params, "waitlist-matches", "waitlist_matches")) {
		return { preferredView: "schedule", studio: { kind: "waitlist_matches" } };
	}
	if (key === "tomorrow-reminders" || key === "tomorrow_reminders" || key === "reminders" || isTruthyParam(params, "tomorrow-reminders", "reminders")) {
		return { preferredView: "schedule", studio: { kind: "tomorrow_reminders" } };
	}
	if (key === "clinical-bundles" || key === "diagnosis-packages" || key === "clinical_bundles" || isTruthyParam(params, "clinical-bundles", "clinical_bundles")) {
		return { preferredView: "visit", studio: { kind: "clinical_bundles" } };
	}
	if (
		key === "payroll" ||
		key === "doctor-payroll" ||
		key === "salary" ||
		key === "commissions" ||
		key === "executive-payroll" ||
		key === "doctor-payroll-report" ||
		isTruthyParam(params, "payroll", "doctor-payroll", "doctor_payroll", "executive_payroll")
	) {
		return { preferredView: "finance", studio: { kind: "doctor_payroll" } };
	}
	if (key === "booking" || key === "online-booking" || key === "public-booking" || key === "booking-studio" || isTruthyParam(params, "booking", "online_booking", "public_booking")) {
		return { preferredView: "leads", studio: { kind: "public_booking" } };
	}
	if (key === "demo-case" || key === "demo-cases" || key === "case-viewer" || key === "clinical-cases" || isTruthyParam(params, "demo_case", "demo-case")) {
		return { preferredView: "shift", studio: { kind: "demo_cases" } };
	}

	return null;
}

export function resolveClinicRoute(search = "", hash = ""): ResolvedClinicRoute {
	const { token, params, hashRaw } = extractTokenAndParams(search, hash);

	const studioMatch = resolveStudioOverlay(token, params, hashRaw);
	if (studioMatch) {
		const explicitBase = getOptionalParam(params, "view");
		const baseResolved = explicitBase ? resolvePrimaryViewFromToken(explicitBase.toLowerCase(), params) : null;
		return {
			view: baseResolved?.view ?? studioMatch.preferredView,
			subTab: baseResolved?.subTab ?? getOptionalParam(params, "subTab"),
			entityId: baseResolved?.entityId ?? getOptionalParam(params, "patientId", "patient_id", "id"),
			studio: studioMatch.studio,
		};
	}

	const primaryMatch = resolvePrimaryViewFromToken(token, params);
	if (primaryMatch) {
		return {
			view: primaryMatch.view,
			subTab: primaryMatch.subTab,
			entityId: primaryMatch.entityId,
			studio: null,
		};
	}

	return {
		view: "shift",
		subTab: undefined,
		entityId: getOptionalParam(params, "patientId", "patient_id"),
		studio: null,
	};
}

export function parseTopLevelSurface(location: LocationInput = {}): TopLevelSurface {
	const pathname = location.pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
	const search = location.search ?? (typeof window !== "undefined" ? window.location.search : "");
	const hash = location.hash ?? (typeof window !== "undefined" ? window.location.hash : "");

	const candidateHash = hash.startsWith("#/portal") || hash.startsWith("#/tgapp")
		? hash
		: pathname.startsWith("/portal") || pathname.startsWith("/booking/") || pathname.startsWith("/consent-sign/")
			? `#${pathname}${search}`
			: hash;

	const publicPortal = publicPortalRouteFromHash(candidateHash);
	if (publicPortal) {
		if (publicPortal.kind === "consent-sign") {
			return { surface: "public_portal", kind: "consent_sign", token: publicPortal.token };
		}
		if (publicPortal.kind === "kiosk") {
			return { surface: "aux_display", kind: "kiosk" };
		}
		if (publicPortal.kind === "booking") {
			return {
				surface: "public_portal",
				kind: "booking",
				slug: publicPortal.organizationId ?? undefined,
			};
		}
		if (publicPortal.kind === "cabinet" || publicPortal.kind === "tgapp") {
			return {
				surface: "public_portal",
				kind: "patient_portal",
				slug: publicPortal.organizationId ?? undefined,
			};
		}
		if (publicPortal.kind === "lab-order" || publicPortal.kind === "budget" || publicPortal.kind === "photo-bridge") {
			return {
				surface: "public_portal",
				kind: "patient_portal",
				token: publicPortal.token,
			};
		}
		return {
			surface: "public_portal",
			kind: "patient_portal",
			token: publicPortal.certificateNumber ?? undefined,
		};
	}

	if (pathname.startsWith("/consent-sign/")) {
		const token = pathname.slice("/consent-sign/".length).split("/")[0] || undefined;
		return { surface: "public_portal", kind: "consent_sign", token };
	}

	const { token, params } = extractTokenAndParams(search, hash);
	if (token === "cbct-tuner" || token === "cbct_tuner" || isTruthyParam(params, "cbct_tuner", "cbct-tuner")) {
		return { surface: "aux_display", kind: "cbct_tuner" };
	}
	if (token === "cbct" || token === "cbct-direct" || isTruthyParam(params, "cbct")) {
		return { surface: "aux_display", kind: "cbct_direct" };
	}
	if (
		pathname === "/reception-board" ||
		token === "reception-board" ||
		isTruthyParam(params, "reception-board", "reception_board")
	) {
		return { surface: "aux_display", kind: "reception_board" };
	}
	if (
		pathname === "/patient-kiosk" ||
		token === "patient-kiosk" ||
		isTruthyParam(params, "patient-kiosk", "patient_kiosk")
	) {
		return { surface: "aux_display", kind: "patient_kiosk" };
	}
	if (pathname === "/kiosk" || token === "kiosk" || isTruthyParam(params, "kiosk")) {
		return { surface: "aux_display", kind: "kiosk" };
	}

	return {
		surface: "clinic_workspace",
		route: resolveClinicRoute(search, hash),
	};
}

export function primaryViewToAppView(view: PrimaryWorkspaceView): AppView {
	switch (view) {
		case "treatment_plans":
			return "pipeline";
		case "warehouse":
			return "inventory";
		case "pricelist":
			return "settings";
		default:
			return view;
	}
}

export function appViewToPrimaryView(view: AppView): PrimaryWorkspaceView {
	switch (view) {
		case "pipeline":
			return "treatment_plans";
		case "inventory":
			return "warehouse";
		case "scanner":
			return "imaging";
		case "marketing":
			return "analytics";
		default:
			return view;
	}
}

export function buildClinicHashUrl(route: {
	readonly view: PrimaryWorkspaceView;
	readonly subTab?: string | undefined;
	readonly entityId?: string | undefined;
	readonly studio?: WorkspaceOverlayStudio["kind"] | null | undefined;
}): string {
	const hashBase = route.studio ? `#${route.studio.replace(/_/g, "-")}` : `#${route.view.replace(/_/g, "-")}`;
	const params = new URLSearchParams();
	if (route.studio) params.set("view", route.view);
	if (route.subTab) params.set("subTab", route.subTab);
	if (route.entityId) params.set("patientId", route.entityId);
	const qs = params.toString();
	return qs ? `${hashBase}?${qs}` : hashBase;
}

export function clearStudioFromBrowserUrl(fallbackView: PrimaryWorkspaceView = "shift"): void {
	if (typeof window === "undefined") return;
	const current = resolveClinicRoute(window.location.search, window.location.hash);
	const nextView = current.view || fallbackView;
	const cleanUrl = `${window.location.pathname}#${nextView.replace(/_/g, "-")}`;
	window.history.replaceState(null, "", cleanUrl);
}
