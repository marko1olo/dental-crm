/*
 * treatmentEstimatorPricing.ts — подбор услуг и деньги сметы плана лечения.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО
 *
 * Смета (TreatmentEstimator.tsx) хранила ВОСЕМЬ запасных объектов с выдуманными
 * ценами (4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000 ₽) и выдуманными
 * идентификаторами услуг ("service_caries_01", "service_endo_pulpitis",
 * "service_implant_osstem", "service_surgery_guide", "service_crown_zirconia").
 * Если в прайсе клиники подходящей услуги не находилось, эти суммы попадали в
 * документ, который ПОДПИСЫВАЕТ ПАЦИЕНТ, а идентификаторы уходили на сервер
 * полем `priceId`. Ни одну из этих цен не назначала ни одна клиника.
 *
 * Рядом жил тот же дефект помягче: `if (!best && candidates.length > 0) best =
 * candidates[0]` — «возьми любую услугу из раздела». Клиника, у которой раздел
 * «терапия» начинается с «Консультация», получала на кариозный зуб название и
 * цену консультации. Данные при этом настоящие, а утверждение — выдуманное.
 * Общий модуль сметы (../plan/planPricing.ts) этот выбор запрещает прямым
 * текстом: несколько подходящих услуг — вопрос к врачу, а не повод выбрать за
 * него ту, что лежит первой.
 *
 * И третье: раздел прайса фильтровался, а флаг `active` — нет. Услуга, которую
 * клиника ВЫКЛЮЧИЛА, всё равно могла попасть в подписываемую смету.
 *
 * ЧТО СТАЛО
 *
 * Цена приходит из прайса клиники и больше ниоткуда. Нет подходящей услуги —
 * цены нет: `null`, а не ноль. Ноль означает «бесплатно», и подставлять его
 * вместо неизвестной величины запрещено (.agents/AGENTS.md, анти-хардкод).
 * Клиническая находка при этом НЕ теряется: строка остаётся, зуб остаётся,
 * этап остаётся — исчезает только выдуманное число, а человеку сказано, какой
 * услуги не хватает и что сделать.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ ВНУТРИ КОМПОНЕНТА
 *
 * Компонент импортировать из node:test нельзя: по цепочке импортов он тянет
 * файл стилей, и запуск падает с ERR_UNKNOWN_FILE_EXTENSION (проверено).
 * apps/web/testCssStub.mjs описывает эту же болезнь и называет лечение:
 * «чистые модули логики тянут за собой React-модули… Разделить их — отдельная
 * работа». Деньги обязаны проверяться до отрисовки, а не после, поэтому вся
 * арифметика и весь подбор живут здесь, без React и без DOM.
 *
 * ПОЧЕМУ КОПЕЙКИ
 *
 * Складывается только целое: packages/shared/src/utils/money.ts. Второго
 * денежного модуля здесь нет и быть не должно. Прежняя смета считала итог в
 * плавающей точке — `(price * copayPct) / 100` и `acc + (price * qty - disc)`, —
 * а это ровно тот дефект, из-за которого законная квитанция на 900,13 ₽
 * отклонялась как «не сходится» (.agents/AGENTS.md §8b).
 */

import {
	type Kopecks,
	isValidFdiToothNumber,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	type InsuranceCoveragePercents,
	PLAN_SERVICE_RULES,
	type PlanPriceCatalogItem,
	type PlanServiceRule,
	basisPointsFromPercent,
	coveragePercentForCategory,
} from "../plan/planPricing";

/**
 * Ключ автоподбора. Это НЕ идентификатор услуги прайса и на сервер он не
 * уходит: он существует, чтобы отличать «имплантат» от «хирургического
 * шаблона» на одном и том же зубе, когда ни у одной из услуг нет позиции
 * прайса и `priceId` у обеих равен null.
 *
 * Раньше эту роль играл выдуманный `priceId`, и он же был единственным
 * различителем строк. Отсюда шёл второй, незаметный дефект: у
 * "service_caries_01" стояло ДВА разных объекта (молочный и постоянный зуб), у
 * "service_endo_pulpitis" — два, у "service_crown_zirconia" — два. Восемь
 * идентификаторов на пять разных значений.
 */
export type EstimatorSuggestionKey =
	| "caries"
	| "pulpitis"
	| "implant"
	| "implantGuide"
	| "crown";

/** Правило автоподбора: что искать в прайсе и на какой этап ставить. */
export interface EstimatorRule {
	readonly key: EstimatorSuggestionKey;
	/** I — терапия, II — хирургия, III — ортопедия. */
	readonly phase: number;
	/** Что искать в прайсе. Берётся из общего модуля, а не переписывается. */
	readonly match: PlanServiceRule;
}

/**
 * Хирургический шаблон — единственное правило, которого в общем модуле нет:
 * там одно правило на состояние зуба, а планируемый имплантат даёт ДВЕ строки.
 *
 * Слово «хирург» из прежнего списка убрано намеренно. Оно совпадало почти с
 * любой хирургической услугой («Удаление зуба хирургическое»), и цена удаления
 * уходила в смету как цена навигационного шаблона.
 */
const SURGICAL_GUIDE_RULE: PlanServiceRule = {
	category: "surgery",
	keywords: ["шаблон", "навигацион"],
	humanName: "хирургический шаблон",
};

/**
 * Молочный зуб по FDI — код больше 50 (51–55, 61–65, 71–75, 81–85).
 *
 * Порог, а НЕ второй список: набор допустимых номеров живёт в общем контракте
 * (`VALID_FDI_TOOTH_NUMBERS`, packages/shared), и переписывать его сюда
 * запрещено — скопированный список расходится. Проверка на допустимость идёт
 * тем же общим правилом: до неё «зуб 99» считался молочным.
 */
const FIRST_DECIDUOUS_FDI_CODE = 51;

export function isDeciduousFdiToothNumber(value: number): boolean {
	return isValidFdiToothNumber(value) && value >= FIRST_DECIDUOUS_FDI_CODE;
}

/**
 * Правила для состояния зуба.
 *
 * Словарь «состояние зуба → что искать в прайсе» ОДИН на приложение
 * (`PLAN_SERVICE_RULES`). Здесь к нему добавлены только те две вещи, которых в
 * нём нет и которые нужны именно смете: номер этапа и вторая строка
 * (хирургический шаблон) для планируемого имплантата.
 *
 * Состояние `Missing` сознательно не обрабатывается, хотя правило для него в
 * общем модуле есть: «отсутствующий зуб → мост, съёмный протез или имплантат» —
 * клиническое решение, и смета его за врача не принимает. Так же было и до
 * правки.
 */
