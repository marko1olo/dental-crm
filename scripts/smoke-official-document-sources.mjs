import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const manifestPath = path.resolve("docs/legal-sources/fns-knd-1151156.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sharedPath = path.resolve("packages/shared/dist/index.js");
const sharedSource = readFileSync(path.resolve("packages/shared/src/index.ts"), "utf8");
const docsSource = readFileSync(path.resolve("docs/12-document-generation-forms.md"), "utf8");
const readmeSource = readFileSync(path.resolve("README.md"), "utf8");
const packageJson = JSON.parse(readFileSync(path.resolve("package.json"), "utf8"));

const { documentKindMetadata } = await import(pathToFileURL(sharedPath).href);

const expectedAttachmentIds = new Set([
  "appendix1_form_pdf",
  "appendix2_fill_rules_docx",
  "appendix3_electronic_format_doc",
  "appendix4_submission_rules_docx",
  "xsd_schema"
]);
const sha256Pattern = /^[a-f0-9]{64}$/;

assert(manifest.id === "fns-knd-1151156-ea-7-11-824-2023", "FNS KND manifest id changed");
assert(manifest.status === "source_pinned_not_submission_ready", "FNS KND manifest must not imply submission readiness");
assert(manifest.checkedAt === "2026-05-25", "FNS KND manifest check date must match the latest official-source audit");
assert(manifest.sourcePage === "https://www.nalog.gov.ru/rn77/about_fts/docs/14112883/", "FNS KND order source page is wrong");
assert(manifest.sourcePageUpdatedAt === "2026-05-25", "FNS KND page update date must be recorded");
assert(manifest.orderNumber === "EA-7-11/824@", "FNS KND order number is wrong");
assert(manifest.printFormKnd === "1151156", "printed KND must stay 1151156");
assert(manifest.electronicXmlKnd === "1184043", "electronic XML KND must stay 1184043");
assert(manifest.xsdVersion === "5.01", "FNS XSD version must stay 5.01");
assert(String(manifest.denteBoundary?.notImplemented ?? "").includes("official FNS XSD validator"), "manifest must state that DENTE has no official XSD validator yet");
assert(String(manifest.denteBoundary?.notImplemented ?? "").includes("EDO/TKS"), "manifest must state that EDO/TKS submission is not implemented");
assert(Array.isArray(manifest.attachments), "FNS KND manifest attachments must be an array");
assert(manifest.attachments.length === expectedAttachmentIds.size, "FNS KND manifest must pin appendices 1-4 and XSD");

const byId = new Map();
for (const attachment of manifest.attachments) {
  assert(expectedAttachmentIds.has(attachment.id), `unexpected FNS KND attachment id: ${attachment.id}`);
  assert(!byId.has(attachment.id), `duplicate FNS KND attachment id: ${attachment.id}`);
  assert(/^https:\/\/www\.nalog\.gov\.ru\/html\/sites\/www\.new\.nalog\.ru\/2023\/about_fts\/docs_fts\//.test(attachment.url), `${attachment.id}: URL must be pinned to the official FNS attachment path`);
  assert(attachment.url.endsWith(attachment.fileName), `${attachment.id}: URL and fileName mismatch`);
  assert(Number.isInteger(attachment.bytes) && attachment.bytes > 1000, `${attachment.id}: byte size is missing`);
  assert(sha256Pattern.test(attachment.sha256), `${attachment.id}: sha256 is missing or malformed`);
  byId.set(attachment.id, attachment);
}

const formPdf = byId.get("appendix1_form_pdf");
const xsd = byId.get("xsd_schema");
const fnsMedicalDeductionRulesSourceUrl = "https://www.nalog.gov.ru/rn77/fl/interest/tax_deduction/fl_medik/";
const fnsKnd1151156FillingSourceUrl = "https://www.nalog.gov.ru/rn39/ifns/ob9/info/15134030/";
assert(formPdf.fileName === "pril1_14112883.pdf", "KND form PDF filename changed");
assert(formPdf.sha256 === "520bee5e688f6dc1da4c8edf109e07409a90fd9791af999a9d551fc7824500d2", "KND form PDF hash changed");
assert(xsd.fileName === "UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd", "KND XSD filename changed");
assert(xsd.sha256 === "c6f4b26841436853add552324a690c8cee0d9f66072d750cb502098839a1ec83", "KND XSD hash changed");

const taxMetadata = documentKindMetadata.tax_deduction_certificate;
assert(taxMetadata, "tax_deduction_certificate metadata is missing");
assert(taxMetadata.sourceUrls.includes(manifest.sourcePage), "tax document metadata lost the FNS order source page");
assert(taxMetadata.sourceUrls.includes(formPdf.url), "tax document metadata lost the FNS KND form PDF source");
assert(taxMetadata.sourceUrls.includes(xsd.url), "tax document metadata lost the FNS XSD source");

assert(sharedSource.includes("fnsKnd1151156XsdSourceUrl"), "shared metadata must name the FNS KND XSD source constant");
assert(sharedSource.includes(xsd.url), "shared metadata must include the official FNS XSD URL");
assert(sharedSource.includes(fnsMedicalDeductionRulesSourceUrl), "shared metadata must include the canonical FNS medical deduction URL");
assert(sharedSource.includes(fnsKnd1151156FillingSourceUrl), "shared metadata must include the canonical FNS KND filling note URL");
assert(docsSource.includes("docs/legal-sources/fns-knd-1151156.json"), "document-generation docs must link the FNS KND source manifest");
assert(docsSource.includes(xsd.url), "document-generation docs must show the official FNS XSD URL");
assert(docsSource.includes(fnsMedicalDeductionRulesSourceUrl), "document-generation docs must use the canonical FNS medical deduction URL");
assert(docsSource.includes(fnsKnd1151156FillingSourceUrl), "document-generation docs must use the canonical FNS KND filling note URL");
assert(!docsSource.includes("soc_nv_pm"), "document-generation docs must not keep the old FNS medical deduction path");
assert(!docsSource.includes("imns39_08/info/15134030"), "document-generation docs must not keep the stale regional FNS filling-note path");
assert(docsSource.includes("XSD 5.01"), "document-generation docs must name the XSD 5.01 source boundary");
assert(
  docsSource.includes(`Source checks verified again on ${manifest.checkedAt}:`),
  "document-generation docs must show the same official-source check date as the pinned manifest"
);
assert(readmeSource.includes("smoke:official-document-sources"), "README must mention the official source smoke");
assert(readmeSource.includes("docs/legal-sources/fns-knd-1151156.json"), "README must mention the FNS KND source manifest");
assert(packageJson.scripts["smoke:official-document-sources"] === "node scripts/smoke-official-document-sources.mjs", "package.json must expose smoke:official-document-sources");

console.log(
  JSON.stringify(
    {
      ok: true,
      source: manifest.id,
      attachmentCount: manifest.attachments.length,
      pinnedXsd: xsd.fileName,
      pinnedXsdSha256: xsd.sha256
    },
    null,
    2
  )
);
