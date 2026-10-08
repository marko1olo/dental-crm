import {
	type DentalPricelistAnalysisRequest,
	type DentalPricelistAnalysisResponse,
	type ServiceCatalogItem,
} from "@dental/shared";

import {
	getProviderKeyPoolSummary,
	sanitizeProviderErrorMessage,
} from "../../speech/keyPool.js";
import {
	callGroqPricelist,
	groqPricelistModelName,
	itemFromGroq,
	safeParseJsonObject,
} from "./aiParser.js";
import {
	analyzePricelistDeterministic,
	isExpectedImagePayload,
	responseFromItems,
	selectPricelistServiceRows,
	skippedRowsWarnings,
} from "./tableExtractor.js";
import { parseMoney } from "./textNormalizers.js";
import {
	calendarFromClock,
	groqProviderId,
	type PricelistCalendar,
} from "./types.js";

export * from "./types.js";
export * from "./textNormalizers.js";
export * from "./priceScanner.js";
export * from "./categoryClassifiers.js";
export * from "./similarityMatcher.js";
export * from "./tableExtractor.js";
export * from "./aiParser.js";

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
