/**
 * Разбор структурированных выгрузок: JSON, JSONL и XML.
 *
 * Такие выгрузки отдают API чужих CRM и браузерные экспорты. Задача — привести
 * дерево к плоской таблице «колонка → значение», не потеряв вложенность: путь
 * до значения становится именем колонки («patient.contacts.phone»), поэтому
 * сопоставление полей работает с ним так же, как с колонкой CSV.
 */

export interface StructuredParseResult {
	columns: string[];
	rows: string[][];
	/** Путь, по которому найден массив записей: «data.patients» либо «» для корня. */
	recordPath: string;
	warnings: string[];
}

/** Глубина, дальше которой вложенность не разворачивается. */
const MAX_FLATTEN_DEPTH = 6;

/**
 * Разворачивает объект в плоские пары «путь → значение».
 *
 * Массивы простых значений склеиваются через «; » — это данные, а не структура
 * («телефоны»: ["8900...", "8916..."]). Массивы объектов не разворачиваются в
 * колонки: они помечаются как отдельная сущность, и движок обрабатывает их
 * вторым проходом, а сериализованный JSON остаётся в колонке, чтобы ничего не
 * потерялось.
 */
function flattenValue(
	value: unknown,
	prefix: string,
	target: Map<string, string>,
	depth = 0,
): void {
	if (value === null || value === undefined) {
		if (prefix) target.set(prefix, "");
		return;
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		target.set(prefix || "value", String(value));
		return;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			if (prefix) target.set(prefix, "");
			return;
		}
		const allPrimitive = value.every(
			(item) =>
				item === null || ["string", "number", "boolean"].includes(typeof item),
		);
		if (allPrimitive) {
			target.set(
				prefix || "value",
				value.map((item) => (item === null ? "" : String(item))).join("; "),
			);
			return;
		}
		// Массив объектов: сохраняем целиком, разбор — задача второго проходa.
		target.set(prefix || "value", JSON.stringify(value));
		return;
	}

	if (typeof value === "object") {
		if (depth >= MAX_FLATTEN_DEPTH) {
			target.set(prefix || "value", JSON.stringify(value));
			return;
		}
		for (const [key, nested] of Object.entries(
			value as Record<string, unknown>,
		)) {
			flattenValue(
				nested,
				prefix ? `${prefix}.${key}` : key,
				target,
				depth + 1,
			);
		}
		return;
	}

	target.set(prefix || "value", String(value));
}

/**
 * Ищет массив записей в произвольном дереве.
 *
 * Выгрузки заворачивают данные во что угодно: {data:{patients:[...]}},
 * {result:{items:[...]}}, {response:{rows:[...]}}. Берётся самый длинный массив
 * объектов — он и есть данные, а не служебная обёртка.
 */
function findRecordArray(root: unknown): { records: unknown[]; path: string } {
	let best: { records: unknown[]; path: string } = { records: [], path: "" };

	const visit = (value: unknown, path: string, depth: number): void => {
		if (depth > MAX_FLATTEN_DEPTH) return;
		if (Array.isArray(value)) {
			const objectItems = value.filter(
				(item) =>
					item !== null && typeof item === "object" && !Array.isArray(item),
			);
			if (objectItems.length > best.records.length) {
				best = { records: value, path };
			}
			// Внутрь элементов массива тоже смотрим: вложенные коллекции бывают длиннее.
			for (const [index, item] of value.slice(0, 5).entries()) {
				visit(item, path ? `${path}[${index}]` : `[${index}]`, depth + 1);
			}
			return;
		}
		if (value !== null && typeof value === "object") {
			for (const [key, nested] of Object.entries(
				value as Record<string, unknown>,
			)) {
				visit(nested, path ? `${path}.${key}` : key, depth + 1);
			}
		}
	};

	visit(root, "", 0);
	return best;
}

