/**
 * implantCatalog.ts
 *
 * Real-world Surgical Implant Catalog & Platform Color Coding Engine.
 * Specifications for canonical dental implant systems:
 * Nobel Biocare, Straumann, Osstem, Dentium, and Universal Standard.
 *
 * Free of academic bloat, procedural toys, or imaginary specs (Mandates 8s, 8i, 8k).
 *
 * Provides:
 * 1. Standard diameters (3.0 - 5.5 mm) and lengths (7.0 - 18.0 mm) per manufacturer.
 * 2. Anatomical platform color coding (NP, RP, WP, NC, RC, WN, Mini, Regular, Wide).
 * 3. Surgical guide sleeve parameters (drill sleeve diameter, sleeve height, drill offset).
 * 4. Helper lookup functions and clinical formatters.
 */

export interface ImplantPlatformInfo {
	code: string;
	labelRu: string;
	hexColor: string;
	cssToken: string;
}

export interface ImplantModelSize {
	diameterMm: number;
	lengthsMm: number[];
	platform: ImplantPlatformInfo;
}

export interface ImplantSystemSpec {
	id: string;
	brand: string;
	line: string;
	country: string;
	descriptionRu: string;
	sleeveDiameterMm: number;
	sleeveHeightMm: number;
	drillOffsetDefaultMm: number;
	primaryStabilityDesign: string;
	sizes: ImplantModelSize[];
	diameters: number[];
	lengths: number[];
}

// ---------------------------------------------------------------------------
// 1. CANONICAL SYSTEM CATALOGS
// ---------------------------------------------------------------------------

export const NOBEL_BIOCARE_SYSTEM: ImplantSystemSpec = {
	id: "nobel-active",
	brand: "Nobel Biocare",
	line: "NobelActive",
	country: "Швейцария / Швеция",
	descriptionRu:
		"Конический имплантат с агрессивной резьбой и закругленной апикальной частью. Высокая первичная стабильность в кости любого типа (D1–D4), протокол немедленной нагрузки.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Биконическое тело с конденсирующей обратной резьбой",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [10.0, 11.5, 13.0, 15.0],
			platform: {
				code: "NP",
				labelRu: "Узкая платформа (NP 3.0)",
				hexColor: "#e11d48",
				cssToken: "var(--red, #e11d48)",
			},
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0],
			platform: {
				code: "NP",
				labelRu: "Узкая платформа (NP 3.5)",
				hexColor: "#e11d48",
				cssToken: "var(--red, #e11d48)",
			},
		},
		{
			diameterMm: 4.3,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0, 18.0],
			platform: {
				code: "RP",
				labelRu: "Стандартная платформа (RP 4.3)",
				hexColor: "#f59e0b",
				cssToken: "var(--amber, #f59e0b)",
			},
		},
		{
			diameterMm: 5.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0, 15.0],
			platform: {
				code: "WP",
				labelRu: "Широкая платформа (WP 5.0)",
				hexColor: "#2563eb",
				cssToken: "var(--blue, #2563eb)",
			},
		},
		{
			diameterMm: 5.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "6.0",
				labelRu: "Макси-платформа (WP 5.5)",
				hexColor: "#10b981",
				cssToken: "var(--teal, #10b981)",
			},
		},
	],
	diameters: [3.0, 3.5, 4.3, 5.0, 5.5],
	lengths: [8.5, 10.0, 11.5, 13.0, 15.0, 18.0],
};

export const STRAUMANN_SYSTEM: ImplantSystemSpec = {
	id: "straumann-blx",
	brand: "Straumann",
	line: "Bone Level (BLX / BLT)",
	country: "Швейцария",
	descriptionRu:
		"Премиальный швейцарский имплантат из сплава Roxolid с поверхностью SLActive. Предназначен для немедленной установки и протокола ранней нагрузки.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Анатомический конический контур с самонарезающей резьбой",
	sizes: [
		{
			diameterMm: 3.3,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: {
				code: "SC",
				labelRu: "Small CrossFit (SC 3.3)",
				hexColor: "#eab308",
				cssToken: "var(--amber, #eab308)",
			},
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: {
				code: "NC",
				labelRu: "Narrow CrossFit (NC 3.5)",
				hexColor: "#eab308",
				cssToken: "var(--amber, #eab308)",
			},
		},
		{
			diameterMm: 4.0,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: {
				code: "RC",
				labelRu: "Regular CrossFit (RC 4.0)",
				hexColor: "#a855f7",
				cssToken: "var(--purple, #a855f7)",
			},
		},
		{
			diameterMm: 4.5,
			lengthsMm: [8.0, 10.0, 12.0, 14.0, 16.0],
			platform: {
				code: "RC",
				labelRu: "Regular CrossFit (RC 4.5)",
				hexColor: "#a855f7",
				cssToken: "var(--purple, #a855f7)",
			},
		},
		{
			diameterMm: 5.0,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: {
				code: "WB",
				labelRu: "Wide Base (WB 5.0)",
				hexColor: "#0284c7",
				cssToken: "var(--teal, #0284c7)",
			},
		},
	],
	diameters: [3.3, 3.5, 4.0, 4.5, 5.0],
	lengths: [8.0, 10.0, 12.0, 14.0, 16.0],
};

