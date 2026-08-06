import {
	type DentalMaterialKind,
	type DentalPricelistAnalysisRequest,
	type DentalPricelistAnalysisResponse,
	type DentalPricelistCategorySummary,
	type DentalPricelistItem,
	type DentalRestorationType,
	type DentalSpecialty,
	dentalPricelistAnalysisResponseSchema,
	dentalPricelistItemSchema,
	kopecksToNumericString,
	type PricelistParserMode,
	parseKopecks,
	type ServiceCatalogItem,
	type ServiceCategory,
	sumKopecks,
} from "@dental/shared";

import {
	fetchWithProviderTimeout,
	getProviderKeyPoolSummary,
	keyRetryLimit,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	sanitizeProviderErrorMessage,
	selectProviderKey,
	shouldTryNextProviderKey,
} from "../speech/keyPool.js";

type KeywordRule<T extends string> = {
	value: T;
	label?: string;
	patterns: RegExp[];
};

type Classification = {
	category: ServiceCategory;
	specialty: DentalSpecialty;
	treatmentKind: string;
};

type MaterialClassification = {
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	crownType: string | null;
	brand: string | null;
	unit: string;
	toothScope: string | null;
};

type GroqChatPayload = {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
	error?: {
		message?: string;
	};
};

/*
 * Версия промпта — v2: в системный промпт добавлено перечисление допустимых
 * значений crownType (их не было, при четырёх перечисленных соседях). Номер
 * уходит клиенту как groqJsonPromptVersion, поэтому текст промпта нельзя менять,
 * оставляя прежний номер: тогда номер перестаёт что-либо идентифицировать.
 */
const groqPromptVersion = "pricelist-json-v2";
const maxGroqImagesPerRequest = 1;
const groqProviderId = "groq_whisper" as const;

/*
 * Верхняя граница длительности услуги в минутах — десять часов.
 *
 * Число стояло вписанным прямо в durationFromLine и БОЛЬШЕ НИГДЕ, поэтому
 * нейро-ветка разбора не проверяла длительность вообще: модель могла вернуть
 * durationMinutes: 99999, и запись на приём растянулась бы на 69 суток.
 * Одна граница на оба режима разбора, а не два разных представления о том,
 * сколько может длиться приём.
 */
const maxServiceDurationMinutes = 600;

const categoryRules: Array<
	KeywordRule<ServiceCategory> & {
		specialty: DentalSpecialty;
		treatmentKind: string;
	}
> = [
	{
		value: "consultation",
		specialty: "universal",
		treatmentKind: "consultation",
		patterns: [/консульт/i, /осмотр/i, /план\s+леч/i, /прием/i],
	},
	{
		value: "imaging",
		specialty: "radiologist",
		treatmentKind: "imaging",
		patterns: [
			/кт\b/i,
			/cbct/i,
			/оптг/i,
			/ортопан/i,
			/трг/i,
			/rvg/i,
			/рентген/i,
			/сним/i,
			/фото\s*протокол/i,
			/скан/i,
			/3shape/i,
			/medit/i,
			/sirona/i,
		],
	},
	{
		value: "hygiene",
		specialty: "hygienist",
		treatmentKind: "hygiene",
		patterns: [
			/гигиен/i,
			/air\s*flow/i,
			/airflow/i,
			/ems\b/i,
			/ультразв/i,
			/скейл/i,
			/налет/i,
			/камн/i,
			/фтор/i,
			/реминерал/i,
			/отбел/i,
			/zoom/i,
			/beyond/i,
			/opalescence/i,
			/white/i,
		],
	},
	{
		value: "orthodontics",
		specialty: "orthodontist",
		treatmentKind: "orthodontics",
		patterns: [
			/брекет/i,
			/элайнер/i,
			/капп/i,
			/ретейн/i,
			/ортодонт/i,
			/damon/i,
			/ormco/i,
			/invisalign/i,
		],
	},
	{
		value: "periodontology",
		specialty: "periodontist",
		treatmentKind: "periodontology",
		patterns: [
			/пародонт/i,
			/кюрет/i,
			/шинир/i,
			/лоскут/i,
			/пародонтальн/i,
			/гингив/i,
		],
	},
	{
		value: "surgery",
		specialty: "implantologist",
		treatmentKind: "implantology",
		patterns: [
			/имплант/i,
			/аба[тд]мент/i,
			/формировател/i,
			/синус/i,
			/костн/i,
			/мембран/i,
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/megagen/i,
		],
	},
	{
		value: "surgery",
		specialty: "surgeon",
		treatmentKind: "surgery",
		patterns: [
			/удален/i,
			/экстракц/i,
			/восьмер/i,
			/резекц/i,
			/цист/i,
			/уздеч/i,
			/шв/i,
			/prf/i,
		],
	},
	{
		value: "prosthetics",
		specialty: "orthopedist",
		treatmentKind: "prosthetics",
		patterns: [
			/корон/i,
			/винир/i,
			/вкладк/i,
			/накладк/i,
			/мост/i,
			/протез/i,
			/керамик/i,
			/циркон/i,
			/zircon/i,
			/e\.?\s*max/i,
		],
	},
	{
		value: "therapy",
		specialty: "pediatric",
		treatmentKind: "pediatric",
		patterns: [
			/детск/i,
			/молочн/i,
			/герметизац/i,
			/фиссур/i,
			/sealant/i,
			/пульпотом/i,
			/серебрен/i,
		],
	},
	{
		value: "therapy",
		specialty: "therapist",
		treatmentKind: "therapy",
		patterns: [
			/кариес/i,
			/пульпит/i,
			/периодонт/i,
			/канал/i,
			/эндод/i,
			/пломб/i,
			/реставрац/i,
			/герметизац/i,
			/фиссур/i,
			/коффер/i,
			/анестез/i,
		],
	},
	{
		value: "documents",
		specialty: "universal",
		treatmentKind: "document",
		patterns: [/справк/i, /договор/i, /акт\b/i, /вычет/i, /соглас/i],
	},
];

const materialRules: Array<KeywordRule<DentalMaterialKind>> = [
	{
		value: "zirconia",
		label: "zirconia",
		patterns: [
			/циркон/i,
			/zircon/i,
			/zro/i,
			/multi\s*layer/i,
			/katana/i,
			/prettau/i,
			/bruxzir/i,
			/aidite/i,
			/cercon/i,
			/zircad/i,
			/lava/i,
		],
	},
	{
		value: "lithium_disilicate",
		label: "e.max",
		patterns: [/e\.?\s*max/i, /emax/i, /lithium/i, /disilicate/i, /дисиликат/i],
	},
	{
		value: "metal_ceramic",
		label: "metal ceramic",
		patterns: [/металлокерами/i, /металл[о-]?\s*керами/i, /pfm\b/i],
	},
	{
		value: "ceramic",
		label: "ceramic",
		patterns: [/керамик/i, /фарфор/i, /noritake/i, /vita/i, /ivoclar/i],
	},
	{
		value: "pmma",
		label: "pmma",
		patterns: [/pmma/i, /времен/i, /пластмасс/i, /акрил/i],
	},
	{
		value: "glass_ionomer",
		label: "glass ionomer",
		patterns: [
			/стеклоиономер/i,
			/\bсиц\b/i,
			/glass\s*ionomer/i,
			/fuji/i,
			/ketac/i,
		],
	},
	{
		value: "sealant",
		label: "sealant",
		patterns: [/герметизац/i, /фиссур/i, /sealant/i],
	},
	{
		value: "whitening",
		label: "whitening",
		patterns: [
			/отбел/i,
			/zoom/i,
			/beyond/i,
			/opalescence/i,
			/amazing\s*white/i,
		],
	},
	{
		value: "other",
		label: "hygiene system",
		patterns: [/air\s*flow/i, /airflow/i, /ems\b/i, /ультразв/i, /скейл/i],
	},
	{
		value: "composite",
		label: "composite",
		patterns: [
			/композит/i,
			/фотополимер/i,
			/светов/i,
			/filtek/i,
			/estelite/i,
			/gradia/i,
			/sdr\b/i,
			/tokuyama/i,
			/omnichroma/i,
			/charisma/i,
			/tetric/i,
			/venus/i,
			/esthet[-\s]?x/i,
			/dentsply/i,
			/kerr/i,
			/voco/i,
			/kulzer/i,
		],
	},
	{
		value: "implant_system",
		label: "implant",
		patterns: [
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/megagen/i,
			/anyridge/i,
			/astra/i,
			/biohorizons/i,
			/mis\b/i,
			/alpha[-\s]?bio/i,
			/neodent/i,
			/ankylos/i,
			/zimmer/i,
			/biomet/i,
			/bredent/i,
			/impro/i,
			/sgs\b/i,
			/имплант/i,
		],
	},
	{
		value: "abutment",
		label: "abutment",
		patterns: [/аба[тд]мент/i, /abutment/i, /формировател/i],
	},
	{
		value: "bone_graft",
		label: "bone graft",
		patterns: [
			/костн/i,
			/остео/i,
			/bone/i,
			/графт/i,
			/bio[-\s]?oss/i,
			/cerabone/i,
			/geistlich/i,
			/botiss/i,
			/osteo\s*biol/i,
			/symbios/i,
		],
	},
	{
		value: "membrane",
		label: "membrane",
		patterns: [
			/мембран/i,
			/membrane/i,
			/bio[-\s]?gide/i,
			/jason/i,
			/collagen/i,
			/collprotect/i,
		],
	},
	{
		value: "aligner",
		label: "aligner",
		patterns: [
			/элайнер/i,
			/aligner/i,
			/invisalign/i,
			/star\s*smile/i,
			/flexi/i,
		],
	},
	{
		value: "bracket",
		label: "bracket",
		patterns: [
			/брекет/i,
			/damon/i,
			/ormco/i,
			/3m\b/i,
			/сапфир/i,
			/керамическ.*брек/i,
			/металл.*брек/i,
		],
	},
	{
		value: "fluoride",
		label: "fluoride",
		patterns: [/фтор/i, /fluor/i, /реминерал/i],
	},
	{
		value: "anesthetic",
		label: "anesthetic",
		patterns: [
			/анестез/i,
			/артикаин/i,
			/ультракаин/i,
			/убистезин/i,
			/septanest/i,
			/ultracain/i,
			/ubistesin/i,
		],
	},
	{
		value: "imaging",
		label: "imaging",
		patterns: [
			/кт\b/i,
			/cbct/i,
			/оптг/i,
			/rvg/i,
			/трг/i,
			/рентген/i,
			/vatech/i,
			/carestream/i,
			/planmeca/i,
		],
	},
	{
		value: "lab",
		label: "lab",
		patterns: [
			/лаборатор/i,
			/техник/i,
			/слепок/i,
			/оттиск/i,
			/скан/i,
			/3shape/i,
			/medit/i,
			/sirona/i,
			/exocad/i,
		],
	},
	{
		value: "metal",
		label: "metal",
		patterns: [
			/кобальт/i,
			/хром/i,
			/cobalt/i,
			/chrome/i,
			/co[-\s]?cr/i,
			/бюгель/i,
		],
	},
	{ value: "titanium", label: "titanium", patterns: [/титан/i, /titan/i] },
];

const restorationRules: Array<KeywordRule<DentalRestorationType>> = [
	{
		value: "surgical_guide",
		patterns: [/хирургическ.*шаблон/i, /surgical\s*guide/i, /навигац.*шаблон/i],
	},
	{
		value: "implant",
		patterns: [/имплантац/i, /установк.*имплан/i, /implant\s*placement/i],
	},
	{ value: "implant_crown", patterns: [/корон.*имплан/i, /implant.*crown/i] },
	{
		value: "temporary_crown",
		patterns: [/времен.*корон/i, /temporary.*crown/i],
	},
	{ value: "crown", patterns: [/корон/i, /crown/i] },
	{ value: "bridge", patterns: [/мост/i, /bridge/i] },
	{ value: "veneer", patterns: [/винир/i, /veneer/i] },
	{ value: "inlay", patterns: [/вкладк/i, /inlay/i] },
	{ value: "onlay", patterns: [/накладк/i, /onlay/i] },
	{ value: "overlay", patterns: [/overlay/i] },
	{ value: "post_core", patterns: [/культев/i, /штифт/i, /post/i, /core/i] },
	{ value: "denture", patterns: [/протез/i, /denture/i] },
	{
		value: "ortho_appliance",
		patterns: [/брекет/i, /элайнер/i, /ретейн/i, /капп/i],
	},
	{ value: "sealant", patterns: [/герметизац/i, /фиссур/i, /sealant/i] },
	{
		value: "whitening",
		patterns: [/отбел/i, /zoom/i, /beyond/i, /opalescence/i],
	},
	{ value: "direct_restoration", patterns: [/реставрац/i] },
	{ value: "filling", patterns: [/пломб/i, /filling/i] },
];

const brandRules = [
	"Straumann",
	"Nobel",
	"Osstem",
	"Dentium",
	"Megagen",
	"AnyRidge",
	"Astra",
	"BioHorizons",
	"MIS",
	"Alpha-Bio",
	"Neodent",
	"Ankylos",
	"Zimmer Biomet",
	"Bredent",
	"Impro",
	"SGS",
	"Geistlich",
	"Bio-Oss",
	"Bio-Gide",
	"Cerabone",
	"botiss",
	"OsteoBiol",
	"Jason",
	"Symbios",
	"Damon",
	"Ormco",
	"3M",
	"American Orthodontics",
	"Forestadent",
	"Invisalign",
	"Star Smile",
	"FlexiLigner",
	"Filtek",
	"Estelite",
	"Tokuyama",
	"Omnichroma",
	"Gradia",
	"Fuji",
	"Ketac",
	"Charisma",
	"Tetric",
	"Venus",
	"Esthet-X",
	"Dentsply",
	"Kerr",
	"Voco",
	"Kulzer",
	"IPS e.max",
	"E.max",
	"Ivoclar",
	"Katana",
	"Prettau",
	"BruxZir",
	"Aidite",
	"Cercon",
	"ZirCAD",
	"Lava",
	"Noritake",
	"Vita",
	"Zoom",
	"Beyond",
	"Opalescence",
	"Amazing White",
	"Philips",
	"EMS",
	"Air Flow",
	"Vector",
	"Ultracain",
	"Ubistesin",
	"Septanest",
	"3Shape",
	"Medit",
	"Sirona",
	"Planmeca",
	"Vatech",
	"Carestream",
	"KaVo",
	"NSK",
	"W&H",
];

function normalizeText(value: string): string {
	return value
		.normalize("NFKC")
		.replace(/[‐‑‒–—]/g, "-")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeKey(value: string): string {
	return normalizeText(value)
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9]+/gi, " ")
		.trim();
}

function matchesAny(line: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(line));
}

function classifyLine(
	line: string,
	preferredSpecialty: DentalSpecialty,
): Classification {
	const rule = categoryRules.find((candidate) =>
		matchesAny(line, candidate.patterns),
	);
	if (rule) {
		return {
			category: rule.value,
			specialty:
				preferredSpecialty !== "universal" && rule.value !== "imaging"
					? preferredSpecialty
					: rule.specialty,
			treatmentKind: rule.treatmentKind,
		};
	}

	return {
		category: "other",
		specialty: preferredSpecialty,
		treatmentKind: "unclassified",
	};
}

