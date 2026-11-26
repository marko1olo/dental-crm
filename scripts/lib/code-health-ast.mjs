/**
 * code-health-ast.mjs — exact (AST based) detectors for the quality ratchet and dice audit.
 *
 * Why AST and not regex: regex ratchets only see the exact spelling their author thought
 * of and quietly report "IDEAL: 0" while arbitrary any-types, double casts, non-null
 * assertions, compiler suppressions, swallowed promises, empty catch blocks, Zod any-schemas,
 * constant-true assertions and phantom tests thrive.
 * A metric with blind spots becomes a Goodhart target — debt simply moves into the shadows.
 *
 * Two families of detectors:
 *   scanProductionSource — type laundering, suppressions, swallowed errors, z.any(),
 *                          production code that sniffs the test runner or imports tests.
 *   scanTestSource       — tests that cannot fail, never touch project code (phantom),
 *                          silently bail out on missing files/DB, or only grep source text.
 *
 * Every detector returns { rule, line, text } findings.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import ts from "typescript";

/* ------------------------------------------------------------------ files */

export function isTestFile(relPath) {
	const norm = relPath.replace(/\\/g, "/");
	if (/\.test\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\.spec\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/[Tt]estHelpers?\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\/__tests__\//.test(norm)) return true;
	if (/(^|\/)tests\//.test(norm)) return true;
	if (/\/__mocks__\//.test(norm)) return true;
	if (/\/testUtils\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\/setupTests\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/vitest\.d\.ts$/.test(norm)) return true;
	return false;
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".data", ".vite", "build", "scratch", "coverage"]);

export function collectFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
	const files = [];
	if (!existsSync(dir)) return files;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) files.push(...collectFiles(full, extensions));
		} else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith(".d.ts")) {
			files.push(full);
		}
	}
	return files;
}

/* ------------------------------------------------------------------ parse */

function scriptKindFor(fileName) {
	if (/\.tsx$/.test(fileName)) return ts.ScriptKind.TSX;
	if (/\.jsx$/.test(fileName)) return ts.ScriptKind.JSX;
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
	return ts.ScriptKind.TS;
}

export function parseSource(text, fileName) {
	return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKindFor(fileName));
}

function lineOf(sf, pos) {
	return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function snippet(sf, node) {
	const t = node.getText(sf).replace(/\s+/g, " ");
	return t.length > 120 ? `${t.slice(0, 117)}...` : t;
}

function walk(node, visit) {
	visit(node);
	ts.forEachChild(node, (child) => walk(child, visit));
}

function unwrap(expr) {
	let e = expr;
	while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e))) e = e.expression;
	return e;
}

function rootIdentifier(expr) {
	let e = expr;
	for (;;) {
		if (!e) return null;
		if (ts.isIdentifier(e)) return e.text;
		if (
			ts.isPropertyAccessExpression(e) ||
			ts.isElementAccessExpression(e) ||
			ts.isCallExpression(e) ||
			ts.isNonNullExpression(e) ||
			ts.isParenthesizedExpression(e)
		) {
			e = e.expression;
		} else return null;
	}
}

/** Names of every property segment in a call chain: expect(x).not.toBe -> ["not","toBe"]. */
function chainNames(expr) {
	const names = [];
	let e = expr;
	for (;;) {
		if (ts.isPropertyAccessExpression(e)) {
			names.unshift(e.name.text);
			e = e.expression;
		} else if (ts.isCallExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) {
			e = e.expression;
		} else break;
	}
	return names;
}

/* ------------------------------------------------- production-code rules */

const TEST_ENV_NAMES = new Set(["VITEST", "VITEST_WORKER_ID", "JEST_WORKER_ID", "NODE_TEST_CONTEXT"]);
const SILENT_FALLBACK_BODY = new Set(["undefined"]);
const CONSOLE_NOISE = new Set(["log", "debug", "trace", "info"]);
const DIRECTIVE_RE = /(?:\/\/|\/\*)[^\n]*?(@ts-ignore|@ts-expect-error|@ts-nocheck|biome-ignore|eslint-disable)/;
const SWALLOW_OK_RE = /swallow-ok:\s*\S.{14,}/;
const MONEY_NAME_RE = /kop|amount|price|sum\b|total|cost|rub|balance|debt|paid|fee|salary|payout|revenue|tariff|invoice|payment/i;

