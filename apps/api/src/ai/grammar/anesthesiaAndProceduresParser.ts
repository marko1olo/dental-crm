/**
 * anesthesiaAndProceduresParser.ts — Семантическое распознавание анестетиков и клинических процедур прайс-листа
 */

import type { AnesthesiaResult, ClinicalProcedureResult, Procedure804nResult } from "./clinicalGrammarTypes.js";

// ----------------------------------------------------------------------------
// ANESTHESIA EXTRACTION
// ----------------------------------------------------------------------------

interface AnestheticConfig {
	readonly drugKey: string;
	readonly tradeName: string;
	readonly defaultVolumeMl: number;
	readonly concentration: string;
	readonly patterns: readonly string[];
}

const ANESTHETICS_CONFIG: readonly AnestheticConfig[] = [
	{
		drugKey: "ultracain_ds_forte",
		tradeName: "Ультракаин Д-С форте",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"ультракаин форте",
			"ультракаин д-с форте",
			"ультракаин д с форте",
			"ультракаин дс форте",
			"ultracain ds forte",
		],
	},
	{
		drugKey: "ultracain_ds",
		tradeName: "Ультракаин Д-С",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:200 000",
		patterns: [
			"ультракаин д-с",
			"ультракаин д с",
			"ультракаин дс",
			"ультракаин",
			"ultracain ds",
			"ultracain",
		],
	},
	{
		drugKey: "ubistesin_forte",
		tradeName: "Убистезин форте",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:100 000",
		patterns: [
			"убистезин форте",
			"убистезин forte",
			"ubistesin forte",
		],
	},
	{
		drugKey: "ubistesin",
		tradeName: "Убистезин",
		defaultVolumeMl: 1.7,
		concentration: "4% с эпинефрином 1:200 000",
		patterns: [
			"убистезин",
			"ubistesin",
		],
	},
	{
		drugKey: "scandonest",
		tradeName: "Скандонест 3%",
		defaultVolumeMl: 1.8,
		concentration: "3% без вазоконстриктора",
		patterns: [
			"скандонест",
			"scandonest",
			"мепивакаин без",
		],
	},
	{
		drugKey: "septanest",
		tradeName: "Септанест",
		defaultVolumeMl: 1.7,
		concentration: "4% с адреналином 1:100 000",
		patterns: [
			"септанест",
			"septanest",
		],
	},
	{
		drugKey: "articaine",
		tradeName: "Артикаин 4%",
		defaultVolumeMl: 1.7,
		concentration: "4%",
		patterns: [
			"артикаин",
			"articaine",
		],
	},
	{
		drugKey: "lidocaine",
		tradeName: "Лидокаин 2%",
		defaultVolumeMl: 2.0,
		concentration: "2%",
		patterns: [
			"лидокаин",
			"lidocaine",
		],
	},
];

