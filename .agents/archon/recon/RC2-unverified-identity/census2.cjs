// RC2 route-authorization census v2. READ-ONLY.
// v1 defect (found by reading reports.ts): guards reached through a LOCAL helper
// (e.g. scopeFor -> requireClinicalReadContext) were invisible, so 9 guarded
// report routes were reported as NONE. v2 resolves local functions transitively
// and resolves handlers passed by identifier.
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const ROUTES = path.join(ROOT, "apps", "api", "src", "routes");
const HTTP = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"head",
	"options",
	"all",
	"route",
]);

const TENANT_VERIFIED = new Set([
	"requireOrganizationId",
	"requireResolvedOrganizationId",
	"requireResolvedStaffOrAdminOrganizationId",
	"requireClinicalReadContext",
	"requireClinicalMutationContext",
	"requireStaffIdentity",
]);
const ADMIN_SECRET_ONLY = new Set([
	"requireClinicalReadAccess",
	"requireClinicalMutationAccess",
	"requireNonDoctorAccess",
	"requireSettingsAccess",
	"requireScheduleMutationAccess",
	"requireDicomWebSettingsAccess",
	"requirePayoutAccess",
	"requireTelegramControlPlaneAccess",
]);
const HAND_ROLLED = new Set(["verifyToken"]);
const RAW_IDENTITY = new Set(["getRequestIdentity", "resolveOrganizationId"]);
const OTHER_GUARD = new Set([
	"requirePermission",
	"requireClinicToken",
	"requireTls",
	"requirePatientOrVisit",
	"requireWebhookAuth",
	"verifyWebhookSignature",
	"requireDistinguishingData",
	"assertWebhookSecret",
	"verifyWebhookSecret",
]);
const ALL_GUARDS = new Set([
	...TENANT_VERIFIED,
	...ADMIN_SECRET_ONLY,
	...HAND_ROLLED,
	...RAW_IDENTITY,
	...OTHER_GUARD,
]);

function walk(node, fn) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const n of node) walk(n, fn);
		return;
	}
	if (typeof node.type === "string") fn(node);
	for (const k of Object.keys(node)) {
		if (
			k === "loc" ||
			k === "leadingComments" ||
			k === "trailingComments" ||
			k === "comments"
		)
			continue;
		const v = node[k];
		if (v && typeof v === "object") walk(v, fn);
	}
}
function isFn(n) {
	return (
		n &&
		(n.type === "ArrowFunctionExpression" ||
			n.type === "FunctionExpression" ||
			n.type === "FunctionDeclaration")
	);
}

function localFunctionMap(ast) {
	const map = new Map();
	walk(ast, (n) => {
		if (n.type === "FunctionDeclaration" && n.id) map.set(n.id.name, n);
		if (
			n.type === "VariableDeclarator" &&
			n.id &&
			n.id.type === "Identifier" &&
			isFn(n.init)
		)
			map.set(n.id.name, n.init);
	});
	return map;
}

// Transitively collect called names, descending into local helpers.
function resolvedCalleeNames(node, locals, depth, seen) {
	const out = [];
	if (!node || depth > 5) return out;
	const direct = [];
	walk(node, (n) => {
		if (n.type !== "CallExpression") return;
		const c = n.callee;
		if (!c) return;
		if (c.type === "Identifier") direct.push(c.name);
		else if (
			c.type === "MemberExpression" &&
			c.property &&
			c.property.type === "Identifier"
		)
			direct.push(c.property.name);
	});
	for (const name of direct) {
		out.push(name);
		if (locals.has(name) && !seen.has(name)) {
			seen.add(name);
			out.push(
				...resolvedCalleeNames(locals.get(name), locals, depth + 1, seen),
			);
		}
	}
	return out;
}

// Does the handler unconditionally reply 4xx/5xx (deny-all stub)?
function isDenyAll(node) {
	if (!node) return false;
	let sends = 0,
		statuses = [];
	walk(node, (n) => {
		if (n.type !== "CallExpression") return;
		const c = n.callee;
		if (
			c &&
			c.type === "MemberExpression" &&
			c.property &&
			(c.property.name === "status" || c.property.name === "code")
		) {
			const a = n.arguments[0];
			if (a && a.type === "NumericLiteral") statuses.push(a.value);
		}
		if (
			c &&
			c.type === "MemberExpression" &&
			c.property &&
			c.property.name === "send"
		)
			sends++;
	});
	return sends > 0 && statuses.length > 0 && statuses.every((s) => s >= 400);
}

