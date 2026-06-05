import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

const routeFiles = {
  documents: path.resolve("apps/api/dist/routes/documents.js"),
  ingestion: path.resolve("apps/api/dist/routes/ingestion.js"),
  pricelist: path.resolve("apps/api/dist/routes/pricelist.js"),
  sampleData: path.resolve("apps/api/dist/sampleData.js")
};

for (const [label, routePath] of Object.entries(routeFiles)) {
  if (!existsSync(routePath)) {
    throw new Error(`Build API first: npm run build -w @dental/api (${label} missing)`);
  }
}

const sourceFiles = {
  documents: readFileSync("apps/api/src/routes/documents.ts", "utf8"),
  ingestion: readFileSync("apps/api/src/routes/ingestion.ts", "utf8"),
  pricelist: readFileSync("apps/api/src/routes/pricelist.ts", "utf8")
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "parsedInput.error.issues[0]?.message",
  "parsedIssueInput.error.issues[0]?.message",
  "parsedVoidInput.error.issues[0]?.message"
].forEach((needle) => {
  assert(!sourceFiles.documents.includes(needle), `document route must not expose zod issue copy: ${needle}`);
});

assert(
  sourceFiles.ingestion.includes("parseIngestionPayload(") &&
    !sourceFiles.ingestion.includes("documentIngestionRequestSchema.parse(request.body)"),
  "ingestion route must use route-owned validation before document extraction"
);
assert(
  sourceFiles.pricelist.includes("parsePricelistPayload(") &&
    !sourceFiles.pricelist.includes("dentalPricelistAnalysisRequestSchema.parse(request.body)"),
  "pricelist route must use route-owned validation before analyzer work"
);
assert(
  !sourceFiles.documents.includes("return { error: repairMojibakeText(message) };"),
  "document route must not put operator copy into the machine error field"
);
assert(
  sourceFiles.documents.includes('error = "DocumentOperationRejected"') &&
    sourceFiles.documents.includes("message: repairMojibakeText(message)"),
  "document route must separate stable operation error code from operator message"
);

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routeFiles.documents).href);
const { registerIngestionRoutes } = await import(pathToFileURL(routeFiles.ingestion).href);
const { registerPricelistRoutes } = await import(pathToFileURL(routeFiles.pricelist).href);
const { activeVisit, payments } = await import(pathToFileURL(routeFiles.sampleData).href);

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({
      error: "ValidationError",
      issues: error.issues
    });
  }
  return reply.send(error);
});
await registerDocumentRoutes(app);
await registerIngestionRoutes(app);
await registerPricelistRoutes(app);

const clinicalHeaders = {
  "x-dente-admin-secret": "synthetic-clinical-secret",
  "content-type": "application/json"
};

const forbiddenValidationTerms =
  /ZodError|too_small|invalid_type|invalid_string|issues|path|code|request\.body|safeParse|patientId|visitId|payload|taxPayerInn|taxYear|signatureAttestation|voidAttestation|fileName|fileBase64|rawText|sourceName|sourceKind|imageBase64|imageMimeType|preferredSpecialty/i;

async function requestJson(options) {
  const response = await app.inject({
    ...options,
    headers: {
      ...clinicalHeaders,
      ...(options.headers ?? {})
    }
  });
  let body;
  try {
    body = response.json();
  } catch {
    body = {};
  }
  return { response, body, text: response.body };
}

