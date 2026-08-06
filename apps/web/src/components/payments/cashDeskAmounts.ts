/*
 * АРИФМЕТИКА КАССЫ: КОПЕЙКИ ЦЕЛЫМИ, БЕЗ СТРОК И БЕЗ ПЛАВАЮЩЕЙ ТОЧКИ.
 *
 * Зачем этот модуль вообще появился. В кассе три величины считаются каждый день
 * и каждая была посчитана неверно:
 *
 * 1. ОСТАТОК ДОЛГА ПОДСТАВЛЯЛСЯ ОКРУГЛЁННЫМ. На экране оплат кнопка «Долг: …»
 *    заполняет поле суммы одним нажатием и делает это через
 *    `Math.round(remainingDebt)`. Долг приходит из `billingSummary.totalDueRub`
 *    и копейки в нём есть — схема `nonNegativeMoneyRubSchema` их разрешает, а
 *    `packages/shared/src/tests/money-contract-kopecks.test.ts` прямо
 *    закрепляет значение 1500,24. Итог: долг 1500,24 ₽ подставлялся как 1500 —
 *    24 копейки оставались висеть на пациенте и кнопка «оплатить долг одним
 *    нажатием» его не закрывала никогда; долг 1500,70 ₽ превращался в 1501 —
 *    с пациента брали на 30 копеек больше, чем он должен. Оправдание в
 *    комментарии рядом («поле принимает только целые рубли») устарело: поле
 *    принимает копейки, `normalizeRubAmountInput` разбирает «1500,50», и текст
 *    ошибки сам учит кассира писать копейки после запятой.
 *
 * 2. ДЕНЬГИ СРАВНИВАЛИСЬ И СКЛАДЫВАЛИСЬ СТРОКАМИ. Колонки `numeric(12,2)`
 *    драйвер базы отдаёт строками, и такая строка доезжает до клиента как есть
 *    (это уже поймано в расчёте сверки дня — см. `finance/cashDaySummary.ts`).
 *    Для строк «10» < «3» истинно, а «10» + «3» даёт «103». Поэтому здесь на
 *    входе допускается и число, и строка, но считается всё в целых копейках.
 *
 * 3. КОПЕЙКИ ТЕРЯЛИСЬ НА ПЛАВАЮЩЕЙ ТОЧКЕ. 0.1 + 0.2 не равно 0.3, а
 *    2699.7000000000007 — реальное значение, уже виденное в этом коде после
 *    расчёта страхового покрытия. Складывать и вычитать деньги можно только
 *    целыми копейками, деля на сто в самом конце.
 *
 * ЛИСТОВОЙ МОДУЛЬ. Импортировать здесь можно только такие же листовые модули.
 * Причина не в опрятности: `AppHelpers.tsx` по цепочке импортов тянет за собой
 * таблицы стилей, и модуль логики, попросивший у него `money()`, перестаёт
 * запускаться в `node:test`. Поэтому форматирование денег — забота вызывающего
 * экрана: он берёт `money()` сам. Отсюда наружу уходят только числа и текст.
 */

import { countLabel } from "../../lib/russianPlural";

/** Максимальная сумма, при которой копейки представимы точно (2^53 копеек). */
const MAX_SAFE_RUB = Math.floor(Number.MAX_SAFE_INTEGER / 100);

/**
 * Сумма в рублях -> целые копейки. `null`, если это не деньги.
 *
 * Строку принимаем намеренно: `numeric(12,2)` приходит из драйвера базы
 * строкой. Запятая и точка равноправны — с запятой сумма приходит из поля
 * ввода, с точкой из базы. Пробелы (в том числе неразрывный, он же
 * разделитель разрядов у `toLocaleString('ru-RU')`) отбрасываем.
 */
export function toKopecks(
	value: number | string | null | undefined,
): number | null {
	if (value === null || value === undefined) return null;

	if (typeof value === "number") {
		if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE_RUB) return null;
		/*
		 * Округляем, иначе хвост уходит в младший разряд: 2699.7 * 100 в
		 * двоичной дроби равно 269970.00000000006, а 0.29 * 100 —
		 * 28.999999999999996, и усечение съело бы копейку.
		 *
		 * Чего это НЕ лечит: сумму мельче копейки. 1.005 хранится как
		 * 1.00499999999999989, поэтому даст 100 копеек, а не 101 — «правильного»
		 * ответа тут нет, третьего знака у денег не существует. Такие значения
		 * в кассу приходить не должны; сумма из поля ввода их не даёт
		 * (normalizeRubAmountInput отказывает на трёх знаках после запятой).
		 */
		return Math.round(value * 100);
	}

	const compact = value.replace(/[\s ]/g, "").replace(",", ".");
	if (!compact) return null;
	// Минус разрешён: возврат и коррекция приходят отрицательными.
	if (!/^-?\d+(\.\d+)?$/.test(compact)) return null;

	const amountRub = Number(compact);
	if (!Number.isFinite(amountRub) || Math.abs(amountRub) > MAX_SAFE_RUB)
		return null;
	return Math.round(amountRub * 100);
}

