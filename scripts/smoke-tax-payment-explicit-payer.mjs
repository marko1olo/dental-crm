import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/billing.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const appSourcePath = path.resolve("apps/web/src/App.tsx");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerBillingRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, documents, payments } = await import(pathToFileURL(sampleDataPath).href);
const { createPaymentSchema, documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSourceContains(source, needle, message) {
  assert(source.includes(needle), message);
}

const app = Fastify({ logger: false });
await registerBillingRoutes(app);

const paymentDocument = documents.find(
  (document) =>
    document.patientId === activeVisit.patientId &&
    document.visitId === activeVisit.id &&
    document.status !== "voided" &&
    documentKindMetadata[document.kind].group === "payment"
);
assert(paymentDocument, "fixture must contain an active-visit payment document");

const basePayload = {
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  documentId: paymentDocument.id,
  amountRub: 1234,
  method: "card",
  note: "smoke explicit tax payer"
};

const invalidTaxPayload = {
  ...basePayload,
  fiscalReceiptNumber: "FN-SMOKE-TAX",
  fiscalReceiptIssuedAt: "2026-05-22T10:00:00.000Z",
  taxDeductionCode: "1"
};
assert(
  !createPaymentSchema.safeParse(invalidTaxPayload).success,
  "tax-deduction payment schema must reject inferred payer data"
);

const beforeInvalidCount = payments.length;
const invalidResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: invalidTaxPayload
});
assert(invalidResponse.statusCode === 400, `tax payment without explicit payer must be 400, got ${invalidResponse.statusCode}`);
assert(payments.length === beforeInvalidCount, "invalid tax payment must not mutate payment store");

const ordinaryResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: basePayload
});
assert(ordinaryResponse.statusCode === 201, `ordinary payment without tax payer fields must still pass, got ${ordinaryResponse.statusCode}`);
assert(ordinaryResponse.json().taxDeductionCode === null, "ordinary payment must not become tax-deduction eligible");

const validTaxResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    ...basePayload,
    fiscalReceiptNumber: "FN-SMOKE-TAX-OK",
    fiscalReceiptIssuedAt: "2026-05-22T11:00:00.000Z",
    fiscalReceipt: {
      fn: "9287440300000099",
      fd: "123499",
      fpd: "9876543299",
      cashierName: "Smoke cashier",
      receiptUrl: "https://clinic.example.test/ofd/FN-SMOKE-TAX-OK",
      operationType: "income"
    },
    payerFullName: "Smoke Explicit Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 123456",
    payerRelationship: "patient",
    taxDeductionCode: "2"
  }
});
assert(validTaxResponse.statusCode === 201, `explicit tax payment must pass, got ${validTaxResponse.statusCode}`);
assert(validTaxResponse.json().payerFullName === "Smoke Explicit Payer", "tax payment must preserve explicit payer name");
assert(validTaxResponse.json().payerInn === "123456789012", "tax payment must preserve explicit payer INN");
assert(validTaxResponse.json().taxDeductionCode === "2", "tax payment must preserve explicit deduction code");
assert(validTaxResponse.json().fiscalReceipt?.fn === "9287440300000099", "tax payment must preserve structured fiscal FN");
assert(validTaxResponse.json().fiscalReceiptNumber.includes("FN-SMOKE-TAX-OK"), "explicit fiscal receipt number must stay when provided");

const appSource = [
  await import("node:fs").then((fs) => fs.readFileSync(appSourcePath, "utf8")),
  await import("node:fs").then((fs) => fs.readFileSync("apps/web/src/useAppLogic.tsx", "utf8"))
].join("\n");
assertSourceContains(
  appSource,
  "const taxReadyPaymentRequested = paymentTaxDeductionCode === \"1\" || paymentTaxDeductionCode === \"2\";",
  "UI must detect tax-ready payment mode"
);
assertSourceContains(
  appSource,
  "Данные из карточки пациента не подставляются автоматически.",
  "UI must tell the operator that patient-card fallback is disabled for tax payments"
);
assertSourceContains(
  appSource,
  "payerFullName: taxReadyPaymentRequested ? paymentPayerName : paymentPayerName || documentPatient.fullName",
  "UI must not fallback payer name for tax payments"
);
assertSourceContains(
  appSource,
  "if (!documentPatientMatchesActiveVisit)",
  "UI must block payment when selected finance patient differs from active visit"
);
assertSourceContains(appSource, "const explicitFiscalFn = paymentFiscalFn.trim();", "UI must collect fiscal storage number explicitly");
assertSourceContains(appSource, "fiscalReceipt: {", "UI must submit structured fiscal receipt details");
assertSourceContains(appSource, "Для налоговой оплаты заполните явно", "UI must block incomplete tax-ready payments before API");

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    blockedInvalidTaxPayment: invalidResponse.statusCode,
    ordinaryPaymentId: ordinaryResponse.json().id,
    taxPaymentId: validTaxResponse.json().id
  })
);