export const OSSTEM_SYSTEM: ImplantSystemSpec = {
	id: "osstem-ts3",
	brand: "Osstem",
	line: "TS III SA / CA",
	country: "Южная Корея",
	descriptionRu:
		"Самый популярный имплантат в РФ и Азии. Коническое соединение 11° Morse Taper, пескоструйная обработка оксидом алюминия и травление кислотой (SA).",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Штопорная резьба с открытой верхушкой и штопорными бороздками",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "Mini",
				labelRu: "Платформа Mini (Ø3.0)",
				hexColor: "#eab308",
				cssToken: "var(--amber, #eab308)",
			},
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "Mini",
				labelRu: "Платформа Mini (Ø3.5)",
				hexColor: "#eab308",
				cssToken: "var(--amber, #eab308)",
			},
		},
		{
			diameterMm: 4.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "Regular",
				labelRu: "Платформа Regular (Ø4.0)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 4.5,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "Regular",
				labelRu: "Платформа Regular (Ø4.5)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5],
			platform: {
				code: "Wide",
				labelRu: "Платформа Wide (Ø5.0)",
				hexColor: "#2563eb",
				cssToken: "var(--blue, #2563eb)",
			},
		},
	],
	diameters: [3.0, 3.5, 4.0, 4.5, 5.0],
	lengths: [7.0, 8.5, 10.0, 11.5, 13.0],
};

export const DENTIUM_SYSTEM: ImplantSystemSpec = {
	id: "dentium-superline",
	brand: "Dentium",
	line: "SuperLine",
	country: "Южная Корея",
	descriptionRu:
		"Двойная резьба с увеличенным шагом, биологическое коническое соединение. Отличная первичная стабилизация в лунке удаленного зуба и при синус-лифтинге.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Глубокая двойная резьба и выраженная коническая форма",
	sizes: [
		{
			diameterMm: 3.4,
			lengthsMm: [8.0, 10.0, 12.0, 14.0],
			platform: {
				code: "Narrow",
				labelRu: "Узкая платформа (Ø3.4)",
				hexColor: "#f59e0b",
				cssToken: "var(--amber, #f59e0b)",
			},
		},
		{
			diameterMm: 3.8,
			lengthsMm: [7.0, 8.0, 10.0, 12.0, 14.0],
			platform: {
				code: "Regular",
				labelRu: "Стандартная платформа (Ø3.8)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 4.3,
			lengthsMm: [7.0, 8.0, 10.0, 12.0, 14.0],
			platform: {
				code: "Regular",
				labelRu: "Стандартная платформа (Ø4.3)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 4.8,
			lengthsMm: [7.0, 8.0, 10.0, 12.0],
			platform: {
				code: "Regular",
				labelRu: "Стандартная платформа (Ø4.8)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.0, 10.0, 12.0],
			platform: {
				code: "Wide",
				labelRu: "Широкая платформа (Ø5.0)",
				hexColor: "#2563eb",
				cssToken: "var(--blue, #2563eb)",
			},
		},
	],
	diameters: [3.4, 3.8, 4.3, 4.8, 5.0],
	lengths: [7.0, 8.0, 10.0, 12.0, 14.0],
};

export const GENERIC_STANDARD_SYSTEM: ImplantSystemSpec = {
	id: "generic",
	brand: "Generic",
	line: "Standard Cone",
	country: "Международный стандарт",
	descriptionRu:
		"Универсальный эталонный корневидный имплантат с коническим апексом и стандартной размерной сеткой.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Корневидный конус со стандартным шагом резьбы",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "NP",
				labelRu: "Узкая платформа (Ø3.0)",
				hexColor: "#e11d48",
				cssToken: "var(--red, #e11d48)",
			},
		},
		{
			diameterMm: 3.5,
			lengthsMm: [8.0, 10.0, 11.5, 13.0],
			platform: {
				code: "NP",
				labelRu: "Узкая платформа (Ø3.5)",
				hexColor: "#eab308",
				cssToken: "var(--amber, #eab308)",
			},
		},
		{
			diameterMm: 4.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "RP",
				labelRu: "Стандартная платформа (Ø4.0)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 4.5,
			lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
			platform: {
				code: "RP",
				labelRu: "Стандартная платформа (Ø4.5)",
				hexColor: "#16a34a",
				cssToken: "var(--teal, #16a34a)",
			},
		},
		{
			diameterMm: 5.0,
			lengthsMm: [7.0, 8.5, 10.0, 11.5],
			platform: {
				code: "WP",
				labelRu: "Широкая платформа (Ø5.0)",
				hexColor: "#2563eb",
				cssToken: "var(--blue, #2563eb)",
			},
		},
	],
	diameters: [3.0, 3.5, 4.0, 4.5, 5.0],
	lengths: [7.0, 8.0, 8.5, 10.0, 11.5, 13.0],
};

