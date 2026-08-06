// READ-ONLY. Reviewer instrument #2: COMPONENT-granularity reachability.
// The census under review resolves render sites at FILE granularity: a component
// counts as rendered if ANY reachable file contains a JSX tag of its bound name.
// That cannot distinguish "rendered by a live component" from "rendered only by a
// dead sibling inside a live file". This script builds the graph at DECLARATION
// granularity and diffs the mounted set against the census.

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, posix, relative, sep } from "node:path";

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
const ENTRY = "main.tsx";

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
			if (!e.isFile() || ![".ts", ".tsx"].includes(extname(e.name))) continue;
			if (e.name.endsWith(".d.ts") || /\.test\.tsx?$/.test(e.name)) continue;
			out.push(relative(ROOT, full).split(sep).join("/"));
		}
	}
	return out.sort();
}

const NAME_RE = /^[A-Z][A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*$/;
const PASCAL = /^[A-Z]/;

const files = collect();
const universe = new Set(files);

function resolveSpec(from, spec) {
	if (!spec.startsWith(".")) return null;
	const joined = posix.join(posix.dirname(from), spec);
	const stem = joined.replace(/\.(js|jsx|mjs|cjs)$/, "");
	for (const c of [
		`${stem}.tsx`,
		`${stem}.ts`,
		`${stem}/index.tsx`,
		`${stem}/index.ts`,
		joined,
	]) {
		if (universe.has(c)) return c;
	}
	return null;
}

function isTypeOnly(n) {
	return (
		ts.isTypeNode(n) ||
		ts.isTypeAliasDeclaration(n) ||
		ts.isInterfaceDeclaration(n) ||
		ts.isEnumDeclaration(n) ||
		ts.isModuleDeclaration(n)
	);
}

// refs used inside an arbitrary node: PascalCase JSX tags + PascalCase identifiers
function refsIn(node, sf) {
	const tags = new Set();
	const ids = new Set();
	(function walk(n) {
		if (isTypeOnly(n)) return;
		if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
			let e = n.tagName;
			while (ts.isPropertyAccessExpression(e)) e = e.expression;
			if (ts.isIdentifier(e) && PASCAL.test(e.text)) {
				tags.add(e.text);
				ids.add(e.text);
			}
		}
		if (ts.isIdentifier(n) && PASCAL.test(n.text)) ids.add(n.text);
		ts.forEachChild(n, walk);
	})(node);
	return { tags, ids };
}

function containsJsx(node) {
	let f = false;
	(function w(n) {
		if (f || isTypeOnly(n)) return;
		if (
			ts.isJsxElement(n) ||
			ts.isJsxSelfClosingElement(n) ||
			ts.isJsxFragment(n)
		) {
			f = true;
			return;
		}
		ts.forEachChild(n, w);
	})(node);
	return f;
}

function hasExport(n) {
	return (
		ts.canHaveModifiers(n) &&
		(ts.getModifiers(n) ?? []).some(
			(m) => m.kind === ts.SyntaxKind.ExportKeyword,
		)
	);
}

// ---- per-file facts -------------------------------------------------------
// decls: name -> { line, jsx, exported, refs:{tags,ids} }
// imports: localName -> { file, imported }
// reexports: [{file, imported, exportedAs}] ; starReexports: [file]
// moduleScopeRefs: refs at module top level NOT inside a declaration body
// lazyBindings: localName -> {file, imported}
const F = new Map();

