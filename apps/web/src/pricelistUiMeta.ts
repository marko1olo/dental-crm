import type {
	DentalMaterialKind,
	DentalPricelistAnalysisResponse,
	DentalRestorationType,
	PricelistSourceKind,
} from "@dental/shared";

export const pricelistSourceKindLabels: Record<PricelistSourceKind, string> = {
	text: "Текст",
	ocr_text: "OCR",
	photo_ocr: "Фото",
	spreadsheet_copy: "Таблица",
	manual: "Вручную",
};

export const dentalMaterialKindLabels: Record<DentalMaterialKind, string> = {
	composite: "Композит",
	glass_ionomer: "СИЦ",
	sealant: "Герметик",
	ceramic: "Керамика",
	zirconia: "Цирконий",
	lithium_disilicate: "E.max / дисиликат",
	metal_ceramic: "Металлокерамика",
	pmma: "PMMA / временные",
	metal: "Металл",
	titanium: "Титан",
	implant_system: "Имплант-система",
	abutment: "Абатмент",
	bone_graft: "Костный материал",
	membrane: "Мембрана",
	aligner: "Элайнеры",
	bracket: "Брекеты",
	fluoride: "Фтор / реминерализация",
	whitening: "Отбеливание",
	anesthetic: "Анестетик",
	imaging: "Снимки",
	lab: "Лаборатория / скан",
	other: "Другое",
	unknown: "Не распознано",
};

export const dentalRestorationTypeLabels: Record<
	DentalRestorationType,
	string
> = {
	filling: "Пломба",
	direct_restoration: "Прямая реставрация",
	inlay: "Вкладка",
	onlay: "Накладка",
	overlay: "Оверлей",
	veneer: "Винир",
	crown: "Коронка",
	bridge: "Мостовидный протез",
	implant_crown: "Коронка на импланте",
	temporary_crown: "Временная коронка",
	post_core: "Культевая вкладка",
	denture: "Протез",
	ortho_appliance: "Ортодонтический аппарат",
	sealant: "Герметизация",
	whitening: "Отбеливание",
	implant: "Имплантация",
	surgical_guide: "Хирургический шаблон",
	none: "Без реставрации",
	unknown: "Не распознано",
};

const pricelistCrownTypeLabels: Record<string, string> = {
	"zirconia multilayer": "Цирконий MultiLayer",
	zirconia: "Цирконий",
	"lithium disilicate": "E.max / дисиликат лития",
	"metal ceramic": "Металлокерамика",
	"temporary PMMA": "Временная PMMA",
	ceramic: "Керамика",
	crown: "Коронка",
};

/*
 * АНГЛОЯЗЫЧНЫЕ НАПИСАНИЯ ТЕХ ЖЕ СЕМИ ЗНАЧЕНИЙ — СПИСКОМ, А НЕ ПОИСКОМ ПОДСТРОКИ.
 *
 * Слева — то, что реально приезжает с нейро-пути, справа — ключ карты выше.
 * Каждая строка здесь переводит, а не домысливает: «pfm» — общепринятое
 * porcelain-fused-to-metal, «zro2» — оксид циркония, «full/all ceramic» —
 * цельная керамика. Подстрочный поиск («если содержит zirconia») здесь
 * запрещён сознательно: он молча превратил бы «non-zirconia» и любую будущую
 * формулировку модели в утверждение о материале, которого модель не сказала.
 */
const pricelistCrownTypeSynonyms: Record<string, string> = {
	zirconium: "zirconia",
	zro2: "zirconia",
	"zirconia crown": "zirconia",
	"zirconium crown": "zirconia",
	"zirconium oxide": "zirconia",
	"monolithic zirconia": "zirconia",
	"multilayer zirconia": "zirconia multilayer",
	"zirconia multilayer crown": "zirconia multilayer",
	emax: "lithium disilicate",
	"e.max": "lithium disilicate",
	"ips e.max": "lithium disilicate",
	"lithium disilicate crown": "lithium disilicate",
	pfm: "metal ceramic",
	"porcelain fused to metal": "metal ceramic",
	"metal ceramic crown": "metal ceramic",
	"full ceramic": "ceramic",
	"all ceramic": "ceramic",
	"ceramic crown": "ceramic",
	porcelain: "ceramic",
	pmma: "temporary PMMA",
	"pmma crown": "temporary PMMA",
	"temporary pmma crown": "temporary PMMA",
};

/** Регистр, подчёркивания, дефисы и двойные пробелы не меняют смысл ключа. */
function normalizePricelistCrownTypeKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, " ");
}

