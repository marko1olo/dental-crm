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
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	normalizeRubAmountInput,
	validateRubAmountInput,
} from "../../rubAmountInput";
import type { ToothState } from "../odontogram/ToothChart";
import type { TreatmentPlanItem } from "./types";

/**
 * Услуга прайса в том виде, в каком она нужна расчёту.
 *
 * Структурное подмножество `ServiceCatalogItem`: модуль не должен зависеть от
 * полей, которых он не считает, зато любой вызывающий с реальным прайсом
 * подходит по типу.
 */
export interface PlanPriceCatalogItem {
	id: string;
	title: string;
	category: string;
	basePriceRub: number;
	active: boolean;
}

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
					"Ваш прайс-лист пуст, поэтому цены брать неоткуда. " +
						"Заполните прайс в настройках — и смета посчитается сама.",
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
function safeKopecks(
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

/**
 * Процент договора ДМС в базисные пункты (1% = 100 б.п.).
 *
 * `percentageOfKopecks` намеренно не принимает дробный процент: доля от суммы
 * должна считаться целыми. Больше двух знаков после запятой в проценте
 * покрытия — это не покрытие, а ошибка ввода, и молча округлять её нельзя.
 */
export function basisPointsFromPercent(percent: number): number | null {
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
	const basisPoints = Math.round(percent * 100);
	if (Math.abs(percent * 100 - basisPoints) > 1e-6) return null;
	return basisPoints;
}

/** Проценты покрытия из договора ДМС. */
export interface InsuranceCoveragePercents {
	coverageTherapyPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	coverageSurgeryPct: number;
}

/**
 * Процент покрытия для раздела прайса.
 *
 * Раскладка та же, что уже применяется в useAppLogic.tsx для сводки по
 * пациенту: терапия/консультация/периодонтология → терапевтический процент,
 * хирургия → хирургический, ортодонтия и протезирование → ортодонтический,
 * гигиена → гигиенический. Остальное не покрыто.
 *
 * Раньше компонент сметы сравнивал раздел со строкой "ortho", которой в
 * перечислении разделов нет (там `orthodontics`), поэтому ортодонтический
 * процент не применялся никогда.
 */
export function coveragePercentForCategory(
	category: string | null | undefined,
	contract: InsuranceCoveragePercents,
): number {
	switch (category) {
		case "therapy":
		case "consultation":
		case "periodontology":
			return contract.coverageTherapyPct || 0;
		case "surgery":
			return contract.coverageSurgeryPct || 0;
		case "orthodontics":
		case "prosthetics":
			return contract.coverageOrthoPct || 0;
		case "hygiene":
			return contract.coverageHygienePct || 0;
		default:
			return 0;
	}
}

/** Строка плана вместе с разделом прайса, по которому считается покрытие ДМС. */
export interface InsuranceLine {
	lineKopecks: Kopecks;
	category: string | null | undefined;
}

/**
 * Доля ДМС по плану: построчно, по разделу каждой услуги.
 *
 * Раньше здесь стояло среднее арифметическое четырёх процентов договора,
 * поделённое на четыре. Такой доли не назначал никто, и она противоречила
 * значку «Вне покрытия ДМС» на самой строке: значок говорил «не покрыто», а
 * итог всё равно давал этой строке усреднённое покрытие.
 */
export function insuranceCoverageKopecks(
	lines: readonly InsuranceLine[],
	contract: InsuranceCoveragePercents,
): Kopecks {
	const shares: Kopecks[] = [];
	for (const line of lines) {
		const basisPoints = basisPointsFromPercent(
			coveragePercentForCategory(line.category, contract),
		);
		if (basisPoints === null || basisPoints === 0) continue;
		shares.push(percentageOfKopecks(line.lineKopecks, basisPoints));
	}
	return sumKopecks(shares);
}

/** Строка формы создания плана. */
export interface DraftPlanRow {
	/** Название услуги — из прайса или введённое руками. */
	name: string;
	/** Позиция прайса; пусто — не выбрана. */
	priceId?: string | undefined;
	/** Цена так, как её видит человек в поле ввода. */
	price: string;
	quantity: string;
	toothNumber?: number | null | undefined;
}

/** Строка сметы, готовая уйти в POST /api/patients/:id/treatment-plans. */
export interface PlanItemForApi {
	priceId: string;
	name: string;
	toothNumber: number | null;
	price: number;
	quantity: number;
}

export type DraftPlanValidation =
	| { ok: true; items: PlanItemForApi[]; totalKopecks: Kopecks }
	| { ok: false; problems: string[] };

function rowLabel(row: DraftPlanRow, index: number): string {
	const name = row.name.trim();
	if (name) return `«${name}»`;
	return `строка ${index + 1}`;
}

/**
 * Проверка формы перед сохранением.
 *
 * Раньше строки без цены просто отбрасывались (`parseFloat(r.price) > 0`):
 * человек заполнял услугу, нажимал «Создать план» и молча получал план без неё.
 * А строка без позиции прайса уходила с `priceId: null`, который контракт
 * сервера не принимает, — весь запрос падал с 400 и общей фразой «проверьте
 * услуги, цены и этапы».
 *
 * Теперь ни одна заполненная строка не исчезает молча: либо план сохраняется
 * целиком, либо человеку названы конкретные строки и сказано, что с ними
 * сделать.
 */
export function validateDraftPlanRows(
	rows: readonly DraftPlanRow[],
): DraftPlanValidation {
	const problems: string[] = [];
	const items: PlanItemForApi[] = [];
	const lineTotals: Kopecks[] = [];

	rows.forEach((row, index) => {
		const name = row.name.trim();
		const priceId = (row.priceId ?? "").trim();
		const price = row.price.trim();
		const isEmptyRow = !name && !priceId && !price;
		if (isEmptyRow) return;

		let rowIsValid = true;

		if (!name) {
			problems.push(`Строка ${index + 1}: не указано название услуги.`);
			rowIsValid = false;
		}

		const priceProblem = validateRubAmountInput(
			price,
			"укажите цену больше нуля",
		);
		if (priceProblem) {
			problems.push(`${rowLabel(row, index)}: ${priceProblem}.`);
			rowIsValid = false;
		}

		if (!priceId) {
			problems.push(
				`${rowLabel(row, index)}: выберите услугу из прайса. ` +
					"Сохранить строку сметы без позиции прайса сервер не может.",
			);
			rowIsValid = false;
		}

		const quantity = Number.parseInt(row.quantity, 10);
		if (!Number.isInteger(quantity) || quantity < 1) {
			problems.push(
				`${rowLabel(row, index)}: количество указывается целым числом от 1.`,
			);
			rowIsValid = false;
		}

		if (!rowIsValid) return;

		/*
		 * Разбор — тем же единственным разборщиком, что и в кассе
		 * (apps/web/src/rubAmountInput.ts): запятая и точка равноправны,
		 * разделители разрядов отбрасываются, три знака после запятой
		 * отвергаются. Своего разбора денег здесь нет намеренно.
		 */
		const amountRub = normalizeRubAmountInput(price);
		const priceKopecks = amountRub === null ? null : safeKopecks(amountRub);
		if (amountRub === null || priceKopecks === null) {
			problems.push(`${rowLabel(row, index)}: цена не читается как сумма.`);
			return;
		}

		lineTotals.push(multiplyKopecks(priceKopecks, quantity));
		items.push({
			priceId,
			name,
			toothNumber: row.toothNumber ?? null,
			/*
			 * Контракт сервера принимает рубли числом (routes/odontogram.ts), и
			 * сохраняет их строкой в numeric(10,2). Значение приходит из
			 * нормализованного ввода, то есть содержит не больше двух знаков после
			 * запятой, поэтому обратный перевод точен.
			 */
			price: amountRub,
			quantity,
		});
	});

	if (problems.length > 0) return { ok: false, problems };
	if (items.length === 0) {
		return {
			ok: false,
			problems: [
				"В плане нет ни одной услуги. Добавьте услугу из прайса — иначе смету не посчитать.",
			],
		};
	}
	return { ok: true, items, totalKopecks: sumKopecks(lineTotals) };
}

/**
 * Статусы утвержденности плана лечения.
 * Согласно Мандату 8e и 8n, утвержденные планы ('approved', 'in_progress', 'active', 'agreed', 'accepted', 'signed', 'completed')
 * имеют НАМЕРТВО замороженные цены услуг и общую сумму (price snapshot).
 */
export type TreatmentPlanStatus =
	| "draft"
	| "presented"
	| "approved"
	| "in_progress"
	| "active"
	| "agreed"
	| "accepted"
	| "signed"
	| "completed"
	| "rejected";

export function isPlanPriceImmutable(
	status: TreatmentPlanStatus | string | null | undefined,
): boolean {
	if (!status) return false;
	const s = status.trim().toLowerCase();
	return (
		s === "approved" ||
		s === "in_progress" ||
		s === "active" ||
		s === "agreed" ||
		s === "accepted" ||
		s === "signed" ||
		s === "completed"
	);
}

export interface PriceDriftInfo {
	readonly isDrifted: boolean;
	readonly currentCatalogPriceRub: number | null;
	readonly snapshotPriceRub: number;
	readonly driftRub: number;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly badgeText: string;
}

/**
 * Определение дрейфа цен между утвержденным снимком плана и актуальным каталогом (Мандат 8e, 8n).
 * При изменении цен в прайс-листе замороженные цены утвержденного плана НЕ пересчитываются,
 * а врачу показывается спокойный информативный бейдж.
 */
export function detectPriceDrift(
	snapshotPriceRub: number,
	catalogItem: PlanPriceCatalogItem | null | undefined,
	_isPlanImmutable = false,
): PriceDriftInfo {
	const safeSnapshotPrice = Number.isFinite(snapshotPriceRub) ? Math.max(0, snapshotPriceRub) : 0;

	if (!catalogItem) {
		return {
			isDrifted: false,
			currentCatalogPriceRub: null,
			snapshotPriceRub: safeSnapshotPrice,
			driftRub: 0,
			isArchived: false,
			isNotFound: true,
			badgeText: "Позиция не найдена в текущем прайс-листе",
		};
	}

	const isArchived = !catalogItem.active;
	const currentCatalogPriceRub = Number.isFinite(catalogItem.basePriceRub)
		? Math.max(0, catalogItem.basePriceRub)
		: safeSnapshotPrice;
	const driftRub = currentCatalogPriceRub - safeSnapshotPrice;
	const isDrifted = Math.abs(driftRub) > 0.001;

	let badgeText = "Цена актуальна";
	if (isArchived) {
		badgeText = "Услуга архивирована в каталоге";
	} else if (isDrifted) {
		const formattedCatalog = Math.round(currentCatalogPriceRub)
			.toLocaleString("ru-RU")
			.replace(/[\u00A0\u202F]/g, " ");
		const formattedSnapshot = Math.round(safeSnapshotPrice)
			.toLocaleString("ru-RU")
			.replace(/[\u00A0\u202F]/g, " ");
		badgeText = `В прайсе: ${formattedCatalog} ₽ · В плане зафиксировано: ${formattedSnapshot} ₽`;
	}

	return {
		isDrifted,
		currentCatalogPriceRub,
		snapshotPriceRub: safeSnapshotPrice,
		driftRub,
		isArchived,
		isNotFound: false,
		badgeText,
	};
}

export interface InstallmentScheduleKopecks {
	readonly months: 3 | 6 | 12 | 24;
	readonly totalKopecks: Kopecks;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
}

/**
 * Точный копеечный расчет рассрочки 0% без переплат (Мандат 8b, 8e).
 * Сумма всех ежемесячных платежей гарантированно равна итогу плана до копейки (kopeck-exact).
 */
export function calculateInstallmentScheduleKopecks(
	totalKopecks: Kopecks,
	months: 3 | 6 | 12 | 24,
): InstallmentScheduleKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			months,
			totalKopecks: 0,
			monthlyPaymentKopecks: 0,
			monthlyPaymentRub: 0,
			partsKopecks: Array(months).fill(0),
			remainderKopecks: 0,
		};
	}

	const parts = splitKopecks(totalKopecks, months);
	const monthlyPaymentKopecks = parts[0] ?? 0;
	const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
	const basePart = Math.floor(totalKopecks / months);
	const remainder = totalKopecks - basePart * months;

	return {
		months,
		totalKopecks,
		monthlyPaymentKopecks,
		monthlyPaymentRub,
		partsKopecks: parts,
		remainderKopecks: remainder,
	};
}