function assertRouteValidationResponse(actual, label, expectedMessage) {
  assert(actual.response.statusCode === 400, `${label} must return 400, got ${actual.response.statusCode}: ${actual.text}`);
  assert(actual.body.message === expectedMessage, `${label} must return bounded message, got: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

function assertDocumentOperationResponse(actual, label, expectedStatusCode, expectedMessage) {
  assert(
    actual.response.statusCode === expectedStatusCode,
    `${label} must return ${expectedStatusCode}, got ${actual.response.statusCode}: ${actual.text}`
  );
  assert(actual.body.error === "DocumentOperationRejected", `${label} must return stable machine error, got: ${actual.text}`);
  assert(actual.body.message === expectedMessage, `${label} must return operator message, got: ${actual.text}`);
  assert(!/[А-Яа-яЁё]/.test(String(actual.body.error)), `${label} machine error must not contain Russian copy: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

const createValidationMessage =
  "Документ не создан: выберите пациента, тип документа и заполните обязательные поля формы.";
const issueValidationMessage =
  "Документ не выдан: подтвердите подпись или получение, проверку личности и ответственного сотрудника.";
const voidValidationMessage =
  "Документ не аннулирован: укажите причину, ответственного сотрудника, архив и проверку статуса.";
const ingestionValidationMessage =
  "Файл не разобран: передайте название и файл или текст документа до безопасного лимита.";
const pricelistValidationMessage =
  "Прайс не проверен: передайте текст прайса или изображение до безопасного лимита.";

assertRouteValidationResponse(
  await requestJson({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: "not-a-uuid",
      kind: "tax_deduction_certificate",
      payload: {
        medicalInterventionRefusal: {}
      }
    }
  }),
  "document create invalid payload",
  createValidationMessage
);

const receiptPayment = payments.find(
  (payment) => payment.patientId === activeVisit.patientId && payment.visitId === activeVisit.id && payment.status === "paid" && payment.fiscalReceiptNumber
);
assert(receiptPayment, "fixture paid payment with fiscal receipt missing");

const receiptCreateResponse = await requestJson({
  method: "POST",
  url: "/api/documents",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    kind: "payment_receipt",
    totalAmountRub: 999999,
    payload: {
      paymentReceipt: {
        receiptNumber: "KV-ROUTE-VALIDATION-001",
        receiptDate: "23.05.2026 10:05",
        selectedPaymentIds: [receiptPayment.id],
        totalPaidRub: receiptPayment.amountRub,
        payerFullName: receiptPayment.payerFullName,
        taxSupportRequested: false,
        payerBirthDate: null,
        payerInn: null,
        payerIdentityDocument: null,
        payerRelationship: null,
        paymentPurpose: "route validation smoke",
        fiscalReceiptNumbers: [receiptPayment.fiscalReceiptNumber],
        issuedByFullName: "Smoke Admin",
        paymentAndFiscalDataVerified: true,
        payerIdentityVerified: true,
        receiptDoesNotReplaceFiscalReceipt: true
      }
    }
  }
});
assert(
  receiptCreateResponse.response.statusCode === 201,
  `fixture payment receipt create failed: ${receiptCreateResponse.response.statusCode}: ${receiptCreateResponse.text}`
);
const receiptDocumentId = receiptCreateResponse.body.id;
assert(typeof receiptDocumentId === "string" && receiptDocumentId.length > 0, "created receipt id missing");

assertRouteValidationResponse(
  await requestJson({
    method: "POST",
    url: `/api/documents/${receiptDocumentId}/issue`,
    payload: {}
  }),
  "document issue invalid payload",
  issueValidationMessage
);

assertRouteValidationResponse(
  await requestJson({
    method: "POST",
    url: `/api/documents/${receiptDocumentId}/void`,
    payload: {}
  }),
  "document void invalid payload",
  voidValidationMessage
);

assertDocumentOperationResponse(
  await requestJson({
    method: "GET",
    url: "/api/documents/00000000-0000-0000-0000-000000000000/html"
  }),
  "document missing HTML",
  404,
  "Документ не найден"
);

assertRouteValidationResponse(
  await requestJson({
    method: "POST",
    url: "/api/ingestion/extract",
    payload: {
      fileName: "",
      rawText: ""
    }
  }),
  "document ingestion invalid payload",
  ingestionValidationMessage
);

assertRouteValidationResponse(
  await requestJson({
    method: "POST",
    url: "/api/pricelist/analyze",
    payload: {
      rawText: " "
    }
  }),
  "pricelist invalid payload",
  pricelistValidationMessage
);

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    checkedRoutes: ["documents:create", "documents:issue", "documents:void", "ingestion:extract", "pricelist:analyze"],
    rawValidationHidden: true
  })
);
