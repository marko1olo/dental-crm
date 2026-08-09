import { MIGRATION_MAX_ROW_CHARS } from "@dental/shared";

/**
 * Разбор табличных выгрузок с разделителем по правилам RFC 4180.
 *
 * ЗАЧЕМ НЕ splitLine ИЗ shared/utils/strings.ts
 * Тот разбор переключает флаг кавычек и выбрасывает сам символ кавычки:
 *
 *     splitLine('Иванов;"ООО ""Ромашка""";100', ";")
 *       → ['Иванов', 'ООО Ромашка', '100']   — удвоенные кавычки съедены;
 *
 * и, что важнее, работает построчно — то есть поле с переводом строки внутри
 * кавычек (обычное дело для колонки «Комментарий») разрывает запись пополам, и
 * вторая половина уезжает в базу как отдельный пациент с мусорными полями.
 * Здесь состояние кавычек живёт на уровне всего документа, а не строки.
 */

export interface DelimitedParseResult {
	columns: string[];
	/** Строки как массивы значений, до сопоставления с колонками. */
	rows: string[][];
	delimiter: string;
	/** Первая строка распознана как заголовок. */
	hasHeader: boolean;
	warnings: string[];
	/**
	 * Строки, где число ячеек не совпало с числом колонок. Не отбрасываются:
	 * попадают в rows дополненными либо обрезанными, а номера собираются здесь,
	 * чтобы движок отправил их в карантин с внятной причиной.
	 */
	raggedRowNumbers: number[];
}

const CANDIDATE_DELIMITERS = [";", ",", "\t", "|"] as const;

/**
 * Разбор в одной функции: разделитель уже известен, состояние кавычек общее
 * для всего текста.
 */
function splitDelimited(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const char = text[index]!;

		if (inQuotes) {
			if (char === '"') {
				// Удвоенная кавычка внутри поля — это одна кавычка в данных.
				if (text[index + 1] === '"') {
					field += '"';
					index += 1;
					continue;
				}
				inQuotes = false;
				continue;
			}
			field += char;
			continue;
		}

		if (char === '"') {
			/**
			 * Кавычка в середине незакавыченного поля — не начало цитаты, а данные:
			 * «размер 6"». Открывающей считается только кавычка в начале поля.
			 */
			if (field.length === 0) {
				inQuotes = true;
			} else {
				field += char;
			}
			continue;
		}

		if (char === delimiter) {
			row.push(field);
			field = "";
			continue;
		}

		if (char === "\n") {
			row.push(field);
			field = "";
			rows.push(row);
			row = [];
			continue;
		}

		field += char;
	}

	// Хвост без завершающего перевода строки.
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows;
}

/**
 * Определяет разделитель.
 *
 * Считать вхождения в первой строке недостаточно: в заголовке «ФИО, телефон;
 * дата» победит запятая, хотя разделитель — точка с запятой. Правильный
 * признак — постоянство числа ячеек по всем строкам: у верного разделителя
 * таблица прямоугольная, у неверного число ячеек скачет.
 */
export function detectDelimiter(text: string): {
	delimiter: string;
	confidence: number;
} {
	const probe = text.length > 200_000 ? text.slice(0, 200_000) : text;
	let best: { delimiter: string; score: number; columns: number } | null = null;

	for (const delimiter of CANDIDATE_DELIMITERS) {
		const rows = splitDelimited(probe, delimiter)
			.filter((row) => row.length > 0 && row.some((cell) => cell.trim() !== ""))
			.slice(0, 200);
		if (rows.length === 0) continue;

		const counts = rows.map((row) => row.length);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const columns = counts[0]!;
		if (columns < 2) continue;

		const consistent =
			counts.filter((count) => count === columns).length / counts.length;
		/**
		 * Оценка = доля прямоугольных строк × логарифм числа колонок. Множитель
		 * нужен, чтобы разделитель, дающий две колонки на всех строках, не побеждал
		 * разделитель, дающий двенадцать колонок на 98% строк.
		 */
		const score = consistent * Math.log2(columns + 1);
		if (!best || score > best.score) best = { delimiter, score, columns };
	}

	if (!best) {
		// Одна колонка: разделителя нет. Точка с запятой как безопасное значение.
		return { delimiter: ";", confidence: 0 };
	}
	return {
		delimiter: best.delimiter,
		confidence: Math.min(1, best.score / Math.log2(best.columns + 1)),
	};
}

/**
 * Похожа ли строка на заголовок.
 *
 * Признаки заголовка: ячейки непустые, короткие, не числа и не даты, и хотя бы
 * одна отличается по «типу» от того, что стоит под ней. Ошибка в обе стороны
 * дорога: принять данные за заголовок — потерять первого пациента; принять
 * заголовок за данные — завести пациента с именем «ФИО».
 */