export interface StagedPaymentBreakdownKopecks {
	readonly totalKopecks: Kopecks;
	readonly stage1Kopecks: Kopecks;
	readonly stage2Kopecks: Kopecks;
	readonly stage3Kopecks: Kopecks;
	readonly stage1Rub: number;
	readonly stage2Rub: number;
	readonly stage3Rub: number;
}

/**
 * Копеечный расчет поэтапной оплаты (по умолчанию 30% аванс / 40% хирургия / 30% ортопедия).
 * Сумма этапов точно сходится с итогом сметы без погрешностей округления.
 */
export function calculateStagedPaymentScheduleKopecks(
	totalKopecks: Kopecks,
	ratios: readonly [number, number, number] = [30, 40, 30],
): StagedPaymentBreakdownKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			totalKopecks: 0,
			stage1Kopecks: 0,
			stage2Kopecks: 0,
			stage3Kopecks: 0,
			stage1Rub: 0,
			stage2Rub: 0,
			stage3Rub: 0,
		};
	}

	const stage1Kopecks = Math.round((totalKopecks * ratios[0]) / 100);
	const stage2Kopecks = Math.round((totalKopecks * ratios[1]) / 100);
	const stage3Kopecks = Math.max(0, totalKopecks - stage1Kopecks - stage2Kopecks);

	return {
		totalKopecks,
		stage1Kopecks,
		stage2Kopecks,
		stage3Kopecks,
		stage1Rub: Math.round(stage1Kopecks / 100),
		stage2Rub: Math.round(stage2Kopecks / 100),
		stage3Rub: Math.round(stage3Kopecks / 100),
	};
}