function firstRuleValue<T extends string>(
	line: string,
	rules: Array<KeywordRule<T>>,
	fallback: T,
): T {
	return (
		rules.find((candidate) => matchesAny(line, candidate.patterns))?.value ??
		fallback
	);
}

function detectBrand(line: string): string | null {
	const normalized = normalizeKey(line);
	return (
		brandRules.find((brand) => normalized.includes(normalizeKey(brand))) ?? null
	);
}

/*
 * ТИП КОРОНКИ. «Многослойный цирконий» ТРЕБУЕТ, ЧТОБЫ МАТЕРИАЛ И БЫЛ ЦИРКОНИЕМ.
 *
 * БЫЛО: `if (/multi\s*layer|мульти/i.test(line)) return "zirconia multilayer";`
 * стояло ПЕРВЫМ, до всякой проверки материала. «Мульти» — слишком широкий корень:
 * «мультиюнит» (Multi-Unit) это тип АБАТМЕНТА у Straumann и Nobel, а не материал
 * коронки. Замер ведущего (находка ревьюера волны OO):
 *
 *   «Коронка на мультиюнит абатменте 30000 руб»   материал abutment
 *                                                 → crownType «zirconia multilayer»
 *
 * То есть разборщик объявлял ЦИРКОНИЙ в строке, где цирконий не назван ни словом,
 * и материал сам определился как «абатмент». Это выдумывание МАТЕРИАЛА — родня
 * выдумыванию цены, и уезжает оно тем же путём: в каталог, в план лечения, в
 * документ, который подписывает пациент. Материал в подписанном документе — это
 * обещание пациенту, чем ему поставят коронку.
 *
 * ПОЧИНКА СТРУКТУРНАЯ, А НЕ СПИСКОМ СЛОВ. Запрещать «мультиюнит» по имени значило
 * бы ждать следующего слова с тем же корнем. «Многослойный цирконий» по
 * определению цирконий, поэтому заявка требует материала `zirconia` — и тогда ни
 * одно слово с корнем «мульти» не может назначить материал само.
 *
 * ЦЕНА ОШИБКИ В ДРУГУЮ СТОРОНУ МЕНЬШЕ: строка «Коронка multilayer» без названного
 * материала теперь даёт «crown» вместо «zirconia multilayer». Это отказ от
 * уточнения, а не выдумка, и он согласован со стоячим законом файла — не можешь
 * определить, не угадывай.
 */
function detectCrownType(
	line: string,
	materialKind: DentalMaterialKind,
): string | null {
	if (!/корон|crown/i.test(line)) return null;
	if (materialKind === "zirconia" && /multi\s*layer|мульти/i.test(line))
		return "zirconia multilayer";
	if (materialKind === "zirconia") return "zirconia";
	if (materialKind === "lithium_disilicate") return "lithium disilicate";
	if (materialKind === "metal_ceramic") return "metal ceramic";
	if (materialKind === "pmma") return "temporary PMMA";
	if (materialKind === "ceramic") return "ceramic";
	return "crown";
}

function detectUnit(line: string): string {
	if (/челюст|jaw/i.test(line)) return "jaw";
	if (/канал/i.test(line)) return "canal";
	if (/сегмент/i.test(line)) return "segment";
	if (/этап/i.test(line)) return "stage";
	if (/зуб|tooth/i.test(line)) return "tooth";
	if (/имплант/i.test(line)) return "implant";
	if (/аба[тд]мент|abutment/i.test(line)) return "abutment";
	if (/прием|визит/i.test(line)) return "visit";
	return "service";
}

function detectToothScope(line: string): string | null {
	const allOn = line.match(/\ball[-\s]?on[-\s]?(4|6)\b/i);
	if (allOn) return `all-on-${allOn[1]}`;
	const toothRange = line.match(/\b([1-4][1-8])\s*[-,]\s*([1-4][1-8])\b/);
	if (toothRange) return `${toothRange[1]}-${toothRange[2]}`;
	const tooth = line.match(/\b(?:зуб\s*)?([1-4][1-8])\b/);
	return tooth?.[1] ?? null;
}

function classifyMaterial(line: string): MaterialClassification {
	const materialKind = /аба[тд]мент|abutment|формировател/i.test(line)
		? "abutment"
		: firstRuleValue(line, materialRules, "unknown");
	const restorationType = firstRuleValue(line, restorationRules, "none");
	return {
		materialKind,
		restorationType,
		crownType: detectCrownType(line, materialKind),
		brand: detectBrand(line),
		unit: detectUnit(line),
		toothScope: detectToothScope(line),
	};
}

/*
 * Цена строки прайса — вместе с копейками.
 *
 * БЫЛО: value.replace(/[^\d]/g, "") выбрасывало ВСЁ, кроме цифр, а затем
 * Math.round округлял результат до рубля. Копейки исчезали ещё до контракта,
 * поэтому priceRub, minPriceRub, maxPriceRub и averagePriceRub не могли стать
 * дробными ни при каком прайсе: клиника вставляла строку «Лечение кариеса
 * 1500,50» и получала услугу за 1500 ₽, молча, без предупреждения. Хуже того,
 * при удалении разделителя «1500,50» превращалось бы в 150050 — от этого
 * спасало только то, что регулярка десятичную часть вообще не захватывала.
 *
 * Разделитель разрядов и десятичный разделитель различаются числом цифр после
 * него: РОВНО ТРИ — это разряды (1.500 = 1500), ОДНА ИЛИ ДВЕ — копейки
 * (1500,50 = 1500,50; 1500,5 = 1500,50). Другого способа развести их в русском
 * прайсе нет, и обе записи в прайсах встречаются.
 */
function parseMoney(value: string | undefined): number | null {
	if (!value) return null;
	const trimmed = value.trim();
	const decimalMatch = /[.,](\d{1,2})$/.exec(trimmed);
	// «1500,5» — это 50 копеек, а не 5: дополняем до двух знаков справа.
	const kopecks = decimalMatch ? (decimalMatch[1] ?? "").padEnd(2, "0") : "00";
	const rubles = (
		decimalMatch ? trimmed.slice(0, decimalMatch.index) : trimmed
	).replace(/[^\d]/g, "");
	if (!rubles) return null;
	const price = Number(`${rubles}.${kopecks}`);
	return Number.isFinite(price) && price >= 300 && price <= 2_000_000
		? Math.round(price * 100) / 100
		: null;
}

/**
 * Отрезок исходной строки, из которого РЕАЛЬНО прочитана цена.
 *
 * Название услуги теряет ровно этот отрезок и ничего больше — см.
 * stripPriceFromTitle.
 */
type PriceSpan = { start: number; end: number };

type PriceCandidate = PriceSpan & {
	priceRub: number;
	priceMaxRub: number | null;
	explicit: boolean;
	/** Число приклеено к букве слева — см. gluedToWordPattern. */
	glued: boolean;
};

/*
 * Денежная сумма: разряды пробелом или точкой, копейки одной-двумя цифрами.
 *
 * Десятичная часть обязана попадать в ЗАХВАТ, иначе parseMoney её никогда не
 * увидит: раньше регулярка останавливалась на запятой, «1500,50» отдавало
 * «1500», а отброшенное «50» не проходило нижнюю границу цены и терялось
 * совсем. Три цифры после разделителя по-прежнему читаются как разряды первой
 * альтернативой.
 */
/*
 * РАЗРЯДНАЯ ГРУППИРОВКА ОБЯЗАНА ЗАКАНЧИВАТЬСЯ НА НЕ-ЦИФРЕ. Иначе она склеивает
 * хвост названия модели с началом настоящей цены.
 *
 * Измерено на живом разборщике до правки, все три строки — реальные бренды,
 * которые есть в любом русском стоматологическом прайсе:
 *   «Пломба Filtek Z550 3500»      → 550 350 ₽   переплата в 157 раз
 *   «Отбеливание Zoom 4 25000»     → 4 250 ₽     занижение в 6 раз
 *   «Имплантация Osstem TS3 45000» → 3 450 ₽     занижение в 13 раз
 * И предупреждений НОЛЬ во всех трёх, а названия при этом разрушены:
 * «Пломба Filtek Z 0», «Отбеливание Zoom 00», «Имплантация Osstem TS 00».
 *
 * Механизм: `\d{1,3}(?:[\s.]\d{3})+` из «Z550 3500» выхватывает «550 350» —
 * три цифры, пробел, три цифры, — а остаток «0» бросает в название. Из
 * «4 25000» точно так же берёт «4 250». Обе группировки НЕПОЛНЫЕ: сразу за
 * ними стоит цифра, то есть разряды не кончились, и значит это не разряды.
 *
 * `(?!\d)` отсекает ровно этот случай и не мешает настоящим разрядам: «12 500 руб»
 * заканчивается пробелом, «1 200 000» — концом строки. После отказа первой
 * альтернативы вторая берёт «3500» и «25000» целиком, то есть верную цену.
 *
 * Дефект был ДО правок этого файла: воспроизводится и на родителе. Пакет,
 * четыре раза правивший эту же функцию, объявил её «уже верной» — вердикт
 * неверный, и стоил он 157-кратной переплаты в подписываемом документе.
 */
const amountPattern =
	"\\d{1,3}(?:[\\s.]\\d{3})+(?:[.,]\\d{1,2})?(?!\\d)|\\d{3,7}(?:[.,]\\d{1,2})?";

/*
 * ЧИСЛО, ПРИКЛЕЕННОЕ К БУКВЕ СЛЕВА, — ЭТО ХВОСТ КОДА МОДЕЛИ, А НЕ ЦЕНА.
 *
 * `(?!\d)` выше починил склейку разрядов, но вторую половину дефекта не закрыл:
 * «Пломба Filtek Z550 3500» отдавала цену null. Вторая альтернатива
 * `\d{3,7}` находит «550» ВНУТРИ самого «Z550», кандидаты расходятся (550 и
 * 3500), и разборщик отказывается назначать цену — а написанные в строке 3500
 * человек видит. Измерено на дереве до этой правки, все формы дают null:
 *   «Пломба Filtek Z550 3500»       null   вместо 3500
 *   «Пломба Filtek Z550 3500,50»    null   вместо 3500,50
 *   «Пломба Filtek Z550 12 500»     null   вместо 12 500
 *   «Пломба Filtek Z5500 3500»      null   вместо 3500
 * Бренд с цифрой стоит в русском стоматологическом прайсе повсеместно: Filtek
 * Z550 и Z250, Osstem TS3, Zoom 4, Damon Q, Nobel Active 3.0, IPS e.max.
 *
 * ЗАПРЕТ СЛЕВА, КАК У ЗНАКА РУБЛЯ ЗАПРЕТ СПРАВА, ЗДЕСЬ БЫЛ БЫ НЕВЕРЕН, и это
 * измерено, а не выведено. Прямой lookbehind в amountPattern (или гашение через
 * notMoneyPatterns) уносит цену из трёх форм, которые СЕГОДНЯ читаются верно:
 *   «Осмотр1500»              1500 ₽        цена приклеена к названию услуги
 *   «от12000 до 18000»        12000–18000   предлог приклеен к нижней границе
 *   «от 12000 до18000»        12000–18000   предлог приклеен к верхней
 * Отличить «Z550» от «Осмотр1500» ни регистром, ни длиной слова нельзя: русский
 * прайс пишет названия капслоком, а «КТ», «ОПТГ», «ТРГ» — это короткие
 * заглавные аббревиатуры настоящих услуг, а не коды моделей.
 *
 * Поэтому приклеенность — не запрет, а ПОНИЖЕНИЕ В РАНГЕ, ровно как знак рубля
 * повышает: приклеенный кандидат выбрасывается ТОЛЬКО если в строке есть
 * отдельно стоящий (см. extractPrice). Если он единственный — он и остаётся
 * ценой, и ни одна строка цену не теряет.
 *
 * Дефис и точка внутри кода модели считаются частью склейки («RelyX U-550»,
 * «e.max550»): цифрам слева от них буква тоже приклеена. Разделителю диапазона
 * это не мешает — в «12000-18000» слева от дефиса стоит цифра, а не буква.
 */
const gluedToWordPattern = /[А-Яа-яЁёA-Za-z][-.]?$/u;

/*
 * Знак рубля с ЯВНЫМ запретом буквы справа.
 *
 * Без запрета альтернатива `р\.?` откусывает первую букву следующего слова, и
 * «1500 рублей залога» отдаёт «1500 р» как цену со знаком рубля, а из названия
 * услуги уносит «руб» из «рублей». Опираться на \b здесь НЕЛЬЗЯ: в JavaScript
 * он определён через [A-Za-z0-9_], кириллица словными символами не считается, и
 * границы слова после «руб» не возникает никогда.
 */
const currencyPattern = "(?:₽|руб\\.?|р\\.?)(?![А-Яа-яЁёA-Za-z])";

/*
 * ОДИН сканер цены на весь файл: и цена, и название услуги строятся из его
 * результата.
 *
 * БЫЛО: extractPrice и stripPriceFromTitle держали каждый свою регулярку с
 * своим списком разделителей диапазона, и разъезжались они молча. Добавили
 * разделитель только в разбор — цена читалась, а её текст оставался в названии
 * оборванным хвостом («Отбеливание 12000/»), который врач видит в каталоге, а
 * пациент в подписываемом документе. Добавили только в очистку названия —
 * нижняя граница исчезала из прайса совсем: из названия вырезана, в цену не
 * записана. Хуже того, очистка названия вырезала числа, ценой НЕ признанные:
 * «Седация 5000/120 мин» теряла минуты, «Лицензия 5678/2024» — номер лицензии.
 * Сканер отдаёт границы отрезка, и из названия уходит РОВНО прочитанная цена.
 *
 * Знак рубля допускается у КАЖДОЙ границы диапазона: «12000 руб - 18000 руб» и
 * «от 12000 руб до 18000 руб» — обычная запись русского прайса, а прежняя
 * регулярка знала знак рубля только у верхней границы. Из-за этого пара
 * распадалась, нижняя граница 12 000 ₽ пропадала из цены, а в названии
 * оставался висеть разделитель («Отбеливание -»).
 *
 * Слева от «от» стоит запрет буквы через lookbehind, а не \b: без него отрезок
 * начинался бы на «от» внутри слова и «Оборот 12000-18000» давало название
 * «Обор».
 */
const priceRegex = new RegExp(
	`(?:(?<![А-Яа-яЁёA-Za-z])от\\s*)?(?<low>${amountPattern})(?:\\s*${currencyPattern})?` +
		`(?:\\s*(?<separator>-|/|до)\\s*(?<high>${amountPattern})(?:\\s*${currencyPattern})?)?`,
	"gdiu",
);

/*
 * Отрезки, ценой не являющиеся, гасятся ПРОБЕЛАМИ ТОЙ ЖЕ ДЛИНЫ, а не выкидываются.
 *
 * Индексы отрезка считаются по исходной строке и уходят в очистку названия;
 * замена на один пробел сдвинула бы их, и из названия вырезался бы кусок
 * соседнего слова.
 */