export const PRODUCTION_RULES = [
	"explicit-any",
	"z-any",
	"double-cast",
	"as-never",
	"record-cast",
	"type-assertion",
	"non-null-assertion",
	"ts-suppression",
	"linter-suppression",
	"empty-catch",
	"documented-swallow",
	"silent-catch",
	"swallowed-promise",
	"console-noise",
	"prod-imports-test-code",
	"test-env-sniff",
	"float-money-division",
];

function isUnknownOrAnyOrNever(typeNode) {
	return (
		typeNode.kind === ts.SyntaxKind.UnknownKeyword ||
		typeNode.kind === ts.SyntaxKind.AnyKeyword ||
		typeNode.kind === ts.SyntaxKind.NeverKeyword
	);
}

function isRecordOfUnknown(typeNode) {
	if (ts.isTypeReferenceNode(typeNode) && typeNode.typeName.getText() === "Record") {
		const args = typeNode.typeArguments ?? [];
		return args.length === 2 && args[1].kind === ts.SyntaxKind.UnknownKeyword;
	}
	if (ts.isTypeLiteralNode(typeNode) && typeNode.members.length === 1) {
		const m = typeNode.members[0];
		return ts.isIndexSignatureDeclaration(m) && m.type?.kind === ts.SyntaxKind.UnknownKeyword;
	}
	return false;
}

function blockHasCall(block) {
	let found = false;
	walk(block, (n) => {
		if (ts.isCallExpression(n) || ts.isThrowStatement(n) || ts.isNewExpression(n)) found = true;
	});
	return found;
}

function isSilentFallbackBody(body) {
	if (ts.isBlock(body)) return body.statements.length === 0;
	const e = unwrap(body);
	if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return true;
	if (ts.isIdentifier(e) && SILENT_FALLBACK_BODY.has(e.text)) return true;
	if (ts.isVoidExpression(e)) return true;
	if (ts.isArrayLiteralExpression(e) && e.elements.length === 0) return true;
	if (ts.isObjectLiteralExpression(e) && e.properties.length === 0) return true;
	if (ts.isNumericLiteral(e) && e.text === "0") return true;
	if (ts.isStringLiteral(e) && e.text === "") return true;
	return false;
}

/**
 * @param {string} text
 * @param {string} fileName   repo-relative path with forward slashes
 * @param {{ isWeb?: boolean, allowConsole?: boolean, allowFloatMoney?: boolean }} [opts]
 */
