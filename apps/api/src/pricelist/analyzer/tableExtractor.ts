import {
	dentalPricelistAnalysisResponseSchema,
	dentalPricelistItemSchema,
	type DentalPricelistAnalysisRequest,
	type DentalPricelistAnalysisResponse,
	type DentalPricelistCategorySummary,
	type DentalPricelistItem,
	kopecksToNumericString,
	parseKopecks,
	type PricelistParserMode,
	type ServiceCatalogItem,
	sumKopecks,
} from "@dental/shared";

import { getProviderKeyPoolSummary } from "../../speech/keyPool.js";
import { classifyLine, classifyMaterial } from "./categoryClassifiers.js";
import {
	durationFromLine,
	extractPrice,
	stripPriceFromTitle,
} from "./priceScanner.js";
import {
	buildWarnings,
	confidenceForItem,
	matchServiceId,
} from "./similarityMatcher.js";
import {
	blankNotMoney,
	documentEditionPatterns,
	hasExplicitPriceMark,
	matchesAny,
	normalizeKey,
	normalizeText,
} from "./textNormalizers.js";
import {
	groqPromptVersion,
	groqProviderId,
	maxGroqImagesPerRequest,
	type PricelistCalendar,
} from "./types.js";

export function splitPricelistLines(rawText: string): string[] {
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

export function buildItemFromLine(
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

export function summarize(
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

export function createVisionStatus(
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

export function decodeBase64ImagePayload(value: string): Buffer | null {
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

export function isExpectedImagePayload(
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

export function responseFromItems(input: {
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
export function refusedPriceLeavesServiceRow(sourceText: string): boolean {
	if (matchesAny(sourceText, documentEditionPatterns)) return false;
	/*
	 * Год ищется в тексте БЕЗ подписанных не-денег (blankNotMoney), тем же взглядом,
	 * каким его видит сканер цены. Иначе «Гарантия 2025 дней», где 2025 погашен как
	 * величина с единицей измерения, считалось бы отказом от цены, которого не было,
	 * и мусорная строка вернулась бы в прайс услугой.
	 */
	return /(?<!\d)(?:19|20)\d{2}(?!\d)/u.test(blankNotMoney(sourceText));
}

export function isPricelistServiceRow(item: DentalPricelistItem): boolean {
	if (!item.title.length) return false;
	if (item.priceRub !== null) return true;
	if (item.category !== "other") return true;
	if (hasExplicitPriceMark(item.sourceText)) return true;
	return refusedPriceLeavesServiceRow(item.sourceText);
}

/** Формат предупреждения об отброшенных строках. Один владелец на оба режима. */
export const skippedRowsWarningPrefix = "pricelist_rows_skipped:";

export function skippedRowsWarnings(skippedRows: number): string[] {
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
export function analyzePricelistDeterministic(
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