const notMoneyPatterns = [
	// Код услуги по номенклатуре: A16.07.001.
	/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu,
	// Дата: 01.01.2025. Датой в прайсе помечают редакцию, а не цену.
	/\b\d{1,2}\.\d{1,2}\.\d{4}\b/giu,
	/*
	 * НОМЕР ТЕЛЕФОНА ГАСИТСЯ ЦЕЛИКОМ, А НЕ ПЕРВОЙ СВОЕЙ ГРУППОЙ.
	 *
	 * Правило подписи ниже кончается на `\s*\d+` и гасит РОВНО ОДНУ группу цифр
	 * после слова: из «тел 8 999 123 45 67» оно стирало «тел 8», а «999 123 45 67»
	 * доходило до сканера цены. Там разряды с пробелом (`\d{1,3}(?:[\s.]\d{3})+`)
	 * читают «999 123» как деньги, кандидат стоит ОТДЕЛЬНО от букв и потому
	 * старше приклеенного, и телефон клиники продавался как услуга. Измерено на
	 * дереве до этой правки:
	 *   «Тел 8 999 123 45 67»            → услуга «Тел 8 45 67» за 999 123 ₽
	 *   «Запись 8 (999) 123-45-67»       → услуга «Запись 8 ( ) 123-45-67» за 999 ₽
	 *   «Осмотр1500 тел 8 999 123 45 67» → 999 123 ₽ вместо 1500 ₽ (в 666 раз выше)
	 * Предупреждения не было ни одного. Контактную строку клиника вставляет вместе
	 * с прайсом всегда — «Запись по телефону …» стоит в каждом втором прайсе, — и
	 * из середины номера при этом вырезался кусок как будто это цена, поэтому в
	 * каталоге оставалось «Тел 8 45 67». Цена в миллион рублей доезжает из прайса в
	 * план лечения и в подписываемый пациентом документ.
	 *
	 * ЭТО ПРАВИЛО ОБЯЗАНО СТОЯТЬ ВЫШЕ ПРАВИЛА ПОДПИСИ. Гашение идёт reduce'ом по
	 * порядку массива: сработай подпись первой, она съест «тел 8», префикс номера
	 * исчезнет, и телефон уже не опознать.
	 *
	 * ЦЕНУ ЭТА РЕГУЛЯРКА СЪЕСТЬ НЕ МОЖЕТ, и это структурная гарантия, а не расчёт
	 * на удачу: после «8» или «+7» она требует РОВНО 10 цифр в группировке
	 * 3-3-2-2, то есть одиннадцатизначное число. Цен такой длины не существует —
	 * «Имплантация 1 200 000» это семь цифр и первая группа в ней одна цифра, а не
	 * три, поэтому совпадения нет. Запрет цифры справа не даёт правилу оборваться
	 * на середине более длинной последовательности.
	 */
	/(?:\+7|(?<!\d)8)\s*\(?\s*\d{3}\s*\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)/giu,
	/*
	 * Число, ПОДПИСАННОЕ слева словом «это не деньги»: «кабинет 412», «каб. 3»,
	 * «этаж 2», «код 1024», «№ 7», «тел. 5551234».
	 *
	 * Номер кабинета — главный источник ложной цены в русском прайсе: он стоит в
	 * конце строки, состоит из трёх цифр и проходит нижнюю границу цены в 300 ₽,
	 * то есть от настоящей цены отличается ТОЛЬКО подписью слева. Измерено на
	 * дереве до правки: «Имплантация 45000 кабинет 412» давала 412 ₽ — в сто
	 * девять раз ниже написанного.
	 *
	 * Слева стоит запрет буквы через lookbehind, а не \b: в JavaScript \b
	 * определён через [A-Za-z0-9_], кириллица словным символом не считается, и без
	 * запрета «тел» нашлось бы внутри слова.
	 *
	 * «No» в списке — это ЗНАК НОМЕРА ПОСЛЕ NFKC. splitPricelistLines приводит
	 * строку через normalizeText, а NFKC раскладывает «№» (U+2116) в латинские
	 * «No», поэтому до сканера цены символ «№» не доходит никогда. Правило,
	 * знающее только «№», молча не срабатывало: «Осмотр 1500 № 412» осталось без
	 * цены. Измерено.
	 */
	/(?<![А-Яа-яЁёA-Za-z])(?:кабинет|каб|офис|этаж|код|№|No|телефон|тел)\.?\s*(?:№|No)?\s*\d+/giu,
	/*
	 * Число с ЕДИНИЦЕЙ ИЗМЕРЕНИЯ справа: «120 мин», «1000 дней», «500 мл»,
	 * «16 лет», «10 %». Единица измерения — не рубль, и такое число ценой не
	 * является ни в одном прайсе. Измерено до правки: «Коронка 15000 гарантия
	 * 1000 дней» оценивала коронку в 1000 ₽.
	 *
	 * Гашение идёт только в тексте, по которому ищется цена: длительность приёма
	 * читается из исходной строки (durationFromLine), и в названии услуги минуты
	 * остаются на месте.
	 *
	 * РАЗДЕЛИТЕЛЬ РАЗРЯДОВ ЗДЕСЬ НЕ ДОПУСКАЕТСЯ, И ЭТО НЕ УПУЩЕНИЕ. Первая версия
	 * правила разрешала пробел внутри числа (`\d+(?:[\s.,]\d+)*`), и жадный захват
	 * съедал ЦЕНУ, стоящую слева: в «Гигиена 3000 1 час» гасилось «3000 1 час»
	 * целиком, строка оставалась без цены вообще. Измерено на этой же строке.
	 * Длительность, объём и количество тысячами не пишут, а цена слева от них
	 * стоит постоянно.
	 */
	/\d+(?:[.,]\d+)?\s*(?:мин(?:ут\w*)?|час(?:а|ов)?|дн(?:ей|я)|день|суток|недел\w*|месяц\w*|лет|года?|мл|мг|шт|ед|мм|см|%)(?![А-Яа-яЁёA-Za-z])/giu,
];

function blankNotMoney(line: string): string {
	return notMoneyPatterns.reduce(
		(text, pattern) =>
			text.replace(pattern, (fragment) => " ".repeat(fragment.length)),
		line,
	);
}

/*
 * ЗНАК РУБЛЯ РЯДОМ С ЧИСЛОМ — ПОДПИСЬ ЧЕЛОВЕКА «ЭТО ЦЕНА УСЛУГИ».
 *
 * Проверка нужна там, где parseMoney от цены ОТКАЗАЛСЯ: ниже 300 ₽, выше
 * 2 000 000 ₽ или неоднозначно. Отказ от цены — законный исход (price_not_found),
 * а вот удаление всей позиции из прайса законным не является, и решать это по
 * категории нельзя: список ключевых слов categoryRules конечен, «полировка» и
 * «реабилитация» в него не входят, и строка исчезала целиком (см.
 * isPricelistServiceRow).
 *
 * ЭТО НЕ currencyPattern, И РАЗЛИЧИЕ СУЩЕСТВЕННО. Тот запрещает букву справа,
 * потому что отдаёт ГРАНИЦЫ ОТРЕЗКА, и из названия услуги нельзя вырезать «руб»
 * из «рублей». Здесь отрезок не нужен — нужен факт «человек написал знак рубля»,
 * поэтому «290 рублей» и «290 рубля» считаются подписью так же, как «290 руб».
 * Ошибка в другую сторону дороже: она удаляет услугу из прайса клиники.
 *
 * Знак обязан стоять ВПЛОТНУЮ к числу (между ними только пробелы): «Прайс 2025 в
 * рублях» подписью не является, и служебная строка услугой от этого не станет.
 * Не-деньги гасятся тем же blankNotMoney, что и в сканере цены, поэтому «дата
 * редакции», номер кабинета и телефон до проверки не доходят.
 */
/*
 * ОДИН ВЛАДЕЛЕЦ НАПИСАНИЙ ДЕНЕЖНОГО ЗНАКА НА ДВА ВОПРОСА.
 *
 * Вопросов про знак рубля в этом файле ровно два, и они разные:
 *   • «есть ли в СТРОКЕ подписанное деньгами число» — explicitPriceMarkRegex;
 *   • «подписано ли деньгами ИМЕННО ЭТО число» — ownPriceMarkRegex.
 * Список написаний («руб», «рублей», «рубля», «₽», «р.») у них обязан быть один:
 * два списка разъезжаются молча, и этот файл на таком уже терял цену — см.
 * историю currencyPattern и stripPriceFromTitle.
 */
const priceMarkSpellings =
	"(?:₽|руб(?:л[а-яё]+)?\\.?|р\\.?)(?![А-Яа-яЁёA-Za-z])";

const explicitPriceMarkRegex = new RegExp(`\\d\\s*${priceMarkSpellings}`, "iu");

/*
 * ПОДПИСАНО ЛИ ДЕНЬГАМИ ИМЕННО ЭТО ЧИСЛО, а не какое-то другое в той же строке.
 *
 * ЗАЧЕМ ПОНАДОБИЛОСЬ. Отказ от года редакции спрашивал признак ПО СТРОКЕ, и
 * рядом стояло объяснение: «если знак рубля подписывает ДРУГОЕ число, то у того
 * числа стоит explicit, и extractPrice выбирает из явных кандидатов, а не из
 * года». Это допущение НЕВЕРНО, когда другое число НЕ СТАЛО КАНДИДАТОМ ВООБЩЕ.
 *
 * Замер ревьюера пакета NN1, механизм доразобран ведущим (оба прогона EXIT=0):
 *   «Прайс-лист 2025, скидка 100 руб»  →  2025 ₽, и до правки года, и после
 * «скидка 100 руб» кандидатом не является: 100 ₽ ниже окна правдоподобия в 300 ₽,
 * и parseMoney отдаёт null. Но знак рубля этого ОТВЕРГНУТОГО числа делал признак
 * по строке истинным, отказ от года отключался, и годом оценивалась услуга в
 * строке, которая называет сам документ. Подпись принадлежала не-кандидату, а
 * действовала на кандидата.
 *
 * ПОЧЕМУ НЕ lowHasCurrency, хотя это признак кандидата. Он построен из
 * currencyPattern, который отдаёт ГРАНИЦЫ ОТРЕЗКА и потому обязан запрещать букву
 * справа — полного написания «2025 рублей» он не знает никогда. Первая версия
 * отказа смотрела на него и теряла законную цену; ревьюер это перемерил заново
 * (EXIT=1 на «Консультация 2025 рублей»). Здесь отрезок не нужен, нужен только
 * ответ да/нет, поэтому берутся все написания.
 *
 * Проверка идёт от ПЕРВОЙ ЦИФРЫ кандидата: разрешены только цифры, пробелы,
 * точки и запятые (то есть само число с разрядами и копейками), а дальше обязан
 * стоять знак. Буква между числом и знаком разрывает связь — именно этим
 * «2025, скидка 100 руб» отличается от «2025 рублей».
 */
const ownPriceMarkRegex = new RegExp(
	`^\\d[\\d\\s.,]*?\\s*${priceMarkSpellings}`,
	"iu",
);

/** Подписано ли деньгами число, начинающееся в scanText на позиции start. */
function numberCarriesPriceMark(scanText: string, start: number): boolean {
	return ownPriceMarkRegex.test(scanText.slice(start));
}

function hasExplicitPriceMark(line: string): boolean {
	return explicitPriceMarkRegex.test(blankNotMoney(line));
}

/**
 * Четырёхзначный год: 1900–2099.
 *
 * Номер лицензии, договора и полиса в России пишут через косую черту с годом
 * («5678/2024»), то есть той же записью, что диапазон цены. Без знака рубля
 * различить их структурно нечем, и выбор здесь между «выдумать цену» и
 * «отказаться от цены»: отказ виден пользователю как предупреждение
 * price_not_found, выдуманная цена не видна никак и доезжает до плана лечения.
 */
function looksLikeYear(value: string): boolean {
	return /^(?:19|20)\d{2}$/.test(value.trim());
}

/*
 * СТРОКА НАЗЫВАЕТ САМ ДОКУМЕНТ, А НЕ УСЛУГУ: «Прайс-лист 2025», «Редакция 2024»,
 * «Тарифы действуют с 2019».
 *
 * Список работает ТОЛЬКО на четырёхзначном годе (см. looksLikeEditionYear),
 * поэтому цену он унести не может: «Прайс отбеливания 15000» не содержит года, и
 * ни одно из этих слов на неё не влияет.
 *
 * СЛОВО «ИЗМЕНЕНИЕ» ЗДЕСЬ ТРЕБУЕТ КОНТЕКСТА ДОКУМЕНТА, И ЭТО ИЗМЕРЕНО, А НЕ
 * ПРЕДПОЛОЖЕНО. Голое /изменени/ совпадало с НАЗВАНИЕМ НАСТОЯЩЕЙ УСЛУГИ, и
 * законная услуга исчезала из прайса целиком (замер ревьюера пакета NN1,
 * перемерен ведущим, оба прогона EXIT=0):
 *
 *   «Изменение формы зуба 2000»       было 2000 ₽  →  стало 0 ПОЗИЦИЙ
 *   «Изменение формы зуба 2000 руб»   2000 ₽       (спасал только знак рубля)
 *
 * «Изменение формы зуба» и «Изменение прикуса» — обычные позиции ортодонтического
 * прайса. В документном смысле это слово стоит иначе: «с изменениями», «изменения
 * от 2025», «изменение № 3», — то есть рядом с «с», «от» или знаком номера.
 * Поэтому закреплён контекст, а не само слово. Ошибка в эту сторону дешевле:
 * непойманный заголовок даёт лишнюю строку, которую клиника видит и удалит сама, а
 * пойманная услуга исчезает молча.
 */
const documentEditionPatterns = [
	/прайс/i,
	/редакц/i,
	/верси[яи]/i,
	/действ(?:ител|у)/i,
	/утвержд/i,
	/тариф/i,
	// Только документный контекст: «с изменениями», «изменения от 2025», «изменение № 3».
	// Голое /изменени/ съедало услугу «Изменение формы зуба» — см. комментарий выше.
	/с\s+изменени/i,
	/изменени\w*\s*(?:от\b|№|no\b)/i,
	/приказ/i,
];

/*
 * ОКНО ГОДА РЕДАКЦИИ: сколько лет назад и вперёд от СЕГОДНЯШНЕГО года может
 * стоять год, которым помечают прайс.
 *
 * Прайс, который клиника грузит сегодня, помечен сегодняшним годом, годом
 * прошлой редакции или следующим («Тарифы на 2027»). Год редакции — величина
 * относительно даты загрузки по своей природе, поэтому границы и считаются от
 * сегодняшнего года, а не вписаны числом.
 */
const editionYearsBack = 6;
const editionYearsAhead = 1;

