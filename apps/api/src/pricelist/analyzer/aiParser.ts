import {
	dentalPricelistItemSchema,
	type DentalMaterialKind,
	type DentalPricelistAnalysisRequest,
	type DentalPricelistItem,
	type DentalRestorationType,
	type DentalSpecialty,
	kopecksToNumericString,
	parseKopecks,
	type ServiceCatalogItem,
	type ServiceCategory,
} from "@dental/shared";

import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	sanitizeProviderErrorMessage,
	selectProviderKey,
	shouldTryNextProviderKey,
} from "../../speech/keyPool.js";
import {
	editionYearInsteadOfPrice,
	looksLikeEditionYear,
} from "./priceScanner.js";
import { matchServiceId } from "./similarityMatcher.js";
import { buildItemFromLine } from "./tableExtractor.js";
import {
	blankNotMoney,
	looksLikeYear,
	normalizeKey,
	normalizeText,
} from "./textNormalizers.js";
import {
	calendarFromClock,
	groqPromptVersion,
	groqProviderId,
	maxServiceDurationMinutes,
	type GroqChatPayload,
	type PricelistCalendar,
} from "./types.js";

export function groqSystemPrompt(): string {
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

export function groqUserPrompt(request: DentalPricelistAnalysisRequest): string {
	return [
		`Prompt version: ${groqPromptVersion}.`,
		`Source kind: ${request.sourceKind}. Preferred specialty: ${request.preferredSpecialty}.`,
		"Parse the price list text/OCR/photo. Preserve original visible wording in sourceText. Return JSON only.",
		request.rawText
			? `Text:\n${request.rawText.slice(0, 60_000)}`
			: "No OCR text was supplied; use the attached image only.",
	].join("\n\n");
}

export function contentToString(
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

export function groqPricelistModelName(): string {
	return (
		process.env.GROQ_PRICELIST_MODEL?.trim() ||
		process.env.DENTAL_PRICELIST_GROQ_MODEL?.trim() ||
		"meta-llama/llama-4-scout-17b-16e-instruct"
	);
}

export async function callGroqPricelist(
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
			let payload: GroqChatPayload = {};
			try {
				payload = (await response.json()) as GroqChatPayload;
			} catch (jsonErr) {
				payload = {
					error: {
						message: `Ошибка чтения JSON ответа Groq: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
					},
				};
			}
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
				throw new Error("Модель вернула ответ без распознанных позиций прайс-листа.");
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
