// RC1: second pass. For every Cyrillic literal my census left "unclassified",
// record the ancestor node-type chain + a source snippet, so the residue can be
// named instead of guessed at. READ-ONLY.

import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const ROOT = process.cwd();
const CYR = /[Ѐ-ӿ]/;
const SCAN_DIRS = ["apps/web/src", "apps/api/src", "packages/shared/src"];

function isTestFile(rel) {
	return (
		/(^|[\\/])tests?[\\/]/.test(rel) ||
		/(^|[\\/])__tests__[\\/]/.test(rel) ||
		/\.test\.[cm]?tsx?$/.test(rel) ||
		/\.spec\.[cm]?tsx?$/.test(rel) ||
		/(^|[\\/])fixtures?[\\/]/.test(rel)
	);
}
function isData(rel) {
	const r = rel.replace(/\\/g, "/");
	return (
		/\/sampleData/.test(r) ||
		/seed/i.test(r) ||
		/apps\/api\/src\/migration\//.test(r) ||
		/routes\/smartImports\.ts$/.test(r) ||
		/apps\/api\/src\/speech\//.test(r) ||
		/apps\/api\/src\/ai\//.test(r) ||
		/apps\/api\/src\/routes\/documents\//.test(r) ||
		/apps\/api\/src\/documents\//.test(r) ||
		/apps\/api\/src\/scripts\//.test(r)
	);
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
			k === "innerComments"
		)
			continue;
		const v = node[k];
		if (v && typeof v === "object") walk(v, visit, node);
	}
}
function chain(n, depth = 6) {
	const out = [];
	let p = n.__parent;
	let g = 0;
	while (p && g++ < depth) {
		let label = p.type;
		if (p.type === "ObjectProperty" && p.key)
			label += "[" + (p.key.name || p.key.value) + "]";
		if (p.type === "CallExpression") {
			const c = p.callee;
			const nm =
				c && c.type === "Identifier"
					? c.name
					: c && c.type === "MemberExpression" && c.property
						? c.property.name || c.property.value
						: "?";
			label += "(" + nm + ")";
		}
		if (p.type === "VariableDeclarator" && p.id && p.id.name)
			label += "{" + p.id.name + "}";
		if (p.type === "JSXAttribute" && p.name)
			label += "<" + (p.name.name || "?") + ">";
		out.push(label);
		p = p.__parent;
	}
	return out.join(" < ");
}
function isVisibleAlready(n) {
	let p = n.__parent;
	let g = 0;
	while (p && g++ < 200) {
		if (p.type === "JSXAttribute") return true;
		if (p.type === "ThrowStatement") return true;
		if (p.type === "NewExpression") return true;
		if (p.type === "CallExpression") {
			const c = p.callee;
			const cn =
				c && c.type === "Identifier"
					? c.name
					: c && c.type === "MemberExpression" && c.property
						? c.property.name || c.property.value
						: null;
			if (cn && (TOAST_RE.test(cn) || LOG_RE.test(cn))) return true;
		}
		if (p.type === "ObjectProperty" && p.key) {
			const k = p.key.name || p.key.value;
			if (
				typeof k === "string" &&
				/^(message|error|title|label|text|description|reason|hint|detail|details|summary|subtitle|placeholder|note|warning|caption|heading|body|content|name)$/i.test(
					k,
				)
			)
				return true;
		}
		if (
			p.type === "ObjectExpression" &&
			Array.isArray(p.properties) &&
			p.properties.length >= 3
		) {
			const vals = p.properties
				.filter((q) => q.type === "ObjectProperty")
				.map((q) => q.value);
			if (
				vals.length >= 3 &&
				vals.every(
					(v) =>
						v && (v.type === "StringLiteral" || v.type === "TemplateLiteral"),
				)
			)
				return true;
		}
		if (
			p.type === "VariableDeclarator" &&
			p.id &&
			p.id.typeAnnotation &&
			p.id.typeAnnotation.__src &&
			/Record\s*</.test(p.id.typeAnnotation.__src)
		)
			return true;
		p = p.__parent;
	}
	return false;
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

const shapes = {};
const samples = [];
let total = 0;
for (const rel of files) {
	if (isTestFile(rel) || isData(rel)) continue;
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
	walk(ast.program, (n) => {
		if (n.type === "TSTypeAnnotation" && typeof n.start === "number")
			n.__src = src.slice(n.start, n.end);
	});
	walk(ast.program, (n) => {
		let has = false;
		if (n.type === "StringLiteral" && CYR.test(n.value)) has = true;
		else if (
			n.type === "TemplateLiteral" &&
			n.quasis.some((q) => CYR.test(q.value.raw))
		)
			has = true;
		if (!has) return;
		if (isVisibleAlready(n)) return;
		total++;
		const sh = chain(n);
		shapes[sh] = (shapes[sh] || 0) + 1;
		if (samples.length < 3000)
			samples.push({
				file: rel,
				line: n.loc ? n.loc.start.line : 0,
				shape: sh,
				snippet: src
					.slice(n.start, Math.min(n.end, n.start + 90))
					.replace(/\n/g, " "),
			});
	});
}
fs.writeFileSync(
	path.join(ROOT, ".agents/archon/recon/RC1-i18n-true-cost/unclassified.json"),
	JSON.stringify({ total, shapes, samples }, null, 1),
	"utf8",
);
console.log("unclassified total:", total);
console.log("--- top 40 ancestor shapes ---");
Object.entries(shapes)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 40)
	.forEach(([k, v]) => console.log(String(v).padStart(5), k));