for (const rel of files) {
	const text = readFileSync(join(ROOT, rel), "utf8");
	const sf = ts.createSourceFile(
		rel,
		text,
		ts.ScriptTarget.Latest,
		true,
		rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const decls = new Map();
	const imports = new Map();
	const reexports = [];
	const starReexports = [];
	const lazyBindings = new Map();
	const moduleScopeRefs = { tags: new Set(), ids: new Set() };
	const defaultExportNames = new Set();

	const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

	// find lazy(() => import("x").then(m=>({default:m.Y}))) bound to a const
	function lazyTargetOf(init) {
		if (!ts.isCallExpression(init)) return null;
		const callee = init.expression;
		const isLazy =
			(ts.isIdentifier(callee) && callee.text === "lazy") ||
			(ts.isPropertyAccessExpression(callee) && callee.name.text === "lazy");
		if (!isLazy) return null;
		let target = null;
		let imported = "default";
		(function w(n) {
			if (
				ts.isCallExpression(n) &&
				n.expression.kind === ts.SyntaxKind.ImportKeyword
			) {
				const a = n.arguments[0];
				if (a && ts.isStringLiteral(a)) target = a.text;
			}
			if (
				ts.isPropertyAssignment(n) &&
				ts.isIdentifier(n.name) &&
				n.name.text === "default" &&
				ts.isPropertyAccessExpression(n.initializer)
			) {
				imported = n.initializer.name.text;
			}
			ts.forEachChild(n, w);
		})(init);
		if (!target) return null;
		return { spec: target, imported };
	}

	for (const st of sf.statements) {
		if (ts.isImportDeclaration(st)) {
			if (st.importClause?.isTypeOnly) continue;
			const spec = st.moduleSpecifier;
			if (!ts.isStringLiteral(spec)) continue;
			const c = st.importClause;
			if (!c) continue;
			if (c.name)
				imports.set(c.name.text, { spec: spec.text, imported: "default" });
			if (c.namedBindings) {
				if (ts.isNamespaceImport(c.namedBindings))
					imports.set(c.namedBindings.name.text, {
						spec: spec.text,
						imported: "*",
					});
				else
					for (const el of c.namedBindings.elements) {
						if (el.isTypeOnly) continue;
						imports.set(el.name.text, {
							spec: spec.text,
							imported: (el.propertyName ?? el.name).text,
						});
					}
			}
			continue;
		}
		if (ts.isExportDeclaration(st)) {
			const spec = st.moduleSpecifier;
			if (spec && ts.isStringLiteral(spec)) {
				if (!st.exportClause) starReexports.push(spec.text);
				else if (ts.isNamedExports(st.exportClause))
					for (const el of st.exportClause.elements)
						reexports.push({
							spec: spec.text,
							imported: (el.propertyName ?? el.name).text,
							exportedAs: el.name.text,
						});
			}
			continue;
		}
		if (ts.isFunctionDeclaration(st) && st.name) {
			decls.set(st.name.text, {
				line: line(st.name),
				jsx: containsJsx(st),
				exported: hasExport(st),
				refs: refsIn(st, sf),
			});
			if (
				(ts.getModifiers(st) ?? []).some(
					(m) => m.kind === ts.SyntaxKind.DefaultKeyword,
				)
			)
				defaultExportNames.add(st.name.text);
			continue;
		}
		if (ts.isClassDeclaration(st) && st.name) {
			decls.set(st.name.text, {
				line: line(st.name),
				jsx: containsJsx(st),
				exported: hasExport(st),
				refs: refsIn(st, sf),
			});
			if (
				(ts.getModifiers(st) ?? []).some(
					(m) => m.kind === ts.SyntaxKind.DefaultKeyword,
				)
			)
				defaultExportNames.add(st.name.text);
			continue;
		}
		if (ts.isVariableStatement(st)) {
			const exp = hasExport(st);
			for (const d of st.declarationList.declarations) {
				if (!ts.isIdentifier(d.name)) continue;
				decls.set(d.name.text, {
					line: line(d),
					jsx: d.initializer ? containsJsx(d.initializer) : false,
					exported: exp,
					refs: d.initializer
						? refsIn(d.initializer, sf)
						: { tags: new Set(), ids: new Set() },
				});
				if (d.initializer) {
					const lz = lazyTargetOf(d.initializer);
					if (lz) lazyBindings.set(d.name.text, lz);
				}
			}
			continue;
		}
		if (ts.isExportAssignment(st)) {
			const r = refsIn(st, sf);
			for (const t of r.tags) moduleScopeRefs.tags.add(t);
			for (const i of r.ids) moduleScopeRefs.ids.add(i);
			if (ts.isIdentifier(st.expression))
				defaultExportNames.add(st.expression.text);
			continue;
		}
		// any other top-level statement = module scope (e.g. main.tsx createRoot().render(<X/>))
		const r = refsIn(st, sf);
		for (const t of r.tags) moduleScopeRefs.tags.add(t);
		for (const i of r.ids) moduleScopeRefs.ids.add(i);
	}

	// `export {A, B}` without module specifier marks local decls exported
	for (const st of sf.statements) {
		if (
			ts.isExportDeclaration(st) &&
			!st.moduleSpecifier &&
			st.exportClause &&
			ts.isNamedExports(st.exportClause)
		) {
			for (const el of st.exportClause.elements) {
				const local = (el.propertyName ?? el.name).text;
				const d = decls.get(local);
				if (d) d.exported = true;
				if (el.name.text === "default") defaultExportNames.add(local);
			}
		}
	}

	F.set(rel, {
		decls,
		imports,
		reexports,
		starReexports,
		lazyBindings,
		moduleScopeRefs,
		defaultExportNames,
	});
}

// ---- resolve a local name in a file to a declaration node id --------------
function resolveName(file, name, depth = 0) {
	if (depth > 6) return null;
	const f = F.get(file);
	if (!f) return null;
	// lazy() binding first: the local const is a PROXY for a declaration in
	// another file, so returning the local decl would dead-end the walk.
	const lz = f.lazyBindings.get(name);
	if (lz) {
		const t = resolveSpec(file, lz.spec);
		if (t) {
			const r = resolveExported(t, lz.imported, depth + 1);
			if (r) return r;
		}
	}
	if (f.decls.has(name)) return `${file}:${name}`;
	const im = f.imports.get(name);
	if (im) {
		const t = resolveSpec(file, im.spec);
		if (!t) return null;
		if (im.imported === "*") return null; // namespace: handled separately
		return resolveExported(t, im.imported, depth + 1);
	}
	return null;
}

function resolveExported(file, exportedName, depth = 0) {
	if (depth > 6) return null;
	const f = F.get(file);
	if (!f) return null;
	if (exportedName === "default") {
		for (const n of f.defaultExportNames)
			if (f.decls.has(n)) return `${file}:${n}`;
		return null;
	}
	if (f.decls.has(exportedName)) return `${file}:${exportedName}`;
	for (const rx of f.reexports) {
		if (rx.exportedAs !== exportedName) continue;
		const t = resolveSpec(file, rx.spec);
		if (t) {
			const r = resolveExported(t, rx.imported, depth + 1);
			if (r) return r;
		}
	}
	for (const spec of f.starReexports) {
		const t = resolveSpec(file, spec);
		if (t) {
			const r = resolveExported(t, exportedName, depth + 1);
			if (r) return r;
		}
	}
	return null;
}

// ---- BFS at declaration granularity ---------------------------------------
// Roots: everything referenced from main.tsx MODULE SCOPE (createRoot().render(<AppShell/>))
const reached = new Set();
const queue = [];

function push(id) {
	if (id && !reached.has(id)) {
		reached.add(id);
		queue.push(id);
	}
}

const entry = F.get(ENTRY);
if (!entry) throw new Error("no main.tsx");
for (const n of entry.moduleScopeRefs.ids) push(resolveName(ENTRY, n));
// main.tsx module scope may also call a local bootstrap function
for (const [n, d] of entry.decls)
	if (entry.moduleScopeRefs.ids.has(n)) push(`${ENTRY}:${n}`);

while (queue.length) {
	const id = queue.shift();
	const idx = id.lastIndexOf(":");
	const file = id.slice(0, idx);
	const name = id.slice(idx + 1);
	const f = F.get(file);
	if (!f) continue;
	const d = f.decls.get(name);
	if (!d) continue;
	for (const ref of d.refs.ids) {
		if (ref === name) continue;
		push(resolveName(file, ref));
	}
}

// ---- the census's component set (same rule as the builder) ----------------
const components = [];
for (const [file, f] of F) {
	for (const [name, d] of f.decls) {
		if (!d.exported || !d.jsx || !NAME_RE.test(name)) continue;
		components.push(`${file}:${name}`);
	}
}
components.sort();

const notReached = components.filter((c) => !reached.has(c));
console.log(`REVIEWER_COMPONENTS=${components.length}`);
console.log(`REVIEWER_DECL_LEVEL_REACHED=${reached.size}`);
console.log(`REVIEWER_COMPONENTS_NOT_REACHED=${notReached.length}`);
console.log("---NOT_REACHED_AT_DECLARATION_GRANULARITY---");
for (const c of notReached) console.log(c);