/**
 * КАЛЕНДАРНАЯ ОПОРА РАЗБОРА: год, который для ЭТОГО разбора считается
 * сегодняшним.
 *
 * ЗАЧЕМ ВХОД, А НЕ ЧТЕНИЕ ЧАСОВ НА МЕСТЕ. Окно года редакции обязано считаться
 * от сегодняшней даты — это сказано выше и остаётся верным. Но пока
 * `new Date().getFullYear()` стоял ВНУТРИ looksLikeEditionYear, у результата
 * разбора не было опоры, кроме даты прогона:
 *   • один и тот же прайс разбирался по-разному в разные годы, и никто этого не
 *     выбирал. Измерено подменой Date.prototype.getFullYear (зонд, истинный код
 *     выхода 0): «Отбеливание 2025» отдаёт priceRub: null при часах 2026-2031 и
 *     2025 ₽ при часах 2032-2033 — заголовок раздела прайса становится услугой
 *     за 2025 ₽ сам собой, от смены года на машине;
 *   • разбор нельзя воспроизвести: чтобы объяснить клинике, почему в её прайсе
 *     цена не прочитана, надо знать не только текст, но и день прогона;
 *   • проверка, закрепляющая поведение на конкретном годе, молча перестаёт
 *     проверять дефект, когда окно с этого года уезжает, — и остаётся зелёной.
 *     Такая проверка хуже отсутствующей: она создаёт уверенность.
 * Часы читаются РОВНО ОДИН РАЗ на разбор — в calendarFromClock, у входа, — а год
 * едет вниз входом. Заодно это закрывает вторую, более редкую беду: чтение часов
 * стояло в цикле по кандидатам цены, и разбор, начавшийся 31 декабря, мог
 * применить к разным строкам ОДНОГО прайса разные окна.
 *
 * Календарь — отдельный тип, а не голое число, УМЫШЛЕННО: он едет пятым
 * аргументом рядом с номером строки и индексом записи, и два числа в такой
 * цепочке рано или поздно меняются местами молча. Тип делает подмену ошибкой
 * компиляции, а на месте вызова видно, что передаётся именно год.
 *
 * `generatedAt` в ответе часы читает по-прежнему и законно: там время генерации
 * ответа, а не вход разбора.
 */
export type PricelistCalendar = { currentYear: number };

/** Единственное место разбора прайса, где читаются часы машины. */
function calendarFromClock(): PricelistCalendar {
	return { currentYear: new Date().getFullYear() };
}

/**
 * Четырёхзначное число в строке — это ГОД ДОКУМЕНТА, а не цена услуги.
 *
 * ЗАЧЕМ ВООБЩЕ ПРИЗНАК, А НЕ ПРОСТОЙ ОТКАЗ ОТ ЧИСЕЛ 1900–2099. Отвергнуть всю
 * полосу нельзя: прицельный снимок, анестезия и консультация в русском прайсе
 * стоят 300–3000 ₽, а таблица сплошь и рядом приходит без знака рубля в строке
 * (знак стоит в шапке колонки, а шапку splitPricelistLines выбрасывает). Тогда
 * «Прицельный снимок ; 2000» потеряло бы цену, и выдуманная цена превратилась бы
 * в потерянную — обмен одного дефекта на другой.
 *
 * ПОЧЕМУ РЕШАЕТ БЛИЗОСТЬ К СЕГОДНЯШНЕМУ ГОДУ. Между «Отбеливание 2025»
 * (заголовок раздела прайса 2025 года) и «Прицельный снимок 2000» (цена 2000 ₽)
 * структурной разницы нет НИКАКОЙ: слово услуги плюс четырёхзначное число в конце
 * строки. Различает их только величина числа относительно даты загрузки: годом
 * прайса помечают недавний год, а 2000 в 2026 году годом редакции не бывает.
 * Полоса отказа от этого сужается с 200 значений до восьми, и круглым числом —
 * тем, каким пишут цену, — из них является ровно одно (2020).
 *
 * ПРЕДЛОГ В ПРИЗНАКИ НЕ ВЗЯТ УМЫШЛЕННО. «с 2025», «на 2025» выглядят как контекст
 * года, но «от 2025» — это законная открытая цена «от 2025 ₽», и priceRegex
 * читает «от» именно так. Правило по предлогу унесло бы её, поэтому его здесь нет.
 *
 * ЦЕНА, ПОПАВШАЯ В ЭТО ОКНО, НЕ ВЫДУМЫВАЕТСЯ И НЕ ПОДМЕНЯЕТСЯ ЧИСЛОМ: она
 * остаётся НЕИЗВЕСТНОЙ (priceRub: null) и печатается клинике как price_not_found,
 * а сама строка остаётся видимой в прайсе вместе с написанным в ней числом. Это
 * стоячий закон этого файла: не можешь определить цену — откажись, а не угадывай.
 */
function looksLikeEditionYear(
	line: string,
	yearText: string,
	calendar: PricelistCalendar,
): boolean {
	if (!looksLikeYear(yearText)) return false;
	if (matchesAny(line, documentEditionPatterns)) return true;
	const year = Number(yearText);
	return (
		year >= calendar.currentYear - editionYearsBack &&
		year <= calendar.currentYear + editionYearsAhead
	);
}

/**
 * ЧИСЛО, СТОЯЩЕЕ В scanText НА ПОЗИЦИИ start, — ГОД ДОКУМЕНТА, А НЕ ЦЕНА УСЛУГИ.
 *
 * ОДИН ВЛАДЕЛЕЦ ОТКАЗА ОТ ГОДА НА ОБА РЕЖИМА РАЗБОРА. Детерминированная ветка
 * спрашивает это про кандидата своего сканера, нейро-ветка — про число из ответа
 * модели (см. priceIsDocumentYear). Пока правило стояло только внутри
 * collectPriceCandidates, модель, прочитавшая «Прайс-лист 2025» как услугу за
 * 2025 ₽, проходила в каталог мимо него: дефект, закрытый в одной ветке, жил во
 * второй. Измерено прямым вызовом itemFromGroq до правки (истинный код выхода 0):
 *   «Прайс-лист 2025» + priceRub 2025 модели  →  услуга за 2025 ₽
 *   «Редакция 2024»   + priceRub 2024 модели  →  услуга за 2024 ₽
 * Этот файл платил за «двух владельцев одного правила» уже трижды: свёртка
 * убывающей пары цен жила отдельно на ветке ИИ, граница длительности приёма
 * стояла только в durationFromLine, гейт строк прайса не применялся к записям
 * модели вовсе.
 */
function editionYearInsteadOfPrice(
	line: string,
	scanText: string,
	start: number,
	numberText: string,
	calendar: PricelistCalendar,
): boolean {
	return (
		!numberCarriesPriceMark(scanText, start) &&
		looksLikeEditionYear(line, numberText, calendar)
	);
}

function collectPriceCandidates(
	line: string,
	calendar: PricelistCalendar,
): PriceCandidate[] {
	const scanText = blankNotMoney(line);
	const candidates: PriceCandidate[] = [];
	for (const match of scanText.matchAll(priceRegex)) {
		const groups: Record<string, string | undefined> = match.groups ?? {};
		const matchSpan = match.indices?.[0];
		const matchText = match[0] ?? "";
		if (!matchSpan || !matchText) continue;
		const lowGroupText = groups.low ?? "";
		const low = parseMoney(lowGroupText);
		if (low === null) continue;
		/*
		 * Приклеенность считается у НИЖНЕЙ ГРАНИЦЫ, а не у начала совпадения:
		 * совпадение может начинаться с «от», и тогда слева от него стоит пробел или
		 * начало строки, а буква — вплотную к самой цифре («от12000»).
		 *
		 * indexOf по тексту совпадения даёт точную позицию нижней границы: левее неё
		 * в совпадении может стоять только «от» с пробелами, а цифр там нет ни одной.
		 */
		const lowStart = matchSpan[0] + matchText.indexOf(lowGroupText);
		const glued = gluedToWordPattern.test(scanText.slice(0, lowStart));
		const hasCurrency = /(?:₽|руб|р)\.?$/iu.test(matchText.trimEnd());
		/*
		 * Номер документа ценой не считается ЦЕЛИКОМ, включая левую часть: признать
		 * ценой только «5678» значило бы и назначить услуге цену 5678 ₽, и вырезать
		 * это число из названия, оставив «Лицензия /2024».
		 */
		if (
			groups.separator === "/" &&
			groups.high &&
			!hasCurrency &&
			looksLikeYear(groups.high)
		)
			continue;
		const high = groups.high ? parseMoney(groups.high) : null;
		if (high === null) {
			/*
			 * Верхняя граница не деньги — значит диапазона нет, и ценой остаётся
			 * нижняя граница со своим знаком рубля. «Седация 5000/120 мин» теряет
			 * только «5000»: 120 не прошло нижнюю границу цены в 300 ₽ и остаётся в
			 * названии как минуты.
			 */
			const lowEnd = matchText.search(/\s*(?:-|\/|до)\s*\d/u);
			/*
			 * ЗНАК РУБЛЯ ИЩЕТСЯ У ОСТАВЛЕННОЙ ЦЕНЫ, А НЕ У ВСЕГО СОВПАДЕНИЯ.
			 *
			 * `hasCurrency` выше смотрит на конец ВСЕГО совпадения. В этой ветке
			 * совпадение заходит ЗА знак рубля и проглатывает разделитель вместе с
			 * отброшенным числом, поэтому «5000 руб/120» кончается цифрой, знак рубля
			 * не находится и цена объявляется неявной. А для неявных цен extractPrice
			 * берёт ПОСЛЕДНЕЕ число строки — и услугу оценивает номер кабинета:
			 * «Седация 5000 руб/120 мин кабинет 412» давала 412 ₽ вместо 5000 ₽.
			 * Занижение в двенадцать раз в цене, которая уходит в прайс клиники, затем
			 * в план лечения и в документ, подписываемый пациентом.
			 *
			 * Отрезок до `lowEnd` — ровно та часть, которую мы оставляем ценой, поэтому
			 * вопрос «есть ли знак рубля» задаётся именно ей.
			 */
			const lowText = lowEnd > 0 ? matchText.slice(0, lowEnd) : matchText;
			const lowHasCurrency = /(?:₽|руб|р)\.?$/iu.test(lowText.trimEnd());
			/*
			 * ГОД ДОКУМЕНТА БЕЗ ЗНАКА РУБЛЯ ЦЕНОЙ УСЛУГИ НЕ СТАНОВИТСЯ.
			 *
			 * looksLikeYear в этом файле стоял ровно в ОДНОМ месте — на верхней границе
			 * пары через косую черту («Лицензия 5678/2024»), — а одиночный год через
			 * него не проходил вовсе. Измерено зондом scratch/probe-year-as-price.ts
			 * (истинный код выхода 0) на дереве до правки:
			 *   «Прайс-лист 2025»     услуга «Прайс-лист» за 2025 ₽   [category_uncertain]
			 *   «Прайс 2025 в рублях» услуга «Прайс в рублях» за 2025 ₽ [category_uncertain]
			 *   «Редакция 2024»       услуга «Редакция» за 2024 ₽      [category_uncertain]
			 *   «Отбеливание 2025»    услуга «Отбеливание» за 2025 ₽   ПРЕДУПРЕЖДЕНИЙ НЕТ
			 * Худшая строка — последняя, и хуже она КАЧЕСТВЕННО. «Прайс-лист» и
			 * «Редакция» ни в одно правило categoryRules не попадают, поэтому у них хотя
			 * бы стоит category_uncertain. А «отбел» в правилах hygiene есть: категория
			 * опознана — предупреждения о ней нет, цена формально прочитана —
			 * price_not_found нет тем более. Не остаётся НИ ОДНОГО признака, и заголовок
			 * раздела прайса с годом уезжает в каталог услуг ценой 2025 ₽, оттуда в план
			 * лечения, в счёт и в документ, который подписывает пациент.
			 *
			 * Знак рубля здесь — та же подпись человека «это цена», и владелец этого
			 * признака в файле уже есть: hasExplicitPriceMark, тот же, которым снимает
			 * себя гейт строк. Второго не появляется.
			 *
			 * СПРАШИВАТЬ ЗДЕСЬ lowHasCurrency БЫЛО НЕВЕРНО, И ЭТО ИЗМЕРЕНО, А НЕ
			 * ВЫВЕДЕНО. Первая версия этой проверки смотрела на lowHasCurrency —
			 * признак кандидата, построенный из currencyPattern, — и «Консультация 2025
			 * рублей» ТЕРЯЛА цену 2025 ₽ (проверка упала на этой строке). Причина в том,
			 * что currencyPattern отдаёт ГРАНИЦЫ ОТРЕЗКА и потому обязан запрещать букву
			 * справа: иначе из названия услуги вырезалось бы «руб» из «рублей». Полного
			 * написания он не знает никогда. hasExplicitPriceMark отрезок не отдаёт и
			 * знает все написания — «290 руб», «290 рублей», «290 ₽», — поэтому именно он
			 * отвечает на вопрос «подписал ли человек это число деньгами».
			 *
			 * ПРИЗНАК БЕРЁТСЯ ПО ЭТОМУ ЧИСЛУ, А НЕ ПО СТРОКЕ, И ЭТО ИСПРАВЛЕНИЕ.
			 *
			 * Здесь стоял признак по СТРОКЕ с объяснением: «если знак рубля подписывает
			 * ДРУГОЕ число, то у того числа стоит explicit, и extractPrice выбирает из
			 * явных кандидатов, а не из года». Допущение неверно, когда другое число НЕ
			 * СТАЛО КАНДИДАТОМ ВООБЩЕ. Замер (ревьюер NN1, механизм доразобран ведущим):
			 *   «Прайс-лист 2025, скидка 100 руб»  →  2025 ₽
			 * «скидка 100 руб» кандидатом не является — 100 ₽ ниже окна в 300 ₽, и
			 * parseMoney отдаёт null, — но её знак рубля отключал отказ от года для
			 * ДРУГОГО числа, и годом оценивалась услуга в строке, называющей документ.
			 *
			 * numberCarriesPriceMark спрашивает про отрезок, начинающийся на этом числе,
			 * и знает все написания («2025 рублей» тоже), поэтому законная цена не
			 * теряется, а чужая подпись больше не действует.
			 */
			if (
				editionYearInsteadOfPrice(
					line,
					scanText,
					lowStart,
					lowGroupText,
					calendar,
				)
			)
				continue;
			/*
			 * Разделитель в отрезок цены НЕ включается, и висеть в названии его
			 * оставляет не эта ветка: он снимается на срезе, в stripPriceFromTitle.
			 * Здесь его границу знать нельзя — гашение не-денег (notMoneyPatterns)
			 * стирает отброшенное число ещё до сканера, разделитель остаётся вне
			 * совпадения, и «5000 руб/120 мин» приходит сюда как «5000 руб».
			 */
			candidates.push({
				priceRub: low,
				priceMaxRub: null,
				explicit: lowHasCurrency,
				glued,
				start: matchSpan[0],
				end: lowEnd > 0 ? matchSpan[0] + lowEnd : matchSpan[1],
			});
			continue;
		}
		/*
		 * Пара сортируется, а не отбрасывается.
		 *
		 * БЫЛО: верхняя граница ниже нижней просто зачёркивалась (priceMaxRub: null),
		 * и пара СХЛОПЫВАЛАСЬ в оставшееся первое число. «Консультация 1000/500 руб»
		 * — «1000 первичная / 500 повторная» — давала одну цену 1000 ₽: каждая
		 * консультация в прайсе стоила вдвое дороже написанного, молча, и 500 ₽
		 * исчезали. Прежний коммит утверждал, что проверка priceMaxRub >= priceRub
		 * делает исход безопасным; она делала его дороже для пациента.
		 *
		 * Два числа в строке прайса — это либо диапазон, либо две опции («первичная
		 * / повторная»). В обоих случаях меньшее — нижняя граница, большее —
		 * верхняя, и порядок записи на это не влияет.
		 */
		candidates.push({
			priceRub: Math.min(low, high),
			priceMaxRub:
				Math.max(low, high) > Math.min(low, high) ? Math.max(low, high) : null,
			explicit: true,
			glued,
			start: matchSpan[0],
			end: matchSpan[1],
		});
	}
	return candidates;
}

