import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

const routePath = path.resolve("apps/api/dist/routes/clinical.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sharedPath)) {
  throw new Error("Build first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerClinicalRoutes } = await import(pathToFileURL(routePath).href);
const { createClinicalRuleSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const baseRule = {
  title: "Rule title",
  category: "therapy",
  specialty: "therapist",
  action: "show_warning",
  severity: "warning",
  ownerRole: "doctor",
  triggerServiceIds: ["svc-therapy-caries"],
  warningText: "Clinical warning",
  patientText: "Patient explanation"
};

assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, title: "   " }).success,
  "clinical rule contract must reject blank titles"
);
assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, warningText: "   " }).success,
  "clinical rule contract must reject blank clinical warnings"
);
assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, patientText: "   " }).success,
  "clinical rule contract must reject blank patient messages"
);
assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, triggerServiceIds: ["   "] }).success,
  "clinical rule contract must reject blank trigger services"
);
assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, action: "add_required_service", requiredServiceIds: [] }).success,
  "add-required clinical rule must name required services"
);
assert(
  !createClinicalRuleSchema.safeParse({ ...baseRule, action: "block_service", blockedServiceIds: [], requiresCompletedServiceIds: [] }).success,
  "blocking clinical rule must name a blocked or prerequisite service"
);

const trimmed = createClinicalRuleSchema.parse({
  ...baseRule,
  title: "  Trimmed rule  ",
  triggerServiceIds: ["  svc-therapy-caries  "],
  condition: "  Check isolation  ",
  warningText: "  Warn doctor  ",
  patientText: "  Tell patient  "
});
assert(trimmed.title === "Trimmed rule", "clinical rule contract must trim titles");
assert(trimmed.triggerServiceIds[0] === "svc-therapy-caries", "clinical rule contract must trim service ids");
assert(trimmed.condition === "Check isolation", "clinical rule contract must trim conditions");
assert(trimmed.warningText === "Warn doctor", "clinical rule contract must trim warnings");
assert(trimmed.patientText === "Tell patient", "clinical rule contract must trim patient messages");

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
});
await registerClinicalRoutes(app);

const headers = { "x-dente-admin-secret": "synthetic-clinical-secret" };
const invalidCreate = await app.inject({
  method: "POST",
  url: "/api/clinical/rules",
  headers,
  payload: { ...baseRule, title: "   " }
});
assert(invalidCreate.statusCode === 400, `blank clinical rule create must fail with 400, got ${invalidCreate.statusCode}`);

const createResponse = await app.inject({
  method: "POST",
  url: "/api/clinical/rules",
  headers,
  payload: {
    ...baseRule,
    title: "  API trimmed rule  ",
    triggerServiceIds: [" svc-therapy-caries ", "svc-therapy-caries"],
    warningText: "  API warning  ",
    patientText: "  API patient text  "
  }
});
assert(createResponse.statusCode === 200, `valid clinical rule create failed: ${createResponse.statusCode}`);
const created = createResponse.json();
assert(created.title === "API trimmed rule", "API create must store trimmed clinical rule title");
assert(created.triggerServiceIds.length === 1, "API create must deduplicate trigger services");
assert(created.warningText === "API warning", "API create must store trimmed clinical warning");
assert(created.patientText === "API patient text", "API create must store trimmed patient text");

const invalidPatch = await app.inject({
  method: "PATCH",
  url: `/api/clinical/rules/${created.id}`,
  headers,
  payload: {
    action: "add_required_service",
    requiredServiceIds: []
  }
});
assert(invalidPatch.statusCode === 400, `partial update must not create action without payload, got ${invalidPatch.statusCode}`);

const validPatch = await app.inject({
  method: "PATCH",
  url: `/api/clinical/rules/${created.id}`,
  headers,
  payload: {
    action: "add_required_service",
    requiredServiceIds: [" svc-therapy-cofferdam "],
    active: false
  }
});
assert(validPatch.statusCode === 200, `valid clinical rule patch failed: ${validPatch.statusCode}`);
const patched = validPatch.json();
assert(patched.requiredServiceIds[0] === "svc-therapy-cofferdam", "API patch must trim required service ids");
assert(patched.active === false, "API patch must preserve explicit false active state");

console.log(
  JSON.stringify({
    ok: true,
    checked: "clinical rule contract",
    createdRuleId: created.id
  })
);
