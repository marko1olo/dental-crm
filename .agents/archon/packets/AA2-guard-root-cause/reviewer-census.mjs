// READ-ONLY independent census. Reviewer instrument: TypeScript compiler API
// (NOT @babel/parser, which the builder used). Purpose: re-derive 315 files /
// 195 components with a different parser and diff against the builder's list.

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, relative, sep } from "node:path";

const require = createRequire("C:/Clinic_MVP/dental-crm/apps/web/package.json");
const ts = require("typescript");

const ROOT = "C:/Clinic_MVP/dental-crm/apps/web/src";
const IGNORED = new Set([
	"node_modules",
	"dist",
	"__snapshots__",
	"tests",
	"__tests__",
]);

function collect() {
	const out = [];
	const stack = [ROOT];
	while (stack.length) {
		const cur = stack.pop();
		for (const e of readdirSync(cur, { withFileTypes: true })) {
			const full = join(cur, e.name);
			if (e.isDirectory()) {
				if (!IGNORED.has(e.name)) stack.push(full);
				continue;
			}
			if (!e.isFile()) continue;
			if (![".ts", ".tsx"].includes(extname(e.name))) continue;
			if (e.name.endsWith(".d.ts")) continue;
			if (/\.test\.tsx?$/.test(e.name)) continue;
			out.push(relative(ROOT, full).split(sep).join("/"));
		}
	}
	return out.sort();
}

// PascalCase with at least one lowercase letter.
const NAME_RE = /^[A-Z][A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*$/;

function isTypeOnly(node) {
	return (
		ts.isTypeNode(node) ||
		ts.isTypeAliasDeclaration(node) ||
		ts.isInterfaceDeclaration(node) ||
		ts.isTypeParameterDeclaration(node) ||
		ts.isEnumDeclaration(node) ||
		ts.isModuleDeclaration(node)
	);
}

function containsJsx(node) {
	let found = false;
	(function walk(n) {
		if (found) return;
		if (isTypeOnly(n)) return;
		if (
			ts.isJsxElement(n) ||
			ts.isJsxSelfClosingElement(n) ||
			ts.isJsxFragment(n)
		) {
			found = true;
			return;
		}
		ts.forEachChild(n, walk);
	})(node);
	return found;
}

function hasExportModifier(node) {
	return (
		ts.canHaveModifiers(node) &&
		(ts.getModifiers(node) ?? []).some(
			(m) => m.kind === ts.SyntaxKind.ExportKeyword,
		)
	);
}

const files = collect();
const components = [];
const shapes = {
	exportFunction: 0,
	annotatedConst: 0,
	plainArrowConst: 0,
	otherConst: 0,
	classDecl: 0,
};
let parseErrors = 0;

for (const rel of files) {
	const text = readFileSync(join(ROOT, rel), "utf8");
	const sf = ts.createSourceFile(
		rel,
		text,
		ts.ScriptTarget.Latest,
		true,
		rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	// TS parser is error-tolerant; surface any syntactic diagnostics.
	if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) {
		parseErrors++;
		console.log(`PARSE_DIAG ${rel}: ${sf.parseDiagnostics.length}`);
	}

	// Collect local declarations + which names are exported.
	const declared = new Map(); // name -> {line, jsx, shape}
	const exported = new Set();

	for (const st of sf.statements) {
		if (ts.isExportDeclaration(st)) continue; // re-export, handled as edge
		if (ts.isExportAssignment(st)) continue;

		if (ts.isFunctionDeclaration(st) && st.name) {
			const line =
				sf.getLineAndCharacterOfPosition(st.name.getStart(sf)).line + 1;
			declared.set(st.name.text, {
				line,
				jsx: containsJsx(st),
				shape: "exportFunction",
			});
			if (hasExportModifier(st)) exported.add(st.name.text);
			continue;
		}
		if (ts.isClassDeclaration(st) && st.name) {
			const line =
				sf.getLineAndCharacterOfPosition(st.name.getStart(sf)).line + 1;
			declared.set(st.name.text, {
				line,
				jsx: containsJsx(st),
				shape: "classDecl",
			});
			if (hasExportModifier(st)) exported.add(st.name.text);
			continue;
		}
		if (ts.isVariableStatement(st)) {
			const isExp = hasExportModifier(st);
			for (const d of st.declarationList.declarations) {
				if (!ts.isIdentifier(d.name)) continue;
				const line = sf.getLineAndCharacterOfPosition(d.getStart(sf)).line + 1;
				let shape = "otherConst";
				if (d.type) shape = "annotatedConst";
				else if (
					d.initializer &&
					(ts.isArrowFunction(d.initializer) ||
						ts.isFunctionExpression(d.initializer))
				)
					shape = "plainArrowConst";
				declared.set(d.name.text, {
					line,
					jsx: d.initializer ? containsJsx(d.initializer) : false,
					shape,
				});
				if (isExp) exported.add(d.name.text);
			}
		}
	}

	// `export { A, B }` specifiers.
	for (const st of sf.statements) {
		if (
			ts.isExportDeclaration(st) &&
			!st.moduleSpecifier &&
			st.exportClause &&
			ts.isNamedExports(st.exportClause)
		) {
			for (const spec of st.exportClause.elements)
				exported.add(spec.propertyName?.text ?? spec.name.text);
		}
		if (ts.isExportAssignment(st) && ts.isIdentifier(st.expression))
			exported.add(st.expression.text);
	}

	for (const [name, info] of declared) {
		if (!exported.has(name)) continue;
		if (!info.jsx) continue;
		if (!NAME_RE.test(name)) continue;
		components.push(`${rel}:${name}`);
		shapes[info.shape]++;
	}
}

console.log(`REVIEWER_FILES=${files.length}`);
console.log(`REVIEWER_COMPONENTS=${components.length}`);
console.log(`REVIEWER_PARSE_DIAG_FILES=${parseErrors}`);
console.log(`SHAPES=${JSON.stringify(shapes)}`);
console.log("---COMPONENT_LIST---");
for (const c of components.sort()) console.log(c);
