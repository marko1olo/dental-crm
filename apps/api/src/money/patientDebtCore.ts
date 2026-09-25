import {
	formatKopecksRu,
	type Kopecks,
	kopecksToNumericString,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";

/**
 * patientDebtCore.ts — Базовые типы, ошибки, парсеры копеек и расчет строк лечения.
 * Выделено из patientDebt.ts с сохранением 100% обратной совместимости.
 */

export type { Kopecks };

/** Текст денежной колонки `numeric(12, 2)`: `"1500.50"`, `"-800.00"`, `"0"`. */
export type NumericText = string;

/** Сумма на входе: текст колонки `numeric` либо число рублей с ≤ 2 знаками. */
export type MoneyInput = NumericText | number;

/** Статус позиции лечения, который канон исключает из назначенного. */
export const CANCELLED_ITEM_STATUS = "cancelled";

/** Статус платежа, который канон считает полученными деньгами. */
export const PAID_PAYMENT_STATUS = "paid";

/**
 * Порог значимости по умолчанию — 1 ₽ = 100 копеек.
 *
 * Взят у канона (`receivables`, `minDebtRub = Math.max(1, … ?? 1)`) и оставлен
 * параметром, а не константой в теле: это шумовой фильтр отчёта, а не свойство
 * денег. Из-за него `Σ` строк отчёта — НЕ полная дебиторка.
 *
 * СВЕРЯТЬ С БУХГАЛТЕРИЕЙ ПОРОГ БОЛЬШЕ НЕ МЕШАЕТ, и ставить его в ноль для этого
 * не нужно: `clinicDebtTotals` отдаёт рядом со списочными суммами полные
 * (`fullReceivableKopecks`, `fullRefundLiabilityKopecks`) и то, что порог из
 * списков унёс (`subThreshold*`). Пока этих полей не было, «поставьте порог в
 * ноль» оставалось советом в комментарии — а итог клиники тем временем считался с
 * порогом и молча расходился с кассовой арифметикой на отброшенные копейки.
 */
export const DEFAULT_SIGNIFICANCE_KOPECKS = 100;

/**
 * Деньги потеряли точность. Не округляем — отказываемся.
 *
 * Отдельный класс, а не `Error`, чтобы вызывающий мог отличить «данные пришли
 * грязными» от любой другой поломки и ответить пользователю по делу, а не
 * пятисоткой.
 */
export class MoneyPrecisionError extends Error {
	readonly statusCode = 422;

	constructor(
		readonly field: string,
		readonly received: unknown,
		reason: string,
	) {
		super(
			`Сумма «${field}» не может быть представлена в копейках без потери точности: ${reason}. Получено: ${String(received)}.`,
		);
		this.name = "MoneyPrecisionError";
	}
}

/** Количество в позиции лечения нарушает общий контракт. */
export class QuantityContractError extends Error {
	readonly statusCode = 422;

	constructor(
		readonly received: unknown,
		reason: string,
	) {
		super(
			`Количество в позиции лечения обязано быть целым положительным числом (packages/shared/src/index.ts, quantity: z.number().int().positive()): ${reason}. Получено: ${String(received)}.`,
		);
		this.name = "QuantityContractError";
	}
}

/** Текст суммы: знак, целая часть, не более двух знаков дробной. */
const NUMERIC_MONEY_TEXT = /^-?\d+(?:\.\d{1,2})?$/;

/**
 * Копейки из текста колонки `numeric` — с отказом вместо тихого нуля.
 *
 * Само преобразование делает `parseKopecks` из `@dental/shared`: второй разбор
 * денег в этом репозитории запрещён. Здесь добавлены только два отказа, которых
 * общий разбор по замыслу не делает:
 *   • пустая строка и `null` — это не ноль, а непрочитанная сумма;
 *   • всё, что не похоже на `numeric(12, 2)`, отбивается ДО общего разбора, чтобы
 *     вызывающий получил `MoneyPrecisionError` с полем и причиной, а не
 *     безымянный `Error`.
 */
export function kopecksFromNumericText(text: string, field = "сумма"): Kopecks {
	if (typeof text !== "string") {
		throw new MoneyPrecisionError(field, text, "ожидалась строка");
	}

	const trimmed = text.trim();
	if (trimmed === "") {
		throw new MoneyPrecisionError(field, text, "пустая строка — это не ноль");
	}
	if (!NUMERIC_MONEY_TEXT.test(trimmed)) {
		// Сюда попадают три знака после запятой, экспонента, NaN, Infinity и мусор.
		throw new MoneyPrecisionError(
			field,
			text,
			"допустимы только цифры со знаком и не более двух знаков после запятой",
		);
	}

	try {
		return parseKopecks(trimmed);
	} catch (error) {
		throw new MoneyPrecisionError(
			field,
			text,
			error instanceof Error ? error.message : "общий разбор денег отказал",
		);
	}
}

/**
 * Копейки из числа рублей — только если число САМО себя знает точно.
 *
 * Проверка идёт по десятичному представлению (`String(value)`), а не по остатку
 * от умножения. `String` в JavaScript печатает кратчайшую запись, которая
 * читается обратно в то же число, поэтому она — точный детектор грязи:
 *
 *     String(1500.5)              → "1500.5"              → принято
 *     String(1500.505)            → "1500.505"            → ОТКАЗ, третий знак
 *     String(4500.299999999999)   → "4500.299999999999"   → ОТКАЗ, грязь умножения
 *     String(3491.4900000000002)  → "3491.4900000000002"  → ОТКАЗ, грязь сложения
 *
 * Последние две — не «почти 4500,30» и не «почти 3491,49». Это следы того, что
 * кто-то уже посчитал деньги в плавающей точке; `parseKopecks` привёл бы их к
 * двум знакам через `toFixed(2)` и тем самым подтвердил бы чужую потерю точности.
 * Расчёт долга обязан об этом узнать, а не сгладить.
 */
export function kopecksFromRubles(value: number, field = "сумма"): Kopecks {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new MoneyPrecisionError(field, value, "не конечное число");
	}

	const text = String(value);
	if (text.includes("e") || text.includes("E")) {
		throw new MoneyPrecisionError(
			field,
			value,
			"экспоненциальная запись — сумма вне денежного диапазона",
		);
	}

	// Дальше — общий разбор: текст уже доказал, что копейки в нём точные.
	return kopecksFromNumericText(text, field);
}

