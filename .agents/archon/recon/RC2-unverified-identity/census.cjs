// RC2 route-authorization census. READ-ONLY. AST-based, not regex.
// Maps every Fastify route registration in apps/api/src/routes/** to the guard
// idiom actually invoked INSIDE ITS HANDLER BODY (plus preHandler/onRequest).
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const ROUTES = path.join(ROOT, "apps", "api", "src", "routes");

const HTTP = new Set(["get","post","put","patch","delete","head","options","all","route"]);

// Guard idioms, grouped. Order matters for classification precedence.
const TENANT_VERIFIED = new Set([
  "requireOrganizationId","requireResolvedOrganizationId",
  "requireResolvedStaffOrAdminOrganizationId",
  "requireClinicalReadContext","requireClinicalMutationContext",
  "requireStaffIdentity",
]);
const ADMIN_SECRET_ONLY = new Set([
  "requireClinicalReadAccess","requireClinicalMutationAccess",
  "requireNonDoctorAccess","requireSettingsAccess","requireScheduleMutationAccess",
  "requireDicomWebSettingsAccess","requirePayoutAccess",
  "requireTelegramControlPlaneAccess",
]);
const HAND_ROLLED = new Set(["verifyToken"]);
const RAW_IDENTITY = new Set(["getRequestIdentity","resolveOrganizationId"]);
const OTHER_GUARD = new Set([
  "requirePermission","requireClinicToken","requireTls","requirePatientOrVisit",
  "requireWebhookAuth","verifyWebhookSignature","requireDistinguishingData",
]);

function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) walk(n, fn); return; }
  if (typeof node.type === "string") fn(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "comments") continue;
    const v = node[k];
    if (v && typeof v === "object") walk(v, fn);
  }
}

function calleeNames(node) {
  const names = [];
  walk(node, (n) => {
    if (n.type !== "CallExpression" && n.type !== "AwaitExpression") return;
    const c = n.type === "CallExpression" ? n.callee : (n.argument && n.argument.callee);
    if (!c) return;
    if (c.type === "Identifier") names.push(c.name);
    else if (c.type === "MemberExpression" && c.property && c.property.type === "Identifier") names.push(c.property.name);
  });
  return names;
}

function routePathOf(arg) {
  if (!arg) return null;
  if (arg.type === "StringLiteral") return arg.value;
  if (arg.type === "TemplateLiteral") {
    return arg.quasis.map((q, i) => q.value.cooked + (arg.expressions[i] ? "${...}" : "")).join("");
  }
  return null;
}

function collectFiles(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "tests") collectFiles(p, out); continue; }
    if (!e.name.endsWith(".ts")) continue;
    if (e.name.endsWith(".test.ts")) continue;
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
      sourceType: "module", plugins: ["typescript"], errorRecovery: true,
    });
  } catch (err) { parseFailures.push(file + " :: " + err.message); continue; }

  walk(ast, (n) => {
    if (n.type !== "CallExpression") return;
    const c = n.callee;
    if (!c || c.type !== "MemberExpression" || !c.property || c.property.type !== "Identifier") return;
    const method = c.property.name;
    if (!HTTP.has(method)) return;
    const rp = routePathOf(n.arguments[0]);
    if (rp === null) return; // not a route registration

    // handler: last function argument; also scan options object (handler/preHandler/onRequest)
    const fnArgs = n.arguments.filter((a) => a && (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression"));
    const objArgs = n.arguments.filter((a) => a && a.type === "ObjectExpression");
    let handler = fnArgs.length ? fnArgs[fnArgs.length - 1] : null;
    let preGuards = [];
    let schemaOnly = false;
    for (const o of objArgs) {
      for (const p of o.properties || []) {
        if (!p.key) continue;
        const key = p.key.name || p.key.value;
        if (key === "handler" && !handler) handler = p.value;
        if (key === "preHandler" || key === "onRequest" || key === "preValidation") {
          preGuards = preGuards.concat(calleeNames(p.value));
          walk(p.value, (x) => { if (x.type === "Identifier") preGuards.push(x.name); });
        }
        if (key === "schema") schemaOnly = true;
      }
    }
    const names = handler ? calleeNames(handler) : [];
    const all = names.concat(preGuards);
    const found = {
      tenant: all.filter((x) => TENANT_VERIFIED.has(x)),
      adminOnly: all.filter((x) => ADMIN_SECRET_ONLY.has(x)),
      handRolled: all.filter((x) => HAND_ROLLED.has(x)),
      raw: all.filter((x) => RAW_IDENTITY.has(x)),
      other: all.filter((x) => OTHER_GUARD.has(x)),
    };
    let verdict;
    if (found.tenant.length) verdict = "TENANT_VERIFIED";
    else if (found.handRolled.length) verdict = "HAND_ROLLED_TOKEN";
    else if (found.raw.length) verdict = "RAW_IDENTITY_NO_REQUIRE";
    else if (found.adminOnly.length) verdict = "ADMIN_SECRET_GATE_ONLY";
    else if (found.other.length) verdict = "OTHER_GUARD";
    else verdict = "NONE";
    rows.push({
      file: path.relative(ROOT, file).split(path.sep).join("/"),
      line: n.loc ? n.loc.start.line : 0,
      method: method.toUpperCase(),
      route: rp,
      verdict,
      guards: Array.from(new Set(all.filter((x) =>
        TENANT_VERIFIED.has(x) || ADMIN_SECRET_ONLY.has(x) || HAND_ROLLED.has(x) || RAW_IDENTITY.has(x) || OTHER_GUARD.has(x)))).join("+") || "-",
      hasHandler: Boolean(handler),
      schemaOnly,
    });
  });
}

const MUTATING = new Set(["POST","PUT","PATCH","DELETE"]);
rows.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const byVerdict = {};
for (const r of rows) {
  byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
}
const out = {
  totalRegistrations: rows.length,
  files: new Set(rows.map((r) => r.file)).size,
  parseFailures,
  byVerdict,
  mutatingByVerdict: rows.filter((r) => MUTATING.has(r.method))
    .reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {}),
  noHandlerFound: rows.filter((r) => !r.hasHandler).length,
};
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(__dirname, "route-census.json"), JSON.stringify(rows, null, 1), "utf8");
console.log("rows written: route-census.json");