const pricelistCrownTypeNormalizedLabels = new Map<string, string>();
for (const [key, label] of Object.entries(pricelistCrownTypeLabels)) {
	pricelistCrownTypeNormalizedLabels.set(
		normalizePricelistCrownTypeKey(key),
		label,
	);
}
for (const [alias, canonical] of Object.entries(pricelistCrownTypeSynonyms)) {
	const label = pricelistCrownTypeLabels[canonical];
	// Синоним без карты — ошибка этого файла, а не повод придумать подпись.
	if (label)
		pricelistCrownTypeNormalizedLabels.set(
			normalizePricelistCrownTypeKey(alias),
			label,
		);
}

/*
 * ТИП КОРОНКИ С НЕЙРО-ПУТИ — СВОБОДНЫЙ ТЕКСТ, А НЕ ПЕРЕЧИСЛЕНИЕ.
 *
 * В контракте crownType объявлен z.string().nullable()
 * (packages/shared/src/index.ts), НЕ enum, а системный промпт Groq перечисляет
 * допустимые значения для category, specialty, materialKind и restorationType и
 * НЕ перечисляет их для crownType, прямо разрешая «If a material/brand/crown
 * type is uncertain, use unknown or null». Разбор ответа модели пропускает
 * строку как есть (asString + `|| null` обнуляет только пустую), поэтому в это
 * поле законно приезжает всё что угодно.
 *
 * БЫЛО: `pricelistCrownTypeLabels[value] ?? value` — неизвестное значение
 * печаталось КАК ЕСТЬ, и русская клиника читала на экране английский машинный
 * токен. Измерено исполнением функции на HEAD до этой правки:
 *     crownType "unknown"                         -> «unknown»
 *     crownType "zirconia crown"                  -> «zirconia crown»
 *     "full ceramic" + ceramic + crown            -> «full ceramic · Керамика · Коронка»
 * Детерминированный detectCrownType отдаёт ровно 7 значений и все 7 в карте
 * есть, поэтому утечка была только на нейро-пути — но он продуктовый, и до
 * прошлой волны эту функцию не звал никто, из-за чего `?? value` годами не
 * стоил ничего.
 *
 * СТАЛО: ключ нормализуется, ищется в карте вместе со списком синонимов, и всё
 * НЕ ОПОЗНАННОЕ считается ОТСУТСТВИЕМ ДАННЫХ — null, метка не печатается. Сырой
 * токен на экран не попадает ни при каком ответе модели; строка при этом честно
 * вырождается в «материал не распознан», который до правки был недостижим,
 * потому что метка коронки всегда оказывалась непустой.
 *
 * ПОЧЕМУ НЕ ЗАГЛУШКА «Коронка, материал уточнить»: это текст, которого модель не
 * сказала. Отсутствие данных обязано выглядеть как отсутствие, иначе следующий
 * читатель примет заглушку за разобранное значение — ровно та подмена, из-за
 * которой `?? 0` печатает неизвестную сумму как измеренный ноль.
 */
function pricelistCrownTypeLabel(
	value: string | null | undefined,
): string | null {
	if (!value) return null;
	const normalized = normalizePricelistCrownTypeKey(value);
	return pricelistCrownTypeNormalizedLabels.get(normalized) ?? null;
}

function pricelistMaterialKindLabel(kind: DentalMaterialKind): string {
	return dentalMaterialKindLabels[kind] ?? kind;
}

function pricelistRestorationTypeLabel(
	type: DentalRestorationType,
): string | null {
	if (type === "none" || type === "unknown") return null;
	return dentalRestorationTypeLabels[type] ?? type;
}

export function pricelistMaterialSummaryText(
	summary: DentalPricelistAnalysisResponse["summary"][number],
): string {
	const labels = [
		...summary.materialKinds.map(pricelistMaterialKindLabel),
		...summary.brands,
	]
		.filter(Boolean)
		.slice(0, 4);
	return labels.join(", ") || "без материала";
}