function extractPrice(
	line: string,
	calendar: PricelistCalendar,
): {
	priceRub: number | null;
	priceMaxRub: number | null;
	pricedSpan: PriceSpan | null;
} {
	const candidates = collectPriceCandidates(line, calendar);
	const explicit = candidates.filter((candidate) => candidate.explicit);
	const withCurrency = explicit.length ? explicit : candidates;
	/*
	 * ПРИКЛЕЕННОЕ К БУКВЕ ЧИСЛО ВЫБРАСЫВАЕТСЯ ТОЛЬКО ПРИ НАЛИЧИИ ОТДЕЛЬНО
	 * СТОЯЩЕГО.
	 *
	 * «Пломба Filtek Z550 3500» даёт двух кандидатов: «550» из кода модели и
	 * настоящие «3500». Раньше они расходились, строка объявлялась неоднозначной и
	 * цену не получала вовсе. Хвост кода модели ценой не бывает никогда, а число,
	 * стоящее отдельно, бывает всегда, поэтому выбор между ними структурный, а не
	 * позиционный — угадывать позицию этот файл отказывается (см. ниже).
	 *
	 * ОТКАТА К ПУСТОМУ НАБОРУ ЗДЕСЬ НЕТ, И ЭТО НЕ ЗАПАС ПРОЧНОСТИ, А ЕДИНСТВЕННЫЙ
	 * СПОСОБ НЕ СЛОМАТЬ ТРИ РАБОЧИЕ ФОРМЫ. «Осмотр1500» (цена вплотную к названию)
	 * и «от12000 до 18000» / «от 12000 до18000» (предлог вплотную к границе
	 * диапазона) состоят из ОДНОГО приклеенного кандидата, и жёсткий запрет унёс бы
	 * их цену. Измерено на этих строках: сегодня они дают 1500 ₽ и 12000–18000 ₽.
	 */
	const detached = withCurrency.filter((candidate) => !candidate.glued);
	const pool = detached.length ? detached : withCurrency;
	/*
	 * БЕЗ ЗНАКА РУБЛЯ НЕОДНОЗНАЧНАЯ СТРОКА ОСТАЁТСЯ БЕЗ ЦЕНЫ.
	 *
	 * БЫЛО: ценой назначалось ПОСЛЕДНЕЕ число строки. В русском прайсе последнее
	 * число — чаще номер кабинета, срок гарантии, длительность или количество,
	 * чем цена, и измерено это было прямо на дереве: «Седация 5000/120 мин
	 * кабинет 412» давала 412 ₽ вместо 5000 ₽, «Имплантация 45000 кабинет 412» —
	 * те же 412 ₽. Подписанные числа теперь гасятся ещё в сканере
	 * (notMoneyPatterns), но остаток — несколько чисел без знака рубля и без
	 * подписи — не различим НИЧЕМ: «Пломба 3500 4000» это и две опции, и две
	 * колонки таблицы, и цена с числом рядом.
	 *
	 * Выбор здесь тот же, что для номера документа «5678/2024» выше: выдумать
	 * цену или отказаться от неё. Отказ виден клинике как предупреждение
	 * price_not_found и стоит одной проверенной руками строки; выдуманная цена не
	 * видна никак и доезжает из прайса в план лечения, а оттуда в документ,
	 * который подписывает пациент. Позиционного правила, которое делает такую
	 * строку деньгами, не существует, поэтому правила и нет.
	 *
	 * Знак рубля неоднозначность снимает: у явных цен последняя остаётся
	 * выбранной (проверено на «Осмотр 500 руб, повторный осмотр 300 руб»).
	 */
	const ambiguous =
		!explicit.length &&
		new Set(
			pool.map(
				(candidate) => `${candidate.priceRub}/${candidate.priceMaxRub ?? "-"}`,
			),
		).size > 1;
	const selected = ambiguous ? undefined : pool.at(-1);
	if (!selected) return { priceRub: null, priceMaxRub: null, pricedSpan: null };
	return {
		priceRub: selected.priceRub,
		priceMaxRub: selected.priceMaxRub,
		pricedSpan: { start: selected.start, end: selected.end },
	};
}

/**
 * Название услуги без цены.
 *
 * Из названия уходит РОВНО тот отрезок, из которого прочитана цена, и ничего
 * больше: `pricedSpan` приходит из того же сканера, что priceRub и priceMaxRub.
 *
 * БЫЛО: очистка держала свои три регулярки и вырезала из названия всё, что на
 * цену ПОХОЖЕ, — со своим списком разделителей диапазона и без нижней границы
 * в 300 ₽. Из-за этого:
 *   • «Седация 5000/120 мин» превращалась в «Седация мин» — 120 минут признаны
 *     верхней границей цены при вырезании и отброшены при разборе, то есть
 *     удалено число, которое ценой не стало;
 *   • «Лицензия 5678/2024 …» теряла номер лицензии;
 *   • список разделителей приходилось держать синхронным с разбором вручную, и
 *     любое расхождение отдавало врачу оборванный хвост в каталоге
 *     («Отбеливание 12000-», «Отбеливание /») или молча выбрасывало нижнюю
 *     границу цены из прайса.
 * Название услуги попадает в план лечения и в подписываемый пациентом
 * документ, поэтому вырезать из него можно только распознанную цену.
 *
 * Коды услуг по номенклатуре («A16.07.001») удаляются отдельно: ценой они не
 * являются никогда, но и в названии услуги не нужны.
 */
function stripPriceFromTitle(
	line: string,
	pricedSpan: PriceSpan | null,
): string {
	/*
	 * РАЗДЕЛИТЕЛЬ, ОСТАВШИЙСЯ НА СРЕЗЕ ЦЕНЫ, УХОДИТ ВМЕСТЕ С НЕЙ — но только если
	 * за ним стоит ЧИСЛО.
	 *
	 * БЫЛО: «Седация 5000 руб/120 мин кабинет 412» давала название «Седация /120
	 * мин кабинет 412», «Гигиена 3000/1 час» — «Гигиена /1 час». Тот же оборванный
	 * хвост, который этот файл уже убрал у диапазона («Отбеливание 12000-»), с
	 * другой стороны числа. Врач видит название в каталоге, пациент — в
	 * подписываемом документе, и висящая косая черта читается там как сбой
	 * программы.
	 *
	 * Условие «дальше цифра» — не косметика. Косая черта перед СЛОВОМ несёт смысл
	 * «за единицу» и остаётся: «Коронка 15000/зуб» даёт «Коронка /зуб», а не
	 * «Коронка зуб», где предлог потерян вместе с чертой. Перед числом же
	 * разделитель значил диапазон, вторая граница ценой не признана, и держать его
	 * не за что.
	 */
	const withoutPrice = pricedSpan
		? `${line.slice(0, pricedSpan.start)} ${line.slice(pricedSpan.end).replace(/^\s*(?:-|\/|до)\s*(?=\d)/u, "")}`
		: line;
	return (
		normalizeText(
			withoutPrice.replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " "),
		)
			// Разделитель колонок из таблицы (табуляция стала « ; ») не должен висеть
			// на конце названия после того, как из него ушла цена.
			.replace(/[\s;|]+$/u, "")
			.trim()
	);
}

/**
 * Длительность приёма из строки прайса.
 *
 * СПРАВА СТОИТ ЗАПРЕТ БУКВЫ, А НЕ \b. Прежняя регулярка кончалась на `\b` после
 * «мин», и в русском прайсе она не срабатывала НИКОГДА: в JavaScript `\b`
 * определён через [A-Za-z0-9_], кириллическое «н» словным символом не считается,
 * и границы слова после «мин» не возникает ни перед пробелом, ни в конце строки.
 * Проверено прямым вызовом регулярки: «Седация 5000/120 мин» → нет совпадения,
 * «Sedation 120 minutes» → есть. То есть длительность читалась только из
 * английской строки, а весь русский прайс приезжал с durationMinutes: null, и
 * запись на приём теряла длину визита, которая в прайсе была написана.
 *
 * Это тот же способ порчи, из-за которого в этом файле нельзя опираться на `\b`:
 * см. currencyPattern и запрет буквы слева от «от» в priceRegex.
 */
function durationFromLine(line: string): number | null {
	const match = line.match(
		/\b(\d{1,3})\s*(?:мин(?:ут\w*)?|minutes?)(?![А-Яа-яЁёA-Za-z])/iu,
	);
	if (!match) return null;
	const duration = Number(match[1]);
	return Number.isFinite(duration) &&
		duration > 0 &&
		duration <= maxServiceDurationMinutes
		? duration
		: null;
}

function titleTokens(value: string): Set<string> {
	return new Set(
		normalizeKey(value)
			.split(/\s+/)
			.filter((token) => token.length >= 4),
	);
}

function matchServiceId(
	item: Pick<DentalPricelistItem, "category" | "specialty" | "title">,
	catalog: ServiceCatalogItem[],
): string | null {
	const sourceTokens = titleTokens(item.title);
	let best: { service: ServiceCatalogItem; score: number } | null = null;
	for (const service of catalog) {
		let score = service.category === item.category ? 2 : 0;
		if (
			service.specialty === item.specialty ||
			service.specialty === "universal"
		)
			score += 1;
		for (const token of titleTokens(service.title)) {
			if (sourceTokens.has(token)) score += 1;
		}
		if (score > (best?.score ?? 0)) best = { service, score };
	}
	return best && best.score >= 3 ? best.service.id : null;
}

function buildWarnings(input: {
	title: string;
	category: ServiceCategory;
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	priceRub: number | null;
	sourceKind: DentalPricelistAnalysisRequest["sourceKind"];
}): string[] {
	const warnings: string[] = [];
	if (!input.priceRub) warnings.push("price_not_found");
	if (input.category === "other") warnings.push("category_uncertain");
	if (
		input.materialKind === "unknown" &&
		["prosthetics", "orthodontics", "surgery", "therapy"].includes(
			input.category,
		)
	) {
		warnings.push("material_uncertain");
	}
	if (input.restorationType === "unknown")
		warnings.push("restoration_uncertain");
	if (input.title.length < 4) warnings.push("title_too_short");
	if (input.sourceKind === "photo_ocr")
		warnings.push("photo_ocr_requires_visual_review");
	return warnings;
}

function confidenceForItem(input: {
	title: string;
	category: ServiceCategory;
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	brand: string | null;
	priceRub: number | null;
}): number {
	let confidence = 0.35;
	if (input.priceRub !== null) confidence += 0.2;
	if (input.category !== "other") confidence += 0.18;
	if (input.materialKind !== "unknown") confidence += 0.1;
	if (input.restorationType !== "none" && input.restorationType !== "unknown")
		confidence += 0.08;
	if (input.brand) confidence += 0.05;
	if (input.title.length >= 8) confidence += 0.04;
	return Math.min(0.96, Number(confidence.toFixed(2)));
}

function splitPricelistLines(rawText: string): string[] {
	return rawText
		.split(/\r?\n/)
		.map((line) => normalizeText(line.replace(/\t/g, " ; ")))
		.filter((line) => line.length > 0)
		.filter(
			(line) =>
				!/^(код|артикул|услуга|наименование|цена|стоимость)(\s|;|$)/i.test(
					line,
				),
		);
}

function buildItemFromLine(
	line: string,
	lineNumber: number,
	input: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar,
): DentalPricelistItem {
	const classification = classifyLine(line, input.preferredSpecialty);
	const material = classifyMaterial(line);
	const price = extractPrice(line, calendar);
	const title = stripPriceFromTitle(line, price.pricedSpan) || line;
	const item: DentalPricelistItem = {
		id: `price-${lineNumber}`,
		sourceLine: lineNumber,
		sourceText: line,
		title,
		normalizedTitle: normalizeKey(title),
		category: classification.category,
		specialty: classification.specialty,
		treatmentKind: classification.treatmentKind,
		materialKind: material.materialKind,
		restorationType: material.restorationType,
		crownType: material.crownType,
		brand: material.brand,
		toothScope: material.toothScope,
		unit: material.unit,
		priceRub: price.priceRub,
		priceMaxRub: price.priceMaxRub,
		durationMinutes: durationFromLine(line),
		confidence: 0,
		warnings: [],
		matchedServiceId: null,
	};
	item.warnings = buildWarnings({ ...item, sourceKind: input.sourceKind });
	item.confidence = confidenceForItem(item);
	item.matchedServiceId = matchServiceId(item, catalog);
	return dentalPricelistItemSchema.parse(item);
}

function summarize(
	items: DentalPricelistItem[],
): DentalPricelistCategorySummary[] {
	const grouped = new Map<string, DentalPricelistItem[]>();
	for (const item of items) {
		const key = `${item.category}:${item.specialty}`;
		grouped.set(key, [...(grouped.get(key) ?? []), item]);
	}

	return Array.from(grouped.values())
		.map((group) => {
			const prices = group
				.map((item) => item.priceRub)
				.filter((price): price is number => price !== null);
			const materials = Array.from(
				new Set(
					group
						.map((item) => item.materialKind)
						.filter((kind) => kind !== "unknown"),
				),
			).sort();
			const brands = Array.from(
				new Set(
					group
						.map((item) => item.brand)
						.filter((brand): brand is string => Boolean(brand)),
				),
			).sort();
			return {
				category: group[0]?.category ?? "other",
				specialty: group[0]?.specialty ?? "universal",
				count: group.length,
				pricedCount: prices.length,
				minPriceRub: prices.length ? Math.min(...prices) : null,
				maxPriceRub: prices.length ? Math.max(...prices) : null,
				// Среднее по копеечным ценам округляем до КОПЕЙКИ, а не до рубля: min и
				// max в этой же сводке — дословные копии priceRub строки прайса, и
				// среднее целым рублём выпадало из их диапазона на глазах у
				// пользователя (min 1500,50 · max 1500,50 · среднее 1501).
				//
				// Складываются ЦЕЛЫЕ КОПЕЙКИ, а не рубли с плавающей точкой:
				// 300.01 + 300.05 + 300.07 в double даёт 900.1299999999999 или 900.13 в
				// зависимости от порядка слагаемых, и на длинном прайсе накопленная
				// ошибка сдвигает среднее на копейку. Деление на количество — единственное
				// место, где точность теряется по существу задачи, и остаток отбрасывается
				// ровно один раз, в конце.
				averagePriceRub: prices.length
					? Number(
							kopecksToNumericString(
								Math.round(
									sumKopecks(prices.map((price) => parseKopecks(price))) /
										prices.length,
								),
							),
						)
					: null,
				materialKinds: materials,
				brands,
			} satisfies DentalPricelistCategorySummary;
		})
		.sort((left, right) => right.count - left.count);
}

function createVisionStatus(
	used: boolean,
	reason: string,
	modelName: string | null,
) {
	const keyPool = getProviderKeyPoolSummary(groqProviderId);
	return {
		providerId: groqProviderId,
		configured: keyPool.configuredKeyCount > 0,
		used,
		modelName,
		maxImagesPerRequest: maxGroqImagesPerRequest,
		reason,
	};
}

