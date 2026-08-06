// R3-i18n-route :: READ-ONLY. Finds CSS rules that will clip or overflow when a
// label changes length. Reports selector + file:line + the offending declarations.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] ?? "C:/Clinic_MVP/dental-crm";
const SKIP = new Set(["node_modules", "dist", ".git", "build", "coverage"]);

function walk(d, acc) {
	let e;
	try {
		e = fs.readdirSync(d, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const x of e) {
		const p = path.join(d, x.name);
		if (x.isDirectory()) {
			if (!SKIP.has(x.name)) walk(p, acc);
		} else if (x.name.toLowerCase().endsWith(".css")) acc.push(p);
	}
	return acc;
}

const files = walk(path.join(ROOT, "apps/web/src"), []);
const findings = [];

for (const f of files) {
	const src = fs.readFileSync(f, "utf8");
	const rel = path.relative(ROOT, f).split(path.sep).join("/");
	// crude but adequate rule splitter: selector { body }
	const re = /([^{}]+)\{([^{}]*)\}/g;
	let m;
	while ((m = re.exec(src))) {
		const sel = m[1].replace(/\s+/g, " ").trim();
		const body = m[2];
		if (!sel || sel.startsWith("@")) continue;
		const line = src.slice(0, m.index).split("\n").length;
		const nowrap = /white-space\s*:\s*nowrap/.test(body);
		const hidden = /overflow\s*:\s*hidden/.test(body);
		const ellipsis = /text-overflow\s*:\s*ellipsis/.test(body);
		const fixedW = body.match(/(?<!min-|max-)\bwidth\s*:\s*(\d+)px/);
		const fixedGrid = body.match(
			/grid-template-columns\s*:\s*([^;]*\d+px[^;]*)/,
		);
		const minW = body.match(/min-width\s*:\s*(\d+)px/);
		const wrapOk = /flex-wrap\s*:\s*wrap|overflow-wrap|word-break/.test(body);
		const tags = [];
		let sev = 0;
		if (nowrap && hidden && !ellipsis) {
			tags.push("nowrap+hidden+NO-ellipsis=SILENT TRUNCATION");
			sev = 3;
		} else if (nowrap && !wrapOk) {
			tags.push("nowrap (will overflow, not wrap)");
			sev = Math.max(sev, 2);
		}
		if (
			fixedW &&
			Number(fixedW[1]) >= 40 &&
			/btn|button|chip|tab|badge|label|pill|action|nav|col|cell|head/i.test(sel)
		) {
			tags.push("fixed width:" + fixedW[1] + "px on a text element");
			sev = Math.max(sev, 3);
		} else if (fixedW && Number(fixedW[1]) >= 60) {
			tags.push("fixed width:" + fixedW[1] + "px");
			sev = Math.max(sev, 1);
		}
		if (fixedGrid) {
			tags.push("fixed px grid columns: " + fixedGrid[1].trim().slice(0, 70));
			sev = Math.max(sev, 2);
		}
		if (minW && Number(minW[1]) >= 100 && nowrap) {
			tags.push("min-width " + minW[1] + "px + nowrap");
			sev = Math.max(sev, 3);
		}
		if (tags.length)
			findings.push({ rel, line, sel: sel.slice(0, 110), tags, sev });
	}
}

findings.sort(
	(a, b) => b.sev - a.sev || a.rel.localeCompare(b.rel) || a.line - b.line,
);
const bySev = findings.reduce((a, x) => {
	a[x.sev] = (a[x.sev] || 0) + 1;
	return a;
}, {});
console.log("CSS files scanned: " + files.length);
console.log("rules flagged by severity (3=worst): " + JSON.stringify(bySev));
console.log("");
for (const x of findings.filter((y) => y.sev === 3).slice(0, 45)) {
	console.log("SEV3 " + x.rel + ":" + x.line + "  { " + x.sel + " }");
	console.log("      " + x.tags.join(" | "));
}
console.log("");
console.log("---- SEV2 sample (first 25) ----");
for (const x of findings.filter((y) => y.sev === 2).slice(0, 25)) {
	console.log(
		"SEV2 " +
			x.rel +
			":" +
			x.line +
			"  { " +
			x.sel +
			" }  " +
			x.tags.join(" | "),
	);
}
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/R3-i18n-route/layout_risk.json"),
	JSON.stringify(findings, null, 1),
	"utf8",
);
console.log(
	"\ntotal flagged rules: " + findings.length + " -> layout_risk.json",
);