export function estimatorRulesForTooth(
	state: string,
	toothNumber: number,
): EstimatorRule[] {
	const rule = (
		key: EstimatorSuggestionKey,
		phase: number,
		match: PlanServiceRule | undefined,
	): EstimatorRule[] => (match ? [{ key, phase, match }] : []);

	switch (state) {
		case "Caries":
			return rule("caries", 1, PLAN_SERVICE_RULES.Caries);
		case "Pulpitis":
			return rule("pulpitis", 1, PLAN_SERVICE_RULES.Pulpitis);
		case "Crown":
			return rule("crown", 3, PLAN_SERVICE_RULES.Crown);
		case "Planned_Implant":
		case "Implant":
			// Имплантат в молочный зуб не ставят — так было и до правки.
			if (isDeciduousFdiToothNumber(toothNumber)) return [];
			return [
				...rule("implant", 2, PLAN_SERVICE_RULES.Planned_Implant),
				...rule("implantGuide", 2, SURGICAL_GUIDE_RULE),
			];
		default:
			return [];
	}
}

/** Почему у строки сметы нет цены. */
export type EstimatorPriceIssueKind =
	/** Прайс клиники пуст целиком — в нём нет ни одной услуги. */
	| "catalog_empty"
	/**
	 * Подходящая услуга в прайсе ЕСТЬ, но клиника её выключила.
	 *
	 * Отдельная причина, а не «нет в прайсе»: действия у них разные. «Нет» лечится
	 * добавлением услуги, а выключенную услугу надо ВКЛЮЧИТЬ — и совет «добавьте
	 * её» заставил бы завести в прайсе второй экземпляр того, что там уже есть.
	 */
	| "service_disabled"
	/** В прайсе нет подходящей услуги. */
	| "not_in_catalog"
	/** Подходящих услуг несколько — выбирает врач, не программа. */
	| "ambiguous"
	/** Услуга найдена, но цена у неё не указана или испорчена. */
	| "price_missing"
	/**
	 * В строке ЕСТЬ сумма, но услуги прайса за ней нет.
	 *
	 * Не то же самое, что «нет цены», и раньше называлось именно так: строка с
	 * пустым `priceId` попадала в отказ сохранения с фразой «лечение без цены из
	 * вашего прайса» — при том что сумма стояла у неё на экране. Врач читал про
	 * отсутствующую цену и видел цену.
	 *
	 * Состояние приходит с сервера: apps/api/src/routes/odontogram.ts:135-143
	 * (`splitStoredPriceId`) отдаёт пустой `priceId`, если сохранённая склейка
	 * начинается с «::», а схема записи там же (:94) — `z.string().trim().min(1)`,
	 * то есть `priceId` из двух двоеточий она принимает.
	 */
	| "service_unlinked";

export interface EstimatorPriceIssue {
	readonly kind: EstimatorPriceIssueKind;
	/** Название лечения человеческими словами: «лечение кариеса». */
	readonly humanName: string;
	/** Сколько услуг прайса подошло — для «ambiguous» и «service_disabled». */
	readonly matches: number;
	/**
	 * Как услуга называется в самом прайсе. Заполняется, когда программа знает
	 * ровно одну такую услугу, — чтобы человек нашёл в прайсе именно её строку, а
	 * не искал по описанию лечения.
	 */
	readonly catalogTitle?: string;
}

/**
 * Позиция сметы.
 *
 * `price` и `priceId` допускают null, и это главное изменение: до него
 * «неизвестной цены» в типе не существовало, поэтому её приходилось чем-то
 * подменять — либо выдуманной суммой, либо нулём.
 */
export interface PlanItem {
	id?: string;
	toothNumber?: number;
	/** Позиция прайса клиники. null — услуги в прайсе нет, строку не сохранить. */
	priceId: string | null;
	name: string;
	quantity: number;
	/** Цена из прайса клиники, рубли. null — цена НЕИЗВЕСТНА (не ноль). */
	price: number | null;
	/** Скидка в РУБЛЯХ, как её считают и контракт, и сервер. Ноль — правда. */
	discount: number;
	phase: number;
	isAuto?: boolean;
	/** Ключ автоподбора. Локальный, в тело запроса не попадает. */
	suggestion?: EstimatorSuggestionKey;
	/** Раздел прайса найденной услуги — по нему считается покрытие ДМС. */
	category?: string;
	/** Почему у строки нет цены. null — цена есть. */
	issue?: EstimatorPriceIssue | null;
}

/** Зуб в том виде, в каком его читает подбор. */
export interface EstimatorToothInput {
	readonly toothNumber: number;
	readonly state: string;
	readonly surfaces?: readonly string[] | undefined;
}

export interface EstimatorResolution {
	serviceId: string | null;
	serviceTitle: string | null;
	/** Цена клиники в рублях. null — неизвестна. */
	priceRub: number | null;
	category: string | null;
	issue: EstimatorPriceIssue | null;
}

/**
 * Нормализация названия для поиска. Такая же, как в общем модуле сметы: там она
 * не экспортирована, и вытащить её оттуда без правки чужого файла нельзя.
 */
function normalizeTitle(title: string): string {
	return title.toLowerCase().replace(/ё/g, "е");
}

/** Читаемая цена прайса в рублях, либо null. Ноль-заглушку не подставляем. */
function catalogPriceRub(service: PlanPriceCatalogItem): number | null {
	return Number.isFinite(service.basePriceRub) ? service.basePriceRub : null;
}

/**
 * Услуга прайса под правило — либо ровно одна, либо ни одной с названной
 * причиной. «Любая из раздела» больше не выбирается никогда.
 *
 * ПОЧЕМУ СОВПАДЕНИЯ ИЩУТСЯ ПО ВСЕМУ ПРАЙСУ, А ФИЛЬТР `active` ПРИМЕНЯЕТСЯ ПОСЛЕ.
 *
 * Здесь стояло `catalog.filter(s => s.active)` ПЕРЕД поиском, и выключенная
 * услуга становилась невидимой совсем. Из этого выходили две неправды сразу.
 *
 * Первая: клиника, выключившая прайс целиком (так выглядит прайс, который ещё
 * готовят к открытию), получала причину «прайс пуст» и совет «заполните прайс» —
 * при полном прайсе. Вторая, хуже: если нужная услуга выключена, а остальные
 * включены, причиной становилось «такой услуги нет в вашем прайсе. Добавьте
 * её» — и человек по этому совету завёл бы ВТОРУЮ такую же услугу вместо того,
 * чтобы включить имеющуюся.
 *
 * Поэтому совпадения ищутся по всему прайсу, а разделение идёт потом: в смету
 * выключенная услуга по-прежнему не попадает (клиника её не оказывает, и цену её
 * пациенту называть нельзя), но сказано о ней ПРАВДУ.
 */