export type ArchivedServiceAction = "keep_agreed_price" | "replace_from_catalog";

/**
 * Разрешение ситуации с деактивированной / архивной услугой номенклатуры (Zero Dead-Ends).
 * 2 чистых действия в 1 клик для врача:
 * 1. «Выполнить по согласованной цене» — цена плана фиксируется, услуга разблокируется.
 * 2. «Заменить на актуальную из прайса» — подставляется активная позиция каталога с новой ценой.
 */
export function resolveArchivedPlanItem(
	item: TreatmentPlanItem,
	action: ArchivedServiceAction,
	replacementCatalogItem?: PlanPriceCatalogItem | null,
): TreatmentPlanItem {
	if (action === "keep_agreed_price") {
		return {
			...item,
			isPriceLocked: true,
			isArchivedInCatalog: true,
			archivedResolution: "keep_agreed_price",
			requiresManualPricing: false,
		};
	}

	if (action === "replace_from_catalog" && replacementCatalogItem) {
		const newPrice = Number.isFinite(replacementCatalogItem.basePriceRub)
			? Math.max(0, replacementCatalogItem.basePriceRub)
			: item.priceRub;
		return {
			...item,
			name: replacementCatalogItem.title,
			priceId: replacementCatalogItem.id,
			priceRub: newPrice,
			unitPriceRub: newPrice,
			isArchivedInCatalog: false,
			archivedResolution: "replace_from_catalog",
			requiresManualPricing: false,
		};
	}

	return {
		...item,
		archivedResolution: "replace_from_catalog",
	};
}

