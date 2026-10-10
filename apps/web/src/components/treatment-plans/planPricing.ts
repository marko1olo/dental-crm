/*
 * planPricing.ts — цены сметы берутся ТОЛЬКО из прайса клиники.
 *
 * ЧТО БЫЛО НЕ ТАК
 *
 * Импорт предложений из зубной формулы
 * (ComparativePlannerDashboard.tsx, importSuggestions) подставлял свои цены,
 * когда услуги не находилось в прайсе: 4000, 8000, 35000, 15000 и снова 35000
 * рублей. Это суммы, которых ни одна клиника не назначала, а уходили они в
 * смету — документ, который подписывает пациент.
 *
 * Хуже: даже когда услуга В ПРАЙСЕ БЫЛА, цена всё равно не читалась. Код брал
 * поле `priceRub`, а у услуги прайса (`ServiceCatalogItem`,
 * packages/shared/src/index.ts) денежное поле называется `basePriceRub`.
 * `service.priceRub` — всегда undefined, и строка `service?.priceRub || "0"`
 * превращала цену в ноль. То есть выдуманные пять цен были ЕДИНСТВЕННЫМИ
 * ценами, которые этот импорт вообще умел показать.
 *
 * Ещё: скидка считалась процентом (`1 - discount / 100`), тогда как и контракт
 * (routes/odontogram.ts: discount до 100 000 000), и колонка
 * (treatment_plan_items_new.discount numeric(10,2)), и итог на сервере
 * (`Math.max(0, price * quantity - discount)`) считают её РУБЛЯМИ. Скидка 500 ₽
 * на строке в 10 000 ₽ показывала пациенту −40 000 ₽.
 *
 * ЧТО СТАЛО
 *
 * Цена приходит из прайса клиники и больше ниоткуда. Если подходящей услуги в
 * прайсе нет — цены нет: строка остаётся с пустой суммой, а человеку пишут,
 * какой именно услуги не хватает и что сделать. Ноль вместо неизвестной цены
 * запрещён (.agents/AGENTS.md, анти-хардкод): ноль означает «бесплатно», а это
 * такая же неправда, как 35 000 из воздуха.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ ВНУТРИ КОМПОНЕНТА
 *
 * Здесь только чистые функции: их можно прогнать node:test без React и без
 * браузера, а компонент до сих пор не смонтирован (см.
 * apps/web/src/tests/patientCardDecomposition.test.ts). Проверять деньги нужно
 * до монтирования, а не после.
 *
 * ПОЧЕМУ КОПЕЙКИ, А НЕ РУБЛИ С ДРОБЬЮ
 *
 * Суммы складываются целыми копейками через packages/shared/src/utils/money.ts.
 * Второго денежного модуля здесь нет и быть не должно. Но `parseKopecks` по
 * замыслу БРОСАЕТ на неожидаемом значении, а данные плана на клиенте схемой не
 * проверяются, поэтому каждое значение сначала проверяется, и вместо исключения
 * посреди отрисовки возвращается null — «сумма неизвестна». Экран, погашенный
 * исключением, не лучше неверной суммы.
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { ToothState } from "../odontogram/ToothChart";
import type { PlanPriceCatalogItem } from "./planDriftAudit";

// Re-exports from decomposed modules to guarantee 100% backward compatibility
export type { PlanPriceCatalogItem } from "./planDriftAudit";
export * from "./planInsuranceCoverage";
export * from "./planPaymentSchedules";
export * from "./planDriftAudit";
export * from "./planDraftValidation";

/** Предложение из зубной формулы: номер зуба и состояние, которое поставил врач. */
export interface PlanSuggestionInput {
	toothNumber: number;
	state: string;
}

/**
 * Правило подбора услуги под состояние зуба.
 *
 * Это НЕ цена и не конфигурация: это то, что искать в прайсе клиники. Цена
 * всегда берётся из найденной строки прайса.
 *
 * Долг, названный честно: связи «состояние зуба → позиция прайса» в базе нет —
 * ни колонки, ни таблицы. Пока её не завели, единственный способ связать
 * диагноз с прайсом — раздел прайса плюс слово в названии услуги. Поэтому
 * совпадение обязано быть ОДНО: несколько подходящих услуг — это вопрос к
 * врачу, а не повод выбрать за него ту, что дороже или лежит первой.
 */
export interface PlanServiceRule {
	/** Раздел прайса, в котором ищем. */
	category: string;
	/** Слова в названии услуги; достаточно одного совпадения. */
	keywords: readonly string[];
	/** Как назвать это лечение человеку, если услуги не нашлось. */
	humanName: string;
}

/**
 * Состояния, которые одонтограмма кладёт в очередь предложений
 * (components/odontogram/OdontogramModule.tsx): Caries, Pulpitis,
 * Planned_Implant, Missing, Crown. `Implant` добавлен потому, что компонент
 * читает и его.
 *
 * `Missing → имплантат` — это правило, которое стояло здесь до правки. Мост
 * «отсутствующий зуб → мост или съёмный протез» — клиническое решение, его
 * принимает не программа; оставлено как было и записано в долг.
 */