export function scanProductionSource(text, fileName, opts = {}) {
	const sf = parseSource(text, fileName);
	const findings = [];
	const add = (rule, node, extra) => findings.push({ rule, line: lineOf(sf, node.getStart(sf)), text: extra ?? snippet(sf, node) });

	walk(sf, (node) => {
		if (node.kind === ts.SyntaxKind.AnyKeyword) add("explicit-any", node, snippet(sf, node.parent));

		if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
			const typeNode = node.type;
			const isConst = ts.isTypeReferenceNode(typeNode) && typeNode.typeName.getText() === "const";
			if (!isConst) {
				const inner = unwrap(node.expression);
				const innerIsCast = inner && (ts.isAsExpression(inner) || ts.isTypeAssertionExpression(inner));
				if (innerIsCast && isUnknownOrAnyOrNever(inner.type)) add("double-cast", node);
				else if (typeNode.kind === ts.SyntaxKind.NeverKeyword) add("as-never", node);
				else if (isRecordOfUnknown(typeNode)) add("record-cast", node);
				if (typeNode.kind !== ts.SyntaxKind.UnknownKeyword) add("type-assertion", node);
			}
		}

		if (ts.isNonNullExpression(node)) add("non-null-assertion", node);

		if (ts.isCatchClause(node)) {
			const block = node.block;
			const blockText = block.getText(sf);
			if (block.statements.length === 0) {
				add(SWALLOW_OK_RE.test(blockText) ? "documented-swallow" : "empty-catch", node);
			} else if (!blockHasCall(block)) {
				add(SWALLOW_OK_RE.test(blockText) ? "documented-swallow" : "silent-catch", node);
			}
		}

		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			if (ts.isPropertyAccessExpression(callee)) {
				// z.any() in Zod contracts
				if (ts.isIdentifier(callee.expression) && callee.expression.text === "z" && callee.name.text === "any") {
					add("z-any", node);
				}
				// .catch(() => {}) / .catch(() => null) / .catch(() => undefined)
				if (callee.name.text === "catch" && node.arguments.length === 1) {
					const arg = unwrap(node.arguments[0]);
					if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
						if (isSilentFallbackBody(arg.body)) add("swallowed-promise", node);
					} else if (ts.isIdentifier(arg) && /^(noop|_noop|ignore|swallow)$/i.test(arg.text)) {
						add("swallowed-promise", node);
					}
				}
				// console.log / debug / info / trace
				if (
					!opts.allowConsole &&
					ts.isIdentifier(callee.expression) &&
					callee.expression.text === "console" &&
					CONSOLE_NOISE.has(callee.name.text)
				) {
					add("console-noise", node);
				}
			}
		}

		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			if (/(^|\/)(__tests__|__mocks__|tests?)(\/|$)|\.(test|spec)(\.|$)/.test(node.moduleSpecifier.text)) {
				add("prod-imports-test-code", node);
			}
		}

		if (ts.isPropertyAccessExpression(node) && TEST_ENV_NAMES.has(node.name.text) && /process\.env$/.test(node.expression.getText(sf))) {
			add("test-env-sniff", node);
		}
		if (ts.isBinaryExpression(node)) {
			const op = node.operatorToken.kind;
			const isEquality =
				op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
				op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
				op === ts.SyntaxKind.EqualsEqualsToken ||
				op === ts.SyntaxKind.ExclamationEqualsToken;
			if (isEquality) {
				const sides = [node.left, node.right].map((n) => n.getText(sf));
				const hasNodeEnv = sides.some((s) => /process\.env\.NODE_ENV$|process\.env\[["']NODE_ENV["']\]$/.test(s));
				const hasTestLiteral = sides.some((s) => /^["']test["']$/.test(s));
				if (hasNodeEnv && hasTestLiteral) add("test-env-sniff", node);
			}
			if (opts.isWeb && !opts.allowFloatMoney) {
				const r = node.right;
				const l = node.left;
				const other = (lit) => (lit === r ? l : r).getText(sf);
				const isLit = (n, v) => ts.isNumericLiteral(n) && n.text === v;
				if (op === ts.SyntaxKind.SlashToken && isLit(r, "100") && MONEY_NAME_RE.test(other(r))) add("float-money-division", node);
				if (op === ts.SyntaxKind.AsteriskToken) {
					const lit = isLit(r, "0.01") ? r : isLit(l, "0.01") ? l : null;
					if (lit && MONEY_NAME_RE.test(other(lit))) add("float-money-division", node);
				}
			}
		}
	});

	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const m = DIRECTIVE_RE.exec(lines[i]);
		if (!m) continue;
		const rule = m[1].startsWith("@ts-") ? "ts-suppression" : "linter-suppression";
		findings.push({ rule, line: i + 1, text: lines[i].trim().slice(0, 120) });
	}
	return findings;
}

/* ---------------------------------------------------------- test rules */

export const TEST_RULES = [
	"test-no-assertion",
	"test-weak-only",
	"test-tautology",
	"test-phantom-no-sut",
	"test-skipped",
	"test-only-left",
	"test-size-assertion",
	"test-source-grep",
	"test-swallowed-assertion",
	"test-self-mock",
];

const TEST_ROOTS = new Set(["it", "test"]);
const SUITE_ROOTS = new Set(["describe", "suite"]);
const ALLOWED_TEST_CHAIN = new Set(["skip", "only", "todo", "each", "concurrent", "sequential", "skipIf", "runIf", "fails"]);
const ASSERT_ROOTS = new Set(["assert", "expect", "should", "expectTypeOf", "assertType"]);
const HELPER_ASSERT_RE = /^(assert|expect|verify|ensure|must|check)[A-Z0-9_]/;
const WEAK_MATCHERS = new Set(["toBeDefined", "toBeTruthy", "toBeFalsy", "doesNotThrow", "doesNotReject"]);
const NEGATED_WEAK = new Set(["toBeNull", "toBeUndefined", "toThrow", "toBeNaN"]);
const EQUALITY_MATCHERS = new Set(["equal", "strictEqual", "deepEqual", "deepStrictEqual", "toBe", "toEqual", "toStrictEqual"]);
const NON_SUT_SPECIFIER = /^(?:node:|vitest$|@vitest\/|assert$|fs$|path$|os$|url$|crypto$|zlib$|child_process$|stream$|events$|http$|https$|util$|timers$|react$|react-dom|@testing-library\/|jsdom$|happy-dom$|pino$|zod$)/;
const FS_READ_METHODS = new Set(["readFileSync", "readFile", "readdirSync"]);
const CONTENT_ASSERT_METHODS = new Set(["includes", "match", "test", "toMatch", "toContain"]);
const SIZE_VAR_NAMES = new Set(["lineCount", "countLines", "linesCount"]);
const SOURCE_PATH_HINT_RE = /\.(?:tsx?|css|mjs|cjs)\b|(?:^|[\\/])src(?:[\\/]|$)|SRC_|_DIR\b|__dirname/;

function describeTestCall(call) {
	const callee = call.expression;
	const root = rootIdentifier(callee);
	if (!root) return null;
	const isTest = TEST_ROOTS.has(root);
	const isSuite = SUITE_ROOTS.has(root);
	if (!isTest && !isSuite) return null;
	if (!ts.isIdentifier(callee) && !ts.isPropertyAccessExpression(callee) && !ts.isCallExpression(callee)) return null;

	const names = chainNames(callee);
	// Reject non-test APIs such as `test.mock.method(...)`, `test.mock.restoreAll()`, `test.beforeEach(...)`.
	if (names.length > 0 && !names.every((n) => ALLOWED_TEST_CHAIN.has(n))) return null;

	const callback = [...call.arguments].reverse().find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
	const optionsArg = call.arguments.find((a) => ts.isObjectLiteralExpression(a));
	let skipped = names.includes("skip") || names.includes("todo");
	if (optionsArg) {
		for (const p of optionsArg.properties) {
			if (ts.isPropertyAssignment(p) && ["skip", "todo"].includes(p.name.getText()) && p.initializer.kind !== ts.SyntaxKind.FalseKeyword) skipped = true;
		}
	}
	return { isTest, isSuite, only: names.includes("only"), skipped, callback };
}

function isWeakOkArgument(arg) {
	const e = unwrap(arg);
	if (!e) return false;
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return true;
	if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) return isWeakOkArgument(e.operand);
	if (ts.isCallExpression(e) && /Array\.isArray$/.test(e.expression.getText())) return true;
	if (ts.isBinaryExpression(e)) {
		const op = e.operatorToken.kind;
		const right = unwrap(e.right);
		const rightIsNullish = right.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(right) && right.text === "undefined");
		if ((op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) && rightIsNullish) return true;
		if (ts.isTypeOfExpression(unwrap(e.left)) && (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken)) return true;
		if (op === ts.SyntaxKind.GreaterThanToken && /\.length$/.test(e.left.getText()) && ts.isNumericLiteral(right) && right.text === "0") return true;
	}
	return false;
}

