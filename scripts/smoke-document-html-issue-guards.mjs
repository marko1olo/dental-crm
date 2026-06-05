import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/documents.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentErrorText(body) {
  return String(body.message ?? body.error ?? "");
}

function assertDocumentOperationError(body, label) {
  assert(body.error === "DocumentOperationRejected", `${label} must return stable machine error: ${JSON.stringify(body)}`);
  assert(!/[А-Яа-яЁё]/.test(String(body.error)), `${label} machine error must not contain Russian copy`);
}

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
});
await registerDocumentRoutes(app);

try {
  const missingPayloadHtmlResponse = await app.inject({
    method: "GET",
    url: "/api/documents/f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5/html"
  });
  assert(
    missingPayloadHtmlResponse.statusCode === 409,
    `structured document without payload must not render printable HTML: ${missingPayloadHtmlResponse.statusCode}`
  );
  const missingPayloadHtmlBody = missingPayloadHtmlResponse.json();
  assertDocumentOperationError(missingPayloadHtmlBody, "blocked printable HTML response");
  const missingPayloadHtmlMessage = documentErrorText(missingPayloadHtmlBody);
  assert(
    missingPayloadHtmlMessage.includes("Печатная форма недоступна") && missingPayloadHtmlMessage.includes("структурированные данные"),
    "blocked printable HTML response must explain missing structured payload"
  );

  const missingDocumentHtmlResponse = await app.inject({
    method: "GET",
    url: "/api/documents/00000000-0000-0000-0000-000000000000/html"
  });
  assert(missingDocumentHtmlResponse.statusCode === 404, "missing document HTML must still return 404");
  const missingDocumentHtmlBody = missingDocumentHtmlResponse.json();
  assertDocumentOperationError(missingDocumentHtmlBody, "missing document HTML response");
  assert(documentErrorText(missingDocumentHtmlBody) === "Документ не найден", "missing document HTML response must keep operator message");

  console.log(
    JSON.stringify({
      ok: true,
      blockedPrintableDraftWithoutPayload: missingPayloadHtmlResponse.statusCode,
      missingDocument: missingDocumentHtmlResponse.statusCode
    })
  );
} finally {
  await app.close();
}