export const PLAN_SERVICE_RULES: Partial<Record<ToothState, PlanServiceRule>> =
	{
		Caries: {
			category: "therapy",
			keywords: ["кариес"],
			humanName: "лечение кариеса",
		},
		Pulpitis: {
			category: "therapy",
			keywords: ["пульпит", "эндо", "канал"],
			humanName: "лечение пульпита",
		},
		Periodontitis: {
			category: "therapy",
			keywords: ["периодонтит", "эндо", "канал"],
			humanName: "лечение периодонтита",
		},
		Planned_Implant: {
			category: "surgery",
			keywords: ["имплант"],
			humanName: "установка имплантата",
		},
		Implant: {
			category: "surgery",
			keywords: ["имплант"],
			humanName: "установка имплантата",
		},
		Missing: {
			category: "surgery",
			keywords: ["имплант"],
			humanName: "установка имплантата",
		},
		Crown: {
			category: "prosthetics",
			keywords: ["коронка"],
			humanName: "коронка",
		},
		Retained: {
			category: "surgery",
			keywords: ["ретенир", "удалени", "дистопир", "атипичн"],
			humanName: "удаление ретенированного зуба",
		},
	};

/** Почему у строки нет цены. */
export type PlanPriceIssueKind =
	/** Прайс пуст целиком. */
	| "catalog_empty"
	/** В прайсе нет услуги, подходящей под состояние. */
	| "not_in_catalog"
	/** Подходящих услуг несколько — выбирает врач. */
	| "ambiguous"
	/** Для состояния зуба правила подбора нет. */
	| "no_rule";

export interface PlanPriceIssue {
	kind: PlanPriceIssueKind;
	/** Название лечения человеческими словами. */
	humanName: string;
	/** Сколько услуг прайса подошло (для «ambiguous»). */
	matches: number;
}

/** Результат подбора для одного предложения. */
export interface ResolvedPlanRow {
	toothNumber: number;
	state: string;
	/** Идентификатор позиции прайса; null — позиция не выбрана. */
	serviceId: string | null;
	/** Название услуги из прайса; null — услуга не выбрана. */
	serviceTitle: string | null;
	/** Цена из прайса клиники. null — цена НЕИЗВЕСТНА (не ноль). */
	priceRub: number | null;
	issue: PlanPriceIssue | null;
}

function normalizeTitle(title: string): string {
	return title.toLowerCase().replace(/ё/g, "е");
}

/**
 * Подбирает услуги прайса под предложения из зубной формулы.
 *
 * Ничего не выдумывает: либо ровно одна подходящая услуга прайса вместе с её
 * ценой, либо цена отсутствует и названа причина.
 */
export function resolvePlanSuggestions(
	suggestions: readonly PlanSuggestionInput[],
	catalog: readonly PlanPriceCatalogItem[],
): ResolvedPlanRow[] {
	const activeCatalog = catalog.filter((service) => service.active);
	const rows: ResolvedPlanRow[] = [];

	for (const suggestion of suggestions) {
		const rule = PLAN_SERVICE_RULES[suggestion.state as ToothState];
		if (!rule) {
			rows.push({
				toothNumber: suggestion.toothNumber,
				state: suggestion.state,
				serviceId: null,
				serviceTitle: null,
				priceRub: null,
				issue: { kind: "no_rule", humanName: suggestion.state, matches: 0 },
			});
			continue;
		}

		const matches = activeCatalog.filter((service) => {
			if (service.category !== rule.category) return false;
			const title = normalizeTitle(service.title);
			return rule.keywords.some((keyword) =>
				title.includes(normalizeTitle(keyword)),
			);
		});

		if (matches.length === 1) {
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const service = matches[0]!;
			rows.push({
				toothNumber: suggestion.toothNumber,
				state: suggestion.state,
				serviceId: service.id,
				serviceTitle: service.title,
				priceRub: Number.isFinite(service.basePriceRub)
					? service.basePriceRub
					: null,
				issue: Number.isFinite(service.basePriceRub)
					? null
					: {
							kind: "not_in_catalog",
							humanName: rule.humanName,
							matches: 1,
						},
			});
			continue;
		}

		rows.push({
			toothNumber: suggestion.toothNumber,
			state: suggestion.state,
			serviceId: null,
			serviceTitle: null,
			priceRub: null,
			issue: {
				kind:
					matches.length > 1
						? "ambiguous"
						: activeCatalog.length === 0
							? "catalog_empty"
							: "not_in_catalog",
				humanName: rule.humanName,
				matches: matches.length,
			},
		});
	}

	return rows;
}

function toothList(numbers: readonly number[]): string {
	const sorted = [...numbers].sort((left, right) => left - right);
	return sorted.length === 1 ? `зуб ${sorted[0]}` : `зубы ${sorted.join(", ")}`;
}

