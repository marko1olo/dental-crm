/**
 * clinicalKeywords.ts — Клинические словари (диагнозы, SOAP, анестетики, расходные материалы).
 * Layer 2: Сопоставление клинической лексики и извлечение сущностей.
 */

import type {
	AnesthesiaParsedInfo,
	ConsumableParsedInfo,
	DiagnosisDefinition,
	SoapAggregatedNote,
	SoapSectionType,
} from "./types";

export const CLINICAL_DIAGNOSES_CATALOG: DiagnosisDefinition[] = [
	{
		code: "K02.1",
		title: "Кариес дентина",
		status: "CARIES",
		patterns: [
			"кариес дентина",
			"средний кариес",
			"глубокий кариес",
			"кариозное поражение дентина",
			"кариес",
			"полость кариозная",
			"кариозная полость",
		],
		confidence: 0.95,
	},
	{
		code: "K02.0",
		title: "Кариес эмали (в стадии пятна)",
		status: "CARIES",
		patterns: [
			"кариес эмали",
			"начальный кариес",
			"кариес в стадии пятна",
			"меловидное пятно",
		],
		confidence: 0.95,
	},
	{
		code: "K04.0",
		title: "Острый пульпит",
		status: "PULPITIS",
		patterns: [
			"пульпит острый",
			"острый пульпит",
			"пульпит",
			"очаговый пульпит",
			"диффузный пульпит",
			"гнойный пульпит",
			"острая пульпарная боль",
		],
		confidence: 0.95,
	},
	{
		code: "K04.5",
		title: "Хронический периодонтит",
		status: "PERIODONTITIS",
		patterns: [
			"периодонтит хронический",
			"хронический периодонтит",
			"периодонтит",
			"гранулирующий периодонтит",
			"гранулематозный периодонтит",
			"фиброзный периодонтит",
			"апикальный периодонтит",
		],
		confidence: 0.95,
	},
	{
		code: "K05.3",
		title: "Хронический пародонтит",
		status: "PERIODONTITIS_GENERAL",
		patterns: [
			"пародонтит хронический",
			"хронический пародонтит",
			"пародонтит",
			"генерализованный пародонтит",
			"локализованный пародонтит",
			"пародонтальный карман",
		],
		confidence: 0.9,
	},
	{
		code: "K08.1",
		title: "Потеря зубов вследствие удаления или травмы (Отсутствует)",
		status: "MISSING",
		patterns: [
			"удален",
			"удалён",
			"отсутствует",
			"отсутствующий",
			"удаление",
			"адентия",
			"экстракция",
			"зуб удален",
			"ранее удален",
		],
		confidence: 0.95,
	},
	{
		code: "RESTORATION",
		title: "Пломба / Реставрация",
		status: "RESTORATION",
		patterns: [
			"пломба светового отверждения",
			"пломба",
			"реставрация",
			"световая пломба",
			"композитная реставрация",
			"восстановление зуба",
			"поставлена пломба",
			"пломбирование",
		],
		confidence: 0.95,
	},
	{
		code: "CROWN",
		title: "Коронка (диоксид циркония / E.max / металлокерамика)",
		status: "CROWN",
		patterns: [
			"коронка диоксид циркония",
			"коронка цирконий",
			"коронка",
			"металлокерамика",
			"металлокерамическая коронка",
			"циркониевая коронка",
			"e.max",
			"емакс",
			"керамическая коронка",
			"ортопедическая коронка",
		],
		confidence: 0.95,
	},
	{
		code: "IMPLANT",
		title: "Дентальный имплантат установлен",
		status: "IMPLANT",
		patterns: [
			"имплантат установлен",
			"имплантат",
			"имплант",
			"имплантант",
			"дентальный имплантат",
			"установка имплантата",
			"имплантация",
		],
		confidence: 0.95,
	},
	{
		code: "INLAY",
		title: "Культевая вкладка / Микропротез",
		status: "INLAY",
		patterns: [
			"культевая вкладка",
			"вкладка",
			"керамическая вкладка",
			"онлей",
			"инлей",
			"оверлей",
		],
		confidence: 0.9,
	},
	{
		code: "K03.1",
		title: "Клиновидный дефект",
		status: "WEDGE_DEFECT",
		patterns: [
			"клиновидный дефект",
			"клиновидный",
			"пришеечный дефект",
		],
		confidence: 0.9,
	},
	{
		code: "K03.2",
		title: "Эрозия эмали",
		status: "EROSION",
		patterns: [
			"эрозия эмали",
			"эрозия зубов",
			"кислотная эрозия",
		],
		confidence: 0.9,
	},
	{
		code: "K03.8",
		title: "Перелом или трещина зуба",
		status: "FRACTURE",
		patterns: [
			"трещина зуба",
			"перелом зуба",
			"откол коронки",
			"откол стенки зуба",
			"скол эмали",
		],
		confidence: 0.9,
	},
	{
		code: "HEALTHY",
		title: "Интактный / Здоров",
		status: "HEALTHY",
		patterns: [
			"здоров",
			"интактный",
			"без патологии",
			"норма",
			"интактен",
		],
		confidence: 0.9,
	},
];

/**
 * Ищет совпадение по диагнозу в клиническом тексте.
 */
export function extractClinicalDiagnoses(text: string): DiagnosisDefinition | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	for (const item of CLINICAL_DIAGNOSES_CATALOG) {
		for (const pattern of item.patterns) {
			const normPattern = pattern.replace(/ё/g, "е");
			if (norm.includes(normPattern)) {
				return item;
			}
		}
	}
	return null;
}

