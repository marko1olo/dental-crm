// R3-i18n-route recon. READ-ONLY. Classifies every Cyrillic-bearing position in
// the source tree by lexical context using a real state machine, because a line
// regex cannot tell a 90-char Russian explanatory comment from a button label.
// No Cyrillic literals in this file: the ranges are \u escapes so the Windows
// shell never touches Russian bytes.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || "C:/Clinic_MVP/dental-crm";
const CYR = /[Ѐ-ӿԀ-ԯ]/;
const CYR_G = /[Ѐ-ӿԀ-ԯ]/g;

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".vite",
	"coverage",
	".next",
	"out",
	".turbo",
	"playwright-report",
	"test-results",
]);
const EXT = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".css",
	".html",
	".sql",
	".json",
]);

const targets = process.argv[3]
	? process.argv[3].split(",")
	: ["apps/api/src", "apps/web/src", "packages/shared/src"];

function walk(dir, out) {
	let ents;
	try {
		ents = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of ents) {
		if (e.isDirectory()) {
			if (SKIP_DIRS.has(e.name)) continue;
			walk(path.join(dir, e.name), out);
		} else if (e.isFile()) {
			if (EXT.has(path.extname(e.name))) out.push(path.join(dir, e.name));
		}
	}
	return out;
}

// Lexical state machine over TS/TSX. Emits, for each character index, one of:
//   "comment" | "string" | "code"
// Template-literal ${...} substitutions return to "code".
function classify(src, ext) {
	const n = src.length;
	const kind = new Uint8Array(n); // 0=code 1=string 2=comment
	const CODE = 0,
		STR = 1,
		COM = 2;
	let i = 0;
	const tmplStack = []; // depth of {} inside ${ }
	let mode = "code";
	let quote = "";
	const isCssLike = ext === ".css";
	const isSql = ext === ".sql";
	const isJson = ext === ".json";

	while (i < n) {
		const c = src[i],
			c2 = src[i + 1];
		if (mode === "code") {
			if (!isJson && c === "/" && c2 === "/") {
				mode = "line";
				kind[i] = COM;
				kind[i + 1] = COM;
				i += 2;
				continue;
			}
			if (!isJson && c === "/" && c2 === "*") {
				mode = "block";
				kind[i] = COM;
				kind[i + 1] = COM;
				i += 2;
				continue;
			}
			if (isSql && c === "-" && c2 === "-") {
				mode = "line";
				kind[i] = COM;
				kind[i + 1] = COM;
				i += 2;
				continue;
			}
			if (c === '"' || c === "'" || c === "`") {
				mode = "str";
				quote = c;
				kind[i] = STR;
				i++;
				continue;
			}
			if (c === "{" && tmplStack.length) tmplStack[tmplStack.length - 1]++;
			if (c === "}" && tmplStack.length) {
				tmplStack[tmplStack.length - 1]--;
				if (tmplStack[tmplStack.length - 1] < 0) {
					tmplStack.pop();
					mode = "str";
					quote = "`";
					kind[i] = STR;
					i++;
					continue;
				}
			}
			kind[i] = CODE;
			i++;
			continue;
		}
		if (mode === "line") {
			if (c === "\n") {
				mode = "code";
				kind[i] = CODE;
				i++;
				continue;
			}
			kind[i] = COM;
			i++;
			continue;
		}
		if (mode === "block") {
			if (c === "*" && c2 === "/") {
				kind[i] = COM;
				kind[i + 1] = COM;
				mode = "code";
				i += 2;
				continue;
			}
			kind[i] = COM;
			i++;
			continue;
		}
		if (mode === "str") {
			if (c === "\\") {
				kind[i] = STR;
				if (i + 1 < n) kind[i + 1] = STR;
				i += 2;
				continue;
			}
			if (quote === "`" && c === "$" && c2 === "{") {
				kind[i] = STR;
				kind[i + 1] = STR;
				tmplStack.push(0);
				mode = "code";
				i += 2;
				continue;
			}
			if (c === quote) {
				kind[i] = STR;
				mode = "code";
				i++;
				continue;
			}
			if (quote !== "`" && c === "\n") {
				mode = "code";
				kind[i] = CODE;
				i++;
				continue;
			} // unterminated guard
			kind[i] = STR;
			i++;
		}
	}
	return kind;
}