/** Собирает таблицу из списка объектов, объединяя ключи всех записей. */
function recordsToTable(records: unknown[]): {
	columns: string[];
	rows: string[][];
	warnings: string[];
} {
	const warnings: string[] = [];
	const flattened: Map<string, string>[] = [];
	/**
	 * Порядок колонок — порядок первого появления ключа, а не алфавитный: так
	 * таблица в предпросмотре выглядит как исходная выгрузка, и оператору проще
	 * сверять глазами.
	 */
	const columnOrder: string[] = [];
	const seenColumns = new Set<string>();
	let skippedPrimitives = 0;

	for (const record of records) {
		if (
			record === null ||
			typeof record !== "object" ||
			Array.isArray(record)
		) {
			skippedPrimitives += 1;
			// Простое значение вместо записи: сохраняем в единственную колонку.
			const map = new Map<string, string>();
			flattenValue(record, "value", map);
			flattened.push(map);
			if (!seenColumns.has("value")) {
				seenColumns.add("value");
				columnOrder.push("value");
			}
			continue;
		}
		const map = new Map<string, string>();
		flattenValue(record, "", map);
		flattened.push(map);
		for (const key of map.keys()) {
			if (!seenColumns.has(key)) {
				seenColumns.add(key);
				columnOrder.push(key);
			}
		}
	}

	if (skippedPrimitives > 0) {
		warnings.push(
			`${skippedPrimitives} элемент(ов) выгрузки не являются объектами; их значение сохранено в колонке «value».`,
		);
	}

	const rows = flattened.map((map) =>
		columnOrder.map((column) => map.get(column) ?? ""),
	);
	return { columns: columnOrder, rows, warnings };
}