function routePathOf(arg) {
	if (!arg) return null;
	if (arg.type === "StringLiteral") return arg.value;
	if (arg.type === "TemplateLiteral")
		return arg.quasis
			.map((q, i) => q.value.cooked + (arg.expressions[i] ? "${...}" : ""))
			.join("");
	return null;
}
function collectFiles(dir, out) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			if (e.name !== "tests") collectFiles(p, out);
			continue;
		}
		if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) continue;
		out.push(p);
	}
	return out;
}

const rows = [];
const parseFailures = [];
for (const file of collectFiles(ROUTES, [])) {
	let ast;
	try {
		ast = parser.parse(fs.readFileSync(file, "utf8"), {
			sourceType: "module",
			plugins: ["typescript"],
			errorRecovery: true,
		});
	} catch (err) {
		parseFailures.push(file + " :: " + err.message);
		continue;
	}
	const locals = localFunctionMap(ast);

	walk(ast, (n) => {
		if (n.type !== "CallExpression") return;
		const c = n.callee;
		if (
			!c ||
			c.type !== "MemberExpression" ||
			!c.property ||
			c.property.type !== "Identifier"
		)
			return;
		if (!HTTP.has(c.property.name)) return;
		const rp = routePathOf(n.arguments[0]);
		if (rp === null) return;

		let handler = null,
			resolvedVia = "inline";
		const fnArgs = n.arguments.filter(isFn);
		if (fnArgs.length) handler = fnArgs[fnArgs.length - 1];
		const preGuards = [];
		for (const o of n.arguments.filter(
			(a) => a && a.type === "ObjectExpression",
		)) {
			for (const p of o.properties || []) {
				if (!p.key) continue;
				const key = p.key.name || p.key.value;
				if (key === "handler" && !handler) {
					handler = p.value;
					resolvedVia = "options.handler";
				}
				if (
					key === "preHandler" ||
					key === "onRequest" ||
					key === "preValidation"
				) {
					walk(p.value, (x) => {
						if (x.type === "Identifier") preGuards.push(x.name);
					});
				}
			}
		}
		// handler passed by identifier reference
		if (!handler) {
			for (let i = n.arguments.length - 1; i >= 1; i--) {
				const a = n.arguments[i];
				if (a && a.type === "Identifier" && locals.has(a.name)) {
					handler = locals.get(a.name);
					resolvedVia = "identifier:" + a.name;
					break;
				}
			}
		}
		const names = handler
			? resolvedCalleeNames(handler, locals, 0, new Set())
			: [];
		const all = names.concat(preGuards);
		const hit = (s) => all.filter((x) => s.has(x));
		let verdict;
		if (hit(TENANT_VERIFIED).length) verdict = "TENANT_VERIFIED";
		else if (hit(HAND_ROLLED).length) verdict = "HAND_ROLLED_TOKEN";
		else if (hit(RAW_IDENTITY).length) verdict = "RAW_IDENTITY_NO_REQUIRE";
		else if (hit(ADMIN_SECRET_ONLY).length) verdict = "ADMIN_SECRET_GATE_ONLY";
		else if (hit(OTHER_GUARD).length) verdict = "OTHER_GUARD";
		else if (isDenyAll(handler)) verdict = "DENY_ALL_STUB";
		else verdict = "NONE";
		rows.push({
			file: path.relative(ROOT, file).split(path.sep).join("/"),
			line: n.loc ? n.loc.start.line : 0,
			method: c.property.name.toUpperCase(),
			route: rp,
			verdict,
			guards:
				Array.from(new Set(all.filter((x) => ALL_GUARDS.has(x)))).join("+") ||
				"-",
			handler: handler ? resolvedVia : "NOT-FOUND",
		});
	});
}
rows.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const MUT = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const tally = (rs) =>
	rs.reduce((a, r) => {
		a[r.verdict] = (a[r.verdict] || 0) + 1;
		return a;
	}, {});
console.log(
	JSON.stringify(
		{
			totalRegistrations: rows.length,
			files: new Set(rows.map((r) => r.file)).size,
			parseFailures,
			byVerdict: tally(rows),
			mutating: tally(rows.filter((r) => MUT.has(r.method))),
			handlerNotFound: rows.filter((r) => r.handler === "NOT-FOUND").length,
		},
		null,
		2,
	),
);
fs.writeFileSync(
	path.join(__dirname, "route-census.json"),
	JSON.stringify(rows, null, 1),
	"utf8",
);
