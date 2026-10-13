/**
 * inventoryUnitsSsot.ts — Canonical Single Source of Truth (SSOT) for Dental & Medical Inventory Units.
 *
 * Implements:
 * 1. Statutory Russian nomenclature (ОКЕИ — Общероссийский классификатор единиц измерения).
 * 2. Strict normalization of heterogeneous legacy and Russian strings to canonical unit keys.
 * 3. Exact deterministic conversion multipliers (pack -> carpules, syringe -> grams, bottle -> ml/drops).
 * 4. Human-readable Russian formatting without ugly abbreviations or emojis (Mandates 8d, 8e, 8n).
 */

import { z } from "zod";

export const canonicalInventoryUnitSchema = z.enum([
	"pcs",       // Штука (ОКЕИ 796) — матрицы, иглы, скальпели, валики, пины, боры
	"pack",      // Упаковка (ОКЕИ 778) — пачки перчаток, коробки карпул
	"carpule",   // Карпула стоматологическая 1.7–1.8 мл (ОКЕИ 796 / спец) — артикаин
	"ampoule",   // Ампула (ОКЕИ 796 / спец)
	"syringe_g", // Шприц весовой граммовый — композиты (Filtek, Estelite, Gradia 4г)
	"bottle",    // Флакон (ОКЕИ 796) — бонды, адгезивы, протравочные гели
	"canister",  // Канистра (ОКЕИ 112 / спец) — дезсредства (Сурфаниос 5л, Аламинол)
	"gram",      // Грамм (ОКЕИ 163) — композиты, порошок Air-Flow, слепочные массы
	"ml",        // Миллилитр (ОКЕИ 111) — ирриганты гипохлорита, антисептики, жидкие бонды
	"drop",      // Капля / микродоза — капли адгезива, протравки
	"dose",      // Разовая клиническая доза — унидозы бонда, саше, капсулы
	"pair",      // Пара (ОКЕИ 715) — смотровые / стерильные хирургические перчатки
	"set",       // Комплект (ОКЕИ 839) — операционные наборы, матричные комплекты
	"cm",        // Сантиметр (ОКЕИ 011) — шовный материал, ретракционные нити, шины Ribbond
	"meter",     // Метр (ОКЕИ 006) — рулоны крафт-бумаги, шланги
]);

export type CanonicalInventoryUnit = z.infer<typeof canonicalInventoryUnitSchema>;

export const allRecognizedUnitsSchema = z.union([
	canonicalInventoryUnitSchema,
	z.enum([
		"шт", "шт.", "штука", "упак", "упак.", "упаковка", "уп", "уп.",
		"карпула", "карпул", "карп", "карп.", "ампула", "амп", "амп.",
		"шприц_гр", "шприц", "шприц (г)", "шприц(г)", "фл", "фл.", "флакон",
		"кан", "кан.", "канистра", "г", "г.", "гр", "грамм", "мл", "мл.", "миллилитр",
		"капля", "капли", "доза", "доз", "dose", "пара", "пары", "пар",
		"компл", "компл.", "комплект", "см", "см.", "сантиметр", "метр", "м",
	]),
]);

export type RecognizedInventoryUnit = z.infer<typeof allRecognizedUnitsSchema>;

export interface InventoryUnitMetadata {
	readonly canonicalKey: CanonicalInventoryUnit;
	readonly shortRu: string;
	readonly fullRu: string;
	readonly okeiCode?: string | undefined;
	readonly isFractionalAllowed: boolean;
	readonly defaultDecimals: number;
	readonly standardPackConversionFactor?: number | undefined;
}