export function resolveEstimatorService(
	rule: EstimatorRule,
	catalog: readonly PlanPriceCatalogItem[],
): EstimatorResolution {
	const matched = catalog.filter((service) => {
		if (service.category !== rule.match.category) return false;
		const title = normalizeTitle(service.title);
		return rule.match.keywords.some((keyword) =>
			title.includes(normalizeTitle(keyword)),
		);
	});
	// Выключенная услуга в смету не попадает: клиника её уже не оказывает.
	const matches = matched.filter((service) => service.active);
	const disabled = matched.filter((service) => !service.active);

	const single = matches.length === 1 ? matches[0] : undefined;
	if (single) {
		const priceRub = catalogPriceRub(single);
		return {
			serviceId: single.id,
			serviceTitle: single.title,
			priceRub,
			category: single.category,
			issue:
				priceRub === null
					? {
							kind: "price_missing",
							humanName: rule.match.humanName,
							matches: 1,
							catalogTitle: single.title,
						}
					: null,
		};
	}

	// Подходящая услуга есть, но она выключена — включить, а не заводить вторую.
	if (matches.length === 0 && disabled.length > 0) {
		const onlyDisabled = disabled.length === 1 ? disabled[0] : undefined;
		return {
			serviceId: null,
			serviceTitle: null,
			priceRub: null,
			category: null,
			issue: {
				kind: "service_disabled",
				humanName: rule.match.humanName,
				matches: disabled.length,
				...(onlyDisabled ? { catalogTitle: onlyDisabled.title } : {}),
			},
		};
	}

	return {
		serviceId: null,
		serviceTitle: null,
		priceRub: null,
		category: null,
		issue: {
			kind:
				matches.length > 1
					? "ambiguous"
					: // «Пуст» — это про ВЕСЬ прайс, как и написано у самой причины.
						// Раньше здесь стояла длина списка включённых услуг, и полный, но
						// выключенный прайс объявлялся пустым.
						catalog.length === 0
						? "catalog_empty"
						: "not_in_catalog",
			humanName: rule.match.humanName,
			matches: matches.length,
		},
	};
}