/**
 * Форматирование суммы в рублях на понятном русском языке.
 * Запрет на сырые «NULL», «NaN ₽», «404 Not Found» или машинный мусор в UI.
 */
export function formatPlanPriceRub(
	amountRub: number | string | null | undefined,
	fallbackText = "Цена не указана",
): string {
	if (amountRub === null || amountRub === undefined || amountRub === "") {
		return fallbackText;
	}
	const num =
		typeof amountRub === "string"
			? Number(amountRub.replace(/\s+/g, "").replace(",", "."))
			: amountRub;
	if (!Number.isFinite(num)) {
		return fallbackText;
	}
	const formatted = Math.round(num)
		.toLocaleString("ru-RU")
		.replace(/[\u00A0\u202F]/g, " ");
	return `${formatted} ₽`;
}

export interface PlanItemDriftAudit {
	readonly itemId: string;
	readonly itemName: string;
	readonly code804n: string;
	readonly snapshotPriceRub: number;
	readonly currentCatalogPriceRub: number | null;
	readonly driftRub: number;
	readonly isDrifted: boolean;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly badgeText: string;
}

export interface PlanDriftAuditResult {
	readonly isImmutable: boolean;
	readonly totalSnapshotKopecks: Kopecks;
	readonly totalCatalogKopecks: Kopecks;
	readonly totalDriftKopecks: Kopecks;
	readonly hasDrift: boolean;
	readonly driftedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly items: readonly PlanItemDriftAudit[];
}

