import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8")
].join("\n");
const source = appSource;
const documentsViewSource = readFileSync("apps/web/src/DocumentsView.tsx", "utf8");
const uiLabelsSource = readFileSync("apps/web/src/workspaceUiLabels.ts", "utf8");
const helperIndex = uiLabelsSource.indexOf("function paymentTaxYearForUi");
assert(helperIndex >= 0, "workspaceUiLabels must define fiscal-first paymentTaxYearForUi helper");

const helperBody = uiLabelsSource.slice(helperIndex, uiLabelsSource.indexOf("export function taxPaymentPayerKeyForUi", helperIndex));
assert(
  helperBody.includes("payment.fiscalReceiptIssuedAt || payment.paidAt"),
  "UI tax-year helper must prefer fiscalReceiptIssuedAt before paidAt"
);
assert(
  helperBody.includes("explicitYear") && helperBody.includes("getFullYear()"),
  "UI tax-year helper must parse explicit YYYY before Date fallback"
);
assert(source.includes("paymentTaxYearForUi,"), "App must import the fiscal-first tax-year helper from workspaceUiLabels");

const createDocumentIndex = appSource.indexOf("async function createDocument");
assert(createDocumentIndex >= 0, "createDocument function missing");
const createDocumentBody = appSource.slice(createDocumentIndex, appSource.indexOf("async function", createDocumentIndex + 1));
assert(createDocumentBody.includes("paymentTaxYearForUi(payment) === taxDocumentYear"), "createDocument must use fiscal-first tax year");
assert(!createDocumentBody.includes("payment.paidAt") && !createDocumentBody.includes("paidAt.getFullYear"), "createDocument still uses paidAt-only tax-year logic");
assert(createDocumentBody.includes("selectedTaxPaymentIdsForDocument"), "createDocument must send an explicit fiscal receipt selection");
assert(createDocumentBody.includes("taxPaymentSelection"), "createDocument must store selected receipt ids in document payload");

const payerOptionsIndex = appSource.indexOf("const taxDocumentPayerOptions");
assert(payerOptionsIndex >= 0, "tax payer options memo missing");
const payerOptionsBody = appSource.slice(payerOptionsIndex, appSource.indexOf("const activePaymentsWithReceipts", payerOptionsIndex));
assert(payerOptionsBody.includes("paymentTaxYearForUi(payment)"), "tax payer options must use fiscal-first tax year");
assert(documentsViewSource.includes("document-factory-tax-payments"), "Documents UI must render fiscal receipt checkboxes for tax documents");
assert(source.includes("selectedTaxPaymentIds"), "Documents UI must keep selected fiscal receipt ids in state");

console.log(JSON.stringify({ ok: true, checked: ["paymentTaxYearForUi", "createDocument", "taxDocumentPayerOptions", "taxPaymentSelection"] }));