/*
 * ОДНА И ТА ЖЕ МЕТКА ДВАЖДЫ В ОДНОЙ СТРОКЕ — ИЗМЕРЕНО ИСПОЛНЕНИЕМ, НЕ ЧТЕНИЕМ.
 *
 * `detectCrownType` выводит тип коронки ИЗ materialKind
 * (`apps/api/src/pricelist/analyzer.ts:320-329`: при materialKind zirconia
 * возвращается «zirconia»), поэтому две метки описывают один материал ОДНИМИ И
 * ТЕМИ ЖЕ словами. Замерено на HEAD до этой правки, на ДЕТЕРМИНИРОВАННОМ пути —
 * том самом, который считался чистым:
 *     zirconia + zirconia + crown          -> «Цирконий · Цирконий · Коронка»
 *     metal ceramic + metal_ceramic        -> «Металлокерамика · Металлокерамика · Коронка»
 *     ceramic + ceramic + crown            -> «Керамика · Керамика · Коронка»
 *     crown + unknown + crown              -> «Коронка · Коронка»
 *     zirconia multilayer + zirconia       -> «Цирконий MultiLayer · Цирконий · Коронка»
 * Пять из семи значений `detectCrownType` давали клинике заикание, и это не
 * нейро-путь: так выглядит обычная строка «Коронка циркониевая» из любого прайса.
 *
 * Правило: метка не печатается, если она ЦЕЛИКОМ содержится в одной из уже
 * оставленных. Список идёт от точного к общему (бренд -> тип коронки ->
 * материал -> вид работы), поэтому «Цирконий» уходит из-под «Цирконий
 * MultiLayer», а не наоборот, и бренд из прайса клиники не может быть съеден
 * переводной меткой. Ничего не переписывается и не склеивается: не печатается
 * только повторное упоминание того же слова.
 *
 * Почему НЕ «убрать materialKind, когда есть crownType»: на нейро-пути эти два
 * поля приезжают независимо, и при crownType «crown» + materialKind zirconia
 * такое правило потеряло бы единственное упоминание материала.
 */
function pricelistDedupeLabels(labels: string[]): string[] {
	const kept: string[] = [];
	for (const label of labels) {
		const normalized = label.trim().toLowerCase();
		if (!normalized) continue;
		if (kept.some((existing) => existing.toLowerCase().includes(normalized)))
			continue;
		kept.push(label);
	}
	return kept;
}

export function pricelistItemMaterialText(
	item: DentalPricelistAnalysisResponse["items"][number],
): string {
	const labels = pricelistDedupeLabels(
		[
			item.brand,
			pricelistCrownTypeLabel(item.crownType),
			item.materialKind === "unknown"
				? null
				: pricelistMaterialKindLabel(item.materialKind),
			pricelistRestorationTypeLabel(item.restorationType),
		].filter((value): value is string => Boolean(value)),
	);
	return labels.join(" · ") || "материал не распознан";
}

const pricelistWarningLabels: Record<string, string> = {
	price_not_found: "Цена не найдена",
	category_uncertain: "Категория требует проверки",
	material_uncertain: "Материал требует проверки",
	restoration_uncertain: "Тип работы требует проверки",
	title_too_short: "Название слишком короткое",
	photo_ocr_requires_visual_review: "Фото прайса требует ручной проверки",
	no_pricelist_rows_detected: "В прайсе не найдены строки услуг",
	pricelist_rows_skipped: "Часть строк прайса не признана услугами",
	image_supplied_but_server_ai_disabled:
		"Фото добавлено, но нейро-проверка выключена",
	image_payload_invalid: "Фото прайса не прочитано",
	groq_skipped_invalid_image_payload: "Нейро-проверка фото пропущена",
	groq_key_pool_empty: "Нейро-проверка прайса не настроена",
};

const technicalPricelistWarningPattern =
	/\b(groq|openai|deepgram|provider|api|payload|schema|json|http|timeout|token|key|authorization|failed|error|invalid)\b/i;

function pricelistWarningText(warning: string): string {
	const normalized = warning.trim();
	if (!normalized) return "Требуется проверка";
	if (normalized.startsWith("groq_failed:"))
		return "Нейро-проверка прайса недоступна";
	// Счётчик отброшенных строк приезжает в самом ключе
	// («pricelist_rows_skipped:3»), как и текст ошибки в «groq_failed:». Без
	// разбора префикса клиника увидела бы на экране сырой машинный ключ, а число
	// строк, выброшенных из её прайса, — единственное, что здесь важно.
	if (normalized.startsWith("pricelist_rows_skipped:")) {
		const skipped = Number(
			normalized.slice("pricelist_rows_skipped:".length).trim(),
		);
		return Number.isFinite(skipped) && skipped > 0
			? `Строк не признано услугами: ${skipped} — проверьте прайс`
			: "Часть строк прайса не признана услугами";
	}
	if (technicalPricelistWarningPattern.test(normalized))
		return "Требуется ручная проверка прайса";
	/*
	 * НЕИЗВЕСТНЫЙ КЛЮЧ НЕ ПЕЧАТАЕТСЯ КЛИНИКЕ КАК ЕСТЬ.
	 *
	 * БЫЛО: `?? normalized.replace(/[_-]+/g, " ")` — незнакомый ключ выводился на
	 * экран английскими словами. Измерено ИСПОЛНЕНИЕМ этой функции, а не чтением
	 * (находка ревьюера волны OO, перемерена ведущим):
	 *   "price_ambiguous"       → «price ambiguous»
	 *   "two_prices_in_one_row" → «two prices in one row»
	 *   "totally_made_up_key"   → «totally made up key»
	 * Русская клиника видела английский текст в собственном прайсе.
	 *
	 * Источник незнакомых ключей — НЕЙРО-ВЕТКА: `itemFromGroq` сливает
	 * `asWarnings(record.warnings)` от модели с предупреждениями разбора
	 * (`analyzer.ts:1791`), а системный промпт перечисляет допустимые значения для
	 * пяти полей и НЕ перечисляет их для `warnings`. Значит модель может прислать
	 * любую строку. Это ТРЕТИЙ экземпляр одного класса: тем же способом утекали
	 * `crownType` («unknown», «zirconia crown») и `brand`.
	 *
	 * Честная фраза вместо имени ключа: клинике важно не имя, а что делать со
	 * строкой. Сам ключ не теряется — он остаётся в `item.warnings` ответа.
	 * Это ВТОРОЙ рубеж; первый — белый список на стороне разбора.
	 */
	return pricelistWarningLabels[normalized] ?? "Строку нужно проверить руками";
}