export function extractDentalAnesthesia(text: string): AnesthesiaResult | null {
	if (!text) return null;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	const hasAnesthesia =
		lower.includes("анестези") ||
		lower.includes("карпул") ||
		lower.includes("укол") ||
		lower.includes("обезболиван") ||
		lower.includes("инфильтраци") ||
		lower.includes("проводников") ||
		lower.includes("торусальн") ||
		lower.includes("туберальн") ||
		lower.includes("аппликацион") ||
		ANESTHETICS_CONFIG.some((c) => c.patterns.some((p) => lower.includes(p)));

	if (!hasAnesthesia) return null;

	const defaultCfg = (ANESTHETICS_CONFIG.find((c) => c.drugKey === "ultracain_ds") || ANESTHETICS_CONFIG[0]) as AnestheticConfig;
	let matchedConfig = defaultCfg;
	let found = false;

	const sortedConfigs = [...ANESTHETICS_CONFIG].sort((a, b) => {
		const maxA = Math.max(...a.patterns.map((p) => p.length));
		const maxB = Math.max(...b.patterns.map((p) => p.length));
		return maxB - maxA;
	});

	for (const cfg of sortedConfigs) {
		if (cfg.patterns.some((p) => lower.includes(p))) {
			matchedConfig = cfg;
			found = true;
			break;
		}
	}

	if (!found && !hasAnesthesia) {
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

	const techLabel =
		technique === "conduction"
			? "проводниковая"
			: technique === "application"
				? "аппликационная"
				: technique === "intraligamentary"
					? "интралигаментарная"
					: "инфильтрационная";

	const serviceCode =
		technique === "conduction"
			? "A11.07.013"
			: technique === "application"
				? "A11.07.011"
				: "A11.07.012";

	return {
		drugKey: matchedConfig.drugKey,
		tradeName: matchedConfig.tradeName,
		displayName: `${matchedConfig.tradeName} ${volumeMl} мл (${cartridgeCount} карп., ${techLabel})`,
		volumeMl,
		cartridgeCount,
		technique,
		concentration: matchedConfig.concentration,
		serviceCode,
		code804n: serviceCode,
	};
}

// ----------------------------------------------------------------------------
// CLINICAL PROCEDURES & MANIPULATIONS CATALOG (SEMANTIC EXTRACTION)
// ----------------------------------------------------------------------------

interface ManipulationRule {
	readonly serviceCode?: string;
	readonly code804n?: string;
	readonly name: string;
	readonly category: ClinicalProcedureResult["category"];
	readonly patterns: readonly string[];
}

const CANONICAL_MANIPULATIONS: readonly ManipulationRule[] = [
	{
		serviceCode: "A16.07.002.001",
		name: "Наложение коффердама (раббердама) / Оптрагейт",
		category: "isolation",
		patterns: [
			"коффердам",
			"раббердам",
			"оптрагейт",
			"изоляция коффердамом",
			"наложение коффердама",
			"кламп",
		],
	},
	{
		serviceCode: "A16.07.002",
		name: "Препарирование и некрэктомия кариозной полости зуба",
		category: "therapy",
		patterns: [
			"некрэктомия",
			"препарирование",
			"формирование полости",
			"раскрытие кариозной полости",
			"медобработка полости",
		],
	},
	{
		serviceCode: "A16.07.002.010",
		name: "Восстановление зуба пломбой светоотверждаемым композитом (Gradia Direct / Estelite / Filtek)",
		category: "therapy",
		patterns: [
			"пломба эстет икс",
			"эстелайт",
			"estelite",
			"filtek",
			"филтек",
			"gradia",
			"градиа",
			"пломба светового отверждения",
			"световая пломба",
			"фотокомпозит",
			"светоотверждаемый композит",
			"адгезивный протокол",
			"реставрация зуба",
			"пломба",
		],
	},
	{
		serviceCode: "A16.07.002.011",
		name: "Шлифовка и полировка пломбы / реставрации",
		category: "therapy",
		patterns: [
			"полировка",
			"шлифовка",
			"полировочные диски",
			"окклюзионная коррекция",
			"финишная обработка",
		],
	},
	{
		serviceCode: "A16.07.030",
		name: "Инструментальная и медикаментозная обработка корневого канала",
		category: "endodontics",
		patterns: [
			"обработка корневого канала",
			"обработка каналов",
			"механическая обработка канала",
			"медобработка канала",
			"эндодонтия каналов",
			"апекслокация",
			"протейпер",
			"эндомотор",
			"ирригация гипохлоритом",
			"три канала",
			"каналов",
		],
	},
	{
		serviceCode: "A16.07.008",
		name: "Пломбирование корневого канала гуттаперчей / силером",
		category: "endodontics",
		patterns: [
			"пломбирование корневого канала",
			"пломбирование каналов",
			"гуттаперч",
			"латеральная конденсация",
			"силер ah plus",
			"обтурация каналов",
		],
	},
	{
		serviceCode: "A16.07.020",
		name: "Ультразвуковое удаление зубных отложений и Air-Flow",
		category: "hygiene",
		patterns: [
			"ультразвук",
			"air flow",
			"air-flow",
			"снятие зубных отложений",
			"профгигиена",
			"профессиональная гигиена",
			"чистка зубов",
			"скейлинг",
		],
	},
	{
		serviceCode: "A16.07.001",
		name: "Удаление зуба (простое / сложное)",
		category: "surgery",
		patterns: [
			"удаление зуба",
			"экстракция зуба",
			"кюретаж лунки",
			"гемостаз",
			"наложение шва",
		],
	},
	{
		serviceCode: "A16.07.004",
		name: "Восстановление зуба коронкой",
		category: "orthopedics",
		patterns: [
			"коронка",
			"диоксид циркония",
			"e.max",
			"металлокерамика",
			"временная коронка",
			"препарирование под коронку",
		],
	},
	{
		serviceCode: "A16.07.054",
		name: "Внутрикостная дентальная имплантация",
		category: "surgery",
		patterns: [
			"установка импланта",
			"дентальная имплантация",
			"имплантат",
			"формирователь десны",
		],
	},
	{
		serviceCode: "A06.07.007",
		name: "Внутриротовая прицельная радиовизиография",
		category: "hygiene",
		patterns: [
			"прицельный снимок",
			"визиография",
			"рентген зуба",
			"rvg",
		],
	},
	{
		serviceCode: "A11.07.024",
		name: "Местное применение реминерализующих препаратов (фторирование)",
		category: "hygiene",
		patterns: [
			"фторирование",
			"ремотерапия",
			"фторлак",
			"глуфторекс",
		],
	},
	{
		serviceCode: "A16.07.019",
		name: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery",
		patterns: [
			"периостотомия",
			"послабляющий разрез",
			"дренирование абсцесса",
		],
	},
];

export function extractDentalProcedures(
	text: string,
	primaryTooth?: number,
	priceResolver?: ((serviceCode: string) => number | undefined) | Record<string, number>,
): ClinicalProcedureResult[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const results: ClinicalProcedureResult[] = [];

	let shade: string | undefined;
	if (norm.includes("а два") || norm.includes("а2") || norm.includes("a2")) shade = "A2";
	else if (norm.includes("а три") || norm.includes("а3") || norm.includes("a3")) shade = "A3";
	else if (norm.includes("а один") || norm.includes("а1") || norm.includes("a1")) shade = "A1";
	else if (norm.includes("б два") || norm.includes("b2")) shade = "B2";

	for (const rule of CANONICAL_MANIPULATIONS) {
		const matched = rule.patterns.some((p) => norm.includes(p));
		if (matched) {
			let name = rule.name;
			if (shade && rule.category === "therapy") {
				name += ` (оттенок ${shade})`;
			}

			const code = rule.serviceCode || rule.code804n || "";
			let priceRub: number | undefined;
			if (typeof priceResolver === "function") {
				priceRub = priceResolver(code);
			} else if (priceResolver && typeof priceResolver === "object") {
				priceRub = priceResolver[code];
			}

			results.push({
				serviceCode: code,
				code804n: code,
				name,
				category: rule.category,
				quantity: 1,
				toothNumber: primaryTooth,
				priceRub,
				shade,
			});
		}
	}

	return results;
}
