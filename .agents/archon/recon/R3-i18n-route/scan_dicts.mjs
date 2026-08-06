// R3-i18n-route :: READ-ONLY. How much Cyrillic UI text already sits inside a
// dictionary-shaped object literal (`Record<..., string>` / `Record<..., {..}>`)
// versus a bare inline literal. Brace-matched so nested objects are included.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] ?? "C:/Clinic_MVP/dental-crm";
const CENSUS = JSON.parse(
	fs.readFileSync(
		path.join(ROOT, ".agents/archon/recon/R3-i18n-route/census_raw.json"),
		"utf8",
	),
);
const CYR_G = /[Ѐ-ӿ]/g;

// declaration head: `... : Record< ... > = {`  OR `Record<...> = Object.fromEntries`
const DECL =
	/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*:\s*Record<[\s\S]{0,240}?>\s*=\s*\{/g;
// also catch `satisfies Record<..>` and typed arrays of {value,label}
const DECL2 =
	/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*:\s*(?:Array<|ReadonlyArray<)?\{[^}]{0,200}\blabel\b[^}]{0,200}\}\s*(?:\[\])?\s*=\s*\[/g;

function blockRanges(src) {
	const ranges = [];
	for (const re of [DECL, DECL2]) {
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(src))) {
			const open =
				re === DECL
					? src.indexOf("{", m.index + m[0].length - 1)
					: src.indexOf("[", m.index + m[0].length - 1);
			const openCh = re === DECL ? "{" : "[";
			const closeCh = re === DECL ? "}" : "]";
			let i = m.index + m[0].length - 1,
				depth = 0;
			// walk from the opening char
			const start = i;
			for (; i < src.length; i++) {
				const c = src[i];
				if (c === '"' || c === "'" || c === "`") {
					const q = c;
					i++;
					while (i < src.length) {
						if (src[i] === "\\") {
							i += 2;
							continue;
						}
						if (src[i] === q) break;
						i++;
					}
					continue;
				}
				if (c === openCh) depth++;
				else if (c === closeCh) {
					depth--;
					if (depth === 0) {
						ranges.push([start, i]);
						break;
					}
				}
			}
			void open;
		}
	}
	return ranges;
}

function lineOf(src, idx) {
	return src.slice(0, idx).split("\n").length;
}

const rows = [];
let totOcc = 0,
	totInDict = 0;
const perFile = {};
const dictNames = new Map();

for (const fr of CENSUS.fileRows) {
	if (fr.area !== "web-src") continue;
	if (![".ts", ".tsx"].includes(fr.ext)) continue;
	const abs = path.join(ROOT, fr.file);
	let src;
	try {
		src = fs.readFileSync(abs, "utf8");
	} catch {
		continue;
	}
	const ranges = blockRanges(src);
	const lineSets = ranges.map(([a, b]) => [lineOf(src, a), lineOf(src, b)]);
	const lits = CENSUS.literals.filter(
		(l) => l.file === fr.file && l.bucket !== "comment",
	);
	let inDict = 0;
	for (const l of lits) {
		if (lineSets.some(([a, b]) => l.line >= a && l.line <= b)) inDict++;
	}
	totOcc += lits.length;
	totInDict += inDict;
	if (lits.length)
		perFile[fr.file] = { total: lits.length, inDict, blocks: ranges.length };
	// collect dictionary identifier names that actually contain Cyrillic
	DECL.lastIndex = 0;
	let m;
	while ((m = DECL.exec(src))) {
		const tail = src.slice(m.index, Math.min(src.length, m.index + 4000));
		if (CYR_G.test(tail)) dictNames.set(m[1], (dictNames.get(m[1]) || 0) + 1);
		CYR_G.lastIndex = 0;
	}
	rows.push({ file: fr.file, ...perFile[fr.file] });
}

console.log(
	"== WEB-SRC (.ts/.tsx): CYRILLIC UI LITERALS INSIDE A DICTIONARY-SHAPED BLOCK ==",
);
console.log("translatable literal occurrences : " + totOcc);
console.log(
	"inside Record<>/{label} block    : " +
		totInDict +
		"  (" +
		((100 * totInDict) / totOcc).toFixed(1) +
		"%)",
);
console.log(
	"bare inline (JSX text, props, args, template strings): " +
		(totOcc - totInDict) +
		"  (" +
		((100 * (totOcc - totInDict)) / totOcc).toFixed(1) +
		"%)",
);
console.log("");
console.log(
	"distinct Cyrillic-bearing dictionary identifiers: " + dictNames.size,
);
console.log("");
console.log(
	"== TOP 20 FILES BY BARE INLINE LITERALS (the real migration cost) ==",
);
const top = Object.entries(perFile)
	.map(([f, v]) => ({ f, bare: v.total - v.inDict, ...v }))
	.sort((a, b) => b.bare - a.bare)
	.slice(0, 20);
for (const t of top)
	console.log(
		String(t.bare).padStart(6) +
			" bare / " +
			String(t.total).padStart(5) +
			" total  " +
			t.f,
	);
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/R3-i18n-route/dict_coverage.json"),
	JSON.stringify(
		{ totOcc, totInDict, perFile, dictNames: [...dictNames.keys()].sort() },
		null,
		1,
	),
	"utf8",
);
console.log("\nwrote dict_coverage.json");