export const ASTRA_TECH_SYSTEM: ImplantSystemSpec = {
	id: "astra-tech-ev",
	brand: "Astra Tech",
	line: "OsseoSpeed EV",
	country: "Швеция (Dentsply Sirona)",
	descriptionRu:
		"Премиальный конический имплантат с биоактивной наноструктурированной поверхностью OsseoSpeed, MicroThread на шейке и Conical Seal Design для сохранения маргинальной кости.",
	sleeveDiameterMm: 5.0,
	sleeveHeightMm: 5.0,
	drillOffsetDefaultMm: 9.0,
	primaryStabilityDesign: "Апикальная резьба с глубоким режущим желобком и коническим соединением EV",
	sizes: [
		{
			diameterMm: 3.0,
			lengthsMm: [8.0, 9.0, 11.0, 13.0, 15.0],
			platform: {
				code: "Green",
				labelRu: "Узкая платформа (Ø3.0)",
				hexColor: "#10b981",
				cssToken: "var(--emerald, #10b981)",
			},
		},
		{
			diameterMm: 3.6,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: {
				code: "Purple",
				labelRu: "Стандартная платформа (Ø3.6)",
				hexColor: "#8b5cf6",
				cssToken: "var(--purple, #8b5cf6)",
			},
		},
		{
			diameterMm: 4.2,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: {
				code: "Yellow",
				labelRu: "Стандартная платформа (Ø4.2)",
				hexColor: "#f59e0b",
				cssToken: "var(--amber, #f59e0b)",
			},
		},
		{
			diameterMm: 4.8,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
			platform: {
				code: "Blue",
				labelRu: "Широкая платформа (Ø4.8)",
				hexColor: "#2563eb",
				cssToken: "var(--blue, #2563eb)",
			},
		},
		{
			diameterMm: 5.4,
			lengthsMm: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0],
			platform: {
				code: "Brown",
				labelRu: "Широкая платформа (Ø5.4)",
				hexColor: "#92400e",
				cssToken: "var(--amber-900, #92400e)",
			},
		},
	],
	diameters: [3.0, 3.6, 4.2, 4.8, 5.4],
	lengths: [6.0, 8.0, 9.0, 11.0, 13.0, 15.0, 17.0],
};

export const CANONICAL_IMPLANT_SYSTEMS: ImplantSystemSpec[] = [
	OSSTEM_SYSTEM,
	STRAUMANN_SYSTEM,
	NOBEL_BIOCARE_SYSTEM,
	DENTIUM_SYSTEM,
	ASTRA_TECH_SYSTEM,
	GENERIC_STANDARD_SYSTEM,
];

export const DENTAL_IMPLANT_BRANDS = CANONICAL_IMPLANT_SYSTEMS;

// ---------------------------------------------------------------------------
// 2. LOOKUP AND SELECTION HELPERS
// ---------------------------------------------------------------------------

/**
 * Normalizes system identifier string supporting various aliases:
 * "osstem" | "osstem-ts3"
 * "straumann" | "straumann-blx"
 * "nobel" | "nobel_biocare" | "nobel-active"
 * "dentium" | "dentium-superline"
 * "astra" | "astra_tech" | "astra-tech-ev"
 */
