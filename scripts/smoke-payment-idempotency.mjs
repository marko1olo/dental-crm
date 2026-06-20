import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/billing.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const billingRouteSource = readFileSync("apps/api/src/routes/billing.ts", "utf8");
const sampleDataSource = readFileSync("apps/api/src/sampleData.ts", "utf8");
const sharedSource = readFileSync("packages/shared/src/index.ts", "utf8");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build shared and API first: npm run build -w @dental/shared && npm run build -w @dental/api");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(sharedSource.includes("clientMutationId: z.string().nullable().optional()"), "payment response schema must expose clientMutationId");
assert(sharedSource.includes("clientMutationId: z.string().trim().min(1).max(120).nullable().optional()"), "payment create schema must accept a bounded clientMutationId");
assert(sampleDataSource.includes("findPaymentByClientMutationId"), "payment state owner must expose clientMutationId lookup");
assert(sampleDataSource.includes("payment.clientMutationId === normalizedClientMutationId"), "payment lookup must match stored clientMutationId");
assert(sampleDataSource.includes("const clientMutationId = input.clientMutationId?.trim() || null"), "payment creation must normalize clientMutationId before storage");
assert(sampleDataSource.includes("clientMutationId,"), "payment creation must persist normalized clientMutationId");
assert(billingRouteSource.includes("findPaymentByClientMutationId(input.clientMutationId)"), "billing route must check clientMutationId before appending payment");
assert(billingRouteSource.includes("existingPayment.patientId !== input.patientId"), "duplicate operation ids must stay scoped to the same patient");
assert(billingRouteSource.includes("reply.code(200).send(paymentSchema.parse(existingPayment))"), "duplicate payment retry must return the existing payment");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerBillingRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, documents, patients, payments } = await import(pathToFileURL(sampleDataPath).href);
const { documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

const app = Fastify({ logger: false });
await registerBillingRoutes(app);

const validDocument = documents.find(
  (document) =>
    document.patientId === activeVisit.patientId &&
    document.visitId === activeVisit.id &&
    document.status !== "voided" &&
    documentKindMetadata[document.kind].group === "payment"
);
assert(validDocument, "fixture must contain an active-visit financial document");

const clientMutationId = "payment-idempotency-smoke-001";
const initialPaymentCount = payments.length;
const payload = {
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  documentId: validDocument.id,
  amountRub: 1234,
  method: "card",
  clientMutationId,
  note: "payment idempotency smoke"
};

const firstResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload
});
assert(firstResponse.statusCode === 201, `first payment must append: ${firstResponse.statusCode} ${firstResponse.body}`);
const firstPayment = firstResponse.json();
assert(firstPayment.clientMutationId === clientMutationId, "first payment must return the stored clientMutationId");
assert(payments.length === initialPaymentCount + 1, "first payment must append exactly one ledger row");

const retryResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload
});
assert(retryResponse.statusCode === 200, `duplicate retry must return existing payment: ${retryResponse.statusCode} ${retryResponse.body}`);
const retryPayment = retryResponse.json();
assert(retryPayment.id === firstPayment.id, "duplicate retry must return the original payment id");
assert(retryPayment.amountRub === firstPayment.amountRub, "duplicate retry must return the original amount");
assert(payments.length === initialPaymentCount + 1, "duplicate retry must not append a second ledger row");

const changedPayloadRetryResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    ...payload,
    amountRub: 9876,
    note: "changed retry must not append"
  }
});
assert(changedPayloadRetryResponse.statusCode === 200, "changed retry with same clientMutationId must return existing payment");
assert(changedPayloadRetryResponse.json().id === firstPayment.id, "changed retry must keep the original payment id");
assert(changedPayloadRetryResponse.json().amountRub === 1234, "changed retry must keep the original amount");
assert(payments.length === initialPaymentCount + 1, "changed retry must not append a second ledger row");

const otherPatient = patients.find((patient) => patient.id !== activeVisit.patientId);
assert(otherPatient, "fixture must contain a second patient for scope testing");
const crossPatientRetryResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    ...payload,
    patientId: otherPatient.id,
    visitId: null,
    documentId: null,
    amountRub: 5555,
    note: "same operation id must not cross patients"
  }
});
assert(crossPatientRetryResponse.statusCode === 409, "same clientMutationId for another patient must be blocked");
assert(payments.length === initialPaymentCount + 1, "cross-patient operation id reuse must not append a ledger row");

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    clientMutationId,
    paymentId: firstPayment.id,
    paymentCount: payments.length,
    duplicateStatus: retryResponse.statusCode
  })
);
