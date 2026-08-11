/*
 * ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ СКАНЕР. Для каждой needle ищет её по ВСЕМУ apps/web/src,
 * packages/shared/src, apps/api/src и печатает, в каком файле она лежит и является
 * ли вхождение КОММЕНТАРИЕМ. Так отделяется MOVED от COMMENT_ONLY и REAL_LOSS.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["apps/web/src", "packages/shared/src", "apps/api/src"];

function walk(dir, out = []) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === "node_modules" || e.name === "dist") continue;
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walk(full, out);
		else if (/\.(tsx?|css)$/.test(e.name)) out.push(full);
	}
	return out;
}

const files = ROOTS.flatMap((r) => {
	try {
		return statSync(r).isDirectory() ? walk(r) : [];
	} catch {
		return [];
	}
});

const cache = new Map();
function text(f) {
	if (!cache.has(f)) cache.set(f, readFileSync(f, "utf8").replace(/\r\n/g, "\n"));
	return cache.get(f);
}

/* Вырезает комментарии, сохраняя длину, чтобы смещения не поехали. */
function codeOnly(src) {
	let out = "";
	let i = 0;
	let mode = "code";
	while (i < src.length) {
		const c = src[i];
		const n = src[i + 1];
		if (mode === "code") {
			if (c === "/" && n === "*") {
				mode = "block";
				out += "  ";
				i += 2;
				continue;
			}
			if (c === "/" && n === "/") {
				mode = "line";
				out += "  ";
				i += 2;
				continue;
			}
			out += c;
			i += 1;
			continue;
		}
		if (mode === "block") {
			if (c === "*" && n === "/") {
				mode = "code";
				out += "  ";
				i += 2;
				continue;
			}
			out += c === "\n" ? "\n" : " ";
			i += 1;
			continue;
		}
		if (c === "\n") {
			mode = "code";
			out += "\n";
			i += 1;
			continue;
		}
		out += " ";
		i += 1;
	}
	return out;
}

const codeCache = new Map();
function code(f) {
	if (!codeCache.has(f)) codeCache.set(f, codeOnly(text(f)));
	return codeCache.get(f);
}

function lineOf(src, idx) {
	return src.slice(0, idx).split("\n").length;
}

const needles = JSON.parse(readFileSync(process.argv[2], "utf8"));

for (const needle of needles) {
	const hitsCode = [];
	const hitsCommentOnly = [];
	for (const f of files) {
		const raw = text(f);
		if (!raw.includes(needle)) continue;
		const c = code(f);
		if (c.includes(needle)) {
			let at = c.indexOf(needle);
			while (at >= 0) {
				hitsCode.push(`${f.replace(/\\/g, "/")}:${lineOf(c, at)}`);
				at = c.indexOf(needle, at + 1);
			}
		} else {
			let at = raw.indexOf(needle);
			while (at >= 0) {
				hitsCommentOnly.push(`${f.replace(/\\/g, "/")}:${lineOf(raw, at)}`);
				at = raw.indexOf(needle, at + 1);
			}
		}
	}
	const label =
		hitsCode.length > 0
			? "CODE"
			: hitsCommentOnly.length > 0
				? "COMMENT_ONLY"
				: "NOWHERE";
	console.log(
		`### ${label} :: ${JSON.stringify(needle)}\n    code=${hitsCode.slice(0, 8).join(" , ") || "-"}\n    comment=${hitsCommentOnly.slice(0, 8).join(" , ") || "-"}`,
	);
}