/** Копейки из текста колонки или из числа рублей. */
export function toKopecks(value: MoneyInput, field = "сумма"): Kopecks {
	return typeof value === "number"
		? kopecksFromRubles(value, field)
		: kopecksFromNumericText(value, field);
}

/**
 * Рубли числом — ТОЛЬКО на границе с контрактом, где схема требует `number`.
 *
 * В общем модуле такой функции нет намеренно: там есть `kopecksToWholeRubles`,
 * который БРОСАЕТ на суммах с копейками, потому что целые рубли — отдельный
 * законный тип поля. Здесь нужно другое: `moneyRubSchema` принимает копейки и
 * ждёт `number`, значит перевод обязан их сохранить.
 *
 * Деление целого числа копеек на 100 даёт ближайшее представимое число, и схема
 * его принимает. Опасно КОПИТЬ в этом виде, поэтому функция названа так, чтобы
 * её вызов был виден в диффе: любое сложение её результатов — возврат к дефекту.
 */
export function rublesFromKopecks(kopecks: Kopecks): number {
	assertKopecks(kopecks, "копейки");
	return kopecks / 100;
}

export function assertKopecks(value: Kopecks, field: string): void {
	if (!Number.isSafeInteger(value)) {
		throw new MoneyPrecisionError(field, value, "ожидалось целое число копеек");
	}
}

/**
 * Ровно те три поля, из которых считается итог строки.
 *
 * Вынесено из `TreatmentChargeRow` не ради красоты: тот же итог считают ворота
 * и печатная форма документа, а у них на входе строка ПЛАТЁЖНОГО ДОКУМЕНТА, у
 * которой нет ни пациента, ни статуса позиции. Без этого типа им пришлось бы
 * подставлять выдуманные `patientId` и `status`, чтобы позвать общий расчёт, —
 * то есть врать типу ради переиспользования. `TreatmentChargeRow` его
 * расширяет, поэтому ни один существующий вызывающий не меняется.
 */