const stats = {
	filesScanned: 0,
	filesWithCyr: 0,
	totalLines: 0,
	cyrLines: 0,
	cyrLinesCommentOnly: 0, // every Cyrillic char on the line sits in a comment
	cyrLinesStringOnly: 0, // every Cyrillic char sits in a string literal
	cyrLinesBareOnly: 0, // every Cyrillic char sits in bare code position (JSX text)
	cyrLinesMixed: 0,
	cyrCharsComment: 0,
	cyrCharsString: 0,
	cyrCharsBare: 0,
};
const perFile = [];
const perTopDir = new Map();
const stringLiterals = new Map(); // normalized text -> {count, sample file:line}
const jsxTextRuns = new Map();

function addTop(file, key, delta) {
	const rel = path.relative(ROOT, file).replace(/\\/g, "/");
	const parts = rel.split("/");
	const top = parts.slice(0, 3).join("/");
	if (!perTopDir.has(top))
		perTopDir.set(top, {
			cyrLines: 0,
			comment: 0,
			string: 0,
			bare: 0,
			mixed: 0,
			files: 0,
		});
	const o = perTopDir.get(top);
	o[key] += delta;
	return o;
}

const files = walk(path.join(ROOT, "."), []).filter((f) => {
	const rel = path.relative(ROOT, f).replace(/\\/g, "/");
	return targets.some((t) => rel === t || rel.startsWith(t + "/"));
});