function containsCall(node) {
	let found = false;
	walk(node, (n) => {
		if (ts.isCallExpression(n) || ts.isNewExpression(n)) found = true;
	});
	return found;
}

function isAtomicLiteral(node) {
	const e = unwrap(node);
	if (!e) return false;
	return (
		e.kind === ts.SyntaxKind.TrueKeyword ||
		e.kind === ts.SyntaxKind.FalseKeyword ||
		e.kind === ts.SyntaxKind.NullKeyword ||
		ts.isNumericLiteral(e) ||
		ts.isStringLiteral(e) ||
		ts.isNoSubstitutionTemplateLiteral(e)
	);
}

function isPureLiteralExpr(node) {
	const e = unwrap(node);
	if (!e) return false;
	if (isAtomicLiteral(e)) return true;
	if (ts.isPrefixUnaryExpression(e) && (e.operator === ts.SyntaxKind.MinusToken || e.operator === ts.SyntaxKind.PlusToken)) {
		return isPureLiteralExpr(e.operand);
	}
	if (ts.isBinaryExpression(e)) return isPureLiteralExpr(e.left) && isPureLiteralExpr(e.right);
	return false;
}

function isMutationOp(kind) {
	return (
		kind === ts.SyntaxKind.EqualsToken ||
		kind === ts.SyntaxKind.PlusEqualsToken ||
		kind === ts.SyntaxKind.MinusEqualsToken ||
		kind === ts.SyntaxKind.AsteriskEqualsToken ||
		kind === ts.SyntaxKind.SlashEqualsToken ||
		kind === ts.SyntaxKind.PercentEqualsToken ||
		kind === ts.SyntaxKind.BarEqualsToken ||
		kind === ts.SyntaxKind.AmpersandEqualsToken ||
		kind === ts.SyntaxKind.BarBarEqualsToken ||
		kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
		kind === ts.SyntaxKind.QuestionQuestionEqualsToken
	);
}

