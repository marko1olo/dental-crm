/**
 * R5 STATIC CENSUS: route handlers that inspect the REQUEST BODY / return 400 BEFORE
 * calling an authorisation guard. Replaces mining the smoke gate's `payloadBeforeAuthorisation`,
 * which is a hand-written 2-element array (scripts/smoke-clinical-mutation-guard.mjs:310-325)
 * and not a discovery, and which cannot be run anyway while the build is stale.
 *
 * READ-ONLY. Text on stdout.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
	"..",
);
const ROUTES_DIR = join(REPO_ROOT, "apps", "api", "src", "routes");
const SKIP = new Set(["node_modules", "dist"]);

function walk(dir, out = []) {
	let e;
	try {
		e = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const x of e) {
		const full = join(dir, x.name);
		if (x.isDirectory()) {
			if (!SKIP.has(x.name)) walk(full, out);
		} else if (/\.ts$/.test(full) && !/\.test\.ts$/.test(full)) out.push(full);
	}
	return out;
}
const rel = (f) => relative(REPO_ROOT, f).split(sep).join("/");

const GUARDS = [
	"requireClinicalMutationAccess",
	"requireClinicalReadAccess",
	"requireResolvedOrganizationId",
	"requireResolvedStaffOrAdminOrganizationId",
	"requireClinicalReadContext",
	"requireClinicalMutationContext",
	"requireNonDoctorAccess",
	"requireOrganizationId",
	"requireStaffIdentity",
	"requirePermission",
	"enforcePermissionWhenStaffKnown",
	"resolveOrganizationId",
	"getRequestIdentity",
];
const HTTP_METHODS = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"options",
]);

const rows = [];
let handlersSeen = 0;
for (const file of walk(ROUTES_DIR)) {
	const src = readFileSync(file, "utf8");
	const sf = ts.createSourceFile(
		file,
		src,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	const lineOf = (n) =>
		sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			HTTP_METHODS.has(node.expression.name.text) &&
			node.arguments.length >= 2 &&
			ts.isStringLiteralLike(node.arguments[0]) &&
			node.arguments[0].text.startsWith("/")
		) {
			const method = node.expression.name.text.toUpperCase();
			const routePath = node.arguments[0].text;
			const handler = node.arguments[node.arguments.length - 1];
			if (
				(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) &&
				handler.body &&
				ts.isBlock(handler.body)
			) {
				handlersSeen++;
				const stmts = handler.body.statements;
				let firstGuard = -1;
				let firstBody = -1;
				let bodyDetail = "";
				let guardName = "";
				stmts.forEach((st, i) => {
					const text = st.getText(sf);
					// An AUTHORISATION BOUNDARY is any of:
					//  - a call to a known guard, OR any require*/resolve*/enforce*/assert* helper
					//    (settings.ts uses requireSettingsAccess, which a fixed name list misses)
					//  - a hand-rolled identity check: verifyToken, or a 401/403 return
					if (firstGuard === -1) {
						let g = GUARDS.find((n) => new RegExp(`\\b${n}\\s*\\(`).test(text));
						if (
							!g &&
							/\b(require|resolve|enforce|assert)[A-Z]\w*\s*\(/.test(text)
						) {
							g =
								text.match(
									/\b((?:require|resolve|enforce|assert)[A-Z]\w*)\s*\(/,
								)?.[1] ?? "require*Helper";
						}
						if (!g && /\bverifyToken\s*\(/.test(text))
							g = "verifyToken (hand-rolled)";
						if (!g && /\.(code|status)\(\s*(401|403)\s*\)/.test(text))
							g = "inline 401/403 reject";
						if (g) {
							firstGuard = i;
							guardName = g;
						}
					}
					// BODY INSPECTION: only a statement that actually reads the request body, or
					// emits a 400. A `.parse()` on a RESPONSE object is not body validation —
					// counting it flagged GET /api/patients falsely on patientSchema.parse(patient).
					if (firstBody === -1) {
						const touchesBody = /\b(request|req)\.body\b/.test(text);
						const emits400 = /\.(code|status)\(\s*400\s*\)/.test(text);
						if (touchesBody || emits400) {
							firstBody = i;
							bodyDetail = [
								touchesBody ? "reads request.body" : null,
								emits400 ? "returns 400" : null,
							]
								.filter(Boolean)
								.join(" + ");
						}
					}
				});
				if (firstBody !== -1 && (firstGuard === -1 || firstBody < firstGuard)) {
					rows.push({
						method,
						routePath,
						file: rel(file),
						line: lineOf(node),
						bodyStmt: firstBody,
						bodyLine: lineOf(stmts[firstBody]),
						bodyDetail,
						guard:
							firstGuard === -1
								? "NO GUARD IN TOP-LEVEL STATEMENTS"
								: `${guardName} @stmt ${firstGuard} line ${lineOf(stmts[firstGuard])}`,
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

const mutating = rows.filter(
	(r) => r.method !== "GET" && r.method !== "OPTIONS",
);
console.log(`inline route handlers examined: ${handlersSeen}`);
console.log(
	`handlers where body inspection / 400 precedes any guard: ${rows.length}`,
);
console.log(
	`  of those mutating (POST/PUT/PATCH/DELETE): ${mutating.length}\n`,
);
for (const r of rows.sort((a, b) =>
	a.method === b.method
		? a.file.localeCompare(b.file)
		: a.method.localeCompare(b.method),
)) {
	console.log(`${r.method} ${r.routePath}`);
	console.log(`  registered ${r.file}:${r.line}`);
	console.log(
		`  body first: line ${r.bodyLine} (stmt ${r.bodyStmt}) - ${r.bodyDetail}`,
	);
	console.log(`  guard:      ${r.guard}\n`);
}
