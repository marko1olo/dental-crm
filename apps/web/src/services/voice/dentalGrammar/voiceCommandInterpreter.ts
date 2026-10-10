/**
 * voiceCommandInterpreter.ts — Layer 2: Интерпретатор составных высказываний у кресла и генератор действий для ЭМК/зубной формулы
 */

import type { OdontogramQuadrantId } from "../../../components/odontogram/ToothChart";
import type {
	AnesthesiaVoiceItem,
	Procedure804nVoiceItem,
	SoapSectionsVoiceNote,
	EndoCanalVoiceItem,
	PerioToothVoiceItem,
	CephLandmarkVoiceItem,
	DentalVoiceIntent,
	ToothUpdateVoiceItem,
	AnestheticDrugConfig,
} from "./types";
import {
	KNOWN_ANESTHETICS_CONFIG,
	KNOWN_MANIPULATIONS_804N,
	SOAP_HEADERS,
} from "./constants";
import { extractFdiTeethNumbers } from "./toothNumberParser";
import { extractToothSurfaces } from "./surfaceExtractor";
import { matchDiagnosisRule } from "./pathologyClassifier";

export function extractAnesthesiaIntent(text: string): AnesthesiaVoiceItem | null {
	if (!text) return null;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	const hasAnesthesiaWord =
		lower.includes("анестези") ||
		lower.includes("карпул") ||
		lower.includes("укол") ||
		lower.includes("обезболиван") ||
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

	if (!found && !lower.includes("анестези")) {
		return null;
	}

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
		if (cartMatch && cartMatch[1]) {
			cartridgeCount = parseFloat(cartMatch[1].replace(",", "."));
		}
	}

	let volumeMl = Number((matchedConfig.defaultVolumeMl * cartridgeCount).toFixed(2));
	const volMatch = lower.match(/(\d+[.,]?\d*)\s*(?:мл|миллилитр)/);
	if (volMatch && volMatch[1]) {
		volumeMl = parseFloat(volMatch[1].replace(",", "."));
	}

	let technique: "infiltration" | "conduction" | "application" | "intraligamentary" = "infiltration";
	if (
		lower.includes("проводников") ||
		lower.includes("мандибулярн") ||
		lower.includes("торасальн") ||
		lower.includes("торусальн") ||
		lower.includes("туберальн")
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

export function extractProcedures804n(text: string, primaryTooth?: number): Procedure804nVoiceItem[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const results: Procedure804nVoiceItem[] = [];

	let shade: string | undefined;
	if (norm.includes("а два") || norm.includes("а2") || norm.includes("a2")) shade = "A2";
	else if (norm.includes("а три") || norm.includes("а3") || norm.includes("a3")) shade = "A3";
	else if (norm.includes("а один") || norm.includes("а1") || norm.includes("a1")) shade = "A1";
	else if (norm.includes("б два") || norm.includes("b2")) shade = "B2";

	for (const rule of KNOWN_MANIPULATIONS_804N) {
		const matched = rule.patterns.some((p) => norm.includes(p));
		if (matched) {
			let name = rule.name;
			if (shade && rule.category === "therapy") {
				name += ` (оттенок ${shade})`;
			}
			results.push({
				code804n: rule.code804n,
				name,
				category: rule.category,
				quantity: 1,
				toothNumber: primaryTooth,
				priceRub: rule.priceRub,
				shade,
			});
		}
	}

	return results;
}

export function extractSoapNotes(text: string): SoapSectionsVoiceNote {
	const result: Record<string, string> = {};
	if (!text) return result;

	const norm = text.trim();
	const lower = norm.toLowerCase().replace(/ё/g, "е");

	const markersWithSection: Array<{ section: keyof SoapSectionsVoiceNote; marker: string }> = [];
	for (const [sec, markers] of Object.entries(SOAP_HEADERS)) {
		for (const marker of markers) {
			markersWithSection.push({ section: sec as keyof SoapSectionsVoiceNote, marker });
		}
	}
	markersWithSection.sort((a, b) => b.marker.length - a.marker.length);

	const spans: Array<{ section: keyof SoapSectionsVoiceNote; index: number; markerLength: number }> = [];

	for (const { section, marker } of markersWithSection) {
		let pos = lower.indexOf(marker);
		while (pos !== -1) {
			const overlaps = spans.some((s) => pos >= s.index && pos < s.index + s.markerLength);
			if (!overlaps) {
				spans.push({ section, index: pos, markerLength: marker.length });
			}
			pos = lower.indexOf(marker, pos + 1);
		}
	}

	spans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < spans.length; i++) {
		const current = spans[i];
		if (!current) continue;
		const start = current.index + current.markerLength;
		const next = spans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm.slice(start, end).trim();
		content = content.replace(/^[:\-–—\s]+/, "").replace(/[.\s]+$/, "").trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}

/**
 * Распознавание команд переключения квадранта (Q1, Q2, Q3, Q4, all)
 */
export function extractQuadrantIntent(text: string): OdontogramQuadrantId | null {
	if (!text) return null;
	const lower = text.toLowerCase().trim();

	if (
		lower.includes("все зубы") ||
		lower.includes("вся челюсть") ||
		lower.includes("все квадранты") ||
		lower.includes("полная формула") ||
		lower.includes("вся формула") ||
		lower.includes("общий вид") ||
		lower.includes("сброс квадрант") ||
		lower.includes("сброс") ||
		lower.includes("показать все") ||
		lower.includes("вся дуга")
	) {
		return "all";
	}

	if (
		lower.includes("первый квадрант") ||
		lower.includes("1-й квадрант") ||
		lower.includes("1 квадрант") ||
		lower.includes("квадрант 1") ||
		lower.includes("верх право") ||
		lower.includes("верхний правый") ||
		lower.includes("верхняя челюсть справа") ||
		lower.includes("вверх справа") ||
		/(?:^|[^a-zа-я0-9])(?:q1|к1|q-1|к-1)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q1";
	}
	if (
		lower.includes("второй квадрант") ||
		lower.includes("2-й квадрант") ||
		lower.includes("2 квадрант") ||
		lower.includes("квадрант 2") ||
		lower.includes("верх лево") ||
		lower.includes("верхний левый") ||
		lower.includes("верхняя челюсть слева") ||
		lower.includes("вверх слева") ||
		/(?:^|[^a-zа-я0-9])(?:q2|к2|q-2|к-2)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q2";
	}
	if (
		lower.includes("третий квадрант") ||
		lower.includes("3-й квадрант") ||
		lower.includes("3 квадрант") ||
		lower.includes("квадрант 3") ||
		lower.includes("низ лево") ||
		lower.includes("нижний левый") ||
		lower.includes("нижняя челюсть слева") ||
		lower.includes("снизу слева") ||
		/(?:^|[^a-zа-я0-9])(?:q3|к3|q-3|к-3)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q3";
	}
	if (
		lower.includes("четвертый квадрант") ||
		lower.includes("4-й квадрант") ||
		lower.includes("4 квадрант") ||
		lower.includes("квадрант 4") ||
		lower.includes("низ право") ||
		lower.includes("нижний правый") ||
		lower.includes("нижняя челюсть справа") ||
		lower.includes("снизу справа") ||
		/(?:^|[^a-zа-я0-9])(?:q4|к4|q-4|к-4)(?:$|[^a-zа-я0-9])/i.test(lower)
	) {
		return "Q4";
	}
	return null;
}

/**
 * Распознавание замеров эндодонтических каналов (WL, MAF, конусность, силер)
 */
export function extractEndoCanalMeasurements(text: string): EndoCanalVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е");
	if (!/(?:канал|упор|стоп|маф|maf|конус|силер|апекс|working\s*length|wl)/i.test(lower)) {
		return [];
	}
	const results: EndoCanalVoiceItem[] = [];

	const canalPatterns: Array<{
		name: string;
		aliases: string[];
	}> = [
		{ name: "MB1", aliases: ["мв1", "mb1", "медиально-щечный 1", "медиально щечный первый", "медиально щечный 1", "медиальный 1", "мб1", "мб 1"] },
		{ name: "MB2", aliases: ["мв2", "mb2", "медиально-щечный 2", "медиально щечный второй", "медиально щечный 2", "медиальный 2", "мб2", "мб 2"] },
		{ name: "MB", aliases: ["мв", "mb", "медиально-щечный", "медиально щечный", "медиальный щечный", "мезиально-щечный", "мб", "медиальный", "медиального", "mesial"] },
		{ name: "DB", aliases: ["дв", "db", "дистально-щечный", "дистально щечный", "дистальный щечный", "дб"] },
		{ name: "ML", aliases: ["мл", "ml", "медиально-язычный", "медиально-небный"] },
		{ name: "DL", aliases: ["дл", "dl", "дистально-язычный", "дистально-небный"] },
		{ name: "P", aliases: ["небный", "небного", "palatal", "палатальный"] },
		{ name: "D", aliases: ["дистальный", "дистального", "distal"] },
		{ name: "L", aliases: ["язычный", "язычного", "lingual"] },
	];

	for (const pattern of canalPatterns) {
		let matched = false;
		for (const alias of pattern.aliases) {
			const aliasRegex = new RegExp(`(?:канал\\s*)?(?:^|[^a-zа-я0-9])${alias}(?:$|[^a-zа-я0-9])`, "i");
			if (aliasRegex.test(lower)) {
				matched = true;
				break;
			}
		}

		if (matched) {
			let workingLengthMm: number | undefined;
			const bodyAfterAlias = lower.replace(
				/(?:канал\s*)?(?:mb1|mb2|mb|db|ml|dl|p|d|m|l|мв1|мв2|мв|дв|мл|дл|мб1|мб2|мб|медиально[-\s]?щечн\w*\s*[12]?|дистально[-\s]?щечн\w*|медиально[-\s]?язычн\w*|дистально[-\s]?язычн\w*|небн\w*|дистальн\w*|медиальн\w*|язычн\w*)/i,
				"",
			);
			const lenMatch = bodyAfterAlias.match(/(?:длина|рабочая длина|рл)?\s*(\d+(?:[,.]\d+)?)\s*(?:мм|миллиметр[а-я]*)?/i);
			if (lenMatch && lenMatch[1]) {
				workingLengthMm = Number.parseFloat(lenMatch[1].replace(",", "."));
			} else if (lower.includes("двадцать один")) workingLengthMm = 21;
			else if (lower.includes("двадцать два")) workingLengthMm = 22;
			else if (lower.includes("двадцать три")) workingLengthMm = 23;
			else if (lower.includes("двадцать четыре")) workingLengthMm = 24;
			else if (lower.includes("двадцать пять")) workingLengthMm = 25;
			else if (lower.includes("двадцать")) workingLengthMm = 20;

			let masterApicalFile: string | undefined;
			const mafMatch = lower.match(/(?:маф|maf|упор|стоп|файл|инструмент)\s*(?:iso\s*)?([a-z0-9#]+|двадцать\s*пять|двадцать|тридцать\s*пять|тридцать|сорок)/i);
			if (mafMatch && mafMatch[1]) {
				const rawMaf = mafMatch[1].trim();
				if (/^\d+$/.test(rawMaf)) masterApicalFile = `ISO ${rawMaf}`;
				else if (rawMaf.includes("двадцать пять")) masterApicalFile = "ISO 25";
				else if (rawMaf.includes("тридцать пять")) masterApicalFile = "ISO 35";
				else if (rawMaf.includes("тридцать")) masterApicalFile = "ISO 30";
				else if (rawMaf.includes("двадцать")) masterApicalFile = "ISO 20";
				else if (rawMaf.includes("сорок")) masterApicalFile = "ISO 40";
				else masterApicalFile = rawMaf;
			}

			let taper: string | undefined;
			const taperMatch = lower.match(/(?:конус|конусность)\s*([.\d]+|шесть|четыре|два)/i);
			if (taperMatch && taperMatch[1]) {
				const rawT = taperMatch[1].trim();
				if (rawT === "06" || rawT === "6" || rawT === "шесть" || rawT === ".06") taper = ".06 (Конусность 6%)";
				else if (rawT === "04" || rawT === "4" || rawT === "четыре" || rawT === ".04") taper = ".04 (Конусность 4%)";
				else if (rawT === "02" || rawT === "2" || rawT === "два" || rawT === ".02") taper = ".02 (Стандартная 2%)";
				else taper = rawT;
			}

			let sealer: string | undefined;
			const sealerMatch = lower.match(/(?:силер|паста)\s*([a-zа-я0-9\s+]+)/i);
			if (sealerMatch && sealerMatch[1]) {
				const rawS = sealerMatch[1].trim();
				if (/аш\s*плюс|ah\s*plus/i.test(rawS)) sealer = "AH Plus";
				else if (/биорут|bioroot/i.test(rawS)) sealer = "BioRoot RCS";
				else if (/тоталфилл|totalfill/i.test(rawS)) sealer = "TotalFill BC";
				else sealer = rawS;
			}

			results.push({
				canalName: pattern.name,
				...(workingLengthMm !== undefined ? { workingLengthMm } : {}),
				...(masterApicalFile ? { masterApicalFile } : {}),
				...(taper ? { taper } : {}),
				...(sealer ? { sealer } : {}),
			});
			break;
		}
	}

	return results;
}

/**
 * Распознавание замеров пародонтологической карты (глубина карманов, BOP, налет, подвижность)
 */
export function extractPerioVoiceMeasurements(text: string): PerioToothVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е");
	if (!/(?:карман|глубин|пародонт|перио|bop|боп|кровоточив|кровит|рецесси|подвижност|фуркаци|удален|отсутствует|адентия)/i.test(lower)) {
		return [];
	}
	const teeth = extractFdiTeethNumbers(text);
	if (teeth.length === 0) return [];

	const DIGIT_WORDS_MAP: Record<string, number> = {
		"один": 1, "единица": 1, "первая": 1, "первый": 1, "1": 1,
		"два": 2, "двойка": 2, "вторая": 2, "второй": 2, "2": 2,
		"три": 3, "тройка": 3, "третья": 3, "третий": 3, "3": 3,
		"четыре": 4, "четверка": 4, "четвертая": 4, "четвертый": 4, "4": 4,
		"пять": 5, "пятерка": 5, "пятая": 5, "пятый": 5, "5": 5,
		"шесть": 6, "шестерка": 6, "шестая": 6, "шестой": 6, "6": 6,
		"семь": 7, "семерка": 7, "седьмая": 7, "седьмой": 7, "7": 7,
		"восемь": 8, "восьмерка": 8, "восьмая": 8, "восьмой": 8, "8": 8,
		"девять": 9, "девятка": 9, "девятая": 9, "девятый": 9, "9": 9,
		"десять": 10, "десятка": 10, "10": 10,
	};

	function parseDepthNumber(s: string): number | undefined {
		const trimmed = s.trim().toLowerCase();
		if (/^\d{1,2}$/.test(trimmed)) {
			const n = Number.parseInt(trimmed, 10);
			return n >= 0 && n <= 15 ? n : undefined;
		}
		if (DIGIT_WORDS_MAP[trimmed] !== undefined) {
			return DIGIT_WORDS_MAP[trimmed];
		}
		return undefined;
	}

	const results: PerioToothVoiceItem[] = [];

	for (const toothNum of teeth) {
		let mbDepth: number | undefined;
		let bDepth: number | undefined;
		let dbDepth: number | undefined;
		let mlDepth: number | undefined;
		let lDepth: number | undefined;
		let dlDepth: number | undefined;

		const mbMatch = lower.match(/(?:медиально-щечн[а-я]*|мезиально-щечн[а-я]*|мб|mb|медиально|медиальный)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (mbMatch && mbMatch[1]) mbDepth = parseDepthNumber(mbMatch[1]);

		const bMatch = lower.match(/(?:щечн[а-я]*|вестибулярн[а-я]*|щечно)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (bMatch && bMatch[1]) bDepth = parseDepthNumber(bMatch[1]);

		const dbMatch = lower.match(/(?:дистально-щечн[а-я]*|дистально|дб|db|дистальный)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (dbMatch && dbMatch[1]) dbDepth = parseDepthNumber(dbMatch[1]);

		const mlMatch = lower.match(/(?:медиально-язычн[а-я]*|медиально-небн[а-я]*|мл|ml)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (mlMatch && mlMatch[1]) mlDepth = parseDepthNumber(mlMatch[1]);

		const lMatch = lower.match(/(?:язычн[а-я]*|небн[а-я]*|небно|язычно)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (lMatch && lMatch[1]) lDepth = parseDepthNumber(lMatch[1]);

		const dlMatch = lower.match(/(?:дистально-язычн[а-я]*|дистально-небн[а-я]*|дл|dl)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (dlMatch && dlMatch[1]) dlDepth = parseDepthNumber(dlMatch[1]);

		const seqMatch = lower.match(/(?:карман[а-я]*|глубин[а-я]*|зондирование)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (seqMatch && seqMatch[1] && seqMatch[2] && seqMatch[3]) {
			mbDepth = parseDepthNumber(seqMatch[1]);
			bDepth = parseDepthNumber(seqMatch[2]);
			dbDepth = parseDepthNumber(seqMatch[3]);
		}

		let recessionMm: number | undefined;
		const recMatch = lower.match(/рецесси[а-я]*\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь)/i);
		if (recMatch && recMatch[1]) {
			recessionMm = parseDepthNumber(recMatch[1]);
		}

		const hasBop = lower.includes("кровоточивость") || lower.includes("кровь") || lower.includes("bop") || lower.includes("плюс") || lower.includes("кровит");
		const hasPlaque = lower.includes("налет") || lower.includes("бляшка") || lower.includes("plaque");
		const hasSuppuration = lower.includes("гной") || lower.includes("экссудация") || lower.includes("нагноение");
		const hasCalculus = lower.includes("камень") || lower.includes("зубной камень");
		const isMissing = lower.includes("удален") || lower.includes("отсутствует") || lower.includes("адентия");

		let mobility: number | undefined;
		const mobMatch = lower.match(/подвижност[а-я]*\s*(?:степен[а-я]*|ст\b|)?\s*(\d+|один|два|три|первая|вторая|третья|i{1,3})/i);
		if (mobMatch && mobMatch[1]) {
			const m = parseDepthNumber(mobMatch[1]);
			if (m !== undefined && m >= 1 && m <= 3) mobility = m;
			else if (mobMatch[1].includes("i")) mobility = mobMatch[1].length;
		}

		let furcation: number | undefined;
		const furcMatch = lower.match(/фуркаци[а-я]*\s*(?:класс[а-я]*|ст\b|)?\s*(\d+|один|два|три|первая|вторая|третья|i{1,3})/i);
		if (furcMatch && furcMatch[1]) {
			const f = parseDepthNumber(furcMatch[1]);
			if (f !== undefined && f >= 1 && f <= 3) furcation = f;
		}

		const hasAnyMeasure =
			mbDepth !== undefined ||
			bDepth !== undefined ||
			dbDepth !== undefined ||
			mlDepth !== undefined ||
			lDepth !== undefined ||
			dlDepth !== undefined ||
			recessionMm !== undefined ||
			hasBop ||
			hasPlaque ||
			hasSuppuration ||
			hasCalculus ||
			mobility !== undefined ||
			furcation !== undefined ||
			isMissing;

		if (hasAnyMeasure) {
			results.push({
				toothNumber: toothNum,
				...(mbDepth !== undefined || recessionMm !== undefined ? { mesioBuccal: { probingDepthMm: mbDepth ?? 0, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(bDepth !== undefined ? { midBuccal: { probingDepthMm: bDepth, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(dbDepth !== undefined ? { distoBuccal: { probingDepthMm: dbDepth, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(mlDepth !== undefined ? { mesioLingual: { probingDepthMm: mlDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(lDepth !== undefined ? { midLingual: { probingDepthMm: lDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(dlDepth !== undefined ? { distoLingual: { probingDepthMm: dlDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(mobility !== undefined ? { mobility } : {}),
				...(furcation !== undefined ? { furcation } : {}),
				...(hasBop ? { bleedingOnProbing: true } : {}),
				...(isMissing ? { isMissing: true } : {}),
			});
		}
	}

	return results;
}

function splitSpeechClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 1);
}

/**
 * Распознавание голосовых команд разметки ТРГ/цефалометрических ориентиров
 * (S, N, A, B, Pog, Gn, Me, Go, Or, Po, ANS, PNS, U1t, U1a, L1t, L1a)
 */
export function extractCephLandmarksVoiceIntent(text: string): CephLandmarkVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е").trim();

	const isCephContext =
		lower.includes("точка") ||
		lower.includes("ориентир") ||
		lower.includes("трг") ||
		lower.includes("цефалометр") ||
		lower.includes("штайнер") ||
		lower.includes("твид") ||
		lower.includes("назион") ||
		lower.includes("сэлла") ||
		lower.includes("селла") ||
		lower.includes("седло") ||
		lower.includes("субспинале") ||
		lower.includes("супраментале") ||
		lower.includes("погонион") ||
		lower.includes("гнатион") ||
		lower.includes("ментон") ||
		lower.includes("гонион") ||
		lower.includes("орбитале") ||
		lower.includes("порион");

	if (!isCephContext) return [];

	const results: CephLandmarkVoiceItem[] = [];

	const LANDMARK_VOICE_RULES: Array<{
		key: string;
		nameRu: string;
		aliases: string[];
	}> = [
		{ key: "S", nameRu: "Sella (Седло)", aliases: ["сэлла", "селла", "седло", "турецкое седло", "точка s", "точка с", "точка эс"] },
		{ key: "N", nameRu: "Nasion (Назион)", aliases: ["назион", "насион", "nasion", "носолобный шов", "точка n", "точка н", "точка эн"] },
		{ key: "A", nameRu: "Точка A (Субспинале)", aliases: ["субспинале", "subspinale", "точка а", "точка a", "апикальный базис верхней челюсти", "базис вч"] },
		{ key: "B", nameRu: "Точка B (Супраментале)", aliases: ["супраментале", "supramentale", "точка б", "точка в", "точка b", "апикальный базис нижней челюсти", "базис нч"] },
		{ key: "Pog", nameRu: "Pogonion (Погонион)", aliases: ["погонион", "pogonion", "точка погонион", "выступ подбородка"] },
		{ key: "Gn", nameRu: "Gnathion (Гнатион)", aliases: ["гнатион", "gnathion", "точка гнатион"] },
		{ key: "Me", nameRu: "Menton (Ментон)", aliases: ["ментон", "menton", "точка ментон", "низ симфиза"] },
		{ key: "Go", nameRu: "Gonion (Гонион)", aliases: ["гонион", "gonion", "точка гонион", "угол нижней челюсти", "угол челюсти"] },
		{ key: "Or", nameRu: "Orbitale (Орбитале)", aliases: ["орбитале", "orbitale", "точка орбитале", "край глазницы"] },
		{ key: "Po", nameRu: "Porion (Порион)", aliases: ["порион", "porion", "точка порион", "слуховой проход"] },
		{ key: "ANS", nameRu: "ANS (Передняя носовая ость)", aliases: ["ans", "пнс", "передняя носовая ость", "точка ans"] },
		{ key: "PNS", nameRu: "PNS (Задняя носовая ость)", aliases: ["pns", "знс", "задняя носовая ость", "точка pns"] },
		{ key: "U1t", nameRu: "U1 Tip (Край верхнего резца)", aliases: ["u1 tip", "u1tip", "режущий край верхнего резца", "край верхнего резца", "коронка верхнего резца"] },
		{ key: "U1a", nameRu: "U1 Apex (Корень верхнего резца)", aliases: ["u1 apex", "u1apex", "верхушка верхнего резца", "корень верхнего резца", "апекс верхнего резца"] },
		{ key: "L1t", nameRu: "L1 Tip (Край нижнего резца)", aliases: ["l1 tip", "l1tip", "режущий край нижнего резца", "край нижнего резца", "коронка нижнего резца"] },
		{ key: "L1a", nameRu: "L1 Apex (Корень нижнего резца)", aliases: ["l1 apex", "l1apex", "верхушка нижнего резца", "корень нижнего резца", "апекс нижнего резца"] },
	];

	for (const rule of LANDMARK_VOICE_RULES) {
		for (const alias of rule.aliases) {
			const regex = new RegExp(`(?:^|[^a-zа-я0-9])${alias}(?:$|[^a-zа-я0-9])`, "i");
			if (regex.test(lower)) {
				results.push({
					landmarkKey: rule.key,
					landmarkNameRu: rule.nameRu,
					action: lower.includes("сброс") || lower.includes("удалить") ? "clear" : "select",
				});
				break;
			}
		}
	}

	return results;
}

let voiceIntentSeq = 0;

export function parseDentalVoiceSpeech(rawTranscript: string): DentalVoiceIntent {
	const transcript = (rawTranscript || "").trim();
	const now = new Date().toISOString();
	const intentId = `dvi_${Date.now()}_${++voiceIntentSeq}`;

	if (!transcript) {
		return {
			id: intentId,
			timestamp: now,
			rawTranscript: "",
			type: "full_visit_batch",
			confidence: 0,
			confidenceLevel: "review",
			teethUpdates: [],
			detectedTeeth: [],
			anesthesia: null,
			procedures804n: [],
			soapNotes: {},
			summary: "Речь не распознана",
		};
	}

	const allTeeth = extractFdiTeethNumbers(transcript);
	const anesthesia = extractAnesthesiaIntent(transcript);
	const primaryTooth = allTeeth[0];
	const procedures804n = extractProcedures804n(transcript, primaryTooth);
	const soapNotes = extractSoapNotes(transcript);

	const clauses = splitSpeechClauses(transcript);
	const teethUpdates: ToothUpdateVoiceItem[] = [];
	const seenTeeth = new Set<number>();

	for (const clause of clauses) {
		const clauseTeeth = extractFdiTeethNumbers(clause);
		const diagRule = matchDiagnosisRule(clause);
		const surfaces = extractToothSurfaces(clause);

		if (clauseTeeth.length > 0 && diagRule) {
			for (const toothNum of clauseTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: diagRule.toothChartState,
						icd10Code: diagRule.code,
						icd10Title: diagRule.title,
						clinicalStatus: diagRule.status,
						surfaces: surfaces.length > 0 ? surfaces : undefined,
					});
				}
			}
		}
	}

	if (teethUpdates.length === 0 && allTeeth.length > 0) {
		const overallDiag = matchDiagnosisRule(transcript);
		const overallSurfaces = extractToothSurfaces(transcript);
		if (overallDiag) {
			for (const toothNum of allTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: overallDiag.toothChartState,
						icd10Code: overallDiag.code,
						icd10Title: overallDiag.title,
						clinicalStatus: overallDiag.status,
						surfaces: overallSurfaces.length > 0 ? overallSurfaces : undefined,
					});
				}
			}
		}
	}

	const enrichedSoap: {
		subjective?: string | undefined;
		objective?: string | undefined;
		assessment?: string | undefined;
		plan?: string | undefined;
		recommendations?: string | undefined;
	} = { ...soapNotes };

	if (!enrichedSoap.assessment && teethUpdates.length > 0) {
		enrichedSoap.assessment = teethUpdates
			.map((t) => `Зуб ${t.toothNumber}: ${t.icd10Title} [${t.icd10Code}]`)
			.join("; ");
	}

	if (!enrichedSoap.plan && (procedures804n.length > 0 || anesthesia)) {
		const planParts: string[] = [];
		if (anesthesia) {
			planParts.push(`Анестезия: ${anesthesia.displayName}`);
		}
		for (const p of procedures804n) {
			planParts.push(p.name);
		}
		enrichedSoap.plan = planParts.join(", ");
	}

	const summaryParts: string[] = [];
	if (allTeeth.length > 0) {
		summaryParts.push(`Зубы: ${allTeeth.join(", ")}`);
	}
	if (teethUpdates.length > 0) {
		summaryParts.push(teethUpdates.map((t) => `${t.toothNumber} ${t.icd10Code}`).join(", "));
	}
	if (anesthesia) {
		summaryParts.push(anesthesia.tradeName);
	}
	if (procedures804n.length > 0) {
		summaryParts.push(`${procedures804n.length} манип.`);
	}

	const targetQuadrant = extractQuadrantIntent(transcript) || undefined;
	const endoCanalMeasurements = extractEndoCanalMeasurements(transcript);
	const perioMeasurements = extractPerioVoiceMeasurements(transcript);
	const cephLandmarks = extractCephLandmarksVoiceIntent(transcript);

	let intentType: DentalVoiceIntent["type"] = "full_visit_batch";
	if (targetQuadrant) {
		intentType = "quadrant_switch";
	} else if (endoCanalMeasurements.length > 0) {
		intentType = "endo_measurement";
	} else if (perioMeasurements.length > 0) {
		intentType = "perio_measurement";
	} else if (cephLandmarks.length > 0) {
		intentType = "ceph_landmark";
	} else if (teethUpdates.length > 0 && !anesthesia && procedures804n.length === 0) {
		intentType = "odontogram_update";
	}

	if (targetQuadrant) {
		summaryParts.unshift(`Квадрант: ${targetQuadrant}`);
	}
	if (endoCanalMeasurements.length > 0) {
		summaryParts.push(`Эндо: ${endoCanalMeasurements.map((c) => c.canalName).join(", ")}`);
	}
	if (perioMeasurements.length > 0) {
		summaryParts.push(`Перио: ${perioMeasurements.map((p) => p.toothNumber).join(", ")}`);
	}
	if (cephLandmarks.length > 0) {
		summaryParts.push(`ТРГ: ${cephLandmarks.map((c) => c.landmarkKey).join(", ")}`);
	}

	const summary = summaryParts.length > 0 ? summaryParts.join(" | ") : "Клинический голосовой ввод";
	const confidence =
		teethUpdates.length > 0 ||
		anesthesia ||
		procedures804n.length > 0 ||
		targetQuadrant ||
		endoCanalMeasurements.length > 0 ||
		perioMeasurements.length > 0 ||
		cephLandmarks.length > 0
			? 0.95
			: 0.8;
	const confidenceLevel = confidence >= 0.9 ? "high" : "review";

	return {
		id: intentId,
		timestamp: now,
		rawTranscript: transcript,
		type: intentType,
		confidence,
		confidenceLevel,
		teethUpdates,
		detectedTeeth: allTeeth,
		anesthesia,
		procedures804n,
		soapNotes: enrichedSoap,
		...(targetQuadrant ? { targetQuadrant } : {}),
		...(endoCanalMeasurements.length > 0 ? { endoCanalMeasurements } : {}),
		...(perioMeasurements.length > 0 ? { perioMeasurements } : {}),
		...(cephLandmarks.length > 0 ? { cephLandmarks } : {}),
		summary,
	};
}