export function pricelistWarningsText(warnings: string[]): string {
	return warnings.map(pricelistWarningText).filter(Boolean).join(", ");
}

export const pricelistRecognitionServiceGroups = [
	{
		title: "Осмотры и диагностика",
		items: [
			"консультация",
			"план лечения",
			"фотопротокол",
			"сканирование",
			"ОПТГ",
			"КЛКТ",
			"ТРГ",
			"RVG",
		],
	},
	{
		title: "Терапия",
		items: [
			"кариес",
			"пульпит",
			"периодонтит",
			"эндодонтия",
			"коффердам",
			"канал",
			"пломба",
			"реставрация",
		],
	},
	{
		title: "Ортопедия",
		items: [
			"коронка",
			"винир",
			"мост",
			"вкладка",
			"накладка",
			"культевая",
			"протез",
			"перебазировка",
		],
	},
	{
		title: "Хирургия и имплантация",
		items: [
			"удаление",
			"ретинированный",
			"имплант",
			"абатмент",
			"формирователь",
			"синус-лифтинг",
			"НКР",
			"шаблон",
		],
	},
	{
		title: "Ортодонтия",
		items: [
			"брекеты",
			"элайнеры",
			"ретейнер",
			"капа",
			"дуга",
			"активация",
			"снятие",
			"аппарат",
		],
	},
	{
		title: "Пародонтология и профилактика",
		items: [
			"гигиена",
			"Air Flow",
			"ультразвук",
			"кюретаж",
			"пародонтальная карта",
			"шинирование",
			"фтор",
			"отбеливание",
		],
	},
	{
		title: "Детский прием",
		items: [
			"адаптация",
			"молочный зуб",
			"герметизация",
			"фторирование",
			"пульпотомия",
			"серебрение",
			"удерживатель",
		],
	},
	{
		title: "Документы и админ",
		items: [
			"договор",
			"акт",
			"справка для вычета",
			"рассрочка",
			"гарантия",
			"ДМС",
			"сертификат",
		],
	},
] as const;

export const pricelistRecognitionBrandGroups = [
	{
		title: "Импланты",
		items: [
			"Straumann",
			"Nobel",
			"Osstem",
			"Dentium",
			"Megagen",
			"Astra",
			"BioHorizons",
			"MIS",
			"Alpha-Bio",
			"Neodent",
		],
	},
	{
		title: "Кость и мембраны",
		items: [
			"Geistlich",
			"Bio-Oss",
			"Bio-Gide",
			"Cerabone",
			"botiss",
			"OsteoBiol",
			"Jason",
			"Symbios",
		],
	},
	{
		title: "Композиты и СИЦ",
		items: [
			"Filtek",
			"Estelite",
			"Omnichroma",
			"Gradia",
			"Fuji",
			"Ketac",
			"Charisma",
			"Tetric",
			"Venus",
			"Voco",
		],
	},
	{
		title: "Керамика и цирконий",
		items: [
			"IPS e.max",
			"Ivoclar",
			"Katana",
			"Prettau",
			"BruxZir",
			"Aidite",
			"Cercon",
			"ZirCAD",
			"Lava",
			"Vita",
		],
	},
	{
		title: "Ортодонтия",
		items: [
			"Damon",
			"Ormco",
			"3M",
			"American Orthodontics",
			"Forestadent",
			"Invisalign",
			"Star Smile",
			"FlexiLigner",
		],
	},
	{
		title: "Гигиена и отбеливание",
		items: [
			"EMS",
			"Air Flow",
			"Vector",
			"Zoom",
			"Beyond",
			"Opalescence",
			"Amazing White",
			"Philips",
		],
	},
	{
		title: "Анестезия и оборудование",
		items: [
			"Ultracain",
			"Ubistesin",
			"Septanest",
			"3Shape",
			"Medit",
			"Sirona",
			"Planmeca",
			"Vatech",
			"Carestream",
		],
	},
] as const;