function analyzeAssertion(call, sf, localLiteralVars) {
	const callee = call.expression;
	let matcher = null;
	let negated = false;
	let subject = null;
	let expected = null;
	let root = null;

	if (ts.isIdentifier(callee)) {
		if (callee.text === "assert") {
			root = "assert";
			matcher = "ok";
			subject = call.arguments[0];
		} else if (HELPER_ASSERT_RE.test(callee.text)) {
			return { kind: "helper", weak: false, tautology: false };
		} else return null;
	} else if (ts.isPropertyAccessExpression(callee)) {
		root = rootIdentifier(callee);
		const names = chainNames(callee);
		if (ASSERT_ROOTS.has(root)) {
			if (root === "expect" || root === "should" || root === "expectTypeOf" || root === "assertType") {
				if (!ts.isCallExpression(callee.expression) && !ts.isPropertyAccessExpression(callee.expression)) return null;
				matcher = callee.name.text;
				negated = names.includes("not");
				const inner = (() => {
					let e = callee.expression;
					while (ts.isPropertyAccessExpression(e)) e = e.expression;
					return ts.isCallExpression(e) ? e : null;
				})();
				subject = inner?.arguments[0] ?? null;
				expected = call.arguments[0] ?? null;
			} else {
				matcher = callee.name.text;
				subject = call.arguments[0] ?? null;
				expected = call.arguments[1] ?? null;
			}
		} else if (HELPER_ASSERT_RE.test(callee.name.text)) {
			return { kind: "helper", weak: false, tautology: false };
		} else return null;
	} else return null;

	let weak = false;
	if (root === "assert" && matcher === "ok") weak = subject ? isWeakOkArgument(subject) : true;
	else if (root === "assert" && matcher === "notEqual") weak = !!expected && /^(undefined|null)$/.test(expected.getText(sf));
	else if (EQUALITY_MATCHERS.has(matcher) && subject && ts.isTypeOfExpression(unwrap(subject))) weak = true;
	else if (WEAK_MATCHERS.has(matcher)) weak = true;
	else if (negated && NEGATED_WEAK.has(matcher)) weak = true;

	let tautology = false;
	if (root === "assert" && matcher === "ok" && subject && unwrap(subject).kind === ts.SyntaxKind.TrueKeyword) tautology = true;
	if (EQUALITY_MATCHERS.has(matcher) && subject && expected && !negated) {
		const sNode = unwrap(subject);
		const eNode = unwrap(expected);
		// Same expression with NO function calls (e.g. `expect(true).toBe(true)`, `assert.equal(x, x)`).
		// Determinism checks like `assert.equal(fn(x), fn(x))` DO invoke `fn` and are NOT tautologies.
		if (!containsCall(sNode) && !containsCall(eNode)) {
			if (sNode.getText(sf).trim() === eNode.getText(sf).trim()) tautology = true;
			// Local unmutated literal constant compared to an atomic literal: `const blocked = false; assert.equal(blocked, false);`
			if (ts.isIdentifier(sNode) && localLiteralVars.has(sNode.text) && isAtomicLiteral(eNode)) tautology = true;
		}
	}
	return { kind: "matcher", weak, tautology };
}