export function auditTreatmentPlanDrift(
	items: readonly TreatmentPlanItem[],
	catalog: readonly PlanPriceCatalogItem[],
	planStatus?: string,
): PlanDriftAuditResult {
	const isImmutable = isPlanPriceImmutable(planStatus);
	const activeCatalog = catalog;

	let totalSnapshotKopecks: Kopecks = 0;
	let totalCatalogKopecks: Kopecks = 0;
	let driftedItemsCount = 0;
	let archivedItemsCount = 0;

	const auditedItems: PlanItemDriftAudit[] = [];

	for (const item of items) {
		const snapshotKopecks = Math.round(
			(item.unitPriceRub || item.priceRub || 0) * (item.quantity || 1) * 100,
		);
		totalSnapshotKopecks += snapshotKopecks;

		// Match in catalog by priceId or title
		const catalogMatch =
			(item.priceId ? activeCatalog.find((c) => c.id === item.priceId) : undefined) ||
			activeCatalog.find(
				(c) => c.title.trim().toLowerCase() === item.name.trim().toLowerCase(),
			);

		const driftInfo = detectPriceDrift(
			item.unitPriceRub || item.priceRub || 0,
			catalogMatch,
			isImmutable,
		);

		if (driftInfo.isDrifted) driftedItemsCount++;
		if (driftInfo.isArchived) archivedItemsCount++;

		const catPrice =
			driftInfo.currentCatalogPriceRub ?? (item.unitPriceRub || item.priceRub || 0);
		const catKopecks = Math.round(catPrice * (item.quantity || 1) * 100);
		totalCatalogKopecks += catKopecks;

		auditedItems.push({
			itemId: item.id,
			itemName: item.name,
			code804n: item.code804n,
			snapshotPriceRub: item.unitPriceRub || item.priceRub || 0,
			currentCatalogPriceRub: driftInfo.currentCatalogPriceRub,
			driftRub: driftInfo.driftRub,
			isDrifted: driftInfo.isDrifted,
			isArchived: driftInfo.isArchived,
			isNotFound: driftInfo.isNotFound,
			badgeText: driftInfo.badgeText,
		});
	}

	return {
		isImmutable,
		totalSnapshotKopecks,
		totalCatalogKopecks,
		totalDriftKopecks: totalCatalogKopecks - totalSnapshotKopecks,
		hasDrift: driftedItemsCount > 0 || archivedItemsCount > 0,
		driftedItemsCount,
		archivedItemsCount,
		items: auditedItems,
	};
}

