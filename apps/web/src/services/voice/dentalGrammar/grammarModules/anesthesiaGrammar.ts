/**
 * anesthesiaGrammar.ts — Распознавание анестетиков, дозировок, карпул и техники введения
 */

import type { AnesthesiaVoiceItem, AnestheticDrugConfig } from "../types";
import { KNOWN_ANESTHETICS_CONFIG } from "../constants";

export function extractAnesthesiaIntent(text: string): AnesthesiaVoiceItem | null {
	if (!text) return null;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	const hasAnesthesiaWord =
		lower.includes("анестези") || lower.includes("карпул") ||
		lower.includes("укол") || lower.includes("обезболиван") ||
		KNOWN_ANESTHETICS_CONFIG.some((c) => c.patterns.some((p) => lower.includes(p)));

	if (!hasAnesthesiaWord) return null;

	const defaultCfg = KNOWN_ANESTHETICS_CONFIG[0];
	if (!defaultCfg) return null;
	let matchedConfig: AnestheticDrugConfig = defaultCfg;
	let found = false;

	const allRules = [...KNOWN_ANESTHETICS_CONFIG].sort((a, b) => {
		const maxA = Math.max(...a.patterns.map((p) => p.length));
		const maxB = Math.max(...b.patterns.map((p) => p.length));
		return maxB - maxA;
	});

	for (const cfg of allRules) {
		if (cfg.patterns.some((p) => lower.includes(p))) {
			matchedConfig = cfg;
			found = true;
			break;
		}
	}

	if (!found && !lower.includes("анестези")) return null;

	let cartridgeCount = 1;
	if (lower.includes("полторы карпулы") || lower.includes("1.5 карпулы") || lower.includes("1,5 карпулы")) {
		cartridgeCount = 1.5;
	} else if (lower.includes("две с половиной карпулы") || lower.includes("2.5 карпулы") || lower.includes("2,5 карпулы")) {
		cartridgeCount = 2.5;
	} else if (lower.includes("одна карпула") || lower.includes("1 карпула") || lower.includes("одну карпулу")) {
		cartridgeCount = 1;
	} else if (lower.includes("две карпулы") || lower.includes("2 карпулы") || lower.includes("две карпула")) {
		cartridgeCount = 2;
	} else if (lower.includes("три карпулы") || lower.includes("3 карпулы")) {
		cartridgeCount = 3;
	} else if (lower.includes("пол карпулы") || lower.includes("половина карпулы") || lower.includes("0.5 карпулы") || lower.includes("0,5 карпулы")) {
		cartridgeCount = 0.5;
	} else {
		const cartMatch = lower.match(/(\d+[.,]?\d*)\s*(?:карпул|ампул|карп)/);
		if (cartMatch && cartMatch[1]) cartridgeCount = parseFloat(cartMatch[1].replace(",", "."));
	}

	let volumeMl = Number((matchedConfig.defaultVolumeMl * cartridgeCount).toFixed(2));
	const volMatch = lower.match(/(\d+[.,]?\d*)\s*(?:мл|миллилитр)/);
	if (volMatch && volMatch[1]) volumeMl = parseFloat(volMatch[1].replace(",", "."));

	let technique: "infiltration" | "conduction" | "application" | "intraligamentary" = "infiltration";
	if (
		lower.includes("проводников") || lower.includes("мандибулярн") ||
		lower.includes("торасальн") || lower.includes("торусальн") || lower.includes("туберальн")
	) {
		technique = "conduction";
	} else if (lower.includes("аппликацион") || lower.includes("гель") || lower.includes("спрей")) {
		technique = "application";
	} else if (lower.includes("интралигаментарн")) {
		technique = "intraligamentary";
	} else if (lower.includes("инфильтрацион")) {
		technique = "infiltration";
	}

	return {
		drugKey: matchedConfig.drugKey,
		tradeName: matchedConfig.tradeName,
		displayName: `${matchedConfig.tradeName} ${volumeMl} мл (${cartridgeCount} карп.)`,
		volumeMl,
		cartridgeCount,
		technique,
		concentration: matchedConfig.concentration,
		code804n: "A11.07.012",
	};
}