/** Collect identifiers imported from the project (not stdlib / test framework) plus local helpers/fixtures referencing them. */
function collectSutSymbols(sf) {
	const sutNames = new Set();
	for (const stmt of sf.statements) {
		if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
		const spec = stmt.moduleSpecifier.text;
		if (NON_SUT_SPECIFIER.test(spec)) continue;
		const clause = stmt.importClause;
		if (!clause || clause.isTypeOnly) continue;
		if (clause.name) sutNames.add(clause.name.text);
		if (clause.namedBindings) {
			if (ts.isNamespaceImport(clause.namedBindings)) sutNames.add(clause.namedBindings.name.text);
			else {
				for (const el of clause.namedBindings.elements) {
					if (!el.isTypeOnly) sutNames.add(el.name.text);
				}
			}
		}
	}

	const isInsideTestCase = (n) => {
		let p = n.parent;
		while (p) {
			if (ts.isCallExpression(p)) {
				const info = describeTestCall(p);
				if (info?.isTest) return true;
			}
			p = p.parent;
		}
		return false;
	};

	// Propagate to top-level / describe-level helpers, fixtures, and `let app;` assigned in before/beforeEach.
	const decls = [];
	walk(sf, (n) => {
		if (ts.isFunctionDeclaration(n) && n.name && !isInsideTestCase(n)) {
			decls.push({ name: n.name.text, node: n });
		} else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !isInsideTestCase(n)) {
			decls.push({ name: n.name.text, node: n.initializer });
		} else if (
			ts.isForOfStatement(n) ||
			ts.isForInStatement(n)
		) {
			if (!isInsideTestCase(n) && ts.isVariableDeclarationList(n.initializer)) {
				for (const decl of n.initializer.declarations) {
					if (ts.isIdentifier(decl.name)) decls.push({ name: decl.name.text, node: n.expression });
					else if (ts.isObjectBindingPattern(decl.name) || ts.isArrayBindingPattern(decl.name)) {
						for (const el of decl.name.elements) {
							if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) decls.push({ name: el.name.text, node: n.expression });
						}
					}
				}
			}
		} else if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isIdentifier(n.left) &&
			!isInsideTestCase(n)
		) {
			decls.push({ name: n.left.text, node: n.right });
		}
	});
	// Fixed-point propagation (max 5 hops)
	for (let pass = 0; pass < 5; pass++) {
		let grew = false;
		for (const d of decls) {
			if (sutNames.has(d.name)) continue;
			let touches = false;
			walk(d.node, (n) => {
				if (ts.isIdentifier(n) && sutNames.has(n.text)) touches = true;
				if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) touches = true;
			});
			if (touches) { sutNames.add(d.name); grew = true; }
		}
		if (!grew) break;
	}
	return sutNames;
}

/**
 * @param {string} text
 * @param {string} fileName
 */