function looksLikeHeader(
	first: string[],
	second: string[] | undefined,
): boolean {
	const cells = first.map((cell) => cell.trim());
	if (cells.length === 0) return false;
	if (cells.every((cell) => cell === "")) return false;

	const numericCells = cells.filter(
		(cell) => cell !== "" && /^[\d\s.,+-]+$/.test(cell),
	).length;
	// Больше трети числовых ячеек — это данные, а не подписи колонок.
	if (numericCells / cells.length > 0.34) return false;

	const looksLikeDate = cells.filter((cell) =>
		/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/.test(cell),
	).length;
	if (looksLikeDate > 0) return false;

	// Пустые подписи посреди заголовка допустимы, но не половина строки.
	const emptyCells = cells.filter((cell) => cell === "").length;
	if (emptyCells / cells.length > 0.5) return false;

	if (!second) return true;

	/**
	 * Решающий признак: под заголовком стоят значения другого вида. Если вторая
	 * строка содержит числа или даты там, где первая содержит слова, первая —
	 * заголовок.
	 */
	const secondNumeric = second.filter(
		(cell) => cell.trim() !== "" && /^[\d\s.,+-]+$/.test(cell.trim()),
	).length;
	const secondDates = second.filter((cell) =>
		/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(cell.trim()),
	).length;
	if (secondNumeric + secondDates > 0) return true;

	// Обе строки текстовые: считаем заголовком, если ячейки первой заметно короче.
	const averageLength = (values: string[]) =>
		values.reduce((sum, value) => sum + value.trim().length, 0) /
		Math.max(1, values.length);
	return averageLength(cells) < averageLength(second) * 0.8;
}

/** Приводит имена колонок к уникальным непустым значениям. */
function normalizeColumnNames(header: string[]): {
	columns: string[];
	warnings: string[];
} {
	const warnings: string[] = [];
	const seen = new Map<string, number>();
	const columns = header.map((raw, index) => {
		let name = raw.replace(/\s+/g, " ").trim();
		if (name === "") {
			name = `Колонка ${index + 1}`;
			warnings.push(
				`Колонка ${index + 1} без названия — использовано «${name}».`,
			);
		}
		const previous = seen.get(name.toLowerCase());
		if (previous !== undefined) {
			const next = previous + 1;
			seen.set(name.toLowerCase(), next);
			const unique = `${name} (${next})`;
			warnings.push(
				`Колонка «${name}» встречается несколько раз; вторая переименована в «${unique}».`,
			);
			return unique;
		}
		seen.set(name.toLowerCase(), 1);
		return name;
	});
	return { columns, warnings };
}

export function parseDelimited(
	text: string,
	forcedDelimiter?: string,
): DelimitedParseResult {
	const warnings: string[] = [];
	const detection = forcedDelimiter
		? { delimiter: forcedDelimiter, confidence: 1 }
		: detectDelimiter(text);

	if (!forcedDelimiter && detection.confidence < 0.7) {
		warnings.push(
			`Разделитель «${detection.delimiter === "\t" ? "табуляция" : detection.delimiter}» определён неуверенно: в файле есть строки с разным числом ячеек.`,
		);
	}

	const allRows = splitDelimited(text, detection.delimiter)
		// Полностью пустые строки — обычное дело в конце выгрузки, это не данные.
		.filter((row) => row.some((cell) => cell.trim() !== ""));

	if (allRows.length === 0) {
		return {
			columns: [],
			rows: [],
			delimiter: detection.delimiter,
			hasHeader: false,
			warnings: [...warnings, "В источнике нет ни одной непустой строки."],
			raggedRowNumbers: [],
		};
	}

	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const hasHeader = looksLikeHeader(allRows[0]!, allRows[1]);
	let columns: string[];
	let dataRows: string[][];

	if (hasHeader) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const normalized = normalizeColumnNames(allRows[0]!);
		columns = normalized.columns;
		warnings.push(...normalized.warnings);
		dataRows = allRows.slice(1);
	} else {
		warnings.push(
			"Строка заголовка не распознана; колонки пронумерованы, сопоставление полей выполнено по содержимому.",
		);
		const width = Math.max(...allRows.map((row) => row.length));
		columns = Array.from(
			{ length: width },
			(_, index) => `Колонка ${index + 1}`,
		);
		dataRows = allRows;
	}

	/**
	 * Строки другой ширины НЕ выбрасываются. Лишние ячейки — обычно результат
	 * незакавыченного разделителя внутри значения, и содержимое там настоящее.
	 * Недостающие — обрыв выгрузки. И то и другое должно попасть в карантин
	 * целиком, а не исчезнуть.
	 */
	const raggedRowNumbers: number[] = [];
	const rows = dataRows.map((row, index) => {
		if (row.length !== columns.length) {
			raggedRowNumbers.push(index + (hasHeader ? 2 : 1));
		}
		if (row.length < columns.length) {
			return [...row, ...Array<string>(columns.length - row.length).fill("")];
		}
		if (row.length > columns.length) {
			/**
			 * Хвост склеивается в последнюю колонку, а не отрезается: если в поле
			 * «Комментарий» была неэкранированная точка с запятой, текст останется
			 * целым, и оператор увидит его в карантине.
			 */
			const head = row.slice(0, columns.length - 1);
			const tail = row.slice(columns.length - 1).join(detection.delimiter);
			return [...head, tail];
		}
		return row;
	});

	const oversized = rows.filter(
		(row) => row.join("").length > MIGRATION_MAX_ROW_CHARS,
	).length;
	if (oversized > 0) {
		warnings.push(
			`${oversized} строк(и) превышают безопасный размер и будут изолированы в карантин.`,
		);
	}
	if (raggedRowNumbers.length > 0) {
		warnings.push(
			`${raggedRowNumbers.length} строк(и) содержат другое число ячеек, чем заголовок. Обычно причина — неэкранированный разделитель внутри значения. Такие строки изолируются, а не отбрасываются.`,
		);
	}

	return {
		columns,
		rows,
		delimiter: detection.delimiter,
		hasHeader,
		warnings,
		raggedRowNumbers,
	};
}