const SOAP_MARKERS: Record<SoapSectionType, string[]> = {
	subjective: [
		"жалобы:",
		"жалобы пациента:",
		"жалобы",
		"жалуется на",
		"со слов пациента:",
		"пациент отмечает:",
		"анамнез заболевания:",
		"анамнез:",
	],
	objective: [
		"объективно:",
		"при осмотре:",
		"данные осмотра:",
		"статус локалис:",
		"status localis:",
		"объективные данные:",
		"в полости рта:",
		"объективно",
		"при осмотре",
	],
	assessment: [
		"диагноз:",
		"предварительный диагноз:",
		"клинический диагноз:",
		"основное заболевание:",
		"диагноз",
	],
	plan: [
		"лечение:",
		"план лечения:",
		"проведено лечение:",
		"ход лечения:",
		"протокол лечения:",
		"протокол:",
		"манипуляции:",
		"лечение",
	],
	recommendations: [
		"рекомендации:",
		"назначения:",
		"рекомендовано:",
		"пациенту назначено:",
		"советы врача:",
		"рекомендации",
		"назначения",
	],
};

/**
 * Извлекает структурированные SOAP секции из свободной речи.
 */
export function extractSoapSections(text: string): SoapAggregatedNote {
	const result: SoapAggregatedNote = {};
	if (!text) return result;

	const norm = text.trim();

	// Разделяем по маркерам SOAP
	const allMarkersWithKeys: Array<{ section: SoapSectionType; marker: string }> = [];
	for (const [section, markers] of Object.entries(SOAP_MARKERS)) {
		for (const marker of markers) {
			allMarkersWithKeys.push({ section: section as SoapSectionType, marker });
		}
	}

	// Сортируем маркеры по длине (сначала более длинные и точные)
	allMarkersWithKeys.sort((a, b) => b.marker.length - a.marker.length);

	const foundSpans: Array<{ section: SoapSectionType; index: number; markerLength: number }> = [];

	const lower = norm.toLowerCase().replace(/ё/g, "е");

	for (const { section, marker } of allMarkersWithKeys) {
		const normMarker = marker.replace(/ё/g, "е");
		let pos = lower.indexOf(normMarker);
		while (pos !== -1) {
			// Проверяем, не перекрывается ли с уже найденным маркером
			const overlaps = foundSpans.some(
				(s) => pos >= s.index && pos < s.index + s.markerLength,
			);
			if (!overlaps) {
				foundSpans.push({ section, index: pos, markerLength: normMarker.length });
			}
			pos = lower.indexOf(normMarker, pos + 1);
		}
	}

	// Сортируем найденные спаны по позиции в тексте
	foundSpans.sort((a, b) => a.index - b.index);

	for (let i = 0; i < foundSpans.length; i++) {
		const current = foundSpans[i];
		if (!current) continue;

		const start = current.index + current.markerLength;
		const next = foundSpans[i + 1];
		const end = next ? next.index : norm.length;

		let content = norm.slice(start, end).trim();
		// Удаляем ведущие двоеточия, дефисы, пробелы и замыкающие точки
		content = content
			.replace(/^[:\-–—\s]+/, "")
			.replace(/[.\s]+$/, "")
			.trim();

		if (content) {
			const existing = result[current.section];
			result[current.section] = existing ? `${existing}; ${content}` : content;
		}
	}

	return result;
}

const KNOWN_ANESTHETICS = [
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

/**
 * Извлекает информацию об анестезии и расходных материалах.
 */
export function extractAnesthesiaAndConsumables(text: string): {
	anesthesia: AnesthesiaParsedInfo | null;
	consumables: ConsumableParsedInfo[];
} {
	const result: {
		anesthesia: AnesthesiaParsedInfo | null;
		consumables: ConsumableParsedInfo[];
	} = {
		anesthesia: null,
		consumables: [],
	};

	if (!text) return result;
	const lower = text.toLowerCase().replace(/ё/g, "е");

	// 1. Анестезия
	const isAnesthesiaMentioned =
		lower.includes("анестези") ||
		KNOWN_ANESTHETICS.some((drug) => lower.includes(drug));

	if (isAnesthesiaMentioned) {
		let drugName = "Артикаинсодержащий анестетик";
		// Сортируем по длине, чтобы "ультракаин д-с" матчился раньше "ультракаин"
		const sortedDrugs = [...KNOWN_ANESTHETICS].sort(
			(a, b) => b.length - a.length,
		);
		for (const drug of sortedDrugs) {
			if (lower.includes(drug)) {
				drugName = drug.charAt(0).toUpperCase() + drug.slice(1);
				break;
			}
		}

		// Объём в мл
		let volumeMl = 1.7; // стандартный объем карпулы
		const volumeMatch = lower.match(/(\d+[.,]?\d*)\s*(?:мл|миллилитр)/);
		if (volumeMatch && volumeMatch[1]) {
			volumeMl = parseFloat(volumeMatch[1].replace(",", "."));
		}

		// Количество карпул
		let cartridgeCount = 1;
		const cartridgeMatch = lower.match(
			/(\d+)\s*(?:карпул|ампул|карпулы|ампулы)/,
		);
		if (cartridgeMatch && cartridgeMatch[1]) {
			cartridgeCount = parseInt(cartridgeMatch[1], 10);
		}

		// Техника
		let technique: "infiltration" | "conduction" | "application" =
			"infiltration";
		if (lower.includes("проводников")) technique = "conduction";
		else if (lower.includes("аппликацион")) technique = "application";
		else if (lower.includes("инфильтрацион")) technique = "infiltration";

		result.anesthesia = {
			drug: drugName,
			volumeMl,
			cartridgeCount,
			technique,
		};
	}

	// 2. Расходные материалы
	const consumablePatterns = [
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

	for (const item of consumablePatterns) {
		if (item.pattern.test(lower)) {
			result.consumables.push({
				name: item.name,
				quantity: 1,
				unit: item.unit,
			});
		}
	}

	return result;
}
