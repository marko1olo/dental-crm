// RC1 census v2. Corrects TWO errors in my own v1 (ast-census.mjs):
//   1. v1 only treated JSXAttribute as user-visible. A Cyrillic literal inside a
//      JSXExpressionContainer (ternary/&& rendering text into JSX) is equally
//      user-visible and v1 dropped it into "other". Fixed.
//   2. v1 detected Russian-as-data by FILE PATH only, so the speech/NLP vocabulary
//      in packages/shared/src/index.ts and apps/web/src/lib/smart*Parser.ts was
//      counted as translatable UI. Now detected by owning VARIABLE NAME too.
// Also measures dictionary ADOPTION: computed lookups into label maps that land in JSX.
// READ-ONLY.

import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const ROOT = process.cwd();
const CYR = /[Ѐ-ӿ]/;
const SCAN_DIRS = ["apps/web/src", "apps/api/src", "packages/shared/src"];

const DATA_VARS =
	/^(dentalSpeech\w*|spokenTooth\w*|common\w*Tokens|stopWords|migrationHumanTextReplacements|\w*ReplacementMap|\w*PhraseMap|\w*OrdinalMap|\w*Synonyms|\w*Aliases|\w*Matchers?|\w*ColumnHeaders?)$/;
const DICT_NAME =
	/(Labels|Titles|Meta|Names|Text|Texts|Captions|Hints|Descriptions|Options|Copy|Wording|Messages)$/;

