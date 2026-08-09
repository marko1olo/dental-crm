/**
 * function-body-source.mjs — вырезание тела функции для проверок исходников.
 *
 * ЗАЧЕМ. Смоуки этого репозитория проверяют требования по тексту исходника и
 * сужают область поиска до одной функции, чтобы «нашлось где-то в файле» не
 * засчитывалось за «нашлось в нужном месте». Приём был такой:
 *
 *     const bodySource = appSource.slice(
 *         appSource.indexOf("async function recordPayment()"),
 *         appSource.indexOf("function documentKindsForCommunicationTask"),
 *     );
 *
 * У него два молчаливых отказа, и оба сработали на этом дереве 2026-08-10.
 *
 * ПЕРВЫЙ: `indexOf` на потерянном якоре возвращает −1, и `slice(-1, -1)` даёт
 * пустую строку вместо ошибки.
 *
 * ВТОРОЙ, тяжелее: якоря лежат в РАЗНЫХ файлах, а склейка складывает их по
 * алфавиту (см. app-logic-source.mjs). Декомпозиция увезла `recordPayment` в
 * `hooks/domains/useFinanceLogic.ts`, а `documentKindsForCommunicationTask`
 * оказался в `useDocumentWorkflowModule.ts` — то есть РАНЬШЕ по алфавиту.
 * Якорь конца встал перед якорем начала, и `slice` вернул `""`. Замерено:
 * начало на позиции 588796, конец на 560865.
 *
 * Чем это опасно. `requireIn` по пустой строке падает — это видно. А `forbidIn`
 * по пустой строке ПРОХОДИТ: запрет перестаёт охранять и не жалуется. В
 * smoke-payment-capture-source.mjs так вхолостую зеленели два запрета — на
 * `Number(paymentAmount.replace(...))` и на запись в `activePatient.`.
 *
 * Здесь тело функции берётся счётом фигурных скобок от её объявления, второй
 * якорь не нужен вовсе. Потерянное объявление — громкая ошибка, а не пустая
 * строка.
 */

/**
 * Тело функции вместе с заголовком, от `declaration` до парной закрывающей
 * скобки.
 *
 * @param {string} source   Исходник или склейка исходников.
 * @param {string} declaration Точное начало объявления, например
 *   `async function recordPayment()`.
 * @param {string} [label]  Как назвать участок в тексте ошибки.
 * @returns {string} Заголовок и тело функции.
 * @throws {Error} Если объявление не найдено или скобки не сходятся.
 */
export function functionBodySource(source, declaration, label = declaration) {
	const start = source.indexOf(declaration);
	if (start < 0)
		throw new Error(
			`Не найдено объявление «${declaration}» (${label}). ` +
				"Либо функция переименована, либо переехала в файл, которого нет в " +
				"склейке. Проверка не может сузить область и обязана упасть, а не " +
				"сверяться с пустотой.",
		);

	const open = source.indexOf("{", start);
	if (open < 0)
		throw new Error(
			`У «${declaration}» (${label}) не найдена открывающая скобка тела.`,
		);

	/*
	 * Счёт скобок ведётся по коду, поэтому строки, шаблоны, комментарии и
	 * регулярные выражения пропускаются: скобка внутри строки — не скобка кода.
	 * Без этого тело обрывалось бы на первом же `"}"` в сообщении оператору, а
	 * в этом репозитории такие сообщения по-русски и длинные.
	 */
	let depth = 0;
	for (let i = open; i < source.length; i += 1) {
		const ch = source[i];

		if (ch === "/" && source[i + 1] === "/") {
			const end = source.indexOf("\n", i);
			i = end < 0 ? source.length : end;
			continue;
		}
		if (ch === "/" && source[i + 1] === "*") {
			const end = source.indexOf("*/", i + 2);
			if (end < 0)
				throw new Error(`Незакрытый комментарий внутри «${declaration}».`);
			i = end + 1;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			const quote = ch;
			i += 1;
			while (i < source.length && source[i] !== quote) {
				if (source[i] === "\\") i += 1;
				i += 1;
			}
			continue;
		}

		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return source.slice(start, i + 1);
		}
	}

	throw new Error(
		`Скобки тела «${declaration}» (${label}) не сошлись до конца файла.`,
	);
}