/** Целые копейки -> рубли для `money()`. Обратная сторона `toKopecks`. */
export function fromKopecks(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

/**
 * Текст для поля «Сумма к оплате», в точности как его разбирает
 * `normalizeRubAmountInput`: запятая, без разделителей разрядов, копейки только
 * когда они есть.
 *
 * Именно этим заполняется поле по кнопке «Долг: …». Разделитель разрядов сюда
 * ставить нельзя вопреки виду денег на экране: поле снимает пробелы, но
 * `money()` разделяет разряды НЕРАЗРЫВНЫМ пробелом, и он в паре мест доезжал до
 * разбора как обычный символ. Пустая строка вместо мусора: лучше не заполнить
 * поле, чем заполнить его суммой, которой нет.
 */
export function rubAmountForInput(
	value: number | string | null | undefined,
): string {
	const kopecks = toKopecks(value);
	if (kopecks === null || kopecks <= 0) return "";

	const wholeRub = Math.floor(kopecks / 100);
	const restKopecks = kopecks % 100;
	if (restKopecks === 0) return String(wholeRub);
	// Копейки всегда двумя знаками: «1500,2» разберётся, но человек читает
	// это как два рубля, а не как двадцать копеек.
	return `${wholeRub},${String(restKopecks).padStart(2, "0")}`;
}

/**
 * Остаток долга после платежа. Никогда не отрицательный: переплата — это не
 * «долг минус», её разбирают возвратом, а не знаком в подсказке кассиру.
 *
 * Нечитаемые входные данные (обе величины `null`) отдаём как `null`, а не как
 * ноль: ноль на экране означает «долгов нет», и показать его вместо отказа
 * расчёта — та же ложь экрана, что «список пуст» на упавшем запросе.
 */
export function remainingDebtAfterPayment(
	dueRub: number | string | null | undefined,
	paidRub: number | string | null | undefined,
): number | null {
	const dueKopecks = toKopecks(dueRub);
	if (dueKopecks === null) return null;
	// Не введённая ещё сумма платежа — это ноль оплаты, а не отказ расчёта:
	// кассир видит полный долг, пока поле пустое.
	const paidKopecks = toKopecks(paidRub) ?? 0;
	return fromKopecks(Math.max(0, dueKopecks - paidKopecks));
}

/**
 * Сдача наличными: сколько вернуть из ящика. Меньше нуля не бывает — если дали
 * меньше, чем должны, это недоплата, и сдача равна нулю.
 */
export function changeToReturn(
	tenderedRub: number | string | null | undefined,
	dueRub: number | string | null | undefined,
): number | null {
	const tenderedKopecks = toKopecks(tenderedRub);
	const dueKopecks = toKopecks(dueRub);
	if (tenderedKopecks === null || dueKopecks === null) return null;
	return fromKopecks(Math.max(0, tenderedKopecks - dueKopecks));
}

/**
 * Сумма платежей целыми копейками. Для `numeric` из базы, приходящего строками:
 * `["10", "3"].reduce((a, b) => a + b)` даёт «103», а не 13.
 *
 * Нечитаемые значения не пропускаем молча — они возвращаются отдельным списком,
 * чтобы экран мог сказать честно, что часть строк не разобрана, вместо того
 * чтобы показать заниженный итог как полный.
 */
export function sumRubAmounts(
	values: readonly (number | string | null | undefined)[],
): {
	totalRub: number;
	unreadableCount: number;
} {
	let totalKopecks = 0;
	let unreadableCount = 0;
	for (const value of values) {
		const kopecks = toKopecks(value);
		if (kopecks === null) {
			unreadableCount += 1;
			continue;
		}
		totalKopecks += kopecks;
	}
	return { totalRub: fromKopecks(totalKopecks), unreadableCount };
}

/**
 * Человеческое предупреждение о неразобранных платежах для показа рядом с итогом.
 * Пустая строка, когда разобрано всё: показывать нечего.
 *
 * Согласование числа берём общей `countLabel`, а не склеиваем строку руками.
 * Иначе кассир читает «2 платёж не разобран» и «5 платёж», а такая надпись
 * выглядит ошибкой программы — и доверие к самому итогу, к деньгам, падает
 * вместе с ней. Слово выбрано так, чтобы фраза сходилась во всех трёх формах:
 * «1 платёж не попал в итог», «2 платежа не попали в итог».
 */
export function unreadablePaymentsWarning(unreadableCount: number): string {
	if (!Number.isFinite(unreadableCount) || unreadableCount <= 0) return "";
	const counted = countLabel(
		Math.trunc(unreadableCount),
		"платёж",
		"платежа",
		"платежей",
	);
	const whole = Math.trunc(unreadableCount);
	// Число один требует «не попал», остальные — «не попали». Одиннадцать в эту
	// поблажку не входит: «11 платежей не попали».
	const singular = whole % 10 === 1 && whole % 100 !== 11;
	const verb = singular ? "не попал" : "не попали";
	// Подсказка обязательна: без неё это просто «что-то не так» без выхода.
	return `${counted} ${verb} в итог — сумма не читается. Проверьте эти платежи в журнале оплат.`;
}
