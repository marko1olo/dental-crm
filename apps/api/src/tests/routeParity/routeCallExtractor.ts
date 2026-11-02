/**
 * apps/api/src/tests/routeParity/routeCallExtractor.ts
 *
 * Модуль извлечения вызовов API из исходного кода фронтенда (apps/web/src).
 * Разбирает обращения к /api/... через fetch, apiFetch, ky с учетом комментариев,
 * строковых шаблонов и методов HTTP (GET/POST/PUT/PATCH/DELETE).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function collectFiles(
	directory: string,
	extensions: readonly string[],
): string[] {
	const collected: string[] = [];
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "node_modules" || entry === "dist") continue;
			collected.push(...collectFiles(full, extensions));
			continue;
		}
		if (extensions.some((extension) => entry.endsWith(extension))) {
			collected.push(full);
		}
	}
	return collected;
}

/**
 * Приведение адреса к сравнимому виду: параметры пути обезличиваются, потому что
 * `/api/patients/${id}/duplicates` и `/api/patients/:patientId/duplicates` — один
 * и тот же маршрут. Хвостовой параметр отбрасывается: по нему нельзя отличить
 * `/api/egisz/logs/:id` от несуществующего `/api/egisz/logs`.
 */
export function normalizePath(raw: string): string {
	const withoutQuery = raw.split("?")[0] ?? "";
	const withParams = withoutQuery
		.replace(/\$\{[^}]*\}/g, ":param")
		.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ":param")
		.replace(/\/+$/, "");

	const segments = withParams.split("/");
	const glued = segments.findIndex(
		(segment) => segment.includes(":param") && segment !== ":param",
	);
	return glued === -1
		? withParams
		: [
				...segments.slice(0, glued),
				segments[glued]?.replace(/:param.*$/, "") ?? "",
			]
				.filter(Boolean)
				.join("/")
				.replace(/^/, "/");
}

/**
 * Вырезание комментариев перед поиском адресов.
 * Разбор знает про кавычки всех трех видов и экранирование,
 * чтобы не повреждать содержимое шаблонных строк и URL.
 */
export function stripComments(source: string): string {
	let out = "";
	let index = 0;
	let quote: string | null = null;
	while (index < source.length) {
		const char = source[index];
		const next = source[index + 1];
		if (quote) {
			out += char;
			if (char === "\\") {
				out += next ?? "";
				index += 2;
				continue;
			}
			if (char === quote) quote = null;
			index += 1;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			out += char;
			index += 1;
			continue;
		}
		if (char === "/" && next === "*") {
			index += 2;
			while (
				index < source.length &&
				!(source[index] === "*" && source[index + 1] === "/")
			)
				index += 1;
			index += 2;
			out += " ";
			continue;
		}
		if (char === "/" && next === "/") {
			while (index < source.length && source[index] !== "\n") index += 1;
			continue;
		}
		out += char;
		index += 1;
	}
	return out;
}

/** Разбор аргументов вызова функции в скобках. */
export function callArguments(
	source: string,
	openParen: number,
): string[] | null {
	const args: string[] = [];
	let depth = 0;
	let quote: string | null = null;
	let start = openParen + 1;
	for (let index = openParen; index < source.length; index += 1) {
		const char = source[index];
		if (quote) {
			if (char === "\\") {
				index += 1;
				continue;
			}
			if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}
		if (char === "(" || char === "[" || char === "{") {
			depth += 1;
			continue;
		}
		if (char === ")" || char === "]" || char === "}") {
			depth -= 1;
			if (depth === 0) {
				args.push(source.slice(start, index));
				return args;
			}
			continue;
		}
		if (char === "," && depth === 1) {
			args.push(source.slice(start, index));
			start = index + 1;
		}
	}
	return null;
}

/** Строковый литерал целиком, без подстановок с кавычками внутри. */
export function literalValue(raw: string): string | null {
	const text = raw.trim();
	const quote = text[0];
	if (quote !== '"' && quote !== "'" && quote !== "`") return null;
	if (text.length < 2 || text[text.length - 1] !== quote) return null;
	const inner = text.slice(1, -1);
	return inner.includes(quote) ? null : inner;
}

/** Метод из объектного литерала настроек `fetch`; null — утверждать нельзя. */
export function methodFromOptions(raw: string): string | null {
	const text = raw.trim();
	if (text === "") return "GET";
	if (!text.startsWith("{") || !text.endsWith("}")) return null;
	const body = text.slice(1, -1);
	if (body.includes("...")) return null;
	const entries = callArguments(`(${body})`, 0);
	if (!entries) return null;
	for (const entry of entries) {
		if (/^\s*method\s*$/.test(entry)) return null;
		if (/^\s*\[\s*["'`]method["'`]\s*\]\s*:/.test(entry)) return null;
		const match = /^\s*(?:method|"method"|'method')\s*:([\s\S]*)$/.exec(entry);
		if (!match) continue;
		const value = literalValue(match[1] ?? "");
		if (!value) return null;
		return value.trim().toUpperCase();
	}
	return "GET";
}

/** Адреса, которые зовёт интерфейс (только пути). */
export function webCalls(webSrc: string): Map<string, string[]> {
	const calls = new Map<string, string[]>();
	const pattern = /["'`](\/api\/[^"'`\s]*)["'`]/g;

	for (const file of collectFiles(webSrc, [".ts", ".tsx"])) {
		if (
			file.includes(`${path.sep}tests${path.sep}`) ||
			file.endsWith(".test.ts") ||
			file.endsWith(".test.tsx")
		)
			continue;
		const source = stripComments(readFileSync(file, "utf8"));
		for (const match of source.matchAll(pattern)) {
			const raw = match[1];
			if (!raw) continue;
			const normalized = normalizePath(raw);
			if (!normalized.startsWith("/api/")) continue;
			if (normalized.includes("${") || normalized.includes("...")) continue;
			const where = calls.get(normalized) ?? [];
			where.push(path.relative(webSrc, file));
			calls.set(normalized, where);
		}
	}
	return calls;
}

/** Пары «метод + адрес», которые зовёт интерфейс, и файлы вызывающих. */
export function webCallsWithMethod(webSrc: string): Map<string, string[]> {
	const calls = new Map<string, string[]>();

	for (const file of collectFiles(webSrc, [".ts", ".tsx"])) {
		if (
			file.includes(`${path.sep}tests${path.sep}`) ||
			file.endsWith(".test.ts") ||
			file.endsWith(".test.tsx")
		)
			continue;
		const source = stripComments(readFileSync(file, "utf8"));
		for (const match of source.matchAll(/\bfetch\s*\(/g)) {
			const openParen = source.indexOf("(", match.index);
			if (openParen === -1) continue;
			const args = callArguments(source, openParen);
			if (!args || args.length === 0) continue;
			const raw = literalValue(args[0] ?? "");
			if (!raw?.startsWith("/api/")) continue;
			const normalized = normalizePath(raw);
			if (
				!normalized.startsWith("/api/") ||
				normalized.includes("${") ||
				normalized.includes("...")
			)
				continue;
			const method = methodFromOptions(args.length > 1 ? (args[1] ?? "") : "");
			if (!method) continue;
			const key = `${method} ${normalized}`;
			const where = calls.get(key) ?? [];
			where.push(path.relative(webSrc, file));
			calls.set(key, where);
		}
	}
	return calls;
}