export interface ChargeLineInput {
	readonly unitPriceRub: MoneyInput;
	/** Целое положительное. Дробное или ноль — отказ, а не тихая правка. */
	readonly quantity: number | string;
	readonly discountRub: MoneyInput;
	/*
	 * Поля-соседи из `TreatmentChargeRow`. Расчёту итога строки они не нужны и
	 * им не читаются — объявлены здесь необязательными только затем, чтобы
	 * существующие вызывающие могли передать сюда объектный литерал позиции
	 * целиком (`routes/odontogram.ts`, три места). Без них TypeScript отбивает
	 * такой литерал проверкой лишних свойств, и переиспользование общего расчёта
	 * пришлось бы покупать переписыванием чужого файла.
	 */
	readonly patientId?: string;
	readonly visitId?: string | null;
	readonly organizationId?: string | null;
	readonly status?: string;
}

/** Позиция лечения в том виде, в каком её отдаёт `treatment_items`. */
export interface TreatmentChargeRow extends ChargeLineInput {
	readonly patientId: string;
	/**
	 * Приём, к которому привязана позиция (`treatment_items.visit_id`, nullable).
	 *
	 * Для вопросов про пациента и клинику поле не нужно и потому необязательно:
	 * долг пациента складывается из ВСЕХ его позиций, привязаны они к приёму или
	 * нет. Нужно оно ровно одному ответу — сальдо ОДНОГО приёма, см.
	 * `buildVisitLedger`.
	 */
	readonly visitId?: string | null;
	/** Идентификатор организации/клиники (мультитенантность). */
	readonly organizationId?: string | null;
	/** `"cancelled"` исключается из назначенного — это часть канона. */
	readonly status: string;
}

/**
 * Отдельный способ оплаты в составе сплит-платежа (нал + безнал + аванс + сертификат).
 */
export interface SplitTenderItem {
	/** Вид оплаты: "cash" | "card" | "sbp" | "advance_deposit" | "family_deposit" | "credit" | "certificate_or_bonus" | "dms_insurance" | string */
	readonly kind: string;
	/** Сумма в целых копейках (приоритет, нулевой дрейф) */
	readonly amountKopecks?: Kopecks;
	/** Сумма в рублях (текст numeric или число) */
	readonly amountRub?: MoneyInput;
}

/** Платёж в том виде, в каком его отдаёт `payments`. */
export interface PaymentRow {
	readonly patientId: string;
	/** Приём, к которому привязан платёж (`payments.visit_id`, nullable). */
	readonly visitId?: string | null;
	/** Идентификатор организации/клиники (мультитенантность). */
	readonly organizationId?: string | null;
	/** Только `"paid"` считается полученными деньгами. */
	readonly status: string;
	readonly amountRub: MoneyInput;
	/**
	 * Опциональная детальная разбивка сплит-оплаты (нал + безнал + аванс + сертификат).
	 * При наличии проверяется строжайшее равенство: сумма тендеров в копейках === сумма платежа в копейках.
	 * Расхождение даже в 1 копейку отвергается (выброс MoneyPrecisionError).
	 */
	readonly splitTenders?: readonly SplitTenderItem[];
}

/**
 * Валидация сплит-составляющих платежа: сумма тендеров в копейках обязана
 * в точности совпадать с amountRub платежа (расхождение ровно 0 копеек).
 * Исключает любые ошибки округления при сплит-оплатах (нал + безнал + аванс + сертификат).
 */
export function validateSplitPaymentRow(row: PaymentRow): Kopecks {
	const totalKopecks = toKopecks(row.amountRub, "сумма платежа");
	if (!row.splitTenders || row.splitTenders.length === 0) {
		return totalKopecks;
	}

	const tenderKopecksList: Kopecks[] = [];
	for (const tender of row.splitTenders) {
		let tenderKop: Kopecks;
		if (tender.amountKopecks !== undefined) {
			assertKopecks(tender.amountKopecks, `тендер сплит-оплаты ${tender.kind}`);
			tenderKop = tender.amountKopecks;
		} else if (tender.amountRub !== undefined) {
			tenderKop = toKopecks(tender.amountRub, `тендер сплит-оплаты ${tender.kind}`);
		} else {
			throw new MoneyPrecisionError(
				`тендер сплит-оплаты ${tender.kind}`,
				tender,
				"отсутствует сумма как в копейках, так и в рублях",
			);
		}
		if (tenderKop < 0) {
			throw new MoneyPrecisionError(
				`тендер сплит-оплаты ${tender.kind}`,
				tenderKop,
				"сумма тендера не может быть отрицательной",
			);
		}
		tenderKopecksList.push(tenderKop);
	}

	const tendersSumKopecks = sumKopecks(tenderKopecksList);
	if (tendersSumKopecks !== totalKopecks) {
		throw new MoneyPrecisionError(
			"сплит-оплата",
			{ totalKopecks, tendersSumKopecks, splitTenders: row.splitTenders },
			`сумма сплит-тендеров (${tendersSumKopecks} коп.) не совпадает с суммой платежа (${totalKopecks} коп.), расхождение ${tendersSumKopecks - totalKopecks} коп.`,
		);
	}

	return totalKopecks;
}

