// RC1-i18n-true-cost : AST census of user-facing Cyrillic string literals.
// READ-ONLY. Writes nothing outside this dossier directory.
// Uses @babel/parser 8 (real parser, not regex). Own walker => no @babel/traverse interop risk.
//
// Usage: node .agents/archon/recon/RC1-i18n-true-cost/ast-census.mjs <outfile.json>
//
// Buckets, per the RC1 brief:
//   a_jsx_visible  - literal reaches JSX children or a user-visible JSX attribute
//   b_error_toast  - literal in a thrown error / toast / notification / alert / api error message
//   c_comment      - comment text (MUST NOT be translated)
//   d_test_fixture - any literal in a test file
//   dict_value     - literal is a value inside a dictionary-shaped object/array (already an i18n seam)
//   log_only       - console.*/logger.*/req.log.* argument (not user visible)
//   data_not_ui    - Russian-as-data: import matchers, speech/ai vocab, legal templates, seed data
//   other          - everything else (needs eyes)

import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const ROOT = process.cwd();
const OUT = process.argv[2] || "ast-census.json";
const CYR = /[Ѐ-ӿ]/;

const SCAN_DIRS = ["apps/web/src", "apps/api/src", "packages/shared/src"];

// ---- file classification -------------------------------------------------
function isTestFile(rel) {
	return (
		/(^|[\\/])tests?[\\/]/.test(rel) ||
		/(^|[\\/])__tests__[\\/]/.test(rel) ||
		/\.test\.[cm]?tsx?$/.test(rel) ||
		/\.spec\.[cm]?tsx?$/.test(rel) ||
		/(^|[\\/])fixtures?[\\/]/.test(rel)
	);
}
// Russian-as-data: translating these BREAKS the feature.
function dataReason(rel) {
	const r = rel.replace(/\\/g, "/");
	if (/\/sampleData/.test(r) || /seed/i.test(r)) return "seed-demo-data";
	if (/apps\/api\/src\/migration\//.test(r))
		return "import-matcher-competitor-headers";
	if (/routes\/smartImports\.ts$/.test(r))
		return "import-matcher-competitor-headers";
	if (/apps\/api\/src\/speech\//.test(r)) return "russian-speech-vocabulary";
	if (/apps\/api\/src\/ai\//.test(r)) return "russian-llm-prompt-vocabulary";
	if (
		/apps\/api\/src\/routes\/documents\//.test(r) ||
		/apps\/api\/src\/documents\//.test(r)
	)
		return "roszdravnadzor-legal-template";
	if (/apps\/api\/src\/scripts\//.test(r)) return "dev-script";
	return null;
}

// ---- user-visible JSX attribute allow-list ------------------------------
const VISIBLE_ATTRS = new Set([
	"title",
	"placeholder",
	"alt",
	"label",
	"aria-label",
	"ariaLabel",
	"aria-description",
	"aria-placeholder",
	"aria-valuetext",
	"aria-roledescription",
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
	"name_",
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

// ---- walker --------------------------------------------------------------
function walk(node, visit, parent = null, key = null) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) walk(node[i], visit, parent, key);
		return;
	}
	if (typeof node.type !== "string") return;
	node.__parent = parent;
	node.__key = key;
	visit(node);
	for (const k of Object.keys(node)) {
		if (
			k === "loc" ||
			k === "range" ||
			k === "leadingComments" ||
			k === "trailingComments" ||
			k === "innerComments" ||
			k === "__parent" ||
			k === "__key" ||
			k === "extra"
		)
			continue;
		const v = node[k];
		if (v && typeof v === "object") walk(v, visit, node, k);
	}
}

function ancestors(node) {
	const out = [];
	let p = node.__parent;
	let guard = 0;
	while (p && guard++ < 200) {
		out.push(p);
		p = p.__parent;
	}
	return out;
}

function calleeName(node) {
	if (!node) return null;
	if (node.type === "Identifier") return node.name;
	if (node.type === "MemberExpression") {
		const prop = node.property && (node.property.name || node.property.value);
		return prop ? String(prop) : null;
	}
	return null;
}
function calleeObjectName(node) {
	if (node && node.type === "MemberExpression") {
		let o = node.object;
		while (o && o.type === "MemberExpression") o = o.object;
		if (o && o.type === "Identifier") return o.name;
	}
	return null;
}

// Is this node the value of a property inside a dictionary-shaped container?
// Dictionary-shaped = the nearest enclosing VariableDeclarator has a TS annotation
// mentioning Record<...>/Partial<Record<...>>, OR the enclosing object literal has
// >= 3 properties whose values are all string-ish literals (a label map).
function dictInfo(node, anc) {
	for (const a of anc) {
		if (a.type === "VariableDeclarator" && a.id && a.id.typeAnnotation) {
			const ta = a.id.typeAnnotation;
			const txt = ta.__src || "";
			if (/Record\s*</.test(txt) || /\bstring\s*\]/.test(txt)) {
				return { isDict: true, id: a.id.name || null, why: "typed-Record" };
			}
		}
	}
	// shape heuristic on nearest ObjectExpression
	const obj = anc.find((a) => a.type === "ObjectExpression");
	if (obj && Array.isArray(obj.properties) && obj.properties.length >= 3) {
		const vals = obj.properties
			.filter((p) => p.type === "ObjectProperty")
			.map((p) => p.value);
		if (
			vals.length >= 3 &&
			vals.every(
				(v) =>
					v && (v.type === "StringLiteral" || v.type === "TemplateLiteral"),
			)
		) {
			let id = null;
			const vd = anc.find((a) => a.type === "VariableDeclarator");
			if (vd && vd.id && vd.id.name) id = vd.id.name;
			return { isDict: true, id, why: "all-string-object" };
		}
	}
	return { isDict: false };
}

function classify(node, rel, src) {
	const anc = ancestors(node);

	// JSX text
	if (node.type === "JSXText")
		return { bucket: "a_jsx_visible", role: "jsx-text" };

	// JSX attribute
	const attr = anc.find((a) => a.type === "JSXAttribute");
	if (attr) {
		const nm =
			attr.name &&
			(attr.name.name ||
				(attr.name.namespace
					? attr.name.namespace.name + ":" + attr.name.name.name
					: null));
		const name = typeof nm === "string" ? nm : String(nm);
		if (VISIBLE_ATTRS.has(name))
			return { bucket: "a_jsx_visible", role: "jsx-attr:" + name };
		if (INVISIBLE_ATTRS.has(name))
			return { bucket: "other", role: "jsx-attr-invisible:" + name };
		return { bucket: "a_jsx_visible", role: "jsx-attr-other:" + name };
	}

	// thrown error
	for (const a of anc) {
		if (a.type === "ThrowStatement")
			return { bucket: "b_error_toast", role: "throw" };
		if (
			a.type === "NewExpression" &&
			a.callee &&
			/Error$/.test(calleeName(a.callee) || "")
		)
			return { bucket: "b_error_toast", role: "new-Error" };
	}

	// call expressions
	for (const a of anc) {
		if (a.type !== "CallExpression") continue;
		const cn = calleeName(a.callee);
		const on = calleeObjectName(a.callee);
		if (cn && TOAST_RE.test(cn))
			return { bucket: "b_error_toast", role: "call:" + cn };
		if (
			cn &&
			LOG_RE.test(cn) &&
			(on === "console" ||
				on === "logger" ||
				on === "log" ||
				on === "req" ||
				on === "request" ||
				on === "fastify" ||
				on === "app" ||
				on === "server")
		)
			return { bucket: "log_only", role: (on || "?") + "." + cn };
		if (on === "console")
			return { bucket: "log_only", role: "console." + (cn || "?") };
		// zod validation message => user visible on form
		if (
			on === "z" ||
			(cn &&
				/^(min|max|length|regex|refine|superRefine|email|url|uuid|nonempty|int|positive|nonnegative)$/.test(
					cn,
				) &&
				/\bz\./.test(src.slice(Math.max(0, a.start - 60), a.start)))
		)
			return { bucket: "b_error_toast", role: "zod-message" };
	}

	// dictionary value
	const d = dictInfo(node, anc);
	if (d.isDict)
		return {
			bucket: "dict_value",
			role: "dict:" + (d.id || "anon") + ":" + d.why,
			dictId: d.id,
		};

	// object property named like a user-facing field
	const op = anc.find((a) => a.type === "ObjectProperty");
	if (op && op.key) {
		const k = op.key.name || op.key.value;
		if (
			typeof k === "string" &&
			/^(message|error|title|label|text|description|reason|hint|detail|details|summary|subtitle|placeholder|note|warning|caption|heading|body|content|name)$/i.test(
				k,
			)
		)
			return { bucket: "b_error_toast", role: "objprop:" + k };
	}

	return { bucket: "other", role: "unclassified" };
}

// ---- collect files -------------------------------------------------------
function collect(dir, out) {
	let ents;
	try {
		ents = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of ents) {
		const rel = dir + "/" + e.name;
		if (e.isDirectory()) {
			if (e.name === "node_modules" || e.name === "dist" || e.name === ".git")
				continue;
			collect(rel, out);
		} else if (/\.(ts|tsx|mts|cts)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) {
			out.push(rel);
		}
	}
}

const files = [];
for (const d of SCAN_DIRS) collect(d, files);

const result = {
	head: null,
	scannedFiles: files.length,
	parseFailures: [],
	buckets: {},
	distinctByBucket: {},
	perFile: {},
	perArea: {},
	roles: {},
	dictIds: {},
	interpolatedTemplates: { occurrences: 0, distinct: 0 },
	commentStats: {
		files: 0,
		cyrillicComments: 0,
		cyrillicCommentLines: 0,
		cyrillicCommentChars: 0,
	},
};

const distinct = {}; // bucket -> Set
const tplSet = new Set();

function bump(obj, k, n = 1) {
	obj[k] = (obj[k] || 0) + n;
}

function areaOf(rel) {
	if (rel.startsWith("apps/web/src")) return "web";
	if (rel.startsWith("apps/api/src")) return "api";
	return "shared";
}

for (const rel of files) {
	const abs = path.join(ROOT, rel);
	let src;
	try {
		src = fs.readFileSync(abs, "utf8");
	} catch {
		continue;
	}
	if (!CYR.test(src)) continue;

	let ast;
	try {
		ast = parse(src, {
			sourceType: "module",
			allowReturnOutsideFunction: true,
			errorRecovery: true,
			plugins: [
				["typescript", { dts: false }],
				"jsx",
				"decorators-legacy",
				"classProperties",
				"topLevelAwait",
				"importAttributes",
				"explicitResourceManagement",
			],
		});
	} catch (err) {
		result.parseFailures.push({
			file: rel,
			error: String(err.message).slice(0, 200),
		});
		continue;
	}

	const area = areaOf(rel);
	const test = isTestFile(rel);
	const dataWhy = dataReason(rel);

	// annotate type annotations with their source text so dictInfo can read Record<>
	walk(ast.program, (n) => {
		if (
			n.type === "TSTypeAnnotation" &&
			typeof n.start === "number" &&
			typeof n.end === "number"
		) {
			n.__src = src.slice(n.start, n.end);
		}
	});

	const perFile = { total: 0, buckets: {} };

	walk(ast.program, (n) => {
		let raws = null;
		if (n.type === "StringLiteral" && CYR.test(n.value)) raws = [n.value];
		else if (n.type === "JSXText" && CYR.test(n.value)) {
			const t = n.value.trim();
			if (t) raws = [t];
		} else if (n.type === "TemplateLiteral") {
			const parts = n.quasis
				.map((q) => q.value.cooked ?? q.value.raw)
				.filter((s) => CYR.test(s));
			if (parts.length) {
				raws = parts.map((s) => s);
				if (n.expressions.length > 0) {
					result.interpolatedTemplates.occurrences++;
					tplSet.add(
						rel + "::" + src.slice(n.start, Math.min(n.end, n.start + 200)),
					);
				}
			}
		}
		if (!raws) return;

		const c = classify(n, rel, src);
		let bucket = c.bucket;
		if (test) bucket = "d_test_fixture";
		else if (dataWhy && bucket !== "c_comment") bucket = "data_not_ui";

		for (const raw of raws) {
			const norm = raw.replace(/\s+/g, " ").trim();
			if (!norm || !CYR.test(norm)) continue;
			bump(result.buckets, bucket);
			bump(perFile.buckets, bucket);
			perFile.total++;
			(distinct[bucket] ||= new Set()).add(norm);
			bump(result.roles, bucket + "|" + c.role);
			if (c.dictId) bump(result.dictIds, rel + "::" + c.dictId);
			bump(result.perArea, area + "|" + bucket);
		}
	});

	// comments
	const comments = ast.comments || [];
	let cc = 0,
		cl = 0,
		ch = 0;
	for (const cm of comments) {
		if (!CYR.test(cm.value)) continue;
		cc++;
		cl += cm.value.split("\n").filter((l) => CYR.test(l)).length;
		ch += (cm.value.match(/[Ѐ-ӿ]/g) || []).length;
	}
	if (cc) {
		result.commentStats.files++;
		result.commentStats.cyrillicComments += cc;
		result.commentStats.cyrillicCommentLines += cl;
		result.commentStats.cyrillicCommentChars += ch;
		bump(result.buckets, "c_comment", cc);
		bump(result.perArea, area + "|c_comment", cc);
		perFile.buckets.c_comment = cc;
	}

	if (perFile.total || cc) result.perFile[rel] = perFile;
}

for (const [k, s] of Object.entries(distinct))
	result.distinctByBucket[k] = s.size;
result.interpolatedTemplates.distinct = tplSet.size;

fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/RC1-i18n-true-cost", OUT),
	JSON.stringify(result, null, 1),
	"utf8",
);

// console summary (ASCII only)
console.log(
	"scannedFiles(with cyrillic parsed):",
	Object.keys(result.perFile).length,
	"of",
	result.scannedFiles,
);
console.log("parseFailures:", result.parseFailures.length);
console.log("--- occurrences by bucket ---");
for (const [k, v] of Object.entries(result.buckets).sort((a, b) => b[1] - a[1]))
	console.log(
		String(v).padStart(7),
		k,
		" distinct:",
		result.distinctByBucket[k] ?? "(n/a)",
	);
console.log("--- per area ---");
for (const [k, v] of Object.entries(result.perArea).sort())
	console.log(String(v).padStart(7), k);
console.log(
	"--- interpolated templates ---",
	JSON.stringify(result.interpolatedTemplates),
);
console.log("--- comments ---", JSON.stringify(result.commentStats));
