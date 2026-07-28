/**
 * money.ts — деньги целыми копейками, без плавающей точки.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ СУЩЕСТВУЕТ
 *
 * Денежные колонки в базе живут в двух видах: `integer` (целые рубли) и
 * `numeric(12, 2)` (рубли с копейками). Драйвер node-postgres отдаёт `numeric`
 * СТРОКОЙ — иначе значение не влезло бы в double без потерь. Дальше эту строку
 * обычно прогоняют через `Number()`, и с этого места деньги считаются в
 * плавающей точке: 0.1 + 0.2 === 0.30000000000000004, а `Math.round` на балансе
 * кошелька превращает 50.50 в 51 — клиника дарит семье полтинник из воздуха.
 *
 * Здесь единица хранения — целая копейка (`number`, безопасно до 2^53, то есть
 * до ~90 триллионов рублей). Разбор строки из базы идёт по регулярному
 * выражению, без parseFloat: "150.50" → 15050 точно, а не «почти точно».
 *
 * ПРАВИЛА
 *  • складывать и вычитать можно только копейки с копейками;
 *  • умножение на количество — целое на целое, результат точный;
 *  • деление (рассрочка, доля страховой) обязано явно сказать, куда девать
 *    остаток: `splitKopecks` раскидывает его по первым частям, чтобы сумма
 *    частей была РАВНА исходной, а не «примерно равна».
 */

/** Копейки. Ровно целое число; отрицательное значение — долг. */
export type Kopecks = number;

const KOPECKS_IN_RUBLE = 100;

/**
 * Неразрывный пробел (U+00A0) для разрядов и знака рубля: иначе строка может
 * разорваться посередине суммы или оставить "₽" на следующей строке.
 *
 * Записано escape-последовательностью намеренно. Невидимый U+00A0 в исходнике
 * не отличить от обычного пробела глазами — на этом уже спотыкались тесты.
 */
export const RU_MONEY_NBSP = " ";

/** Типографский минус (U+2212), а не дефис: у дефиса другая ширина. */
export const RU_MONEY_MINUS = "−";

/**
 * Разбирает денежное значение из базы в копейки без плавающей точки.
 *
 * Принимает то, что реально приходит из драйвера: строку от `numeric`, число от
 * `integer`, либо null. Строка разбирается регулярным выражением — parseFloat
 * уже на этом шаге внёс бы погрешность.
 *
 * Дробная часть длиннее двух знаков — ошибка, а не повод округлить молча:
 * в базе таких значений быть не должно (numeric(12, 2)), и если они появились,
 * это повреждение данных, о котором нужно узнать.
 */
export function parseKopecks(value: string | number | null | undefined): Kopecks {
	if (value === null || value === undefined || value === "") return 0;

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`Денежное значение не является числом: ${value}`);
		}
		// Колонки integer хранят целые рубли — тут перевод точный.
		if (Number.isInteger(value)) return value * KOPECKS_IN_RUBLE;
		// Нецелое число уже прошло через плавающую точку. Приводим через строку
		// с двумя знаками: это ровно то, что записалось бы в numeric(12, 2).
		return parseKopecks(value.toFixed(2));
	}

	const text = value.trim();
	const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!match) {
		throw new Error(`Не похоже на денежное значение: "${value}"`);
	}
	const [, sign, whole, fraction = ""] = match;
	const kopecks =
		Number(whole) * KOPECKS_IN_RUBLE + Number(fraction.padEnd(2, "0"));
	return sign ? -kopecks : kopecks;
}

/** Целые рубли → копейки. Для значений из контрактов, где сумма объявлена int. */
export function rublesToKopecks(rubles: number): Kopecks {
	if (!Number.isInteger(rubles)) {
		throw new Error(`Ожидались целые рубли, получено ${rubles}`);
	}
	return rubles * KOPECKS_IN_RUBLE;
}

/**
 * Копейки → строка для записи в колонку numeric(12, 2).
 *
 * Именно строка: передать сюда number значило бы снова пустить деньги через
 * double по пути в драйвер.
 */
export function kopecksToNumericString(kopecks: Kopecks): string {
	assertWholeKopecks(kopecks);
	const negative = kopecks < 0;
	const absolute = Math.abs(kopecks);
	const whole = Math.trunc(absolute / KOPECKS_IN_RUBLE);
	const fraction = absolute % KOPECKS_IN_RUBLE;
	return `${negative ? "-" : ""}${whole}.${String(fraction).padStart(2, "0")}`;
}