for (const f of files) {
	let src;
	try {
		src = fs.readFileSync(f, "utf8");
	} catch {
		continue;
	}
	stats.filesScanned++;
	const lines = src.split("\n");
	stats.totalLines += lines.length;
	if (!CYR.test(src)) continue;
	stats.filesWithCyr++;
	const ext = path.extname(f);
	const kind = classify(src, ext);

	// line index for each char
	const fileRec = {
		file: path.relative(ROOT, f).replace(/\\/g, "/"),
		cyrLines: 0,
		comment: 0,
		string: 0,
		bare: 0,
		mixed: 0,
		charsComment: 0,
		charsString: 0,
		charsBare: 0,
		lines: lines.length,
	};
	let lineNo = 1,
		lineHas = { c: 0, s: 0, b: 0 };
	const flush = () => {
		const tot = lineHas.c + lineHas.s + lineHas.b;
		if (tot > 0) {
			stats.cyrLines++;
			fileRec.cyrLines++;
			const nz =
				(lineHas.c > 0 ? 1 : 0) +
				(lineHas.s > 0 ? 1 : 0) +
				(lineHas.b > 0 ? 1 : 0);
			if (nz > 1) {
				stats.cyrLinesMixed++;
				fileRec.mixed++;
			} else if (lineHas.c) {
				stats.cyrLinesCommentOnly++;
				fileRec.comment++;
			} else if (lineHas.s) {
				stats.cyrLinesStringOnly++;
				fileRec.string++;
			} else {
				stats.cyrLinesBareOnly++;
				fileRec.bare++;
			}
		}
		lineHas = { c: 0, s: 0, b: 0 };
	};
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (ch === "\n") {
			flush();
			lineNo++;
			continue;
		}
		if (!CYR.test(ch)) continue;
		const k = kind[i];
		if (k === 2) {
			lineHas.c++;
			stats.cyrCharsComment++;
			fileRec.charsComment++;
		} else if (k === 1) {
			lineHas.s++;
			stats.cyrCharsString++;
			fileRec.charsString++;
		} else {
			lineHas.b++;
			stats.cyrCharsBare++;
			fileRec.charsBare++;
		}
	}
	flush();
	perFile.push(fileRec);
	const o = addTop(f, "cyrLines", fileRec.cyrLines);
	o.comment += fileRec.comment;
	o.string += fileRec.string;
	o.bare += fileRec.bare;
	o.mixed += fileRec.mixed;
	o.files += 1;

	// ---- extract distinct translatable units ----
	// 1) string literals containing Cyrillic
	if (
		ext === ".ts" ||
		ext === ".tsx" ||
		ext === ".js" ||
		ext === ".jsx" ||
		ext === ".mjs" ||
		ext === ".cjs"
	) {
		let i2 = 0;
		while (i2 < src.length) {
			if (kind[i2] === 1) {
				let j = i2;
				while (j < src.length && kind[j] === 1) j++;
				const raw = src.slice(i2, j);
				if (CYR.test(raw)) {
					const norm = raw
						.replace(/^["'`]|["'`]$/g, "")
						.replace(/\s+/g, " ")
						.trim();
					if (norm) {
						const line = src.slice(0, i2).split("\n").length;
						if (!stringLiterals.has(norm))
							stringLiterals.set(norm, {
								count: 0,
								at: `${fileRec.file}:${line}`,
								len: norm.length,
								files: new Set(),
							});
						stringLiterals.get(norm).count++;
						stringLiterals.get(norm).files.add(fileRec.file);
					}
				}
				i2 = j;
				continue;
			}
			i2++;
		}
		// 2) bare (JSX text) runs containing Cyrillic
		let i3 = 0;
		while (i3 < src.length) {
			if (kind[i3] === 0 && CYR.test(src[i3])) {
				let a = i3;
				while (
					a > 0 &&
					kind[a - 1] === 0 &&
					src[a - 1] !== ">" &&
					src[a - 1] !== "\n" &&
					src[a - 1] !== "{" &&
					src[a - 1] !== "}"
				)
					a--;
				let b = i3;
				while (
					b < src.length &&
					kind[b] === 0 &&
					src[b] !== "<" &&
					src[b] !== "\n" &&
					src[b] !== "{" &&
					src[b] !== "}"
				)
					b++;
				const norm = src.slice(a, b).replace(/\s+/g, " ").trim();
				if (norm && CYR.test(norm)) {
					const line = src.slice(0, i3).split("\n").length;
					if (!jsxTextRuns.has(norm))
						jsxTextRuns.set(norm, {
							count: 0,
							at: `${fileRec.file}:${line}`,
							len: norm.length,
							files: new Set(),
						});
					jsxTextRuns.get(norm).count++;
					jsxTextRuns.get(norm).files.add(fileRec.file);
				}
				i3 = b + 1;
				continue;
			}
			i3++;
		}
	}
}

perFile.sort(
	(a, b) => b.string + b.bare + b.mixed - (a.string + a.bare + a.mixed),
);

const distinctStrings = [...stringLiterals.entries()].map(([t, v]) => ({
	t,
	count: v.count,
	at: v.at,
	len: v.len,
}));
const distinctJsx = [...jsxTextRuns.entries()].map(([t, v]) => ({
	t,
	count: v.count,
	at: v.at,
	len: v.len,
}));
const allUnits = new Map();
for (const s of distinctStrings)
	allUnits.set(s.t, (allUnits.get(s.t) || 0) + s.count);
for (const s of distinctJsx)
	allUnits.set(s.t, (allUnits.get(s.t) || 0) + s.count);

const out = {
	generatedAt: new Date().toISOString(),
	root: ROOT,
	targets,
	stats,
	translatable: {
		cyrLinesExcludingCommentOnly: stats.cyrLines - stats.cyrLinesCommentOnly,
		distinctStringLiterals: distinctStrings.length,
		distinctJsxTextRuns: distinctJsx.length,
		distinctUnitsCombined: allUnits.size,
		totalStringLiteralOccurrences: distinctStrings.reduce(
			(a, b) => a + b.count,
			0,
		),
		totalJsxOccurrences: distinctJsx.reduce((a, b) => a + b.count, 0),
		charsToTranslate: stats.cyrCharsString + stats.cyrCharsBare,
		charsInComments: stats.cyrCharsComment,
	},
	perTopDir: [...perTopDir.entries()]
		.map(([k, v]) => ({ dir: k, ...v }))
		.sort((a, b) => b.cyrLines - a.cyrLines),
	top40Files: perFile.slice(0, 40),
	longestUnits: [...allUnits.entries()]
		.sort((a, b) => b[0].length - a[0].length)
		.slice(0, 25)
		.map(([t, c]) => ({ len: t.length, count: c, t: t.slice(0, 160) })),
	mostRepeatedUnits: [...allUnits.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 40)
		.map(([t, c]) => ({ count: c, len: t.length, t: t.slice(0, 90) })),
};

// ---- role buckets: not all Russian is translatable UI ----
function role(rel) {
	if (
		/\/tests?\//.test(rel) ||
		/\.test\.[cm]?[jt]sx?$/.test(rel) ||
		/\.spec\./.test(rel)
	)
		return "test-fixture";
	if (/sampleData|seed|fixtures?\//i.test(rel)) return "seed-demo-data";
	if (
		/\/documents?\//.test(rel) ||
		/renderDocument|documentValidators|documentTemplates|docTemplates/i.test(
			rel,
		)
	)
		return "legal-document-template";
	if (
		/\/migration\/|vendorProfiles|smartImports|LegacyMigration|SmartImport|SettingsImports/i.test(
			rel,
		)
	)
		return "competitor-import-pattern";
	if (/\/ai\/|\/speech\/|Prompt|prompt/.test(rel)) return "llm-prompt";
	if (/^apps\/api\/src\/scripts\//.test(rel)) return "api-script-cli";
	if (/^apps\/api\/src\/routes\//.test(rel)) return "api-route-message";
	if (/^apps\/api\//.test(rel)) return "api-other";
	if (/^packages\/shared\//.test(rel)) return "shared-enum-dictionary";
	if (/UiLabels|UiMeta|StaticOptions|Catalog|catalog/.test(rel))
		return "web-ui-dictionary";
	if (/^apps\/web\//.test(rel)) return "web-ui-surface";
	return "other";
}
const buckets = new Map();
for (const r of perFile) {
	const b = role(r.file);
	if (!buckets.has(b))
		buckets.set(b, {
			bucket: b,
			files: 0,
			translatableLines: 0,
			commentLines: 0,
			charsTranslatable: 0,
		});
	const o = buckets.get(b);
	o.files++;
	o.translatableLines += r.string + r.bare + r.mixed;
	o.commentLines += r.comment;
	o.charsTranslatable += r.charsString + r.charsBare;
}
// Distinct translation units per role bucket. A unit that appears in several
// buckets is credited to each, so the columns do not sum to the global total.
const unitsByBucket = new Map();
const USER_FACING = new Set([
	"web-ui-surface",
	"web-ui-dictionary",
	"shared-enum-dictionary",
	"api-route-message",
]);
const userFacingUnits = new Set();
for (const src of [stringLiterals, jsxTextRuns]) {
	for (const [text, v] of src) {
		for (const f of v.files) {
			const b = role(f);
			if (!unitsByBucket.has(b)) unitsByBucket.set(b, new Set());
			unitsByBucket.get(b).add(text);
			if (USER_FACING.has(b)) userFacingUnits.add(text);
		}
	}
}
out.distinctUnitsByBucket = [...unitsByBucket.entries()]
	.map(([bucket, s]) => ({ bucket, distinctUnits: s.size }))
	.sort((a, b) => b.distinctUnits - a.distinctUnits);
out.distinctUserFacingUnits = userFacingUnits.size;
const ufArr = [...userFacingUnits];
out.userFacingUnitStats = {
	count: ufArr.length,
	totalChars: ufArr.reduce((a, b) => a + b.length, 0),
	medianChars:
		ufArr.map((s) => s.length).sort((a, b) => a - b)[
			Math.floor(ufArr.length / 2)
		] ?? 0,
	under30chars: ufArr.filter((s) => s.length < 30).length,
	over120chars: ufArr.filter((s) => s.length > 120).length,
};
out.roleBuckets = [...buckets.values()].sort(
	(a, b) => b.translatableLines - a.translatableLines,
);
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/R3-i18n-route/perfile-full.json"),
	JSON.stringify(
		perFile.map((r) => ({ ...r, role: role(r.file) })),
		null,
		2,
	),
	"utf8",
);

fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/R3-i18n-route/cyrillic-census.json"),
	JSON.stringify(out, null, 2),
	"utf8",
);
// ASCII-only console summary so the Windows console cannot mangle anything.
console.log("filesScanned", stats.filesScanned);
console.log("filesWithCyrillic", stats.filesWithCyr);
console.log("totalLinesInScannedFiles", stats.totalLines);
console.log("cyrillicBearingLines", stats.cyrLines);
console.log("  commentOnlyLines", stats.cyrLinesCommentOnly);
console.log("  stringOnlyLines", stats.cyrLinesStringOnly);
console.log("  bareJsxOnlyLines", stats.cyrLinesBareOnly);
console.log("  mixedLines", stats.cyrLinesMixed);
console.log("cyrCharsComment", stats.cyrCharsComment);
console.log("cyrCharsString", stats.cyrCharsString);
console.log("cyrCharsBare", stats.cyrCharsBare);
console.log("distinctStringLiterals", distinctStrings.length);
console.log("distinctJsxTextRuns", distinctJsx.length);
console.log("distinctUnitsCombined", allUnits.size);
console.log(
	"wroteJson",
	".agents/archon/recon/R3-i18n-route/cyrillic-census.json",
);