/**
 * Человеческие объяснения, почему часть строк осталась без цены.
 *
 * Одна фраза на проблему, а не на строку: пять кариозных зубов без услуги в
 * прайсе — это одна новость и один список зубов, иначе экран заваливает
 * повторами (.agents/AGENTS.md, без визуальной перегрузки).
 *
 * Каждая фраза говорит, что СДЕЛАТЬ. Про «впишите цену руками» здесь намеренно
 * не сказано: сервер принимает строку сметы только с позицией прайса
 * (routes/odontogram.ts, priceId обязателен), поэтому такой совет был бы
 * обещанием, которого интерфейс не сдержит.
 */
export function planPriceIssueMessages(
	rows: readonly ResolvedPlanRow[],
): string[] {
	const groups = new Map<string, { issue: PlanPriceIssue; teeth: number[] }>();
	for (const row of rows) {
		if (!row.issue) continue;
		const key = `${row.issue.kind}|${row.issue.humanName}`;
		const group = groups.get(key);
		if (group) group.teeth.push(row.toothNumber);
		else groups.set(key, { issue: row.issue, teeth: [row.toothNumber] });
	}

	const messages: string[] = [];
	for (const { issue, teeth } of groups.values()) {
		switch (issue.kind) {
			case "catalog_empty":
				messages.push(
					"Прайс-лист пуст: в нём нет ни одной активной услуги. " +
						"Заполните прайс — тогда смету можно будет рассчитать автоматически.",
				);
				break;
			case "not_in_catalog":
				messages.push(
					`«${issue.humanName}» (${toothList(teeth)}): такой услуги нет в вашем прайсе. ` +
						"Добавьте её в прайс — тогда в смете появится ваша цена.",
				);
				break;
			case "ambiguous":
				messages.push(
					`«${issue.humanName}» (${toothList(teeth)}): в прайсе несколько подходящих услуг ` +
						`(${issue.matches}). Выберите нужную в строке — цену программа возьмёт из прайса.`,
				);
				break;
			case "no_rule":
				messages.push(
					`Состояние «${issue.humanName}» (${toothList(teeth)}) программа пока не умеет ` +
						"превращать в услугу. Добавьте нужную строку сметы вручную.",
				);
				break;
		}
	}
	return messages;
}

/**
 * Разбор денежного значения, пришедшего из API, без исключения в отрисовке.
 * null — значение испорчено, и это ЧЕСТНЫЙ ответ, в отличие от нуля.
 */
export function safeKopecks(
	value: number | string | null | undefined,
): Kopecks | null {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

/** Строка сметы в том виде, в каком её отдаёт API. */
export interface PlanMoneyLine {
	price: number | string;
	quantity: number;
	discount?: number | string | null;
}

/**
 * Итог по строке, точно до копейки.
 *
 * Считается ровно так же, как на сервере (routes/odontogram.ts):
 * `max(0, цена × количество − скидка)`, где скидка — РУБЛИ, а не проценты.
 * Иначе экран и сохранённый итог разошлись бы, а расходиться им нельзя:
 * пациент видит один документ.
 */
export function planLineTotalKopecks(line: PlanMoneyLine): Kopecks | null {
	const unitKopecks = safeKopecks(line.price);
	if (unitKopecks === null) return null;
	if (!Number.isInteger(line.quantity) || line.quantity < 0) return null;
	const discountKopecks = safeKopecks(line.discount ?? 0);
	if (discountKopecks === null || discountKopecks < 0) return null;

	const gross = multiplyKopecks(unitKopecks, line.quantity);
	return Math.max(0, gross - discountKopecks);
}

export interface PlanTotal {
	/** Итог в копейках; null — в плане есть строка с непонятной суммой. */
	kopecks: Kopecks | null;
	/** Сколько строк не удалось прочитать. */
	unreadableLines: number;
}

/**
 * Итог плана. Складываются целые копейки, поэтому сумма строк равна итогу
 * ровно, без «почти» (.agents/AGENTS.md §8b).
 *
 * Пустой список строк — не ноль: у сохранённого плана итог хранится отдельно
 * (`totalPrice`), и именно он тогда и показывается.
 */
export function planTotalKopecks(
	lines: readonly PlanMoneyLine[],
	storedTotalRub?: number | string | null,
): PlanTotal {
	if (lines.length === 0) {
		const stored = safeKopecks(storedTotalRub ?? 0);
		return { kopecks: stored, unreadableLines: stored === null ? 1 : 0 };
	}

	const totals: Kopecks[] = [];
	let unreadableLines = 0;
	for (const line of lines) {
		const lineTotal = planLineTotalKopecks(line);
		if (lineTotal === null) {
			unreadableLines += 1;
			continue;
		}
		totals.push(lineTotal);
	}
	if (unreadableLines > 0) return { kopecks: null, unreadableLines };
	return { kopecks: sumKopecks(totals), unreadableLines: 0 };
}
