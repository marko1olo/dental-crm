import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/billing.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");
const billingRouteSource = readFileSync("apps/api/src/routes/billing.ts", "utf8");

if (!existsSync(routePath) || !existsSync(sampleDataPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerBillingRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, createGeneratedDocument, createPayment, documents } = await import(pathToFileURL(sampleDataPath).href);
const { createPaymentSchema, documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(billingRouteSource.includes("BillingPaymentScopeError"), "billing route must keep a stable payment scope error code");
assert(billingRouteSource.includes("sendBillingPaymentScopeError"), "billing route must use one payment scope response helper");
assert(
  billingRouteSource.includes('documentKind !== "payment_refund_correction_request"'),
  "billing route must not accept refund/correction request documents as new incoming payments"
);
assert(
  !/send\(\{\s*error:\s*"(?:Пациент|Визит|Документ|К аннулированному|Оплату можно)/u.test(billingRouteSource),
  "billing route must not put human scope/link copy directly into the error field"
);

function assertBillingScopeError(response, expectedStatusCode, expectedText, label) {
  assert(response.statusCode === expectedStatusCode, `${label} status mismatch: ${response.statusCode}`);
  const body = response.json();
  assert(body.error === "BillingPaymentScopeError", `${label} error code mismatch: ${response.body}`);
  assert(typeof body.message === "string" && body.message.includes(expectedText), `${label} message mismatch: ${response.body}`);
  assert(
    !/patientId|visitId|documentId|amountRub|request\.body|safeParse|undefined|null|issues|ZodError/i.test(response.body),
    `${label} leaked billing route internals: ${response.body}`
  );
}

const app = Fastify({ logger: false });
await registerBillingRoutes(app);

const validDocument = documents.find(
  (document) =>
    document.patientId === activeVisit.patientId &&
    document.visitId === activeVisit.id &&
    document.status !== "voided" &&
    documentKindMetadata[document.kind].group === "payment" &&
    document.kind !== "payment_refund_correction_request"
);
const nonFinancialDocument = createGeneratedDocument({
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  kind: "informed_consent",
  title: "Smoke non-financial consent"
});
const refundCorrectionDocument = createGeneratedDocument({
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  kind: "payment_refund_correction_request",
  title: "Smoke refund correction request"
});
const otherPatientDocument = documents.find((document) => document.patientId !== activeVisit.patientId);

assert(validDocument, "fixture must contain an active-visit document");
assert(nonFinancialDocument, "fixture must contain an active-visit non-financial document");
assert(refundCorrectionDocument, "fixture must contain a refund/correction request document");
assert(otherPatientDocument, "fixture must contain another patient's document");

const validResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    documentId: validDocument.id,
    amountRub: 1000,
    method: "card",
    note: "smoke valid document link"
  }
});
assert(validResponse.statusCode === 201, `valid linked payment failed: ${validResponse.statusCode}`);
assert(validResponse.json().documentId === validDocument.id, "valid payment must keep selected document link");
assert(validResponse.json().visitId === activeVisit.id, "valid linked payment must keep explicit visit link");
assert(validResponse.json().taxDeductionCode === null, "payment API must not invent tax deduction service code");

const inheritedVisitResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    documentId: validDocument.id,
    amountRub: 1000,
    method: "card",
    note: "smoke inherited document visit link"
  }
});
assert(inheritedVisitResponse.statusCode === 201, `document-linked payment without visit failed: ${inheritedVisitResponse.statusCode}`);
assert(inheritedVisitResponse.json().visitId === validDocument.visitId, "document-linked payment must inherit the document visit");

const unknownPatientResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: "11111111-1111-4111-8111-111111111111",
    amountRub: 1000,
    method: "card",
    note: "smoke unknown patient payment"
  }
});
assertBillingScopeError(unknownPatientResponse, 404, "Пациент для оплаты не найден", "unknown payment patient");

const unknownVisitResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: "22222222-2222-4222-8222-222222222222",
    amountRub: 1000,
    method: "card",
    note: "smoke unknown visit payment"
  }
});
assertBillingScopeError(unknownVisitResponse, 404, "Прием для оплаты не найден", "unknown payment visit");

const unknownDocumentResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    documentId: "33333333-3333-4333-8333-333333333333",
    amountRub: 1000,
    method: "card",
    note: "smoke unknown document payment"
  }
});
assertBillingScopeError(unknownDocumentResponse, 404, "Документ для оплаты не найден", "unknown payment document");

const wrongPatientResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    documentId: otherPatientDocument.id,
    amountRub: 1000,
    method: "card",
    note: "smoke invalid document link"
  }
});
assertBillingScopeError(wrongPatientResponse, 409, "другому пациенту", "wrong-patient document link");

const nonFinancialDocumentResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    documentId: nonFinancialDocument.id,
    amountRub: 1000,
    method: "card",
    note: "smoke invalid non-financial document link"
  }
});
assertBillingScopeError(nonFinancialDocumentResponse, 409, "финансовый документ", "non-financial document link");

const refundCorrectionDocumentResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    documentId: refundCorrectionDocument.id,
    amountRub: 1000,
    method: "card",
    note: "smoke refund correction cannot receive new incoming payment"
  }
});
assertBillingScopeError(refundCorrectionDocumentResponse, 409, "коррекцию не принимает новую оплату", "refund/correction document payment link");
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 0,
    method: "card"
  }).success,
  "zero-ruble paid records must be rejected at input validation"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptIssuedAt: "today"
  }).success,
  "payment schema must reject non-date fiscal receipt dates"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptIssuedAt: "2026-02-31T00:00:00Z"
  }).success,
  "payment schema must reject normalized impossible ISO fiscal receipt dates"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptIssuedAt: "31.02.2026"
  }).success,
  "payment schema must reject impossible Russian fiscal receipt dates"
);
assert(
  createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptIssuedAt: "29.02.2028"
  }).success,
  "payment schema must allow real leap-day fiscal receipt dates"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    payerBirthDate: "2026-02-31"
  }).success,
  "payment schema must reject impossible payer birth dates"
);
const russianPayerBirthDateSchemaResult = createPaymentSchema.safeParse({
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  amountRub: 1000,
  method: "card",
  payerBirthDate: "04.03.1988"
});
assert(russianPayerBirthDateSchemaResult.success, "payment schema must allow Russian payer birth dates");
assert(
  russianPayerBirthDateSchemaResult.success && russianPayerBirthDateSchemaResult.data.payerBirthDate === "1988-03-04",
  "payment schema must normalize Russian payer birth dates to ISO"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptUrl: "ftp://clinic.example.test/fiscal/FN-SMOKE"
  }).success,
  "payment schema must reject non-http OFD receipt links"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceipt: {
      receiptUrl: "ftp://clinic.example.test/fiscal/FN-SMOKE",
      operationType: "income"
    }
  }).success,
  "payment schema must reject non-http structured receipt links"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/top",
    fiscalReceipt: {
      receiptUrl: "https://clinic.example.test/fiscal/structured",
      operationType: "income"
    }
  }).success,
  "payment schema must reject conflicting OFD receipt links"
);
assert(
  !createPaymentSchema.safeParse({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceipt: {
      fn: "9287440300000001",
      fd: "12345",
      fpd: "6789012345",
      operationType: "income_return"
    }
  }).success,
  "payment schema must reject return fiscal receipts in paid payment creation"
);

const invalidPayerBirthDateResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    payerBirthDate: "31.02.2026"
  }
});
assert(
  invalidPayerBirthDateResponse.statusCode === 400,
  `impossible payer birth date must be blocked at API: ${invalidPayerBirthDateResponse.statusCode}`
);

const returnReceiptResponse = await app.inject({
  method: "POST",
  url: "/api/billing/payments",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceipt: {
      fn: "9287440300000001",
      fd: "12345",
      fpd: "6789012345",
      operationType: "income_return"
    }
  }
});
assert(returnReceiptResponse.statusCode === 400, `return fiscal receipt must be blocked at API: ${returnReceiptResponse.statusCode}`);

let directReturnReceiptRejected = false;
try {
  createPayment({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    fiscalReceipt: {
      fn: "9287440300000001",
      fd: "12345",
      fpd: "6789012345",
      operationType: "income_return"
    }
  });
} catch (error) {
  directReturnReceiptRejected = error instanceof Error && error.message.includes("Возвратный фискальный чек");
}
assert(directReturnReceiptRejected, "domain createPayment must reject return fiscal receipts for paid payment creation");

let directImpossiblePayerBirthDateRejected = false;
try {
  createPayment({
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    amountRub: 1000,
    method: "card",
    payerBirthDate: "2026-02-31"
  });
} catch (error) {
  directImpossiblePayerBirthDateRejected = error instanceof Error && error.message.includes("Дата рождения плательщика");
}
assert(directImpossiblePayerBirthDateRejected, "domain createPayment must reject impossible payer birth dates");

const directRussianPayerBirthDatePayment = createPayment({
  patientId: activeVisit.patientId,
  visitId: activeVisit.id,
  amountRub: 1000,
  method: "card",
  payerBirthDate: "05.04.1988"
});
assert(
  directRussianPayerBirthDatePayment.payerBirthDate === "1988-04-05",
  "domain createPayment must normalize Russian payer birth dates"
);

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    validDocumentId: validDocument.id,
    inheritedVisitId: inheritedVisitResponse.json().visitId,
    blockedWrongPatient: wrongPatientResponse.statusCode,
    blockedNonFinancialDocument: nonFinancialDocumentResponse.statusCode,
    blockedRefundCorrectionDocument: refundCorrectionDocumentResponse.statusCode
  })
);