function isTestFile(rel) {
	return (
		/(^|[\\/])tests?[\\/]/.test(rel) ||
		/(^|[\\/])__tests__[\\/]/.test(rel) ||
		/\.test\.[cm]?tsx?$/.test(rel) ||
		/\.spec\.[cm]?tsx?$/.test(rel) ||
		/(^|[\\/])fixtures?[\\/]/.test(rel)
	);
}
function dataReason(rel) {
	const r = rel.replace(/\\/g, "/");
	if (/\/sampleData/.test(r) || /seed/i.test(r)) return "seed-demo-data";
	if (/apps\/api\/src\/migration\//.test(r)) return "import-matcher";
	if (/routes\/smartImports\.ts$/.test(r)) return "import-matcher";
	if (/apps\/web\/src\/lib\/smart\w*Parser\.ts$/.test(r))
		return "russian-nlp-parser";
	if (/apps\/api\/src\/speech\//.test(r)) return "russian-speech-vocabulary";
	if (/apps\/api\/src\/ai\//.test(r)) return "russian-llm-vocabulary";
	if (
		/apps\/api\/src\/routes\/documents\//.test(r) ||
		/apps\/api\/src\/documents\//.test(r)
	)
		return "legal-template";
	if (/apps\/api\/src\/scripts\//.test(r)) return "dev-script";
	return null;
}
const VISIBLE_ATTRS = new Set([
	"title",
	"placeholder",
	"alt",
	"label",
	"aria-label",
	"ariaLabel",
	"aria-description",
	"aria-placeholder",
	"heading",
	"subtitle",
	"caption",
	"description",
	"hint",
	"helpText",
	"help",
	"emptyText",
	"emptyLabel",
	"emptyMessage",
	"errorText",
	"errorMessage",
	"confirmLabel",
	"cancelLabel",
	"submitLabel",
	"actionLabel",
	"buttonLabel",
	"tooltip",
	"summary",
	"message",
	"text",
	"content",
	"legend",
	"badge",
	"primaryLabel",
	"secondaryLabel",
	"ctaLabel",
	"name",
	"header",
	"footer",
	"unit",
	"suffix",
	"prefix",
	"note",
	"warning",
	"detail",
	"details",
	"data-label",
]);
const INVISIBLE_ATTRS = new Set([
	"className",
	"class",
	"id",
	"key",
	"href",
	"src",
	"type",
	"role",
	"style",
	"data-testid",
	"testId",
	"htmlFor",
	"target",
	"rel",
	"value",
	"autoComplete",
	"inputMode",
	"pattern",
	"accept",
	"method",
	"action",
]);
const TOAST_RE =
	/^(toast|notify|pushToast|showToast|addToast|setToast|alert|confirm|prompt|setError|setErrorMessage|setStatusMessage|setFeedback|setNotice|setBanner|showError|reportError|setFormError|setValidationError|pushNotification|notifyUser)$/i;
const LOG_RE = /^(log|info|warn|error|debug|trace)$/;

function walk(node, visit, parent = null) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const x of node) walk(x, visit, parent);
		return;
	}
	if (typeof node.type !== "string") return;
	node.__parent = parent;
	visit(node);
	for (const k of Object.keys(node)) {
		if (
			k === "loc" ||
			k === "__parent" ||
			k === "extra" ||
			k === "leadingComments" ||
			k === "trailingComments" ||
			k === "innerComments" ||
			k === "__src"
		)
			continue;
		const v = node[k];
		if (v && typeof v === "object") walk(v, visit, node);
	}
}
function anc(n) {
	const o = [];
	let p = n.__parent,
		g = 0;
	while (p && g++ < 300) {
		o.push(p);
		p = p.__parent;
	}
	return o;
}
function cName(c) {
	if (!c) return null;
	if (c.type === "Identifier") return c.name;
	if (c.type === "MemberExpression" && c.property)
		return String(c.property.name || c.property.value || "");
	return null;
}
function cObj(c) {
	if (c && c.type === "MemberExpression") {
		let o = c.object;
		while (o && o.type === "MemberExpression") o = o.object;
		if (o && o.type === "Identifier") return o.name;
	}
	return null;
}

const B = {}; // bucket -> occurrences
const D = {}; // bucket -> Set(distinct)
const PA = {}; // area|bucket
const perFile = {};
let dictLookupsInJsx = 0;
const dictLookupNames = {};
let jsxExprRescued = 0;
let dataVarRescued = 0;

function bump(o, k, n = 1) {
	o[k] = (o[k] || 0) + n;
}

function collect(dir, out) {
	let e;
	try {
		e = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
	} catch {
		return;
	}
	for (const x of e) {
		const rel = dir + "/" + x.name;
		if (x.isDirectory()) {
			if (["node_modules", "dist", ".git"].includes(x.name)) continue;
			collect(rel, out);
		} else if (/\.(ts|tsx|mts|cts)$/.test(x.name) && !/\.d\.ts$/.test(x.name))
			out.push(rel);
	}
}
const files = [];
for (const d of SCAN_DIRS) collect(d, files);

for (const rel of files) {
	const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
	if (!CYR.test(src)) continue;
	let ast;
	try {
		ast = parse(src, {
			sourceType: "module",
			errorRecovery: true,
			allowReturnOutsideFunction: true,
			plugins: [
				["typescript", {}],
				"jsx",
				"decorators-legacy",
				"classProperties",
				"topLevelAwait",
				"importAttributes",
				"explicitResourceManagement",
			],
		});
	} catch {
		continue;
	}
	const area = rel.startsWith("apps/web/src")
		? "web"
		: rel.startsWith("apps/api/src")
			? "api"
			: "shared";
	const test = isTestFile(rel);
	const dataWhy = dataReason(rel);
	walk(ast.program, (n) => {
		if (n.type === "TSTypeAnnotation" && typeof n.start === "number")
			n.__src = src.slice(n.start, n.end);
	});

	const pf = { total: 0, buckets: {} };

	walk(ast.program, (n) => {
		// ---- dictionary adoption: computed lookup landing in JSX ----
		if (
			n.type === "MemberExpression" &&
			n.computed &&
			n.object &&
			n.object.type === "Identifier" &&
			DICT_NAME.test(n.object.name)
		) {
			const a = anc(n);
			if (
				a.some(
					(x) =>
						x.type === "JSXExpressionContainer" || x.type === "JSXAttribute",
				)
			) {
				dictLookupsInJsx++;
				bump(dictLookupNames, n.object.name);
			}
		}

		let raws = null;
		if (n.type === "StringLiteral" && CYR.test(n.value)) raws = [n.value];
		else if (n.type === "JSXText" && CYR.test(n.value)) {
			const t = n.value.trim();
			if (t) raws = [t];
		} else if (n.type === "TemplateLiteral") {
			const parts = n.quasis
				.map((q) => q.value.cooked ?? q.value.raw)
				.filter((s) => CYR.test(s));
			if (parts.length) raws = parts;
		}
		if (!raws) return;

		const a = anc(n);
		let bucket = "other",
			role = "unclassified";

		// owning variable is a Russian-data structure => never translatable
		const owner = a.find(
			(x) => x.type === "VariableDeclarator" && x.id && x.id.name,
		);
		const ownerName = owner ? owner.id.name : null;
		const isDataVar = ownerName && DATA_VARS.test(ownerName);

		const attr = a.find((x) => x.type === "JSXAttribute");
		const inJsxExpr = a.some((x) => x.type === "JSXExpressionContainer");

		if (n.type === "JSXText") {
			bucket = "a_jsx_visible";
			role = "jsx-text";
		} else if (attr) {
			const nm = attr.name && attr.name.name ? String(attr.name.name) : "?";
			if (INVISIBLE_ATTRS.has(nm)) {
				bucket = "other";
				role = "jsx-attr-invisible:" + nm;
			} else {
				bucket = "a_jsx_visible";
				role = "jsx-attr:" + nm;
			}
		} else if (
			a.some((x) => x.type === "ThrowStatement") ||
			a.some(
				(x) =>
					x.type === "NewExpression" && /Error$/.test(cName(x.callee) || ""),
			)
		) {
			bucket = "b_error_toast";
			role = "throw";
		} else {
			const call = a.find(
				(x) =>
					x.type === "CallExpression" &&
					cName(x.callee) &&
					TOAST_RE.test(cName(x.callee)),
			);
			const logc = a.find(
				(x) =>
					x.type === "CallExpression" &&
					(cObj(x.callee) === "console" ||
						(LOG_RE.test(cName(x.callee) || "") &&
							[
								"logger",
								"log",
								"req",
								"request",
								"fastify",
								"app",
								"server",
							].includes(cObj(x.callee)))),
			);
			if (call) {
				bucket = "b_error_toast";
				role = "call:" + cName(call.callee);
			} else if (logc) {
				bucket = "log_only";
				role = "log";
			} else if (inJsxExpr) {
				bucket = "a_jsx_visible";
				role = "jsx-expression";
				jsxExprRescued++;
			} else {
				const typed = a.find(
					(x) =>
						x.type === "VariableDeclarator" &&
						x.id &&
						x.id.typeAnnotation &&
						/Record\s*</.test(x.id.typeAnnotation.__src || ""),
				);
				const obj = a.find(
					(x) =>
						x.type === "ObjectExpression" &&
						Array.isArray(x.properties) &&
						x.properties.length >= 3 &&
						x.properties.filter((p) => p.type === "ObjectProperty").length >=
							3 &&
						x.properties
							.filter((p) => p.type === "ObjectProperty")
							.every(
								(p) =>
									p.value &&
									(p.value.type === "StringLiteral" ||
										p.value.type === "TemplateLiteral"),
							),
				);
				if (typed || obj) {
					bucket = "dict_value";
					role = "dict:" + (ownerName || "anon");
				} else {
					const op = a.find((x) => x.type === "ObjectProperty" && x.key);
					const k = op ? op.key.name || op.key.value : null;
					if (
						typeof k === "string" &&
						/^(message|error|title|label|text|description|reason|hint|detail|details|summary|subtitle|placeholder|note|warning|caption|heading|body|content|name)$/i.test(
							k,
						)
					) {
						bucket = "b_error_toast";
						role = "objprop:" + k;
					}
				}
			}
		}

		if (test) {
			bucket = "d_test_fixture";
			role = "test";
		} else if (isDataVar) {
			bucket = "data_not_ui";
			role = "data-var:" + ownerName;
			dataVarRescued++;
		} else if (dataWhy) {
			bucket = "data_not_ui";
			role = "data-path:" + dataWhy;
		}

		for (const raw of raws) {
			const norm = raw.replace(/\s+/g, " ").trim();
			if (!norm || !CYR.test(norm)) continue;
			bump(B, bucket);
			bump(pf.buckets, bucket);
			pf.total++;
			(D[bucket] ||= new Set()).add(norm);
			bump(PA, area + "|" + bucket);
		}
	});
	if (pf.total) perFile[rel] = pf;
}

const out = {
	buckets: B,
	distinct: {},
	perArea: PA,
	perFile,
	dictLookupsInJsx,
	dictLookupNames,
	jsxExprRescued,
	dataVarRescued,
};
for (const [k, s] of Object.entries(D)) out.distinct[k] = s.size;
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/RC1-i18n-true-cost/ast-census-v2.json"),
	JSON.stringify(out, null, 1),
	"utf8",
);

console.log("--- v2 buckets (occurrences / distinct) ---");
for (const [k, v] of Object.entries(B).sort((a, b) => b[1] - a[1]))
	console.log(
		String(v).padStart(6),
		"/",
		String(out.distinct[k] ?? 0).padStart(6),
		" ",
		k,
	);
console.log(
	"rescued into a_jsx_visible by the JSXExpressionContainer fix:",
	jsxExprRescued,
);
console.log(
	"rescued into data_not_ui by the variable-name fix:",
	dataVarRescued,
);
console.log("dictionary lookups landing in JSX:", dictLookupsInJsx);
console.log("--- per area ---");
for (const [k, v] of Object.entries(PA).sort())
	console.log(String(v).padStart(6), k);
console.log("--- top dictionaries actually consumed by JSX ---");
Object.entries(dictLookupNames)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 20)
	.forEach(([k, v]) => console.log(String(v).padStart(5), k));
console.log("--- worst files by a_jsx_visible ---");
Object.entries(perFile)
	.map(([f, d]) => [f, d.buckets.a_jsx_visible || 0])
	.sort((a, b) => b[1] - a[1])
	.slice(0, 15)
	.forEach(([f, v]) => console.log(String(v).padStart(5), f));