export const INVENTORY_UNITS_METADATA: Readonly<Record<CanonicalInventoryUnit, InventoryUnitMetadata>> = {
	pcs: { canonicalKey: "pcs", shortRu: "шт.", fullRu: "Штука", okeiCode: "796", isFractionalAllowed: false, defaultDecimals: 0 },
	pack: { canonicalKey: "pack", shortRu: "упак.", fullRu: "Упаковка", okeiCode: "778", isFractionalAllowed: false, defaultDecimals: 0 },
	carpule: { canonicalKey: "carpule", shortRu: "карп.", fullRu: "Карпула (1.7–1.8 мл)", okeiCode: "796", isFractionalAllowed: true, defaultDecimals: 1, standardPackConversionFactor: 100 },
	ampoule: { canonicalKey: "ampoule", shortRu: "амп.", fullRu: "Ампула", okeiCode: "796", isFractionalAllowed: false, defaultDecimals: 0, standardPackConversionFactor: 10 },
	syringe_g: { canonicalKey: "syringe_g", shortRu: "шприц (г)", fullRu: "Шприц композита (4 г)", okeiCode: "796", isFractionalAllowed: true, defaultDecimals: 2, standardPackConversionFactor: 4.0 },
	bottle: { canonicalKey: "bottle", shortRu: "фл.", fullRu: "Флакон", okeiCode: "796", isFractionalAllowed: false, defaultDecimals: 0, standardPackConversionFactor: 5.0 },
	canister: { canonicalKey: "canister", shortRu: "кан.", fullRu: "Канистра дезсредства", okeiCode: "112", isFractionalAllowed: false, defaultDecimals: 0, standardPackConversionFactor: 5000 },
	gram: { canonicalKey: "gram", shortRu: "г", fullRu: "Грамм", okeiCode: "163", isFractionalAllowed: true, defaultDecimals: 2 },
	ml: { canonicalKey: "ml", shortRu: "мл", fullRu: "Миллилитр", okeiCode: "111", isFractionalAllowed: true, defaultDecimals: 1 },
	drop: { canonicalKey: "drop", shortRu: "кап.", fullRu: "Капля", okeiCode: "796", isFractionalAllowed: false, defaultDecimals: 0 },
	dose: { canonicalKey: "dose", shortRu: "доз", fullRu: "Разовая клиническая доза", okeiCode: "796", isFractionalAllowed: false, defaultDecimals: 0 },
	pair: { canonicalKey: "pair", shortRu: "пар", fullRu: "Пара перчаток", okeiCode: "715", isFractionalAllowed: false, defaultDecimals: 0 },
	set: { canonicalKey: "set", shortRu: "компл.", fullRu: "Комплект", okeiCode: "839", isFractionalAllowed: false, defaultDecimals: 0 },
	cm: { canonicalKey: "cm", shortRu: "см", fullRu: "Сантиметр", okeiCode: "011", isFractionalAllowed: true, defaultDecimals: 1 },
	meter: { canonicalKey: "meter", shortRu: "м", fullRu: "Метр", okeiCode: "006", isFractionalAllowed: true, defaultDecimals: 2 },
};

const ALIAS_TO_CANONICAL_MAP: Readonly<Record<string, CanonicalInventoryUnit>> = {
	"карпула": "carpule", "карпулы": "carpule", "карпул": "carpule", "карп": "carpule", "карп.": "carpule", "carpule": "carpule", "carpules": "carpule", "carp": "carpule",
	"шприц_гр": "syringe_g", "шприц _гр": "syringe_g", "шприц (г)": "syringe_g", "шприц(г)": "syringe_g", "шприц-гр": "syringe_g", "шприц": "syringe_g", "syringe_g": "syringe_g", "syringe": "syringe_g",
	"упак": "pack", "упак.": "pack", "упаковка": "pack", "упаковки": "pack", "уп": "pack", "уп.": "pack", "пак": "pack", "pack": "pack", "package": "pack", "box": "pack",
	"шт": "pcs", "шт.": "pcs", "штука": "pcs", "штуки": "pcs", "штук": "pcs", "pcs": "pcs", "pc": "pcs", "piece": "pcs", "pieces": "pcs", "unit": "pcs",
	"ампула": "ampoule", "ампулы": "ampoule", "ампул": "ampoule", "амп": "ampoule", "амп.": "ampoule", "ampoule": "ampoule", "amp": "ampoule",
	"фл": "bottle", "фл.": "bottle", "флакон": "bottle", "флаконы": "bottle", "бутылка": "bottle", "bottle": "bottle", "vial": "bottle", "tube": "bottle", "тюбик": "bottle",
	"кан": "canister", "кан.": "canister", "канистра": "canister", "канистры": "canister", "canister": "canister",
	"г": "gram", "г.": "gram", "гр": "gram", "гр.": "gram", "грамм": "gram", "граммы": "gram", "gram": "gram", "grams": "gram", "g": "gram",
	"мл": "ml", "мл.": "ml", "миллилитр": "ml", "миллилитры": "ml", "ml": "ml",
	"капля": "drop", "капли": "drop", "капель": "drop", "кап": "drop", "кап.": "drop", "drop": "drop", "drops": "drop",
	"доза": "dose", "дозы": "dose", "доз": "dose", "dose": "dose", "doses": "dose", "унидоза": "dose",
	"пара": "pair", "пары": "pair", "пар": "pair", "pair": "pair", "pairs": "pair",
	"компл": "set", "компл.": "set", "комплект": "set", "комплекты": "set", "набор": "set", "set": "set", "kit": "set",
	"см": "cm", "см.": "cm", "сантиметр": "cm", "сантиметры": "cm", "cm": "cm",
	"м": "meter", "м.": "meter", "метр": "meter", "метры": "meter", "meter": "meter", "m": "meter",
};

/**
 * Normalizes any free-form, legacy, or localized unit string into the canonical unit key.
 * Never throws — defaults to "pcs" when unknown.
 */
export function normalizeInventoryUnit(raw: string | null | undefined): CanonicalInventoryUnit {
	if (!raw) return "pcs";
	const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ");
	if (trimmed in INVENTORY_UNITS_METADATA) {
		return trimmed as CanonicalInventoryUnit;
	}
	return ALIAS_TO_CANONICAL_MAP[trimmed] ?? "pcs";
}

/**
 * Returns clean Russian display name for any unit string (short abbreviation or full title).
 */