/** Целые рубли из копеек. Бросает, если копейки не делятся на 100 без остатка. */
export function kopecksToWholeRubles(kopecks: Kopecks): number {
	assertWholeKopecks(kopecks);
	if (kopecks % KOPECKS_IN_RUBLE !== 0) {
		throw new Error(
			`Сумма ${kopecksToNumericString(kopecks)} руб. содержит копейки и не может быть выражена целыми рублями`,
		);
	}
	return kopecks / KOPECKS_IN_RUBLE;
}

/** Сумма нескольких значений. Точная: складываются целые. */
export function sumKopecks(values: readonly Kopecks[]): Kopecks {
	let total = 0;
	for (const value of values) {
		assertWholeKopecks(value);
		total += value;
	}
	return total;
}

/** Цена за единицу × количество. Количество обязано быть целым. */
export function multiplyKopecks(unit: Kopecks, quantity: number): Kopecks {
	assertWholeKopecks(unit);
	if (!Number.isInteger(quantity) || quantity < 0) {
		throw new Error(
			`Количество должно быть целым неотрицательным, получено ${quantity}`,
		);
	}
	return unit * quantity;
}

/**
 * Доля от суммы по проценту — для страхового покрытия и скидок.
 *
 * Процент задаётся в базисных пунктах (1% = 100 б.п.), чтобы не тащить в расчёт
 * дробное число. Остаток отбрасывается: доля покрытия не должна оказаться
 * больше самой суммы из-за округления вверх.
 */
export function percentageOfKopecks(
	amount: Kopecks,
	basisPoints: number,
): Kopecks {
	assertWholeKopecks(amount);
	if (!Number.isInteger(basisPoints) || basisPoints < 0) {
		throw new Error(
			`Процент должен быть целым в базисных пунктах, получено ${basisPoints}`,
		);
	}
	return Math.trunc((amount * basisPoints) / 10_000);
}

/**
 * Делит сумму на `parts` частей так, что их сумма РАВНА исходной.
 *
 * Нужно для рассрочки: 100.00 на 3 платежа — это 33.34 + 33.33 + 33.33, а не
 * три раза по 33.33 с потерянной копейкой и не три раза по 33.34 с лишней.
 * Остаток раскидывается по первым частям — так первый платёж чуть больше, что
 * привычно для графиков платежей.
 *
 * Тип возврата — непустой кортеж, а не просто массив. Это не украшение: `parts`
 * меньше единицы отсекается броском ниже, поэтому первая часть существует
 * ВСЕГДА, и вызывающий не обязан её проверять. С обычным `Kopecks[]` при
 * включённом noUncheckedIndexedAccess разбор `const [first] = splitKopecks(...)`
 * давал `Kopecks | undefined`, и график рассрочки в renderDocument.ts не
 * компилировался. Вторая часть по-прежнему может отсутствовать — при `parts: 1`
 * её действительно нет, и это правда, которую тип обязан сохранить.
 */
export function splitKopecks(
	total: Kopecks,
	parts: number,
): [Kopecks, ...Kopecks[]] {
	assertWholeKopecks(total);
	if (!Number.isInteger(parts) || parts <= 0) {
		throw new Error(
			`Число частей должно быть целым положительным, получено ${parts}`,
		);
	}
	const sign = total < 0 ? -1 : 1;
	const absolute = Math.abs(total);
	const base = Math.trunc(absolute / parts);
	const remainder = absolute - base * parts;
	const split = Array.from(
		{ length: parts },
		(_, index) => sign * (base + (index < remainder ? 1 : 0)),
	);
	return split as [Kopecks, ...Kopecks[]];
}

/** Отображение для интерфейса и печатных форм: "1 500,50 ₽". */
export function formatKopecksRu(kopecks: Kopecks): string {
	assertWholeKopecks(kopecks);
	const negative = kopecks < 0;
	const absolute = Math.abs(kopecks);
	const whole = Math.trunc(absolute / KOPECKS_IN_RUBLE);
	const fraction = absolute % KOPECKS_IN_RUBLE;
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_MONEY_NBSP);
	const sign = negative ? RU_MONEY_MINUS : "";
	return `${sign}${grouped},${String(fraction).padStart(2, "0")}${RU_MONEY_NBSP}₽`;
}

function assertWholeKopecks(value: Kopecks): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`Копейки должны быть целым числом, получено ${value}. Похоже, сумма прошла через плавающую точку.`,
		);
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(`Сумма ${value} копеек выходит за пределы точного целого`);
	}
}
