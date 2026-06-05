import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

const routePath = path.resolve("apps/api/dist/routes/imaging.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build -w @dental/api");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerImagingRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error?.name === "ZodError" && Array.isArray(error.issues)) {
      return reply.code(400).send({ error: "ValidationError", issues: error.issues });
    }
    return reply.send(error);
  });
  return app;
}

async function injectDicomWebCheck(env, headers = {}, payload = { endpointUrl: "http://127.0.0.1:9/dicom-web" }) {
  const previous = {
    settings: process.env.DENTE_SETTINGS_ADMIN_SECRET,
    clinical: process.env.DENTE_CLINICAL_ADMIN_SECRET
  };
  if ("settings" in env) {
    if (env.settings) process.env.DENTE_SETTINGS_ADMIN_SECRET = env.settings;
    else delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
  }
  if ("clinical" in env) {
    if (env.clinical) process.env.DENTE_CLINICAL_ADMIN_SECRET = env.clinical;
    else delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
  }

  const app = createApp();
  await registerImagingRoutes(app);
  try {
    return await app.inject({
      method: "POST",
      url: "/api/imaging/dicomweb/check",
      headers: {
        "content-type": "application/json",
        ...headers
      },
      payload
    });
  } finally {
    await app.close();
    if (previous.settings) process.env.DENTE_SETTINGS_ADMIN_SECRET = previous.settings;
    else delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
    if (previous.clinical) process.env.DENTE_CLINICAL_ADMIN_SECRET = previous.clinical;
    else delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
  }
}

function assertNoSecretMechanics(response, label) {
  assert(
    !/DENTE_|x-dente-admin-secret|DICOMWEB_BEARER_TOKEN|DICOMWEB_BASIC_AUTH|Authorization/i.test(response.body),
    `${label} leaked raw env/header/auth mechanics: ${response.body}`
  );
}

const missingSettingsSecret = await injectDicomWebCheck(
  { settings: "", clinical: "synthetic-clinical-secret" },
  { "x-dente-admin-secret": "synthetic-clinical-secret" }
);
assert(
  missingSettingsSecret.statusCode === 503,
  `DICOMweb check must fail closed when settings admin secret is not configured: ${missingSettingsSecret.statusCode}`
);
assert(missingSettingsSecret.json().error === "DicomWebSettingsAdminSecretMissing", "DICOMweb check must use settings-domain missing-secret code");
assertNoSecretMechanics(missingSettingsSecret, "missing settings secret");

const wrongSettingsSecret = await injectDicomWebCheck(
  { settings: "synthetic-settings-secret", clinical: "synthetic-clinical-secret" },
  { "x-dente-admin-secret": "synthetic-clinical-secret" }
);
assert(
  wrongSettingsSecret.statusCode === 403,
  `DICOMweb check must not accept clinical-only secret for settings connector work: ${wrongSettingsSecret.statusCode}`
);
assert(wrongSettingsSecret.json().error === "DicomWebSettingsAdminSecretRequired", "DICOMweb check must use settings-domain required-secret code");
assertNoSecretMechanics(wrongSettingsSecret, "wrong settings secret");

const validSettingsSecret = await injectDicomWebCheck(
  { settings: "synthetic-settings-secret", clinical: "synthetic-clinical-secret" },
  { "x-dente-admin-secret": "synthetic-settings-secret" },
  { endpointUrl: "not-url" }
);
assert(validSettingsSecret.statusCode === 400, `valid settings secret must reach route validation: ${validSettingsSecret.statusCode}`);
assert(!Object.hasOwn(validSettingsSecret.json(), "issues"), "DICOMweb validation must not expose raw zod issues");
assertNoSecretMechanics(validSettingsSecret, "valid settings secret validation");

delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
delete process.env.NODE_ENV;

console.log(
  JSON.stringify({
    ok: true,
    settingsSecretRequired: true,
    clinicalSecretRejected: true,
    rawSecretMechanicsHidden: true
  })
);
