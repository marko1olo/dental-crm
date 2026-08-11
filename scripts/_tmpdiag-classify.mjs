/*
 * ВРЕМЕННЫЙ КЛАССИФИКАТОР. Берёт JSON падений из логов патченных стражей и для
 * каждой needle ищет её по apps/web/src + packages/shared/src + apps/api/src,
 * отделяя вхождения в КОДЕ от вхождений только в КОММЕНТАРИЯХ.
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
	if (!cache.has(f))
		cache.set(f, readFileSync(f, "utf8").replace(/\r\n/g, "\n"));
	return cache.get(f);
}

/* Вырезает комментарии, сохраняя длину. */
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

function locate(needle) {
	const inCode = [];
	const inComment = [];
	for (const f of files) {
		const raw = text(f);
		if (!raw.includes(needle)) continue;
		const c = code(f);
		const rel = f.replace(/\\/g, "/");
		if (c.includes(needle)) {
			let at = c.indexOf(needle);
			while (at >= 0 && inCode.length < 12) {
				inCode.push(`${rel}:${lineOf(c, at)}`);
				at = c.indexOf(needle, at + 1);
			}
		} else {
			let at = raw.indexOf(needle);
			while (at >= 0 && inComment.length < 12) {
				inComment.push(`${rel}:${lineOf(raw, at)}`);
				at = raw.indexOf(needle, at + 1);
			}
		}
	}
	return { inCode, inComment };
}

const logs = process.argv.slice(2);
for (const log of logs) {
	const line = readFileSync(log, "utf8")
		.split("\n")
		.find((l) => l.startsWith("@@@JSON "));
	if (!line) {
		console.log(`!! нет JSON в ${log}`);
		continue;
	}
	const fails = JSON.parse(line.slice("@@@JSON ".length));
	console.log(`\n=========== ${log} :: ${fails.length} падений`);
	for (const f of fails) {
		if (!f.needle || f.kind === "pattern") {
			console.log(
				`--- [${f.kind}] ${f.message}\n    needle=${JSON.stringify(f.needle ?? null)} src=${f.src ?? "?"}  (не сканируется)`,
			);
			continue;
		}
		const { inCode, inComment } = locate(f.needle);
		const verdict =
			f.kind === "forbid"
				? inCode.length
					? "FORBID/в коде"
					: "FORBID/только коммент"
				: inCode.length
					? "ЖИВО В КОДЕ"
					: inComment.length
						? "ТОЛЬКО КОММЕНТАРИЙ"
						: "НИГДЕ";
		console.log(
			`--- [${f.kind}] ${f.message}\n    src=${f.src ?? "?"} needle=${JSON.stringify(f.needle)}\n    ${verdict}\n    code: ${inCode.join(" , ") || "-"}\n    comm: ${inComment.join(" , ") || "-"}`,
		);
	}
}
