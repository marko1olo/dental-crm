/**
 * anesthesiaAndConsumablesDictionary.ts — Клинический словарь анестетиков и материалов.
 */

import type { AnesthesiaParsedInfo, ConsumableParsedInfo } from "../types";

export const KNOWN_ANESTHETICS = [
	"ультракаин д-с форте",
	"ультракаин д-с",
	"ультракаин",
	"убистезин форте",
	"убистезин",
	"септанест",
	"артикаин",
	"скандонест",
	"мепивакаин",
	"лидокаин",
	"новокаин",
];

const CONSUMABLE_PATTERNS = [
	{
		pattern: /(?:наложение\s+)?коффердам(?:а)?(?:\s+установлен)?/,
		name: "Коффердам (раббердам)",
		unit: "шт",
	},
	{
		pattern: /оптрагейт|optra\s*gate/,
		name: "Ретрактор OptraGate",
		unit: "шт",
	},
	{
		pattern: /адгезивный\s+протокол|адгезив(?:\s+5\s*поколения)?/,
		name: "Адгезивная система",
		unit: "доза",
	},
	{
		pattern:
			/пломба\s+светового\s+отверждения|светоотверждаемый\s+композит|эстелайт|filtek|gradia/,
		name: "Композит светового отверждения",
		unit: "порция",
	},
	{
		pattern: /гуттаперч(?:а|евые\s+штифты)|силер|ah\s*plus/,
		name: "Гуттаперчевые штифты и эндодонтический силер",
		unit: "комплект",
	},
	{
		pattern: /шовный\s+материал|викрил|кетгут/,
		name: "Шовный материал",
		unit: "нить",
	},
];

function extractAnesthesia(lower: string): AnesthesiaParsedInfo | null {
	const isAnesthesiaMentioned =
		lower.includes("анестези") ||
		KNOWN_ANESTHETICS.some((drug) => lower.includes(drug));

	if (!isAnesthesiaMentioned) return null;

	let drugName = "Артикаинсодержащий анестетик";
	const sortedDrugs = [...KNOWN_ANESTHETICS].sort((a, b) => b.length - a.length);
	for (const drug of sortedDrugs) {
		if (lower.includes(drug)) {
			drugName = drug.charAt(0).toUpperCase() + drug.slice(1);
			break;
		}
	}

	let volumeMl = 1.7;
	const volumeMatch = lower.match(/(\d+[.,]?\d*)\s*(?:мл|миллилитр)/);
	if (volumeMatch && volumeMatch[1]) {
		volumeMl = parseFloat(volumeMatch[1].replace(",", "."));
	}

	let cartridgeCount = 1;
	const cartridgeMatch = lower.match(/(\d+)\s*(?:карпул|ампул|карпулы|ампулы)/);
	if (cartridgeMatch && cartridgeMatch[1]) {
		cartridgeCount = parseInt(cartridgeMatch[1], 10);
	}

	let technique: "infiltration" | "conduction" | "application" = "infiltration";
	if (lower.includes("проводников")) technique = "conduction";
	else if (lower.includes("аппликацион")) technique = "application";
	else if (lower.includes("инфильтрацион")) technique = "infiltration";

	return { drug: drugName, volumeMl, cartridgeCount, technique };
}

export function extractAnesthesiaAndConsumables(text: string): {
	anesthesia: AnesthesiaParsedInfo | null;
	consumables: ConsumableParsedInfo[];
} {
	if (!text) return { anesthesia: null, consumables: [] };
	const lower = text.toLowerCase().replace(/ё/g, "е");
	const anesthesia = extractAnesthesia(lower);
	const consumables: ConsumableParsedInfo[] = [];

	for (const item of CONSUMABLE_PATTERNS) {
		if (item.pattern.test(lower)) {
			consumables.push({ name: item.name, quantity: 1, unit: item.unit });
		}
	}
	return { anesthesia, consumables };
}