export function formatInventoryUnitRu(
	raw: string | null | undefined,
	options: { full?: boolean } = {},
): string {
	const canonical = normalizeInventoryUnit(raw);
	const meta = INVENTORY_UNITS_METADATA[canonical];
	return options.full ? meta.fullRu : meta.shortRu;
}

/**
 * Returns OKEI statutory code for a unit string.
 */
export function getOkeiCodeForUnit(raw: string | null | undefined): string {
	const canonical = normalizeInventoryUnit(raw);
	return INVENTORY_UNITS_METADATA[canonical].okeiCode ?? "796";
}

/**
 * Checks whether fractional quantities (e.g. 0.2, 1.5) are permitted for this unit.
 */
export function isFractionalQuantityAllowed(raw: string | null | undefined): boolean {
	const canonical = normalizeInventoryUnit(raw);
	return INVENTORY_UNITS_METADATA[canonical].isFractionalAllowed;
}

export interface UnitConversionOptions {
	readonly carpulesPerPack?: number | undefined;
	readonly gramsPerSyringe?: number | undefined;
	readonly mlPerBottle?: number | undefined;
	readonly dosesPerMl?: number | undefined;
	readonly mlPerCanister?: number | undefined;
}

/**
 * Deterministically converts material quantities between warehouse packaging and chairside dispensing units.
 */
export function convertInventoryUnit(
	amount: number,
	fromRawUnit: string,
	toRawUnit: string,
	options: UnitConversionOptions = {},
): number {
	if (!Number.isFinite(amount) || amount <= 0) return 0;

	const fromUnit = normalizeInventoryUnit(fromRawUnit);
	const toUnit = normalizeInventoryUnit(toRawUnit);
	if (fromUnit === toUnit) return amount;

	const carpulesPerPack = options.carpulesPerPack ?? 100;
	const gramsPerSyringe = options.gramsPerSyringe ?? 4.0;
	const mlPerBottle = options.mlPerBottle ?? 5.0;
	const dosesPerMl = options.dosesPerMl ?? 20;
	const mlPerCanister = options.mlPerCanister ?? 5000;

	if (fromUnit === "pack" && (toUnit === "carpule" || toUnit === "pcs")) {
		return Number((amount * carpulesPerPack).toFixed(4));
	}
	if ((fromUnit === "carpule" || fromUnit === "pcs") && toUnit === "pack") {
		return Number((amount / carpulesPerPack).toFixed(4));
	}
	if (fromUnit === "syringe_g" && toUnit === "gram") {
		return Number((amount * gramsPerSyringe).toFixed(4));
	}
	if (fromUnit === "gram" && toUnit === "syringe_g") {
		return Number((amount / gramsPerSyringe).toFixed(4));
	}
	if (fromUnit === "carpule" && toUnit === "ml") {
		return Number((amount * 1.7).toFixed(4));
	}
	if (fromUnit === "ml" && toUnit === "carpule") {
		return Number((amount / 1.7).toFixed(4));
	}
	if (fromUnit === "bottle" && toUnit === "ml") {
		return Number((amount * mlPerBottle).toFixed(4));
	}
	if (fromUnit === "ml" && toUnit === "bottle") {
		return Number((amount / mlPerBottle).toFixed(4));
	}
	if (fromUnit === "ml" && (toUnit === "dose" || toUnit === "drop")) {
		return Number((amount * dosesPerMl).toFixed(4));
	}
	if ((fromUnit === "dose" || fromUnit === "drop") && toUnit === "ml") {
		return Number((amount / dosesPerMl).toFixed(4));
	}
	if (fromUnit === "bottle" && (toUnit === "dose" || toUnit === "drop")) {
		return Number((amount * mlPerBottle * dosesPerMl).toFixed(4));
	}
	if ((fromUnit === "dose" || fromUnit === "drop") && toUnit === "bottle") {
		return Number((amount / (mlPerBottle * dosesPerMl)).toFixed(4));
	}
	if (fromUnit === "canister" && toUnit === "ml") {
		return Number((amount * mlPerCanister).toFixed(4));
	}
	if (fromUnit === "ml" && toUnit === "canister") {
		return Number((amount / mlPerCanister).toFixed(4));
	}
	if (fromUnit === "meter" && toUnit === "cm") {
		return Number((amount * 100).toFixed(4));
	}
	if (fromUnit === "cm" && toUnit === "meter") {
		return Number((amount / 100).toFixed(4));
	}

	return amount;
}

/**
 * Formats quantity and unit in clean Russian notation without double dots or weird spaces.
 */
export function formatInventoryQuantityWithUnitRu(
	quantity: number,
	rawUnit: string | null | undefined,
): string {
	const canonical = normalizeInventoryUnit(rawUnit);
	const meta = INVENTORY_UNITS_METADATA[canonical];

	let formattedNumber: string;
	if (meta.isFractionalAllowed) {
		const rounded = Number(quantity.toFixed(meta.defaultDecimals));
		formattedNumber = String(rounded).replace(".", ",");
	} else {
		formattedNumber = String(Math.round(quantity));
	}

	return `${formattedNumber} ${meta.shortRu}`;
}