export function normalizeSystemId(rawId: string | undefined | null): string {
	if (!rawId) return "osstem-ts3";
	const lower = rawId.toLowerCase().trim();
	if (lower.includes("osstem")) return "osstem-ts3";
	if (lower.includes("straumann")) return "straumann-blx";
	if (lower.includes("nobel")) return "nobel-active";
	if (lower.includes("dentium")) return "dentium-superline";
	if (lower.includes("astra")) return "astra-tech-ev";
	return "generic";
}

/**
 * Retrieves the full specification of an implant system by ID or brand name.
 */
export function getImplantSystem(id: string | undefined | null): ImplantSystemSpec {
	const normalized = normalizeSystemId(id);
	return (
		CANONICAL_IMPLANT_SYSTEMS.find((s) => s.id === normalized) ??
		OSSTEM_SYSTEM
	);
}

/**
 * Returns all available canonical implant systems.
 */
export function getAllImplantSystems(): ImplantSystemSpec[] {
	return CANONICAL_IMPLANT_SYSTEMS;
}

/**
 * Returns list of available diameters for a given implant system.
 */
export function getAvailableDiameters(systemId: string | undefined | null): number[] {
	return getImplantSystem(systemId).diameters;
}

/**
 * Returns list of available lengths for a given implant system and diameter.
 */
export function getAvailableLengths(
	systemId: string | undefined | null,
	diameterMm?: number,
): number[] {
	const sys = getImplantSystem(systemId);
	if (diameterMm !== undefined) {
		const size = sys.sizes.find(
			(s) => Math.abs(s.diameterMm - diameterMm) < 0.1,
		);
		if (size) return size.lengthsMm;
	}
	return sys.lengths;
}

/**
 * Retrieves the platform color, code, and label for an implant system and diameter.
 */
export function getPlatformForDiameter(
	systemId: string | undefined | null,
	diameterMm: number,
): ImplantPlatformInfo {
	const sys = getImplantSystem(systemId);
	let closestSize = sys.sizes[0]!;
	let minDiff = Infinity;

	for (const size of sys.sizes) {
		const diff = Math.abs(size.diameterMm - diameterMm);
		if (diff < minDiff) {
			minDiff = diff;
			closestSize = size;
		}
	}

	return closestSize.platform;
}

/**
 * Validates whether the given diameter and length exist in the manufacturer catalog,
 * returning the closest valid manufacturer dimension if invalid.
 */
export function validateImplantDimensions(
	systemId: string | undefined | null,
	diameterMm: number,
	lengthMm: number,
): {
	valid: boolean;
	normalizedDiameter: number;
	normalizedLength: number;
	platform: ImplantPlatformInfo;
} {
	const sys = getImplantSystem(systemId);
	const availDiameters = sys.diameters;

	// Find closest diameter
	let normDiameter = availDiameters[0]!;
	let minDDiff = Infinity;
	for (const d of availDiameters) {
		const diff = Math.abs(d - diameterMm);
		if (diff < minDDiff) {
			minDDiff = diff;
			normDiameter = d;
		}
	}

	const availLengths = getAvailableLengths(sys.id, normDiameter);
	let normLength = availLengths[0]!;
	let minLDiff = Infinity;
	for (const l of availLengths) {
		const diff = Math.abs(l - lengthMm);
		if (diff < minLDiff) {
			minLDiff = diff;
			normLength = l;
		}
	}

	const exactMatch = minDDiff < 0.05 && minLDiff < 0.05;
	const platform = getPlatformForDiameter(sys.id, normDiameter);

	return {
		valid: exactMatch,
		normalizedDiameter: normDiameter,
		normalizedLength: normLength,
		platform,
	};
}

/**
 * Formats a clean clinical implant specification label for surgical acts and cards.
 * Example: "Osstem TS III • Ø4.0 × 10.0 мм (Regular)"
 */
export function formatImplantSpecRu(
	systemId: string | undefined | null,
	diameterMm: number,
	lengthMm: number,
): string {
	const sys = getImplantSystem(systemId);
	const platform = getPlatformForDiameter(sys.id, diameterMm);
	return `${sys.brand} ${sys.line} • Ø${diameterMm.toFixed(1)} × ${lengthMm.toFixed(1)} мм (${platform.code})`;
}
