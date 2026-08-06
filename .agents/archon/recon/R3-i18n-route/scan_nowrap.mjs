// R3-i18n-route :: READ-ONLY. Every `white-space: nowrap` in web CSS with its
// selector and whether an ellipsis/wrap escape hatch exists in the same rule.
import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Clinic_MVP/dental-crm";
const SKIP = new Set(["node_modules", "dist", ".git", "build", "coverage"]);
function walk(d, a) {
	let e;
	try {
		e = fs.readdirSync(d, { withFileTypes: true });
	} catch {
		return a;
	}
	for (const x of e) {
		const p = path.join(d, x.name);
		if (x.isDirectory()) {
			if (!SKIP.has(x.name)) walk(p, a);
		} else if (x.name.endsWith(".css")) a.push(p);
	}
	return a;
}
const out = [];
for (const f of walk(path.join(ROOT, "apps/web/src"), [])) {
	const src = fs.readFileSync(f, "utf8");
	const rel = path.relative(ROOT, f).split(path.sep).join("/");
	const lines = src.split("\n");
	lines.forEach((l, i) => {
		if (!/white-space\s*:\s*nowrap/.test(l)) return;
		let sel = "?";
		for (let j = i; j >= 0; j--) {
			const raw = lines[j];
			if (raw.includes("{")) {
				const s = raw
					.replace(/\/\*[\s\S]*?\*\//g, "")
					.split("{")[0]
					.trim();
				if (s) {
					sel = s;
					break;
				}
			}
		}
		const win = lines.slice(Math.max(0, i - 8), i + 9).join(" ");
		out.push({
			loc: rel + ":" + (i + 1),
			sel,
			ellipsis: /text-overflow\s*:\s*ellipsis/.test(win),
			hidden: /overflow\s*:\s*hidden/.test(win),
			fixedW:
				(win.match(/(?<!min-|max-)\bwidth\s*:\s*(\d+)px/) || [])[1] ?? null,
		});
	});
}
console.log(
	"total white-space:nowrap rules in apps/web/src CSS: " + out.length,
);
console.log("");
const risky = out.filter(
	(x) =>
		!x.ellipsis &&
		!/visually-hidden|sr-only|otp|pin|icon-|badge-dot/i.test(x.sel),
);
console.log(
	"== nowrap WITHOUT an ellipsis escape hatch (" + risky.length + ") ==",
);
for (const x of risky)
	console.log(
		"  " +
			x.loc.padEnd(58) +
			" { " +
			x.sel +
			" }" +
			(x.hidden ? "  +overflow:hidden -> SILENT CUT" : "") +
			(x.fixedW ? "  +width:" + x.fixedW + "px" : ""),
	);
console.log("");
console.log(
	"== nowrap WITH ellipsis (degrades gracefully, still hides text) (" +
		(out.length - risky.length) +
		") ==",
);
for (const x of out.filter((y) => !risky.includes(y)))
	console.log("  " + x.loc.padEnd(58) + " { " + x.sel + " }");
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/R3-i18n-route/nowrap.json"),
	JSON.stringify(out, null, 1),
	"utf8",
);