export function scanTestSource(text, fileName) {
	const sf = parseSource(text, fileName);
	const findings = [];
	let tests = 0;
	const sutSymbols = collectSutSymbols(sf);
	const baseStem = basename(fileName).replace(/\.(test|spec)\.[cm]?[jt]sx?$/, "");

	// Check for self-mocking (`vi.mock("./foo")` inside `foo.test.ts`).
	walk(sf, (node) => {
		if (!ts.isCallExpression(node)) return;
		const callee = node.expression;
		if (
			ts.isPropertyAccessExpression(callee) &&
			ts.isIdentifier(callee.expression) &&
			(callee.expression.text === "vi" || callee.expression.text === "jest") &&
			callee.name.text === "mock" &&
			node.arguments.length >= 1 &&
			ts.isStringLiteral(node.arguments[0])
		) {
			const target = node.arguments[0].text;
			const targetStem = basename(target).replace(/\.[cm]?[jt]sx?$/, "");
			if (targetStem === baseStem && baseStem.length > 2) {
				findings.push({ rule: "test-self-mock", line: lineOf(sf, node.getStart(sf)), text: snippet(sf, node) });
			}
		}
	});

	walk(sf, (node) => {
		if (!ts.isCallExpression(node)) return;
		const info = describeTestCall(node);
		if (!info) return;
		const at = (rule, extra) => findings.push({ rule, line: lineOf(sf, node.getStart(sf)), text: extra ?? snippet(sf, node.arguments[0] ?? node).slice(0, 100) });

		if (info.only) at("test-only-left");
		if (info.skipped) at("test-skipped");
		if (!info.isTest || !info.callback) return;
		tests++;
		if (info.skipped) return;

		const body = info.callback.body;

		// Track local variables assigned pure literal arithmetic (`const remaining = 2.0 - 5.0; const blocked = false;`)
		const localLiteralVars = new Set();
		const reassignedVars = new Set();
		walk(body, (n) => {
			if (ts.isBinaryExpression(n) && isMutationOp(n.operatorToken.kind) && ts.isIdentifier(n.left)) {
				reassignedVars.add(n.left.text);
			} else if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && ts.isIdentifier(n.operand)) {
				if (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) {
					reassignedVars.add(n.operand.text);
				}
			}
		});
		walk(body, (n) => {
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !reassignedVars.has(n.name.text)) {
				if (isAtomicLiteral(n.initializer)) localLiteralVars.add(n.name.text);
			}
		});

		const assertions = [];
		let touchesSut = false;
		let hasDynamicImportOrFetch = false;
		let hasNestedTests = false;
		let hasFsReadCall = false;
		let hasFsExistsCall = false;
		let hasSizeAstNode = false;
		let hasContentAssertAstNode = false;
		let hasSourcePathArg = false;
		walk(body, (n) => {
			if (ts.isCallExpression(n)) {
				if (n !== node && describeTestCall(n)?.isTest) hasNestedTests = true;
				const a = analyzeAssertion(n, sf, localLiteralVars);
				if (a) assertions.push(a);
				if (n.expression.kind === ts.SyntaxKind.ImportKeyword) hasDynamicImportOrFetch = true;
				const calleeText = ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : "";
				if (["fetch", "spawnSync", "execSync", "execFileSync"].includes(calleeText)) hasDynamicImportOrFetch = true;
				if (FS_READ_METHODS.has(calleeText)) {
					hasFsReadCall = true;
					if (n.arguments.some((arg) => SOURCE_PATH_HINT_RE.test(arg.getText(sf)) || /Path|File|Dir/i.test(arg.getText(sf)))) {
						hasSourcePathArg = true;
					}
				}
				if (calleeText === "existsSync") hasFsExistsCall = true;
				if (calleeText === "resolve" || calleeText === "join") {
					if (n.arguments.some((arg) => SOURCE_PATH_HINT_RE.test(arg.getText(sf)))) hasSourcePathArg = true;
				}
				if (CONTENT_ASSERT_METHODS.has(calleeText)) hasContentAssertAstNode = true;
				if (ts.isPropertyAccessExpression(n.expression) && n.expression.getText(sf) === "assert.match") hasContentAssertAstNode = true;
			}
			if (ts.isPropertyAccessExpression(n) && n.name.text === "length") {
				const tgt = n.expression;
				if (ts.isCallExpression(tgt) && ts.isPropertyAccessExpression(tgt.expression) && tgt.expression.name.text === "split") {
					hasSizeAstNode = true;
				}
			}
			if (ts.isIdentifier(n)) {
				if (sutSymbols.has(n.text)) touchesSut = true;
				if (SIZE_VAR_NAMES.has(n.text)) hasSizeAstNode = true;
			}
			if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) touchesSut = true;
		});

		const readsProjectSource = hasFsReadCall && hasSourcePathArg;
		const checksExistenceOfProjectFile = hasFsExistsCall && hasSourcePathArg;

		if (assertions.length === 0 && !hasNestedTests) at("test-no-assertion");
		else if (assertions.length > 0 && assertions.every((a) => a.weak)) at("test-weak-only");
		for (const a of assertions) if (a.tautology) at("test-tautology");

		// Phantom test: has assertions, does NOT touch any project import, does NOT render JSX,
		// does NOT read/check source, does NOT run a CLI/fetch/import — it is testing JS literals against JS literals.
		if (!hasNestedTests && !touchesSut && !hasDynamicImportOrFetch && !readsProjectSource && !checksExistenceOfProjectFile && assertions.length > 0) {
			at("test-phantom-no-sut");
		}

		if (readsProjectSource && hasSizeAstNode) at("test-size-assertion");
		else if (readsProjectSource && hasContentAssertAstNode) at("test-source-grep");

		walk(body, (n) => {
			if (!ts.isTryStatement(n) || !n.catchClause) return;
			let tryHasAssert = false;
			walk(n.tryBlock, (c) => {
				if (ts.isCallExpression(c) && analyzeAssertion(c, sf, localLiteralVars)) tryHasAssert = true;
			});
			if (!tryHasAssert) return;
			let rethrows = false;
			walk(n.catchClause.block, (c) => {
				if (ts.isThrowStatement(c)) rethrows = true;
				if (ts.isCallExpression(c) && (analyzeAssertion(c, sf, localLiteralVars) || /assert\.fail$|\bfail$/.test(c.expression.getText(sf)))) rethrows = true;
			});
			if (!rethrows) findings.push({ rule: "test-swallowed-assertion", line: lineOf(sf, n.getStart(sf)), text: "try { assertion } catch { swallowed }" });
		});
	});

	return { tests, findings };
}

export function readText(file) {
	return readFileSync(file, "utf8");
}