/** Первая буква прописной — для названия строки, собранного из правила. */
function capitalizeFirst(text: string): string {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function surfaceSuffix(surfaces: readonly string[] | undefined): string {
	return surfaces && surfaces.length > 0
		? ` (Поверхности: ${surfaces.join(", ")})`
		: "";
}

/**
 * Строка сметы из правила и прайса.
 *
 * Название найденной услуги — из прайса. Название НЕнайденной — клиническая
 * находка человеческими словами («Лечение кариеса»), а не выдуманная позиция
 * прайса: `priceId` у такой строки null, цены нет, и интерфейс говорит об этом
 * прямо. Врач видит, что зубу нужно лечение, и видит, чего не хватает, чтобы
 * посчитать деньги.
 */
export function planItemFromRule(
	rule: EstimatorRule,
	tooth: EstimatorToothInput,
	catalog: readonly PlanPriceCatalogItem[],
): PlanItem {
	const resolution = resolveEstimatorService(rule, catalog);
	const baseName = resolution.serviceTitle ?? capitalizeFirst(rule.match.humanName);
	return {
		isAuto: true,
		suggestion: rule.key,
		toothNumber: tooth.toothNumber,
		priceId: resolution.serviceId,
		name: baseName + surfaceSuffix(tooth.surfaces),
		quantity: 1,
		price: resolution.priceRub,
		discount: 0,
		phase: rule.phase,
		...(resolution.category !== null ? { category: resolution.category } : {}),
		issue: resolution.issue,
	};
}

/**
 * Образцы правил для обратного опознания «услуга прайса → ключ автоподбора».
 *
 * Номер зуба здесь не участвует, поэтому берётся любой постоянный: правило
 * зависит от состояния, а не от зуба, и молочный порог влияет только на то,
 * предлагать ли имплантат вообще. Второго перечисления категорий и слов нет —
 * образцы собраны тем же `estimatorRulesForTooth`.
 */
const ESTIMATOR_RULE_SAMPLES: Partial<
	Record<EstimatorSuggestionKey, EstimatorRule>
> = (() => {
	const samples: Partial<Record<EstimatorSuggestionKey, EstimatorRule>> = {};
	const adultTooth = 11;
	for (const state of ["Caries", "Pulpitis", "Crown", "Planned_Implant"]) {
		for (const rule of estimatorRulesForTooth(state, adultTooth)) {
			samples[rule.key] = rule;
		}
	}
	return samples;
})();

/**
 * Пересборка автоматических строк под текущую зубную формулу.
 *
 * Опознание строки идёт по ключу автоподбора, а не по `priceId`: у строки без
 * позиции прайса `priceId` равен null, и по нему две разные строки на одном
 * зубе (имплантат и шаблон) слились бы в одну.
 *
 * Строки, пришедшие с сервера, ключа не несут — сервер о нём не знает и знать
 * не должен. Для них опознание остаётся прежним, по `priceId`, поэтому
 * сохранённый план после перезагрузки не удваивается и не пропадает.
 */
/**
 * Чем помечена снятая корзиной автоматическая строка.
 *
 * ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. Пересборка ниже возвращала снятую строку обратно:
 * подбор смотрит только на зубную формулу, а формула про снятие ничего не знает.
 * Врач нажимал корзину на «Коронка, зуб 26», отмечал ЛЮБОЙ другой зуб — и строка
 * появлялась в смете снова, потому что список зубов в этот момент пересоздаётся и
 * эффект подбора идёт заново. Корзина выглядела рабочей, а лечение и его цена
 * возвращались в документ, который подписывает пациент.
 *
 * Ключ считается и по номеру зуба, и по происхождению строки: снятие «коронки на
 * 26» не должно убирать коронку с 36-го.
 */
export function estimatorDismissalKeys(item: PlanItem): string[] {
	if (item.toothNumber === undefined) return [];
	const keys: string[] = [];
	if (item.suggestion) keys.push(`${item.toothNumber}:подбор:${item.suggestion}`);
	// Строки из сохранённого плана ключа подбора не несут — сервер о нём не
	// знает. Для них опознание по позиции прайса, как и в самой пересборке.
	if (item.priceId) keys.push(`${item.toothNumber}:прайс:${item.priceId}`);
	return keys;
}

export function reconcileAutoSuggestions(
	previous: readonly PlanItem[],
	teeth: readonly EstimatorToothInput[],
	catalog: readonly PlanPriceCatalogItem[],
	/**
	 * Что врач снял корзиной вручную. Такие строки подбор больше не возвращает —
	 * до перезагрузки карточки пациента, где смета читается с сервера заново.
	 */
	dismissed: ReadonlySet<string> = new Set(),
): { items: PlanItem[]; changed: boolean } {
	/** Какой ключ автоподбора отвечает за услугу прайса — для строк с сервера. */
	const keysByServiceId = new Map<string, Set<EstimatorSuggestionKey>>();
	for (const rule of Object.values(ESTIMATOR_RULE_SAMPLES)) {
		const { serviceId } = resolveEstimatorService(rule, catalog);
		if (!serviceId) continue;
		const keys = keysByServiceId.get(serviceId) ?? new Set<EstimatorSuggestionKey>();
		keys.add(rule.key);
		keysByServiceId.set(serviceId, keys);
	}

	const toothByNumber = new Map<number, EstimatorToothInput>();
	for (const tooth of teeth) toothByNumber.set(tooth.toothNumber, tooth);

	const allowedKeysByTooth = new Map<number, Set<EstimatorSuggestionKey>>();
	for (const tooth of teeth) {
		allowedKeysByTooth.set(
			tooth.toothNumber,
			new Set(
				estimatorRulesForTooth(tooth.state, tooth.toothNumber).map(
					(rule) => rule.key,
				),
			),
		);
	}

	let changed = false;

	// 1. Убрать автоматические строки, которых зубная формула больше не требует.
	const kept = previous.filter((item) => {
		if (!item.isAuto) return true;
		if (item.toothNumber === undefined) return true;
		const tooth = toothByNumber.get(item.toothNumber);
		if (!tooth) {
			changed = true;
			return false;
		}
		const allowed = allowedKeysByTooth.get(item.toothNumber);
		const itemKeys: Set<EstimatorSuggestionKey> | undefined = item.suggestion
			? new Set([item.suggestion])
			: item.priceId
				? keysByServiceId.get(item.priceId)
				: undefined;
		// Строку неизвестного происхождения не удаляем: удалить чужую строку
		// хуже, чем оставить лишнюю — её видно и её можно снять корзиной.
		if (!itemKeys || itemKeys.size === 0) return true;
		const stillNeeded = [...itemKeys].some((key) => allowed?.has(key) === true);
		if (!stillNeeded) changed = true;
		return stillNeeded;
	});

	// 2. Добавить недостающие.
	const items = [...kept];
	for (const tooth of teeth) {
		for (const rule of estimatorRulesForTooth(tooth.state, tooth.toothNumber)) {
			const resolution = resolveEstimatorService(rule, catalog);
			const alreadyThere = items.some(
				(item) =>
					item.toothNumber === tooth.toothNumber &&
					(item.suggestion === rule.key ||
						(resolution.serviceId !== null &&
							item.priceId === resolution.serviceId)),
			);
			if (alreadyThere) continue;
			/*
			 * Снятое корзиной обратно не возвращается. Проверяются оба ключа: по
			 * подбору (строка родилась здесь) и по позиции прайса (строка пришла из
			 * сохранённого плана и ключа подбора не несёт).
			 */
			const wasDismissed =
				dismissed.has(`${tooth.toothNumber}:подбор:${rule.key}`) ||
				(resolution.serviceId !== null &&
					dismissed.has(`${tooth.toothNumber}:прайс:${resolution.serviceId}`));
			if (wasDismissed) continue;
			items.push(planItemFromRule(rule, tooth, catalog));
			changed = true;
		}
	}

	return { items, changed };
}

/**
 * Позиция плана, пришедшая с сервера.
 *
 * ПОЧЕМУ ЗДЕСЬ ТЕПЕРЬ null, А НЕ НОЛЬ. Прежний автор оставил у этого места
 * записанное решение: `price: numberOr(item.price, 0)`, потому что «проще было
 * поставить ?. в семи местах вывода, но тогда экран показывал бы «0 ₽» там, где
 * цена просто не сохранилась». Цель названа верно — не показывать «0 ₽» вместо
 * неизвестной цены. Достигала она обратного: `money()` (AppHelpers) печатает
 * «0 ₽» и для нуля, и для null, поэтому подстановка нуля не избавляла от «0 ₽»,
 * а ГАРАНТИРОВАЛА его — и вместе с ним отказ сервера, для которого 0 ₽ это
 * законная цена. Третьего варианта у автора не было, потому что в типе не
 * существовало «цены нет».
 *
 * Теперь он есть: цена null, и разметка печатает «цена не задана», а не число.
 * Это не отмена решения предшественника — это единственная его форма, которая
 * действительно даёт обещанное.
 *
 * Отдельным долгом (не в этом файле): сервер сам расплющивает отсутствующую
 * цену в ноль — `numeric(item.price)` в apps/api/src/routes/odontogram.ts, —
 * поэтому строки старых планов приходят уже с нулём, и отличить его от
 * настоящей нулевой цены на клиенте невозможно.
 */
export function planItemFromServer(raw: unknown): PlanItem | null {
	if (!raw || typeof raw !== "object") return null;
	const item = raw as Record<string, unknown>;
	const finiteOr = (value: unknown, fallback: number) =>
		typeof value === "number" && Number.isFinite(value) ? value : fallback;
	const name = typeof item.name === "string" ? item.name : "";
	// Позиция без названия не показывается: врач не поймёт, за что платит.
	if (!name) return null;
	const priceId =
		typeof item.priceId === "string" && item.priceId.trim() !== ""
			? item.priceId
			: null;
	const price =
		typeof item.price === "number" && Number.isFinite(item.price)
			? item.price
			: null;
	// Номер зуба проверяется общим правилом FDI: «зуб 99» в смете — это опечатка,
	// а не зуб, и молочным его считать тем более нельзя.
	const toothNumber = isValidFdiToothNumber(item.toothNumber)
		? item.toothNumber
		: undefined;
	return {
		...(typeof item.id === "string" ? { id: item.id } : {}),
		...(toothNumber !== undefined ? { toothNumber } : {}),
		priceId,
		name,
		quantity: Math.max(1, finiteOr(item.quantity, 1)),
		price,
		discount: finiteOr(item.discount, 0),
		phase: finiteOr(item.phase, 1),
		...(typeof item.isAuto === "boolean" ? { isAuto: item.isAuto } : {}),
		/*
		 * Причина у строки с сервера ставится по ТОМУ, ЧЕГО НЕ ХВАТАЕТ ИМЕННО ЕЙ.
		 *
		 * Здесь стояла одна проверка на цену, и строка с суммой, но без позиции
		 * прайса оставалась `issue: null` — то есть «всё в порядке». Дальше она
		 * считалась в «Итого» как посчитанная, на экране не имела ни одной пометки,
		 * и при этом попадала в отказ сохранения с текстом про отсутствующую цену.
		 * Три места говорили о ней три разных вещи.
		 */
		issue:
			price === null
				? { kind: "price_missing", humanName: name, matches: 0 }
				: priceId === null
					? { kind: "service_unlinked", humanName: name, matches: 0 }
					: null,
	};
}

/* ─────────────────────────── ДЕНЬГИ ─────────────────────────── */

/** Договор ДМС в том виде, в каком его читает расчёт. */
export type EstimatorContract = InsuranceCoveragePercents | null;

/**
 * Четыре процента договора из ответа сервера.
 *
 * Договор приходил в компонент как `any`, и недостающий процент печатался в
 * интерфейсе как «Покрытие ДМС undefined%». Непрочитанный процент — это ноль
 * покрытия, то есть полная цена: пациенту называют сумму БОЛЬШЕ той, которую он
 * заплатит, а не меньше. Ошибаться можно только в эту сторону.
 */
export function estimatorContractFrom(raw: unknown): EstimatorContract {
	if (!raw || typeof raw !== "object") return null;
	const source = raw as Record<string, unknown>;
	const pct = (value: unknown): number =>
		typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
			? value
			: 0;
	return {
		coverageTherapyPct: pct(source.coverageTherapyPct),
		coverageOrthoPct: pct(source.coverageOrthoPct),
		coverageHygienePct: pct(source.coverageHygienePct),
		coverageSurgeryPct: pct(source.coverageSurgeryPct),
	};
}

/**
 * Раздел прайса, по которому считается покрытие ДМС.
 *
 * Раздел найденной услуги — самое точное, что есть. Его не было у строк,
 * пришедших с сервера, поэтому запасной путь повторяет ровно то соответствие,
 * которое действовало до правки: этап I — терапия, II — хирургия, III —
 * ортопедия, а гигиена узнаётся по слову в названии. Числа при этом считает
 * один владелец — `coveragePercentForCategory` из общего модуля.
 */
export function estimatorCoverageCategory(item: PlanItem): string | null {
	if (item.category) return item.category;
	const nameLower = item.name.toLowerCase();
	if (nameLower.includes("гигиен") || nameLower.includes("чистк")) {
		return "hygiene";
	}
	if (item.phase === 1) return "therapy";
	if (item.phase === 2) return "surgery";
	if (item.phase === 3) return "prosthetics";
	return null;
}

/** Деньги одной строки. `known: false` — цены нет, и числа не будет. */
export type EstimatorRowMoney =
	| { known: false }
	| {
			known: true;
			/** Цена за единицу из прайса. */
			unitKopecks: Kopecks;
			/** Цена за единицу к оплате пациентом после покрытия ДМС. */
			unitPayableKopecks: Kopecks;
			/** Цена × количество − скидка, не меньше нуля (как на сервере). */
			lineKopecks: Kopecks;
			/** К оплате пациентом после покрытия ДМС. */
			payableKopecks: Kopecks;
			/** Процент покрытия; 0 — вне покрытия ДМС. */
			coveragePct: number;
			/** Процент со-оплаты пациента. */
			copayPct: number;
			/** Есть ли вообще договор ДМС. */
			hasContract: boolean;
	  };

/**
 * Разбор денежного значения без исключения посреди отрисовки.
 * `parseKopecks` по замыслу бросает, а погашенный экран не лучше неверной суммы.
 */
function safeKopecks(value: number | string | null | undefined): Kopecks | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

/**
 * Деньги строки — целыми копейками.
 *
 * Порядок действий сохранён тот же, что был до правки: со-оплата берётся от
 * ЦЕНЫ ЗА ЕДИНИЦУ, затем умножение на количество, затем вычет скидки в рублях.
 * Менять порядок значило бы менять смысл денег, а этого правка не делает — она
 * убирает плавающую точку.
 */
export function estimatorRowMoney(
	item: PlanItem,
	contract: EstimatorContract,
): EstimatorRowMoney {
	const unitKopecks = safeKopecks(item.price);
	if (unitKopecks === null || unitKopecks < 0) return { known: false };
	if (!Number.isInteger(item.quantity) || item.quantity < 0) {
		return { known: false };
	}
	const discountKopecks = safeKopecks(item.discount) ?? 0;
	if (discountKopecks < 0) return { known: false };

	const lineKopecks = Math.max(
		0,
		multiplyKopecks(unitKopecks, item.quantity) - discountKopecks,
	);

	if (!contract) {
		return {
			known: true,
			unitKopecks,
			unitPayableKopecks: unitKopecks,
			lineKopecks,
			payableKopecks: lineKopecks,
			coveragePct: 0,
			copayPct: 100,
			hasContract: false,
		};
	}

	const coveragePct = coveragePercentForCategory(
		estimatorCoverageCategory(item),
		contract,
	);
	const basisPoints = basisPointsFromPercent(coveragePct);
	if (basisPoints === null || basisPoints === 0) {
		return {
			known: true,
			unitKopecks,
			unitPayableKopecks: unitKopecks,
			lineKopecks,
			payableKopecks: lineKopecks,
			coveragePct: 0,
			copayPct: 100,
			hasContract: true,
		};
	}
	const unitPayable = unitKopecks - percentageOfKopecks(unitKopecks, basisPoints);
	return {
		known: true,
		unitKopecks,
		unitPayableKopecks: unitPayable,
		lineKopecks,
		payableKopecks: Math.max(
			0,
			multiplyKopecks(unitPayable, item.quantity) - discountKopecks,
		),
		coveragePct,
		copayPct: 100 - coveragePct,
		hasContract: true,
	};
}

export interface EstimatorTotals {
	/** Итог к оплате пациентом, целые копейки. Точный. */
	payableKopecks: Kopecks;
	/** Строк без читаемой цены. Больше нуля — итог НЕПОЛНЫЙ, и так и сказано. */
	incompleteRows: number;
	/**
	 * Сколько строк вообще удалось посчитать.
	 *
	 * Ноль здесь означает, что складывать было НЕЧЕГО, и это единственное
	 * состояние, в котором `payableKopecks` нельзя печатать как сумму: ноль
	 * посчитанных строк даёт «0 ₽», а «Итого: 0 ₽» читается как «лечение
	 * бесплатное». Именно этот случай и работает на пустом прайсе, то есть по
	 * умолчанию. Число не выдумано — просто предъявлять его как итог нельзя.
	 */
	pricedRows: number;
}

/**
 * Итог плана.
 *
 * Строка без цены НЕ считается нулём: она увеличивает `incompleteRows`, и
 * интерфейс обязан назвать итог неполным. Молча просуммировать известное и
 * выдать это за итог — то же самое, что выдумать цену.
 */
export function estimatorTotals(
	items: readonly PlanItem[],
	contract: EstimatorContract,
): EstimatorTotals {
	const payable: Kopecks[] = [];
	let incompleteRows = 0;
	for (const item of items) {
		const money = estimatorRowMoney(item, contract);
		if (!money.known) {
			incompleteRows += 1;
			continue;
		}
		payable.push(money.payableKopecks);
	}
	return {
		payableKopecks: sumKopecks(payable),
		incompleteRows,
		pricedRows: payable.length,
	};
}

/** Как панель прочитала сохранённый план — те же три состояния, что в компоненте. */
export type EstimatorPlanReadPhase = "loading" | "ready" | "failed";

/**
 * Что стоит в строке итога.
 *
 * `kind: "sum"` — сумму печатать МОЖНО. `kind: "instead"` — сумма не заявляется
 * вовсе, и вместо неё стоит фраза. Разделение сделано типом, а не соглашением:
 * иначе разметка снова сможет напечатать ноль там, где считать было нечего.
 */
export type EstimatorTotalView = {
	/** Подпись слева от суммы. */
	readonly caption: string;
	/** Приписка под суммой. null — приписки нет. */
	readonly note: string | null;
} & (
	| { readonly kind: "sum"; readonly payableKopecks: Kopecks }
	| { readonly kind: "instead"; readonly instead: string }
);

/**
 * Строка итога сметы.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО. Условие в разметке было `pricedRows === 0 &&
 * incompleteRows > 0`, и оно закрывало ровно один случай — план из строк, ни у
 * одной из которых нет цены. При ПУСТОМ наборе строк оба числа равны нулю,
 * условие не срабатывало, и печаталось «Итого по плану: 0 ₽».
 *
 * Хуже того, строка итога стоит в главном возврате компонента, ни за одним
 * условием чтения, а набор строк обнуляется на каждую загрузку. Поэтому то же
 * «Итого по плану: 0 ₽» печаталось, ПОКА план читается, и — главное — когда план
 * прочитать НЕ УДАЛОСЬ: панель прямо над этим местом сообщала «Позиции плана
 * лечения не загружены», а под ней стоял итог, утверждающий сумму по плану,
 * которого никто не видел. Ноль вместо неизвестной величины запрещён
 * (.agents/AGENTS.md, анти-хардкод), и здесь он ещё и противоречил соседней
 * строке экрана.
 *
 * Правило теперь одно: сумма заявляется ТОЛЬКО когда план прочитан и хотя бы
 * одна строка посчитана. Во всех прочих состояниях на месте суммы стоит фраза о
 * том, что происходит.
 *
 * У отказа чтения приписки нет намеренно: причина и следующий шаг уже написаны в
 * панели отказа выше, а звать «Повторить» отсюда нельзя — эту кнопку рисует
 * PanelLoadFailure только при некоторых кодах ответа (:64), и на 404 или 422 её
 * там нет. Кнопка, обещанная текстом и отсутствующая на экране, — такая же
 * неправда, как выдуманная цена.
 */
export function estimatorTotalView(
	totals: EstimatorTotals,
	rowCount: number,
	phase: EstimatorPlanReadPhase,
): EstimatorTotalView {
	if (phase === "loading") {
		return {
			kind: "instead",
			caption: "Итого по плану:",
			instead: "План ещё читается",
			note: null,
		};
	}
	if (phase === "failed") {
		return {
			kind: "instead",
			caption: "Итого по плану:",
			instead: "План не прочитан",
			note: null,
		};
	}
	if (totals.pricedRows === 0) {
		return rowCount === 0
			? {
					kind: "instead",
					caption: "Итого по плану:",
					instead: "Пока ничего не добавлено",
					note: null,
				}
			: {
					kind: "instead",
					caption: "Итого по плану:",
					instead: "Считать пока нечего",
					note: "Ни у одной строки плана нет цены из вашего прайса",
				};
	}
	return {
		kind: "sum",
		caption:
			totals.incompleteRows > 0
				? "Итого, без непосчитанного:"
				: "Итого по плану:",
		payableKopecks: totals.payableKopecks,
		note:
			totals.incompleteRows > 0
				? "Итог неполный: в плане есть лечение без цены из прайса"
				: null,
	};
}

/* ──────────────────── ЧЕЛОВЕЧЕСКИЕ ОБЪЯСНЕНИЯ ──────────────────── */

/** Куда идти за прайсом. Название раздела — как в интерфейсе (AppHelpers). */
const PRICE_LIST_PLACE = "«Настройки → Прайс»";

function toothList(numbers: readonly number[]): string {
	const sorted = [...numbers].sort((left, right) => left - right);
	return sorted.length === 1 ? `зуб ${sorted[0]}` : `зубы ${sorted.join(", ")}`;
}

/** «лечение кариеса (зубы 11, 12)» — что именно нужно и на каких зубах. */
function needLabel(humanName: string, teeth: readonly number[]): string {
	return teeth.length > 0 ? `${humanName} (${toothList(teeth)})` : humanName;
}

/**
 * Почему часть строк без цены — одной фразой на причину, а не на строку.
 *
 * Пять кариозных зубов без услуги в прайсе — это одна новость и один список
 * зубов: иначе экран заваливает повторами (.agents/AGENTS.md, без визуальной
 * перегрузки).
 *
 * ПУСТОЙ ПРАЙС — ОДНА ФРАЗА НА ВЕСЬ ПЛАН, А НЕ НА КАЖДОЕ ЛЕЧЕНИЕ. Группировка
 * идёт по паре «причина + название лечения», и у пустого прайса это давало по
 * фразе на каждое лечение, причём фразы получались ПОБУКВЕННО ОДИНАКОВЫЕ:
 * «Ваш прайс-лист пуст…» три раза подряд. В разметке они выводятся списком с
 * ключом по тексту, так что одинаковые фразы — это ещё и повторяющиеся ключи
 * React. Поэтому у пустого прайса причина одна, а названия лечений собраны в
 * один список: он же говорит человеку, что заводить в прайсе первым.
 *
 * Общий `planPriceIssueMessages` здесь НЕ переиспользован сознательно: его
 * фраза про несколько подходящих услуг велит «выбрать нужную в строке», а в
 * этой панели выбора услуги в строке нет. Подсказка, которую интерфейс не может
 * выполнить, — такая же неправда, как выдуманная цена.
 */
export function estimatorIssueMessages(items: readonly PlanItem[]): string[] {
	/** Пустой прайс: одна причина на весь план, но список нужных лечений полный. */
	const emptyCatalogNeeds = new Map<string, number[]>();
	const groups = new Map<
		string,
		{ issue: EstimatorPriceIssue; teeth: number[] }
	>();
	for (const item of items) {
		if (!item.issue) continue;
		if (item.issue.kind === "catalog_empty") {
			const teeth = emptyCatalogNeeds.get(item.issue.humanName) ?? [];
			if (item.toothNumber !== undefined) teeth.push(item.toothNumber);
			emptyCatalogNeeds.set(item.issue.humanName, teeth);
			continue;
		}
		const key = `${item.issue.kind}|${item.issue.humanName}`;
		const group = groups.get(key);
		if (group) {
			if (item.toothNumber !== undefined) group.teeth.push(item.toothNumber);
		} else {
			groups.set(key, {
				issue: item.issue,
				teeth: item.toothNumber !== undefined ? [item.toothNumber] : [],
			});
		}
	}

	const messages: string[] = [];
	if (emptyCatalogNeeds.size > 0) {
		const needs = [...emptyCatalogNeeds.entries()].map(([humanName, teeth]) =>
			needLabel(humanName, teeth),
		);
		messages.push(
			`Ваш прайс-лист пуст, поэтому цены брать неоткуда. Заполните прайс в ${PRICE_LIST_PLACE} — для этого плана нужны: ${needs.join("; ")}. Найденное лечение из плана не исчезло: зубы и лечение видны, нет только цен.`,
		);
	}
	for (const { issue, teeth } of groups.values()) {
		const where = teeth.length > 0 ? ` (${toothList(teeth)})` : "";
		switch (issue.kind) {
			case "not_in_catalog":
				messages.push(
					`«${issue.humanName}»${where}: такой услуги нет в вашем прайсе. Добавьте её в ${PRICE_LIST_PLACE} — и в смете появится ваша цена. Пока цены нет, строку сохранить нельзя, но зуб и лечение она показывает верно.`,
				);
				break;
			case "service_disabled":
				/*
				 * Выключенная услуга — отдельная новость, и совет у неё обратный.
				 *
				 * До этого такая строка объявлялась либо «прайс пуст», либо «такой
				 * услуги нет — добавьте её»: по второму совету человек завёл бы в
				 * прайсе ВТОРУЮ такую же услугу, а первый советовал заполнять
				 * заполненный прайс.
				 */
				messages.push(
					issue.catalogTitle
						? `«${issue.humanName}»${where}: такая услуга в вашем прайсе есть — «${issue.catalogTitle}», — но она выключена, поэтому в смету не берётся. Включите её в ${PRICE_LIST_PLACE}, и появится ваша цена. Заводить вторую такую же услугу не нужно.`
						: `«${issue.humanName}»${where}: подходящие услуги в вашем прайсе есть (${issue.matches}), но все выключены, поэтому в смету не берутся. Включите нужную в ${PRICE_LIST_PLACE}, и появится ваша цена.`,
				);
				break;
			case "ambiguous":
				messages.push(
					`«${issue.humanName}»${where}: в вашем прайсе несколько подходящих услуг (${issue.matches}). Какую из них поставить пациенту — решает врач, а не программа. Уточните названия в ${PRICE_LIST_PLACE}, чтобы под это лечение подходила ровно одна услуга.`,
				);
				break;
			case "price_missing":
				messages.push(
					`«${issue.humanName}»${where}: у услуги в прайсе не указана цена. Впишите её в ${PRICE_LIST_PLACE} — считать смету по неизвестной цене программа не станет.`,
				);
				break;
			case "service_unlinked":
				messages.push(
					`«${issue.humanName}»${where}: сумма в строке сохранена, а услуги прайса за ней нет — сервер такую строку не примет. Уберите строку корзиной и отметьте зуб на схеме заново: смета подставит услугу из вашего прайса вместе с ценой.`,
				);
				break;
			case "catalog_empty":
				// Пустой прайс — одна фраза на весь план, она собрана выше по
				// emptyCatalogNeeds. Сюда такая строка не попадает.
				break;
			default: {
				/*
				 * Новая причина обязана получить фразу.
				 *
				 * Ровно этого здесь не было, и цена ошибки уже известна: причина
				 * «услуга выключена» появилась в типе без ветки в этом switch, и
				 * строка молча оставалась БЕЗ ОБЪЯСНЕНИЯ — а вместе с ней исчезал и
				 * весь блок объяснений, потому что разметка рисует его по
				 * непустому списку. Теперь такую причину не пропустит компилятор.
				 */
				const unhandled: never = issue.kind;
				void unhandled;
				break;
			}
		}
	}
	return messages;
}

/** Строки, которые сервер не примет, и почему — человеческими словами. */
export interface EstimatorSaveBlock {
	rows: PlanItem[];
	message: string;
}

/** Чего строке не хватает, чтобы сервер её принял. */
export type EstimatorRowBlockReason =
	/** Нет читаемой цены. */
	| "no_price"
	/** Цена есть, а позиции прайса за ней нет. */
	| "no_service";

/**
 * Почему сервер не примет ИМЕННО эту строку. null — примет.
 *
 * ОДИН владелец правила «сервер возьмёт строку». Оно требуется в трёх местах:
 * запретить сохранение, не собрать тело запроса и пометить строку на экране. До
 * этого условие было выписано в двух из них по отдельности, и они уже разошлись
 * в смысле: отказ сохранения объяснял ЛЮБУЮ незасчитанную строку отсутствием
 * цены, хотя строка без позиции прайса цену показывать может.
 *
 * Порядок причин важен для текста: «нет цены» — беда более глубокая, и если
 * нет ни цены, ни услуги, человеку надо говорить сначала про цену.
 */
export function estimatorRowBlock(
	item: PlanItem,
): EstimatorRowBlockReason | null {
	if (item.price === null || !Number.isFinite(item.price) || item.price < 0) {
		return "no_price";
	}
	if (!item.priceId) return "no_service";
	return null;
}

/**
 * Короткая пометка на строке сметы: почему её нельзя посчитать или сохранить.
 * null — со строкой всё в порядке, и помечать её нечем.
 *
 * Зачем пометка отдельно от объяснений сверху: блок объяснений говорит про
 * лечение вообще («коронки нет в прайсе»), а человек смотрит на строку и должен
 * видеть, какая именно из четырёх строк мешает сохранить план. Строка с суммой,
 * но без позиции прайса не имела на экране ни одного признака — она выглядела
 * посчитанной и молча блокировала сохранение всего плана.
 */
export function estimatorRowMark(
	item: PlanItem,
	money: EstimatorRowMoney,
): string | null {
	if (!money.known) return rowIssueMark(item.issue);
	return estimatorRowBlock(item) === "no_service" ? "нет услуги прайса" : null;
}

function rowIssueMark(issue: EstimatorPriceIssue | null | undefined): string {
	// Причина названа своими словами: строка без услуги в прайсе и строка с
	// испорченной суммой требуют от человека разных действий.
	if (!issue) return "сумма в плане не читается";
	switch (issue.kind) {
		case "catalog_empty":
			return "прайс ещё не заполнен";
		case "service_disabled":
			return "услуга выключена в прайсе";
		case "not_in_catalog":
			return "нет в вашем прайсе";
		case "ambiguous":
			return "подходит несколько услуг";
		case "price_missing":
			return "в прайсе не указана цена";
		case "service_unlinked":
			return "нет услуги прайса";
		default: {
			// Новую причину без пометки компилятор дальше не пропустит; в рантайме
			// общая правда лучше пустого места рядом с ценой.
			const unhandled: never = issue.kind;
			void unhandled;
			return "цены нет";
		}
	}
}

/**
 * Можно ли сохранять план.
 *
 * Сервер (apps/api/src/routes/odontogram.ts, treatmentPlanItemSchema) требует у
 * КАЖДОЙ строки непустой `priceId` и числовую `price`. Одна строка без цены
 * отклоняет ВЕСЬ план, и раньше врач получал за это общую фразу «План лечения
 * не сохранен: проверьте услуги, цены и этапы» — без единого слова о том, какая
 * строка виновата.
 *
 * Выбрасывать такие строки молча тоже нельзя: человек нажал «Сохранить» и
 * получил бы план без части лечения, ничего об этом не узнав.
 */
function namedRows(rows: readonly PlanItem[]): string {
	const named = rows.map((row) => {
		const label = row.issue?.humanName ?? row.name;
		return row.toothNumber !== undefined
			? `«${label}» (зуб ${row.toothNumber})`
			: `«${label}»`;
	});
	return [...new Set(named)].join(", ");
}

export function estimatorSaveBlock(
	items: readonly PlanItem[],
): EstimatorSaveBlock | null {
	/*
	 * Строки разделены по ТОМУ, ЧЕГО ИМ НЕ ХВАТАЕТ, и действия названы разные.
	 *
	 * Прежде здесь был один список и одна фраза «лечение без цены из вашего
	 * прайса» на всех. Про строку с сохранённой суммой, но без позиции прайса это
	 * была прямая неправда: сумма стояла у неё на экране, и совет «добавьте эти
	 * услуги в прайс» ей не помогал — услуга-то в прайсе может быть, потеряна
	 * связь строки с ней.
	 */
	const noPrice: PlanItem[] = [];
	const noService: PlanItem[] = [];
	for (const item of items) {
		const reason = estimatorRowBlock(item);
		if (reason === "no_price") noPrice.push(item);
		else if (reason === "no_service") noService.push(item);
	}
	const rows = [...noPrice, ...noService];
	if (rows.length === 0) return null;

	const parts: string[] = [];
	if (noPrice.length > 0) {
		parts.push(
			`в смете есть лечение без цены из вашего прайса — ${namedRows(noPrice)}. Добавьте эти услуги в ${PRICE_LIST_PLACE} и сохраните снова`,
		);
	}
	if (noService.length > 0) {
		parts.push(
			`у строк есть сумма, но нет услуги прайса — ${namedRows(noService)}. Уберите их корзиной и отметьте зуб на схеме заново: смета подставит услугу из вашего прайса вместе с ценой`,
		);
	}
	const message =
		`План не сохранён: ${parts.join(". Кроме того, ")}. ` +
		`Сервер не принимает строку сметы без услуги прайса, поэтому отказ пришёл бы на весь план. ` +
		`Можно и просто убрать спорную строку корзиной, чтобы сохранить остальное. Набранные позиции остались на экране.`;
	return { rows, message };
}

/**
 * Тело строки для POST /api/patients/:id/treatment-plans.
 *
 * Собирается по полям, а не разворотом `{...item}`: локальные поля
 * (`suggestion`, `issue`, `category`) сервер не описывает, и отправлять их
 * значило бы полагаться на то, что zod-схема их молча выбросит. Возврат null —
 * строка не готова к отправке; проверку делает `estimatorSaveBlock` до запроса.
 *
 * `id` строки тоже не отправляется. Его нет в контракте сервера
 * (`treatmentPlanItemSchema`, apps/api/src/routes/odontogram.ts:92), а при
 * сохранении позиции плана удаляются и вставляются заново (там же, :445-481) —
 * то есть идентификатор прежней строки не значит ничего и уходил только затем,
 * чтобы схема его выбросила.
 */
export interface EstimatorItemForApi {
	toothNumber?: number;
	priceId: string;
	name: string;
	quantity: number;
	price: number;
	discount: number;
	phase: number;
	isAuto?: boolean;
}

export function estimatorItemForApi(item: PlanItem): EstimatorItemForApi | null {
	// Правило «сервер возьмёт строку» одно и живёт в estimatorRowBlock. Второй
	// строкой не проверка, а сужение типов: в PlanItem и цена, и позиция прайса
	// допускают null, и компилятор обязан это увидеть здесь, а не поверить.
	if (estimatorRowBlock(item) !== null) return null;
	const { priceId, price } = item;
	if (priceId === null || price === null) return null;
	return {
		...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
		priceId,
		name: item.name,
		quantity: item.quantity,
		// Именно суженный `price`, а не `item.price`: проверка выше сузила локальную
		// переменную из разбора, а обращение через `item` компилятор по-прежнему
		// видит как `number | null`. Значение то же, но тип обязан это ВИДЕТЬ —
		// иначе сужение написано и не работает.
		price,
		discount: item.discount,
		phase: item.phase,
		...(item.isAuto !== undefined ? { isAuto: item.isAuto } : {}),
	};
}