/**
 * Итог одной строки позиции: `цена × количество − скидка`, не ниже нуля.
 *
 * Порядок действий здесь — не стилистика. `цена × количество − скидка` и
 * `(цена − скидка) × количество` расходятся на `скидка × (количество − 1)`. Прав
 * первый, и причина — не вкус, а объявление колонки: скидка в этом проекте
 * задана строкой позиции целиком (`treatment_items.discount_rub`,
 * `numeric(12,2)`, `db/schema.ts`), а не ценой за единицу. Вычитание её из
 * КАЖДОЙ единицы умножило бы скидку на количество.
 *
 * Второй способ в дереве уже был — двумя копиями одного модуля
 * (`treatment/TreatmentPlanBuilder.ts` и `full_treatment_plan.ts` в корне), обе
 * с нулём импортёров, обе удалены 2026-08-05/06. Имён их файлов здесь больше
 * нет намеренно: ссылка на несуществующий файл — это приглашение искать его
 * снова. Довод держится на колонке, которая никуда не делась, а расхождение
 * закреплено прогоняемым тестом в `patientDebt.test.ts`.
 *
 * `Math.max(0, …)` стоит на СТРОКЕ, а не на итоге: иначе позиция со скидкой
 * больше цены тайно уменьшила бы долг по остальным позициям того же пациента.
 * Клинике это выглядело бы как «пациент вдруг стал должен меньше», без причины
 * в его собственном лечении.
 *
 * Умножение и вычитание — целые копейки через `multiplyKopecks` из общего
 * модуля, поэтому потерять копейку здесь физически нечем.
 */
export function chargeLineKopecks(row: ChargeLineInput): Kopecks {
	const quantity = assertContractQuantity(row.quantity);
	const unitPrice = toKopecks(row.unitPriceRub, "цена за единицу");
	const discount = toKopecks(row.discountRub, "скидка");
	return Math.max(0, multiplyKopecks(unitPrice, quantity) - discount);
}

/**
 * Тот же итог строки, но БЕЗ исключения — для мест, где бросать нельзя.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ, ЧИСЛОМ. Итог строки лечения считался в проекте ЧЕТЫРЬМЯ
 * способами, и два из них — ворота и печать ОДНОГО И ТОГО ЖЕ юридического
 * документа. Замер 2026-08-05 на цене 1 000,00 ₽, количестве 1,5 и нулевой
 * скидке, через публичные входы обеих сторон:
 *
 *   documents/guards.ts   `validateDocumentCreation` → «строка должна иметь
 *                          сумму 2000.00 руб.»  (там стоял `Math.round(кол-во)`)
 *   documents/renderDocument.ts `renderDocumentHtml` → ячейка «Сумма»: 1 500 руб.
 *                          (там стоял `Math.round(цена × кол-во)`)
 *
 * То есть валидатор сметы и печатная форма той же сметы расходились на 500,00 ₽
 * на одних и тех же данных. Оба «округления» — тихая догадка о том, чего в
 * контракте нет: количество объявлено целым положительным
 * (`packages/shared/src/index.ts`, `treatmentPlanItemSchema.quantity`,
 * `serviceLines[].quantity`), а колонка `treatment_items.quantity` объявлена
 * `numeric(10, 2)` и дробное значение физически пропускает.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ВХОД, А НЕ try/catch ПО МЕСТАМ. `chargeLineKopecks` обязан
 * бросать: расчёт долга и отчёты должны останавливаться на грязных деньгах.
 * Но валидатор документа возвращает ПРИЧИНУ ОТКАЗА строкой, а печатная форма
 * обязана отрисоваться всегда — исключение там превратило бы объяснимый 409 в
 * пустую пятисотку и в невыдаваемый документ без причины. Свой try/catch в
 * каждом из этих мест — это две копии политики, а копий политики в этом файле
 * уже хоронили девять. Здесь ОДНА арифметика (вызов ниже — тот же
 * `chargeLineKopecks`) и ОДНА политика отказа.
 *
 * `ok: false` — это «ответа нет», а НЕ ноль: ноль неотличим от бесплатной
 * услуги, и именно на такой неразличимости в этом дереве уже стоял долг
 * `balanceRub: 0` на семи пациентах подряд.
 */