function decodeBase64ImagePayload(value: string): Buffer | null {
	const cleaned = value
		.trim()
		.replace(/^data:[^,]+,/i, "")
		.replace(/\s+/g, "");
	if (
		!cleaned ||
		cleaned.length % 4 === 1 ||
		!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)
	)
		return null;
	const buffer = Buffer.from(cleaned, "base64");
	return buffer.length >= 12 ? buffer : null;
}

function isExpectedImagePayload(
	request: DentalPricelistAnalysisRequest,
): boolean {
	if (!request.imageBase64) return true;
	const buffer = decodeBase64ImagePayload(request.imageBase64);
	if (!buffer) return false;
	if (request.imageMimeType === "image/jpeg") {
		return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
	}
	if (request.imageMimeType === "image/png") {
		return buffer
			.subarray(0, 8)
			.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
	}
	if (request.imageMimeType === "image/webp") {
		return (
			buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
			buffer.subarray(8, 12).toString("ascii") === "WEBP"
		);
	}
	return false;
}

function groqPricelistModelName(): string {
	return (
		process.env.GROQ_PRICELIST_MODEL?.trim() ||
		process.env.DENTAL_PRICELIST_GROQ_MODEL?.trim() ||
		"meta-llama/llama-4-scout-17b-16e-instruct"
	);
}

function responseFromItems(input: {
	request: DentalPricelistAnalysisRequest;
	items: DentalPricelistItem[];
	parserMode: PricelistParserMode;
	warnings: string[];
	aiUsed: boolean;
	aiReason: string;
	modelName: string | null;
}): DentalPricelistAnalysisResponse {
	return dentalPricelistAnalysisResponseSchema.parse({
		sourceName: input.request.sourceName,
		sourceKind: input.request.sourceKind,
		parserMode: input.parserMode,
		generatedAt: new Date().toISOString(),
		items: input.items,
		summary: summarize(input.items),
		warnings: input.warnings,
		aiVision: createVisionStatus(input.aiUsed, input.aiReason, input.modelName),
		groqJsonPromptVersion: groqPromptVersion,
	});
}

/**
 * Строка прайса — это услуга, а не адрес клиники, дата редакции или заголовок
 * колонки.
 *
 * Гейт нужен: в присланном тексте стоят «Прайс-лист действителен с 01.01.2025»,
 * «г. Москва, ул. Ленина, д. 5», телефон записи. Оставить всё — значит завести
 * услугу на каждую такую строку.
 *
 * НО ЗНАК РУБЛЯ ГЕЙТ СНИМАЕТ, и это третье условие здесь появилось потому, что
 * без него ЗАКОННАЯ УСЛУГА ИСЧЕЗАЛА ИЗ ПРАЙСА ЦЕЛИКОМ — не цена, а позиция.
 * Условие было «цена прочитана ИЛИ категория опознана», и обе неизвестности
 * складывались в удаление. Измерено на дереве до правки (зонд
 * scratch/probe-row-gate.ts, код выхода 0):
 *   «Полировка одного зуба 290 руб»                  0 позиций (цена < 300 ₽)
 *   «Полная реабилитация обеих челюстей 2 500 000 руб» 0 позиций (цена > 2 000 000 ₽)
 *   «Полная реабилитация 2 000 001 руб»              0 позиций
 *   «Полная реабилитация 2 000 000 руб»              позиция с ценой 2 000 000 ₽
 * То есть рубль сверху потолка удалял услугу, а рубль снизу — оставлял: разница
 * в один рубль решала, есть ли позиция в прайсе. «Фторлак 200 руб» при той же
 * отвергнутой цене выживал только потому, что в categoryRules есть /фтор/, а
 * слов «полировка» и «реабилитация» там нет ни в одном правиле.
 *
 * Порядок проверок — от самого дешёвого к самому дорогому: пустое название и
 * прочитанная цена решают строку без регулярок.
 */
/*
 * ОТКАЗ ОТ ГОДА ОБЯЗАН ОСТАВЛЯТЬ СТРОКУ ВИДИМОЙ, ЕСЛИ СТРОКА НЕ НАЗЫВАЕТ ДОКУМЕНТ.
 *
 * Отказ от цены — законный исход, он виден клинике как price_not_found. Удаление
 * позиции из прайса законным исходом НЕ является: клиника видит только счётчик
 * потерь и не узнаёт, КАКАЯ услуга не доехала и что в её строке было написано.
 *
 * Регресс, который это закрывает, измерен ревьюером пакета NN1 и перемерен
 * ведущим отдельным зондом (оба прогона EXIT=0). Правка про год редакции вернула
 * РОВНО тот дефект, который закрывал коммит 46298c9fb:
 *
 *   «Полировка одного зуба 2025»   было: позиция с ценой 2025 → стало: 0 ПОЗИЦИЙ
 *   «Полировка 2025»               было: позиция с ценой 2025 → стало: 0 ПОЗИЦИЙ
 *   «Реабилитация 2025»            было: позиция с ценой 2025 → стало: 0 ПОЗИЦИЙ
 *
 * Цепочка: год отвергнут → priceRub === null; слов «полировка» и «реабилитация»
 * нет ни в одном правиле categoryRules → категория other; знака рубля в строке
 * нет → гейт возвращал false и позиция исчезала. Это те же два слова, из-за
 * которых гейт правили в 46298c9fb, и та же цена ошибки: выдуманная цена заменена
 * не отказом, а ПОТЕРЕЙ УСЛУГИ, что по закону этого файла хуже.
 *
 * РАЗЛИЧИТЬ ЗАГОЛОВОК ОТ УСЛУГИ ЗДЕСЬ ЕСТЬ ЧЕМ, и это не новое правило:
 * documentEditionPatterns уже отвечает на вопрос «строка называет документ»
 * («прайс», «редакция», «версия», «тариф», «приказ», «действителен», «утверждён»).
 * Поэтому «Прайс-лист 2025» по-прежнему отбрасывается — он называет документ, — а
 * «Полировка одного зуба 2025» остаётся позицией с price_not_found.
 *
 * Второго владельца признаков не создано намеренно: и год, и «называет документ»
 * спрашиваются теми же looksLikeYear-правилом и documentEditionPatterns, которыми
 * пользуется сам отказ в collectPriceCandidates.
 */
function refusedPriceLeavesServiceRow(sourceText: string): boolean {
	if (matchesAny(sourceText, documentEditionPatterns)) return false;
	/*
	 * Год ищется в тексте БЕЗ подписанных не-денег (blankNotMoney), тем же взглядом,
	 * каким его видит сканер цены. Иначе «Гарантия 2025 дней», где 2025 погашен как
	 * величина с единицей измерения, считалось бы отказом от цены, которого не было,
	 * и мусорная строка вернулась бы в прайс услугой.
	 */
	return /(?<!\d)(?:19|20)\d{2}(?!\d)/u.test(blankNotMoney(sourceText));
}

function isPricelistServiceRow(item: DentalPricelistItem): boolean {
	if (!item.title.length) return false;
	if (item.priceRub !== null) return true;
	if (item.category !== "other") return true;
	if (hasExplicitPriceMark(item.sourceText)) return true;
	return refusedPriceLeavesServiceRow(item.sourceText);
}

/** Формат предупреждения об отброшенных строках. Один владелец на оба режима. */
const skippedRowsWarningPrefix = "pricelist_rows_skipped:";

function skippedRowsWarnings(skippedRows: number): string[] {
	return skippedRows > 0 ? [`${skippedRowsWarningPrefix}${skippedRows}`] : [];
}

/**
 * ОДНО ПРАВИЛО СУЩЕСТВОВАНИЯ СТРОКИ ПРАЙСА НА ОБА РЕЖИМА РАЗБОРА.
 *
 * БЫЛО: у одного и того же прайса было ДВА разных правила. Детерминированная
 * ветка звала isPricelistServiceRow, считала отброшенные строки и печатала
 * pricelist_rows_skipped:N. Успешная НЕЙРО-ветка звала responseFromItems напрямую
 * — без гейта, без счётчика и без предупреждения вовсе, — поэтому запись модели
 * «Прайс-лист действителен с 01.01.2025» становилась услугой в каталоге, а
 * потерянные записи не оставляли следа.
 *
 * НЕВИДИМА БЫЛА ИМЕННО ЧАСТИЧНАЯ ПОТЕРЯ, и это уточнение существенно: если
 * itemFromGroq отбросил ВСЕ записи, callGroqPricelist дальше бросает исключение и
 * ветка откатывается на детерминированный разбор с предупреждением groq_failed: —
 * такой исход клиника видит. А когда часть записей модели прошла, а часть
 * исчезла (itemFromGroq отдаёт null на не-объекте и на пустом sourceText), ответ
 * приходил без единого признака недостачи. Поэтому счётчик обязан быть и в этой
 * ветке, а не только гейт.
 *
 * Это тот же класс «двух владельцев одного правила», за который в этом файле уже
 * заплачено дважды: свёртка убывающей пары цен жила отдельно на ветке ИИ, а
 * граница длительности приёма стояла только в durationFromLine.
 *
 * `droppedBeforeGate` — записи, потерянные ДО гейта, то есть те, из которых
 * позиция не собралась вовсе. Складывать их с отброшенными гейтом обязательно:
 * клинике важно число строк, которые надо проверить руками, а не то, на каком
 * шаге они выпали.
 */
export function selectPricelistServiceRows(
	parsedRows: DentalPricelistItem[],
	droppedBeforeGate = 0,
): { items: DentalPricelistItem[]; skippedRows: number } {
	const items = parsedRows.filter((item) => isPricelistServiceRow(item));
	return {
		items,
		skippedRows: droppedBeforeGate + (parsedRows.length - items.length),
	};
}

/*
 * Календарь здесь ОБЯЗАТЕЛЕН и стоит перед необязательными аргументами не по
 * прихоти: значение по умолчанию из часов на этом уровне вернуло бы разбору вторую
 * опору на дату прогона — ровно то, что правка убирает. Часы читает только вход
 * (analyzePricelist), и все четыре его вызова передают один и тот же календарь.
 */
function analyzePricelistDeterministic(
	request: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar,
	parserMode: PricelistParserMode = "deterministic",
	extraWarnings: string[] = [],
): DentalPricelistAnalysisResponse {
	const lines = splitPricelistLines(request.rawText);
	const parsedRows = lines.map((line, index) =>
		buildItemFromLine(line, index + 1, request, catalog, calendar),
	);
	const selected = selectPricelistServiceRows(parsedRows);
	const items = selected.items;
	/*
	 * УДАЛЕНИЕ СТРОКИ ОБЯЗАНО БЫТЬ ВИДНО КЛИНИКЕ.
	 *
	 * Отказ от ЦЕНЫ виден всегда (price_not_found у позиции), а удаление ПОЗИЦИИ
	 * не было видно никак: измерено на тексте из четырёх строк — «Прайс-лист
	 * действителен с 01.01.2025», адрес, «Коронка 12 500 руб», «Цены указаны в
	 * рублях» — приходила одна позиция и warnings: [] , то есть три выброшенные
	 * строки не оставляли ни одного следа. Клиника загружает прайс и не узнаёт,
	 * что услуги в нём нет.
	 *
	 * Счётчик в предупреждении — минимум, который различим на экране: клиника
	 * видит, что строк было больше, и знает, сколько проверить руками.
	 */
	const warnings = [...extraWarnings];
	/*
	 * no_pricelist_rows_detected ЗНАЧИТ «НИ ОДНОЙ СТРОКИ НЕ ПРИШЛО», а не «все
	 * отброшены».
	 *
	 * БЫЛО: `if (!items.length)`, и одно предупреждение покрывало два разных
	 * события — пустой текст (или фото без OCR, где строк нет вовсе) и текст, из
	 * которого гейт выбросил всё. Различить их было нельзя, а действия у них
	 * противоположные: в первом случае прайс надо прислать, во втором — проверить
	 * строки, которые уже присланы.
	 */
	if (!lines.length) warnings.push("no_pricelist_rows_detected");
	warnings.push(...skippedRowsWarnings(selected.skippedRows));
	if (request.imageBase64 && !request.useServerAi)
		warnings.push("image_supplied_but_server_ai_disabled");
	return responseFromItems({
		request,
		items,
		parserMode,
		warnings,
		aiUsed: false,
		aiReason: request.useServerAi
			? "Нейро-проверка не запускалась: локальный разбор уже дал безопасный черновик."
			: "Нейро-проверка выключена.",
		modelName: null,
	});
}

function groqSystemPrompt(): string {
	return [
		"You extract dental clinic price lists into strict JSON.",
		"Do not invent services, materials, prices, brands, tooth numbers, durations, or clinical meaning.",
		"If a price is absent, use null. If a material/brand/crown type is uncertain, use unknown or null.",
		"Classify dental services for Russian dental clinics: therapy, prosthetics, surgery, implantology, orthodontics, periodontology, hygiene, imaging, documents, consultation.",
		"Return only JSON with keys items and warnings.",
		"Each item must contain: sourceLine, sourceText, title, normalizedTitle, category, specialty, treatmentKind, materialKind, restorationType, crownType, brand, toothScope, unit, priceRub, priceMaxRub, durationMinutes, confidence, warnings.",
		"Allowed category values: consultation, therapy, surgery, prosthetics, orthodontics, periodontology, hygiene, imaging, documents, other.",
		"Allowed specialty values: therapist, orthopedist, surgeon, orthodontist, periodontist, hygienist, pediatric, implantologist, radiologist, universal.",
		"Allowed materialKind values: composite, glass_ionomer, sealant, ceramic, zirconia, lithium_disilicate, metal_ceramic, pmma, metal, titanium, implant_system, abutment, bone_graft, membrane, aligner, bracket, fluoride, whitening, anesthetic, imaging, lab, other, unknown.",
		"Allowed restorationType values: filling, direct_restoration, inlay, onlay, overlay, veneer, crown, bridge, implant_crown, temporary_crown, post_core, denture, ortho_appliance, sealant, whitening, implant, surgical_guide, none, unknown.",
		"Allowed crownType values: zirconia multilayer, zirconia, lithium disilicate, metal ceramic, temporary PMMA, ceramic, crown. If the crown type is uncertain, use null for crownType: never the word unknown and never free text.",
		/*
		 * Правило бренда — ПАРА к правилу crownType выше, и оно про другое.
		 * Перечислить бренды нельзя: список открыт, «Straumann» и «Filtek Z550» —
		 * законные значения, которые клиника обязана видеть латиницей как есть.
		 * Запрещается ровно служебное слово вместо «не знаю»; ту же строку подпирает
		 * brandFromModel на границе разбора.
		 */
		"The brand field must be the manufacturer or product name exactly as printed in the price list, for example Straumann, Filtek Z550, Bio-Gide. If no brand is named in the row, use null for brand: never the word unknown, never n/a, never a dash.",
	].join(" ");
}

function groqUserPrompt(request: DentalPricelistAnalysisRequest): string {
	return [
		`Prompt version: ${groqPromptVersion}.`,
		`Source kind: ${request.sourceKind}. Preferred specialty: ${request.preferredSpecialty}.`,
		"Parse the price list text/OCR/photo. Preserve original visible wording in sourceText. Return JSON only.",
		request.rawText
			? `Text:\n${request.rawText.slice(0, 60_000)}`
			: "No OCR text was supplied; use the attached image only.",
	].join("\n\n");
}

function contentToString(
	content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((part: { type?: string; text?: string }) =>
				typeof part.text === "string" ? part.text : "",
			)
			.join("\n");
	}
	return "";
}