export function parseJsonSource(text: string): StructuredParseResult {
	const warnings: string[] = [];
	const trimmed = text.trim();
	if (!trimmed) {
		return {
			columns: [],
			rows: [],
			recordPath: "",
			warnings: ["Источник JSON пуст."],
		};
	}

	// JSONL: каждая строка — самостоятельный объект. Признак — несколько строк,
	// каждая из которых начинается с «{».
	const lines = trimmed
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const looksLikeJsonl =
		lines.length > 1 &&
		lines.every((line) => line.startsWith("{") && line.endsWith("}"));

	if (looksLikeJsonl) {
		const records: unknown[] = [];
		const brokenLines: number[] = [];
		lines.forEach((line, index) => {
			try {
				records.push(JSON.parse(line));
			} catch {
				// Одна битая строка не должна ронять разбор остальных 100 000.
				brokenLines.push(index + 1);
			}
		});
		if (brokenLines.length > 0) {
			warnings.push(
				`${brokenLines.length} строк(и) JSONL не разобраны (первая — строка ${brokenLines[0]}). Остальные записи прочитаны.`,
			);
		}
		const table = recordsToTable(records);
		return {
			...table,
			recordPath: "",
			warnings: [...warnings, ...table.warnings],
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch (error) {
		throw new Error(
			`JSON не разобран: ${error instanceof Error ? error.message : "неизвестная ошибка"}. Проверьте, что файл не обрезан.`,
		);
	}

	if (Array.isArray(parsed)) {
		const table = recordsToTable(parsed);
		return {
			...table,
			recordPath: "",
			warnings: [...warnings, ...table.warnings],
		};
	}

	const found = findRecordArray(parsed);
	if (found.records.length === 0) {
		// Единственный объект — это одна запись, а не отсутствие данных.
		const table = recordsToTable([parsed]);
		warnings.push(
			"В JSON не найдено массива записей; файл обработан как одна запись.",
		);
		return {
			...table,
			recordPath: "",
			warnings: [...warnings, ...table.warnings],
		};
	}

	if (found.path) warnings.push(`Записи найдены по пути «${found.path}».`);
	const table = recordsToTable(found.records);
	return {
		...table,
		recordPath: found.path,
		warnings: [...warnings, ...table.warnings],
	};
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

function decodeXmlEntities(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&amp;/g, "&");
}

interface XmlNode {
	name: string;
	attributes: Record<string, string>;
	children: XmlNode[];
	text: string;
}

/**
 * Разбор XML без внешних зависимостей.
 *
 * Намеренно НЕ обрабатываются внешние сущности (DOCTYPE/ENTITY): их поддержка —
 * это уязвимость XXE, а выгрузка данных клиники приходит из недоверенного
 * источника по определению. DOCTYPE пропускается целиком.
 */
function parseXmlTree(xml: string): {
	root: XmlNode | null;
	warnings: string[];
} {
	const warnings: string[] = [];

	let working = xml
		.replace(/<\?xml[\s\S]*?\?>/g, "")
		.replace(/<!--[\s\S]*?-->/g, "");

	if (/<!DOCTYPE/i.test(working)) {
		warnings.push(
			"Объявление DOCTYPE пропущено: внешние сущности XML не обрабатываются из соображений безопасности.",
		);
		working = working.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*?\])?\s*>/gi, "");
	}

	// CDATA превращаем в обычный текст с экранированием, чтобы не спутать с разметкой.
	working = working.replace(
		/<!\[CDATA\[([\s\S]*?)\]\]>/g,
		(_, content: string) =>
			content
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;"),
	);

	const stack: XmlNode[] = [];
	let root: XmlNode | null = null;
	const tagPattern =
		/<\/?([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while (true) {
		match = tagPattern.exec(working);
		if (match === null) break;
		const text = working.slice(lastIndex, match.index);
		if (text.trim() && stack.length > 0) {
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			stack[stack.length - 1]!.text += decodeXmlEntities(text);
		}
		lastIndex = tagPattern.lastIndex;

		const isClosing = match[0].startsWith("</");
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const name = match[1]!;
		const selfClosing = match[3] === "/";

		if (isClosing) {
			// Незакрытые теги не роняют разбор: сматываем стек до совпадения.
			const depth = stack.map((node) => node.name).lastIndexOf(name);
			if (depth >= 0) stack.length = depth;
			continue;
		}

		const attributes: Record<string, string> = {};
		for (const attributeMatch of (match[2] ?? "").matchAll(
			/([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
		)) {
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			attributes[attributeMatch[1]!] = decodeXmlEntities(
				attributeMatch[2] ?? attributeMatch[3] ?? "",
			);
		}

		const node: XmlNode = { name, attributes, children: [], text: "" };
		if (stack.length === 0) {
			if (!root) root = node;
			else root.children.push(node);
		} else {
			stack[stack.length - 1]?.children.push(node);
		}
		if (!selfClosing) stack.push(node);
	}

	return { root, warnings };
}

/** Узел XML в плоскую запись: атрибуты как @имя, вложенные элементы как путь. */
function xmlNodeToRecord(
	node: XmlNode,
	prefix: string,
	target: Map<string, string>,
	depth = 0,
): void {
	for (const [key, value] of Object.entries(node.attributes)) {
		target.set(prefix ? `${prefix}.@${key}` : `@${key}`, value);
	}

	const text = node.text.replace(/\s+/g, " ").trim();
	if (text) {
		target.set(prefix || node.name, text);
	}

	if (depth >= MAX_FLATTEN_DEPTH) return;

	// Повторяющиеся имена детей нумеруются, чтобы не затирать друг друга.
	const nameCounts = new Map<string, number>();
	for (const child of node.children) {
		const seen = nameCounts.get(child.name) ?? 0;
		nameCounts.set(child.name, seen + 1);
		const suffix = seen === 0 ? child.name : `${child.name}[${seen}]`;
		xmlNodeToRecord(
			child,
			prefix ? `${prefix}.${suffix}` : suffix,
			target,
			depth + 1,
		);
	}
}

export function parseXmlSource(text: string): StructuredParseResult {
	const { root, warnings } = parseXmlTree(text);
	if (!root) {
		return {
			columns: [],
			rows: [],
			recordPath: "",
			warnings: [...warnings, "XML не содержит корневого элемента."],
		};
	}

	/**
	 * Записи — это самая многочисленная группа детей с одинаковым именем на
	 * любом уровне. У выгрузок это <patient>, <row>, <record>, <ЗАПИСЬ>.
	 */
	let best: { nodes: XmlNode[]; path: string } = { nodes: [], path: "" };

	const visit = (node: XmlNode, path: string, depth: number): void => {
		if (depth > MAX_FLATTEN_DEPTH) return;
		const groups = new Map<string, XmlNode[]>();
		for (const child of node.children) {
			const group = groups.get(child.name) ?? [];
			group.push(child);
			groups.set(child.name, group);
		}
		for (const [name, group] of groups) {
			if (group.length > best.nodes.length) {
				best = { nodes: group, path: path ? `${path}/${name}` : name };
			}
		}
		for (const child of node.children) {
			visit(child, path ? `${path}/${child.name}` : child.name, depth + 1);
		}
	};

	visit(root, root.name, 0);

	const recordNodes = best.nodes.length > 0 ? best.nodes : [root];
	if (best.nodes.length === 0) {
		warnings.push(
			"В XML не найдено повторяющихся элементов; файл обработан как одна запись.",
		);
	} else {
		warnings.push(
			`Записи найдены по пути «${best.path}» (${best.nodes.length} шт.).`,
		);
	}

	const columnOrder: string[] = [];
	const seenColumns = new Set<string>();
	const maps = recordNodes.map((node) => {
		const map = new Map<string, string>();
		xmlNodeToRecord(node, "", map);
		for (const key of map.keys()) {
			if (!seenColumns.has(key)) {
				seenColumns.add(key);
				columnOrder.push(key);
			}
		}
		return map;
	});

	return {
		columns: columnOrder,
		rows: maps.map((map) => columnOrder.map((column) => map.get(column) ?? "")),
		recordPath: best.path,
		warnings,
	};
}