export type ChargeLineOutcome =
	| { readonly ok: true; readonly kopecks: Kopecks }
	| { readonly ok: false; readonly reason: string };

export function chargeLineOutcome(row: ChargeLineInput): ChargeLineOutcome {
	try {
		return { ok: true, kopecks: chargeLineKopecks(row) };
	} catch (error) {
		if (
			error instanceof QuantityContractError ||
			error instanceof MoneyPrecisionError
		) {
			return { ok: false, reason: error.message };
		}
		throw error;
	}
}

function assertContractQuantity(value: number | string): number {
	const parsed =
		typeof value === "number" ? value : Number(String(value).trim());
	if (!Number.isFinite(parsed)) {
		throw new QuantityContractError(value, "не число");
	}
	if (!Number.isInteger(parsed)) {
		/*
		 * Здесь расходились три существовавших места, и молчаливого выбора быть не
		 * должно: канон в SQL брал `greatest(quantity, 1)` и посчитал бы 1,5
		 * единицы как 1,5, `domainStateHydration` брал `Math.round(quantity)` и
		 * посчитал бы как 2, `sampleData` берёт количество сырым. Первые два из
		 * дерева ушли 2026-08-05/06, но отказ остаётся нужным: колонка
		 * `numeric(10, 2)` приводит вход к двум знакам ДО того, как его увидит
		 * ограничение `quantity = trunc(quantity)` из миграции 0162, поэтому
		 * `1.004` дойдёт сюда как `1.00` и базой отвергнут не будет. На дробном
		 * значении правильный ответ — отказ с объяснением, а не догадка.
		 */
		throw new QuantityContractError(
			value,
			"дробное количество: три существовавших расчёта округляли его по-разному, поэтому здесь оно отвергается, а не угадывается",
		);
	}
	if (parsed <= 0) {
		// Канон подставлял 1 через `greatest(quantity, 1)`, то есть выставлял счёт
		// за единицу, которой в позиции нет. 2026-08-06 это выражение убрано из
		// отчётов и рассылок, а миграция 0162 закрыла такую строку ограничением
		// `quantity > 0`. Ноль означает, что позицию надо пометить `cancelled`, а
		// не выставить.
		throw new QuantityContractError(
			value,
			"количество меньше единицы: позицию без объёма надо отменять статусом cancelled, а не считать как одну единицу",
		);
	}
	return parsed;
}

/**
 * Опции фильтрации расчета задолженности.
 */
export interface PatientDebtFilterOptions {
	/**
	 * Идентификатор организации/клиники (мультитенантность).
	 * Если задан, в сальдо попадают ТОЛЬКО позиции и оплаты этой организации.
	 * Исключает перекрестный зачет долгов и переплат между разными филиалами/клиниками.
	 */
	readonly organizationId?: string | null;
}

/**
 * Проверка принадлежности строки к организации при активной фильтрации.
 */
export function matchesOrganization(
	rowOrg: string | null | undefined,
	filterOrg?: string | null,
): boolean {
	if (!filterOrg) return true;
	if (rowOrg === undefined || rowOrg === null) return false;
	return rowOrg === filterOrg;
}


/**
 * Сумма для записи в колонку `numeric(12, 2)`.
 *
 * Тонкая пересылка в `kopecksToNumericString` из общего модуля — стоит здесь
 * только ради того, чтобы вызывающему не приходилось импортировать деньги из
 * двух пакетов и чтобы поиск по этому файлу показывал полный путь суммы от базы
 * до базы. Своей реализации печати нет.
 */
export function debtNumericText(kopecks: Kopecks): NumericText {
	return kopecksToNumericString(kopecks);
}
