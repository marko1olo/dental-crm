/**
 * Class C instrument, second attempt — TYPE-based, not name-based.
 *
 * WHY THE FIRST ATTEMPT FAILED, stated so it is not repeated: a name diff
 * (`moneyfields.mjs`) cannot see the one class-C bug that is PROVEN real
 * tonight. `svc.priceRub` was wrong because `ServiceCatalogItem` has
 * `basePriceRub`, yet `priceRub` is a perfectly legitimate field name elsewhere
 * in the contract (packages/shared/src/index.ts:1734 and :8389). A name that
 * exists somewhere is "produced" to a name diff. Only the TYPE knows.
 *
 * So: build a real TypeScript Program over apps/web and ask the checker, for
 * every money-ish property access, what the type of the OBJECT is.
 *   - object type is `any`/`unknown`/`error`  -> UNCHECKED. The compiler cannot
 *     tell `priceRub` from `basePriceRub` here. This is the class-C surface.
 *   - object type is a real object type       -> CHECKED. typecheck web = 0
 *     errors, so the field exists. Cannot be class C.
 *
 * Read-only: uses createProgram for types, emits nothing.
 * Run: node .agents/archon/recon/RC3-hollow-panel-census/anymoney.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const WEB = join(REPO, "apps", "web");
const rel = (f) => relative(REPO, f).split(sep).join("/");

const configPath = join(WEB, "tsconfig.json");
const cf = ts.readConfigFile(configPath, ts.sys.readFile);
if (cf.error)
	throw new Error(ts.flattenDiagnosticMessageText(cf.error.messageText, " "));
const parsed = ts.parseJsonConfigFileContent(cf.config, ts.sys, WEB);
console.log(`tsconfig: ${rel(configPath)}  files: ${parsed.fileNames.length}`);

const program = ts.createProgram({
	rootNames: parsed.fileNames,
	options: { ...parsed.options, noEmit: true },
});
const checker = program.getTypeChecker();

const MONEY =
	/(Rub|Kopeck|Kopek|amount|price|Price|total|Total|sum|Sum|balance|Balance|cost|Cost|payout|Payout|debt|Debt|revenue|Revenue|paid|Paid|discount|Discount)/;

const unchecked = [];
const checked = [];

function isOpaque(type) {
	const f = type.flags;
	if (f & ts.TypeFlags.Any) return "any";
	if (f & ts.TypeFlags.Unknown) return "unknown";
	// index signature only, e.g. Record<string, unknown>
	const props = checker.getPropertiesOfType(type);
	const idx = checker.getIndexInfoOfType(type, ts.IndexKind.String);
	if (props.length === 0 && idx) return "index-signature";
	return null;
}

for (const sf of program.getSourceFiles()) {
	const f = sf.fileName;
	if (f.includes("node_modules")) continue;
	if (!f.replace(/\\/g, "/").includes("/apps/web/src/")) continue;
	if (
		/\.test\.tsx?$/.test(f) ||
		/\/tests?\//.test(f.replace(/\\/g, "/")) ||
		f.includes("__tests__")
	)
		continue;

	const visit = (node) => {
		if (
			ts.isPropertyAccessExpression(node) &&
			ts.isIdentifier(node.name) &&
			MONEY.test(node.name.text)
		) {
			let objType;
			try {
				objType = checker.getTypeAtLocation(node.expression);
			} catch {
				objType = null;
			}
			const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
			const entry = {
				name: node.name.text,
				site: `${rel(f)}:${line}`,
				objText: node.expression.getText(sf).slice(0, 70).replace(/\s+/g, " "),
			};
			const kind = objType ? isOpaque(objType) : "no-type";
			if (kind) unchecked.push({ ...entry, kind });
			else checked.push(entry);
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

console.log(`\nMoney-ish property accesses in apps/web/src (non-test):`);
console.log(
	`  type-CHECKED (compiler guarantees the field exists): ${checked.length}`,
);
console.log(
	`  UNCHECKED (object type is any/unknown/index-signature): ${unchecked.length}`,
);

const byFile = new Map();
for (const u of unchecked) {
	const file = u.site.split(":")[0];
	if (!byFile.has(file)) byFile.set(file, []);
	byFile.get(file).push(u);
}
console.log(
	`\n=== UNCHECKED money reads, grouped by file (${byFile.size} files) ===`,
);
for (const [file, list] of [...byFile].sort(
	(a, b) => b[1].length - a[1].length,
)) {
	console.log(`\n${file}  (${list.length})`);
	for (const u of list.slice(0, 40))
		console.log(
			`   ${u.site.split(":")[1]}\t${u.kind}\t${u.objText}.${u.name}`,
		);
}