export function safeParseJsonObject(value: string): Record<string, unknown> {
	const trimmed = value.trim();
	if (!trimmed) return {};
	try {
		return JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		const objectMatch = trimmed.match(/\{[\s\S]*\}/);
		if (!objectMatch) return {};
		return JSON.parse(objectMatch[0]) as Record<string, unknown>;
	}
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

/*
 * ЧТЕНИЕ ЧИСЕЛ ИЗ ОТВЕТА МОДЕЛИ. Их ровно два вида, и правила у них разные.
 *
 * БЫЛО: одна функция asNumberOrNull с `Math.round` обслуживала и ДЕНЬГИ
 * (priceRub, priceMaxRub), и СЧЁТ (durationMinutes). Округление до целого
 * молча превращало 1500.50 в 1501: копейки исчезали в режиме, который продукт
 * продаёт как «серверную нейро-проверку», и ни одна проверка не возражала —
 * целое число тривиально точно до копейки, поэтому расширенный контракт
 * (nonNegativeMoneyRubSchema) пропускал результат без замечаний. Клиника
 * получала прайс, отличающийся от присланного, без единой ошибки на экране.
 *
 * Просто снять Math.round было НЕЛЬЗЯ: durationMinutes в контракте объявлен
 * `z.number().int().positive()`, и дробная длительность уронила бы разбор
 * ЦЕЛОЙ позиции в откат (см. safeParse в itemFromGroq). Поэтому читателя два,
 * и назван каждый по своей единице измерения.
 *
 * Оба отказываются от приведения типов через Number(): Number(false) и
 * Number([]) дают 0, то есть услугу за 0 ₽ и длительность 0 минут из значения,
 * которое ценой и длительностью не является. Неизвестное значение обязано
 * остаться неизвестным (null) и уйти в откат к детерминированному разбору, а не
 * стать выдуманным нулём.
 */

/** Денежное значение из ответа модели в целых копейках. Без плавающей точки. */
function readMoneyKopecksOrNull(value: unknown): number | null {
	if (typeof value === "number") {
		if (!Number.isFinite(value) || value < 0) return null;
		const kopecks = parseKopecks(value);
		return Number.isSafeInteger(kopecks) ? kopecks : null;
	}
	if (typeof value !== "string") return null;
	/*
	 * Формат проверяется здесь, арифметика — только в parseKopecks: второго
	 * владельца денежного инварианта в проекте быть не должно. Модель по промпту
	 * отдаёт число, но JSON от языковой модели регулярно приносит строку
	 * «1500.50» или «1500,50», и терять из-за этого цену нельзя.
	 */
	const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
	if (!match) return null;
	const kopecks = parseKopecks(
		`${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`,
	);
	return Number.isSafeInteger(kopecks) ? kopecks : null;
}

/**
 * Цена из ответа модели — рубли с копейками, как объявлено в контракте.
 *
 * Ноль трактуется как НЕ названная цена, а не как услуга за 0 ₽: промпт
 * (groqSystemPrompt) прямо требует «If a price is absent, use null», а
 * детерминированный разбор в этом же файле не считает ценой ничего ниже 300 ₽.
 * Ноль из модели — это проигнорированная инструкция, и он обязан уйти в откат к
 * детерминированной цене, а не встать в каталог услуг ценой без предупреждения.
 */
function readMoneyRubOrNull(value: unknown): number | null {
	const kopecks = readMoneyKopecksOrNull(value);
	if (kopecks === null || kopecks === 0) return null;
	return Number(kopecksToNumericString(kopecks));
}

/**
 * ЦЕНА ИЗ ОТВЕТА МОДЕЛИ — ЭТО ГОД ДОКУМЕНТА, А НЕ ЦЕНА УСЛУГИ.
 *
 * Вопрос задаётся ТЕМИ ЖЕ функциями, что в детерминированной ветке
 * (editionYearInsteadOfPrice → looksLikeEditionYear, numberCarriesPriceMark,
 * documentEditionPatterns), потому что второго владельца правила года в этом файле
 * быть не должно. У модели есть sourceText — исходная строка прайса, — значит ей
 * можно задать те же вопросы, а не изобретать проверку года заново.
 *
 * ЗДЕСЬ ЛЕГКО УНЕСТИ ЗАКОННУЮ ЦЕНУ, ПОЭТОМУ ПОРЯДОК ПРОВЕРОК ИМЕННО ТАКОЙ:
 *   1. looksLikeYear отсекает всё, что на год не похоже, ПЕРВЫМ. 2025 ₽ — вполне
 *      реальная цена услуги (прицельный снимок, анестезия, консультация стоят
 *      300-3000 ₽), и полосу 1900-2099 целиком отвергать нельзя; но 12 500 и
 *      1500,50 до остальных проверок не доходят вовсе. Он же делает numberText
 *      заведомо четырьмя цифрами — только поэтому его можно вставлять в регулярку.
 *   2. Подпись деньгами ищется у КАЖДОГО вхождения этого числа в строку, и хотя бы
 *      одна подпись снимает вопрос: «Консультация 2025 руб» остаётся ценой 2025 ₽.
 *      Вхождения ищутся с запретом цифры по краям, иначе «2025» нашлось бы внутри
 *      «12025» и чужая подпись сошла бы за свою.
 *   3. Числа, которого в строке НЕТ ВООБЩЕ, подписать нечем: подписи нет ни у
 *      одного вхождения, потому что вхождений ноль. Такое число модель не
 *      прочитала, а придумала — промпт запрещает выдумывать цены прямо, — и год
 *      редакции ценой от этого не становится. Цена при этом не теряется: отказ
 *      уводит запись в детерминированный откат по той же строке (см. itemFromGroq),
 *      то есть к цене, которая в строке НАПИСАНА.
 *
 * Год ищется в тексте без подписанных не-денег (blankNotMoney) — тем же взглядом,
 * каким его видит сканер цены, иначе «Гарантия 2025 дней» отвечала бы на вопрос о
 * подписи по погашенному числу.
 */
function priceIsDocumentYear(
	sourceText: string,
	priceRub: number,
	calendar: PricelistCalendar,
): boolean {
	/*
	 * ГОД СПРАШИВАЕТСЯ ПО ЦЕЛОЙ ЧАСТИ, А НЕ ПО СТРОКОВОМУ ВИДУ ЧИСЛА.
	 *
	 * БЫЛО: `String(priceRub)`, а `looksLikeYear` — это `/^(?:19|20)\d{2}$/`.
	 * Дробное число этому образцу не подходит НИКОГДА, поэтому весь отказ от года
	 * выключался одной десятой копейки. Замер ревьюера пакета PP4, перемерен
	 * ведущим прямым вызовом `itemFromGroq` (календарь передан явно):
	 *
	 *   «Отбеливание 2025» + модель priceRub 2025    → null      правило работает
	 *   «Отбеливание 2025» + модель priceRub 2025.5  → 2025.5    ПРАВИЛО ВЫКЛЮЧЕНО
	 *   «Прайс-лист 2025»  + модель priceRub 2025.5  → 2025.5
	 *
	 * То есть заголовок раздела прайса встаёт услугой за 2025,50 ₽ — ровно тот
	 * дефект, против которого написан весь отказ от года, только через дробь.
	 * Дробные рубли здесь не экзотика: под копейки в этом файле отдельный набор
	 * `groqPricelistKopecks.test.ts` и отдельный коммит, то есть модель именно такие
	 * значения и присылает.
	 *
	 * `2025.0` дырой не был и не является: `String(2025.0) === "2025"`. Дыра ровно в
	 * непустой дробной части, поэтому лечится отбрасыванием этой части — и целая
	 * часть же используется дальше для поиска числа в строке, иначе «2025.5» не
	 * нашлось бы в тексте «Отбеливание 2025» вовсе.
	 */
	const numberText = String(Math.trunc(priceRub));
	if (!looksLikeYear(numberText)) return false;
	const scanText = blankNotMoney(sourceText);
	const occurrences = Array.from(
		scanText.matchAll(new RegExp(`(?<!\\d)${numberText}(?!\\d)`, "gu")),
	)
		.map((match) => match.index)
		.filter((index): index is number => index !== undefined);
	return occurrences.length
		? occurrences.every((start) =>
				editionYearInsteadOfPrice(
					sourceText,
					scanText,
					start,
					numberText,
					calendar,
				),
			)
		: looksLikeEditionYear(sourceText, numberText, calendar);
}

/** Цена из ответа модели, если это цена, и НЕИЗВЕСТНО (null), если это год документа. */
function moneyUnlessDocumentYear(
	value: number | null,
	sourceText: string,
	calendar: PricelistCalendar,
): number | null {
	return value !== null && priceIsDocumentYear(sourceText, value, calendar)
		? null
		: value;
}

/**
 * Счётное значение из ответа модели: целое, не меньше единицы, не больше
 * `maxValue`. Ноль и отрицательное — не счёт, а отсутствие значения.
 */
function readIntegerCountOrNull(
	value: unknown,
	maxValue: number,
): number | null {
	const raw =
		typeof value === "number"
			? value
			: typeof value === "string" && /^\d+(?:[.,]\d+)?$/.test(value.trim())
				? Number(value.trim().replace(",", "."))
				: null;
	if (raw === null || !Number.isFinite(raw)) return null;
	const rounded = Math.round(raw);
	return rounded >= 1 && rounded <= maxValue ? rounded : null;
}

/*
 * ПРЕДУПРЕЖДЕНИЯ ОТ МОДЕЛИ ПРОХОДЯТ БЕЛЫЙ СПИСОК, А НЕ ЕДУТ НА ЭКРАН КАК ЕСТЬ.
 *
 * Список — ровно те ключи, которые ставит сам разбор (buildWarnings), потому что
 * русская подпись на экране существует только для них. Незнакомый ключ клиника
 * видела АНГЛИЙСКИМИ СЛОВАМИ: интерфейс превращал `price_ambiguous` в
 * «price ambiguous», `two_prices_in_one_row` — в «two prices in one row», а любой
 * выдуманный ключ — в его же текст через пробелы. Измерено ИСПОЛНЕНИЕМ функции
 * подписи (находка ревьюера волны OO, перемерена ведущим).
 *
 * ПОЧЕМУ БЕЛЫЙ СПИСОК, А НЕ ФИЛЬТР ПО ВИДУ КЛЮЧА. `groqSystemPrompt` перечисляет
 * допустимые значения для пяти полей и про `warnings` не говорит НИЧЕГО, то есть
 * модель вправе прислать любую строку и присылает. Отличить «наш ключ, которого мы
 * ещё не знаем» от выдумки модели по форме нельзя — только по списку. Это тот же
 * выбор, что у `crownType` и `brand`: свободная строка из модели обязана
 * сверяться с перечислением.
 *
 * НЕЗНАКОМОЕ НЕ ТЕРЯЕТСЯ МОЛЧА. Вместо выброшенных ключей ставится
 * `material_uncertain` — строка остаётся помеченной «проверьте руками», и клиника
 * видит русскую подпись. Тихо выбросить просьбу модели проверить строку было бы
 * хуже, чем показать чужой ключ: просьба исчезла бы вместе с ключом, а это тот
 * самый класс «молчаливой потери», против которого написан весь этот файл.
 */
/*
 * БРЕНД ОТ МОДЕЛИ: СЛОВО-ЗАГЛУШКА — НЕ БРЕНД.
 *
 * ОТЛИЧИЕ ОТ crownType, И ОНО ОПРЕДЕЛЯЕТ ПОЧИНКУ. Бренды ЗАКОННО латиницей:
 * «Straumann», «Filtek Z550», «Bio-Gide», «Zoom» — это настоящие названия, и
 * печатать их как есть ПРАВИЛЬНО. Поэтому переводить бренд нельзя и перечислить
 * все допустимые значения тоже нельзя: список брендов открыт. Ломает не латиница,
 * а служебное слово, которое модель ставит вместо «не знаю».
 *
 * Замер ведущего исполнением pricelistItemMaterialText (находка ревьюера волны OO):
 *   brand "unknown"   → «unknown»     ← дефект, клиника видит служебное слово
 *   brand "Straumann" → «Straumann»   ← верно, так и должно быть
 *   brand null        → «материал не распознан»  ← верно
 *
 * ПРИЧИНА В САМОМ ПРОМПТЕ: строка «If a material/brand/crown type is uncertain,
 * use unknown or null» ПРИГЛАШАЕТ слово unknown. Для crownType это уже закрыто
 * отдельным правилом («never the word unknown and never free text»), для бренда —
 * закрывается здесь же, ниже в промпте, и подпирается этой проверкой на границе.
 *
 * ЧИСТКА НА ГРАНИЦЕ РАЗБОРА, А НЕ В ИНТЕРФЕЙСЕ: бренд уходит не только в подпись
 * позиции, но и в сводку по категориям (`summary.brands`). Починка в одном месте
 * отображения оставила бы служебное слово в сводке.
 *
 * Детерминированная ветка чиста по построению: `detectBrand` выбирает только из
 * `brandRules`, то есть из закрытого списка, и «unknown» вернуть не может.
 */
const modelBrandSentinels = new Set([
	"unknown",
	"unknown brand",
	"n/a",
	"na",
	"none",
	"null",
	"-",
	"—",
]);

function brandFromModel(
	raw: unknown,
	fallbackBrand: string | null,
): string | null {
	if (raw === null) return null;
	const candidate = asString(raw, fallbackBrand ?? "").trim();
	if (!candidate) return fallbackBrand;
	/*
	 * ЗАГЛУШКА ОТ МОДЕЛИ УСТУПАЕТ НАХОДКЕ ДЕТЕРМИНИРОВАННОГО РАЗБОРА, А НЕ ОБНУЛЯЕТ ЕЁ.
	 *
	 * `fallbackBrand` приходит из `detectBrand`, то есть из ЗАКРЫТОГО списка
	 * `brandRules`, и служебного слова содержать не может. Если модель написала
	 * «unknown», а в строке прайса стоит «Straumann» и разбор его нашёл, — верным
	 * ответом является «Straumann», а не пустота. Обнулять здесь значило бы
	 * выбросить измеренное в пользу незнания модели.
	 */
	return modelBrandSentinels.has(candidate.toLowerCase())
		? fallbackBrand
		: candidate;
}

const modelWarningAllowList = new Set([
	"price_not_found",
	"category_uncertain",
	"material_uncertain",
	"restoration_uncertain",
	"title_too_short",
	"photo_ocr_requires_visual_review",
]);

function asWarnings(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const raw = value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter(Boolean)
		.slice(0, 8);
	const known = raw.filter((warning) => modelWarningAllowList.has(warning));
	const droppedUnknown = known.length < raw.length;
	return droppedUnknown && !known.includes("material_uncertain")
		? [...known, "material_uncertain"]
		: known;
}

/**
 * Одна позиция прайса из JSON-ответа модели.
 *
 * Экспортируется ради проверки: вызвать напрямую с записью того же вида, какую
 * возвращает модель, дешевле, чем поднимать всю ветку. Тест
 * apps/api/src/pricelist/groqPricelistKopecks.test.ts.
 *
 * НО «ВЕТКУ GROQ ЗДЕСЬ ИСПОЛНИТЬ НЕЛЬЗЯ» — НЕВЕРНО, И ЭТА ФРАЗА СТОЯЛА ЗДЕСЬ
 * РАНЬШЕ. Она была оправданием, по которому проверка нейро-ветки написана как
 * ПОВТОРЕНИЕ её последовательности в тесте вместо ВЫЗОВА: набор оказался зелёным
 * на полностью сломанном коде (15/15 pass при восстановленном дефекте), и поймал
 * это только ревьюер мутацией.
 *
 * ВЕТКА ПОДНИМАЕТСЯ, И ЭТО ИЗМЕРЕНО: заглушка `fetch`, отдающая правдоподобный
 * ответ (`choices[0].message.content` с JSON `{items,warnings}`), ключ в пуле и
 * `DENTAL_SPEECH_KEY_HEALTH_FILE=off` — последним выключателем уже пользуются три
 * смоука речи (`scripts/smoke-speech-key-rotation.mjs` и родня), он отменяет
 * запись состояния здоровья ключей на диск (`speech/keyPool.ts`). Живой прогон
 * даёт `parserMode: "groq_json"`, то есть ветка действительно исполнилась.
 *
 * Поэтому проверять состав позиций и счёт потерь в нейро-режиме надо ВЫЗОВОМ
 * `analyzePricelist` с `useServerAi: true`, а не сборкой последовательности из
 * вынутых функций: собранная в тесте композиция проверяет сама себя.
 */
export function itemFromGroq(
	raw: unknown,
	index: number,
	request: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar = calendarFromClock(),
): DentalPricelistItem | null {
	if (!raw || typeof raw !== "object") return null;
	const record = raw as Record<string, unknown>;
	const sourceText = normalizeText(
		asString(record.sourceText, asString(record.title)),
	);
	if (!sourceText) return null;

	const fallback = buildItemFromLine(
		sourceText,
		index + 1,
		request,
		catalog,
		calendar,
	);
	/*
	 * ОТКАЗ ОТ ГОДА РЕДАКЦИИ ДЕЙСТВУЕТ И ЗДЕСЬ, А НЕ ТОЛЬКО В ДЕТЕРМИНИРОВАННОЙ
	 * ВЕТКЕ. Раньше стояло `readMoneyRubOrNull(record.priceRub) ?? fallback.priceRub`,
	 * и число модели проверок на год не проходило ВООБЩЕ: детерминированный разбор от
	 * года уже отказывался, а запись модели с priceRub 2025 по строке «Прайс-лист
	 * 2025» вставала в каталог услугой за 2025 ₽ — и оттуда в план лечения, в счёт и в
	 * документ, который подписывает пациент.
	 *
	 * Отказ уводит цену в ОТКАТ ПО ТОЙ ЖЕ СТРОКЕ, а не в null: `?? fallback` ниже
	 * читает ту же строку детерминированным разбором. Поэтому «Гигиена от 2025 до 2500
	 * руб» цену не теряет — там пара границ, а не одиночный год, — и решает в итоге
	 * одно правило на оба режима, а не два разных представления о годе.
	 *
	 * ВЕРХНЯЯ ГРАНИЦА ПРОВЕРЯЕТСЯ ТЕМ ЖЕ ПРАВИЛОМ, И ЦЕНА ЭТОЙ ОШИБКИ ИЗМЕРЕНА, А НЕ
	 * ВЫВЕДЕНА. Здесь стояло «иначе получился бы выдуманный диапазон 12 500-2025 ₽» —
	 * это неверно и мягче, чем правда. Мутация этой строки к прежнему виду (проверка
	 * снята только с priceMaxRub) роняет набор с «2025 !== 12500»: запись «Коронка
	 * 12 500 руб (прайс 2025)» с priceMaxRub 2025 от модели даёт убывающую пару,
	 * свёртка ниже её СОРТИРУЕТ, и коронка встаёт в каталог за 2025 ₽, а написанные
	 * 12 500 ₽ уезжают в верхнюю границу. То есть год подменяет саму цену, занижая её
	 * в 6,2 раза, а не приписывает услуге лишний диапазон.
	 */
	const priceRubFromModel =
		moneyUnlessDocumentYear(
			readMoneyRubOrNull(record.priceRub),
			sourceText,
			calendar,
		) ?? fallback.priceRub;
	const priceMaxRubFromModel =
		moneyUnlessDocumentYear(
			readMoneyRubOrNull(record.priceMaxRub),
			sourceText,
			calendar,
		) ?? fallback.priceMaxRub;
	/*
	 * Убывающая пара СОРТИРУЕТСЯ, а не схлопывается в первое число.
	 *
	 * БЫЛО: верхняя граница ниже нижней просто обнулялась, а ценой оставалась
	 * нижняя ПОЗИЦИЯ пары — на убывающей паре это бо́льшее из двух чисел. Модель,
	 * прочитавшая «Консультация 1000/500» как priceRub 1000 и priceMaxRub 500,
	 * ставила в каталог консультацию за 1000 ₽, и 500 ₽ исчезали: услуга дорожала
	 * вдвое, молча. Проверка «max < min» безопасности не давала — она делала исход
	 * дороже для пациента.
	 *
	 * Тот же дефект убран из детерминированного разбора (collectPriceCandidates),
	 * а нейро-ветка осталась с ним, и две ветки на одном прайсе давали РАЗНЫЕ
	 * цены. Два числа — это либо диапазон, либо две опции; в обоих случаях меньшее
	 * есть нижняя граница, и порядок в ответе модели на это не влияет.
	 */
	const descendingPair =
		priceRubFromModel !== null &&
		priceMaxRubFromModel !== null &&
		priceMaxRubFromModel < priceRubFromModel;
	const priceRub = descendingPair ? priceMaxRubFromModel : priceRubFromModel;
	const priceMaxRub = descendingPair ? priceRubFromModel : priceMaxRubFromModel;
	const item: DentalPricelistItem = {
		...fallback,
		id: `price-ai-${index + 1}`,
		sourceLine: Math.max(1, Math.round(Number(record.sourceLine) || index + 1)),
		sourceText,
		title:
			normalizeText(asString(record.title, fallback.title)) || fallback.title,
		normalizedTitle: normalizeKey(
			asString(record.normalizedTitle, asString(record.title, fallback.title)),
		),
		category: asString(record.category, fallback.category) as ServiceCategory,
		specialty: asString(
			record.specialty,
			fallback.specialty,
		) as DentalSpecialty,
		treatmentKind: asString(record.treatmentKind, fallback.treatmentKind),
		materialKind: asString(
			record.materialKind,
			fallback.materialKind,
		) as DentalMaterialKind,
		restorationType: asString(
			record.restorationType,
			fallback.restorationType,
		) as DentalRestorationType,
		crownType:
			record.crownType === null
				? null
				: asString(record.crownType, fallback.crownType ?? "") || null,
		brand: brandFromModel(record.brand, fallback.brand),
		toothScope:
			record.toothScope === null
				? null
				: asString(record.toothScope, fallback.toothScope ?? "") || null,
		unit: asString(record.unit, fallback.unit),
		priceRub,
		priceMaxRub,
		durationMinutes:
			readIntegerCountOrNull(
				record.durationMinutes,
				maxServiceDurationMinutes,
			) ?? fallback.durationMinutes,
		confidence: Math.min(
			0.98,
			Math.max(0.1, Number(record.confidence) || fallback.confidence),
		),
		warnings: Array.from(
			new Set([...fallback.warnings, ...asWarnings(record.warnings)]),
		),
		matchedServiceId: null,
	};
	item.matchedServiceId = matchServiceId(item, catalog);
	return dentalPricelistItemSchema.safeParse(item).success
		? dentalPricelistItemSchema.parse(item)
		: fallback;
}

/**
 * Позиции прайса из массива записей ответа модели — вместе с числом ЗАПИСЕЙ,
 * которые разобрать не удалось.
 *
 * БЫЛО: `rows.map(itemFromGroq).filter(Boolean)` прямо в callGroqPricelist, и
 * отброшенные записи не считались никем. itemFromGroq отдаёт null на не-объекте и
 * на пустом sourceText, то есть модель, вернувшая двадцать строк, из которых три
 * без текста, отдавала семнадцать позиций и НИ ОДНОГО признака недостачи.
 *
 * Экспортируется по той же причине, что itemFromGroq: вызвать сборку записей
 * напрямую тем же массивом, какой возвращает модель, дешевле и точнее.
 *
 * НО ЭТО НЕ ЗНАЧИТ «HTTP-ПУТЬ GROQ ЗДЕСЬ ИСПОЛНИТЬ НЕЛЬЗЯ» — раньше здесь стояла
 * именно такая фраза, и она неверна. Заглушка `fetch` плюс
 * `DENTAL_SPEECH_KEY_HEALTH_FILE=off` поднимают ветку целиком (измерено:
 * `parserMode: "groq_json"` на живом вызове). Подробнее — в комментарии к
 * `itemFromGroq`, там же описано, чем эта фраза обошлась: проверка нейро-ветки,
 * написанная как повторение её последовательности вместо вызова, была зелёной на
 * полностью сломанном коде.
 *
 * ЧЕМ ПРОВЕРЯТЬ ЧТО: эти вынутые функции — для проверки САМОЙ СБОРКИ записей
 * (сколько отброшено, что стало с полями). А то, что боевая ветка их ЗОВЁТ,
 * проверяется только вызовом `analyzePricelist` с `useServerAi: true`.
 */
export function pricelistItemsFromGroqRows(
	rows: unknown[],
	request: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar = calendarFromClock(),
): { items: DentalPricelistItem[]; droppedRows: number } {
	const items = rows
		.map((row, index) => itemFromGroq(row, index, request, catalog, calendar))
		.filter((item): item is DentalPricelistItem => Boolean(item));
	return { items, droppedRows: rows.length - items.length };
}

async function callGroqPricelist(
	request: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar,
): Promise<{ items: DentalPricelistItem[]; droppedRows: number }> {
	const modelName = groqPricelistModelName();
	const tried = new Set<string>();
	const maxAttempts = keyRetryLimit(groqProviderId);
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const key = selectProviderKey(groqProviderId, tried);
		if (!key) break;
		tried.add(key.fingerprint);
		try {
			const content: Array<Record<string, unknown>> = [
				{ type: "text", text: groqUserPrompt(request) },
			];
			if (request.imageBase64) {
				content.push({
					type: "image_url",
					image_url: {
						url: `data:${request.imageMimeType};base64,${request.imageBase64}`,
					},
				});
			}

			const response = await fetchWithProviderTimeout(
				"https://api.groq.com/openai/v1/chat/completions",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${key.value}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: modelName,
						temperature: 0,
						response_format: { type: "json_object" },
						messages: [
							{ role: "system", content: groqSystemPrompt() },
							{ role: "user", content },
						],
					}),
				},
			);
			const payload = (await response
				.json()
				.catch(() => ({}))) as GroqChatPayload;
			if (!response.ok) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload.error?.message,
				);
			}

			const contentText = contentToString(
				payload.choices?.[0]?.message?.content,
			);
			const parsed = safeParseJsonObject(contentText);
			const rows = Array.isArray(parsed.items) ? parsed.items : [];
			const parsedRows = pricelistItemsFromGroqRows(
				rows,
				request,
				catalog,
				calendar,
			);
			/*
			 * Отброшены ВСЕ записи — это видимый исход и без счётчика: исключение уводит
			 * ветку в откат на детерминированный разбор с предупреждением groq_failed:.
			 * Считать здесь нечего, чинить надо было частичную потерю.
			 */
			if (!parsedRows.items.length) {
				throw new Error("Groq returned JSON without pricelist items.");
			}
			recordProviderKeySuccess(groqProviderId, key);
			return parsedRows;
		} catch (error) {
			lastError = error;
			recordProviderKeyFailure(groqProviderId, key, error);
			if (!shouldTryNextProviderKey(error)) break;
		}
	}

	throw new Error(
		sanitizeProviderErrorMessage(
			lastError instanceof Error
				? lastError.message
				: "Groq pricelist extraction failed.",
		),
	);
}

/**
 * Разбор прайса целиком.
 *
 * `calendar` — год, который для ЭТОГО разбора считается сегодняшним. Он объявлен
 * входом с значением по умолчанию из часов, потому что окно года редакции — это
 * свойство ДАТЫ ЗАГРУЗКИ, а не свойство функции: боевой вызов (routes/pricelist.ts)
 * передаёт два аргумента и работает как раньше, а проверка передаёт год явно и
 * получает один и тот же результат в любую дату прогона. Подробности и цена
 * прежнего поведения — у объявления PricelistCalendar.
 *
 * Часы читаются здесь ОДИН РАЗ на запрос: ниже календарь едет аргументом во все
 * ветки, включая нейро-ветку и все четыре отката на детерминированный разбор.
 * Клиентский контракт (DentalPricelistAnalysisRequest) года не содержит намеренно —
 * иначе окном года редакции управлял бы браузер, а не сервер.
 */
export async function analyzePricelist(
	request: DentalPricelistAnalysisRequest,
	catalog: ServiceCatalogItem[],
	calendar: PricelistCalendar = calendarFromClock(),
): Promise<DentalPricelistAnalysisResponse> {
	const keyPool = getProviderKeyPoolSummary(groqProviderId);
	const modelName = groqPricelistModelName();

	if (!request.useServerAi) {
		return analyzePricelistDeterministic(request, catalog, calendar);
	}

	if (request.imageBase64 && !isExpectedImagePayload(request)) {
		return analyzePricelistDeterministic(
			request,
			catalog,
			calendar,
			"deterministic_groq_fallback",
			["image_payload_invalid", "groq_skipped_invalid_image_payload"],
		);
	}

	if (!keyPool.configuredKeyCount) {
		return analyzePricelistDeterministic(
			request,
			catalog,
			calendar,
			"deterministic_groq_fallback",
			["groq_key_pool_empty"],
		);
	}

	try {
		const parsedRows = await callGroqPricelist(request, catalog, calendar);
		/*
		 * ГЕЙТ СТРОК И СЧЁТЧИК СТОЯТ И ЗДЕСЬ. Раньше эта ветка звала responseFromItems
		 * напрямую: запись модели «Прайс-лист действителен с 01.01.2025» становилась
		 * услугой каталога, а записи, из которых позиция не собралась, исчезали молча.
		 *
		 * no_pricelist_rows_detected здесь не появляется намеренно: оно значит «строк
		 * не пришло вовсе», а записи модели пришли — просто ни одна не оказалась
		 * услугой. Различие между пустым и отброшенным прайсом одинаково в обеих
		 * ветках.
		 */
		const selected = selectPricelistServiceRows(
			parsedRows.items,
			parsedRows.droppedRows,
		);
		return responseFromItems({
			request,
			items: selected.items,
			parserMode: "groq_json",
			warnings: [
				...(request.imageBase64 ? ["photo_ocr_requires_visual_review"] : []),
				...skippedRowsWarnings(selected.skippedRows),
			],
			aiUsed: true,
			aiReason:
				"Серверная нейро-проверка разобрала текст или фото; результат проверен схемой перед показом.",
			modelName,
		});
	} catch (error) {
		return analyzePricelistDeterministic(
			request,
			catalog,
			calendar,
			"deterministic_groq_fallback",
			[
				`groq_failed:${sanitizeProviderErrorMessage(error instanceof Error ? error.message : "unknown")}`,
			],
		);
	}
}
