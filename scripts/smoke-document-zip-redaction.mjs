import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const extractorPath = path.resolve("apps/api/dist/ingestion/documentExtractor.js");
if (!existsSync(extractorPath)) {
  throw new Error("Build the API first: npm run build");
}

function localHeader(nameBuffer, data, offset) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return { buffer: Buffer.concat([header, nameBuffer, data]), offset };
}

function centralHeader(nameBuffer, data, localOffset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, nameBuffer]);
}

function eocd(entryCount, centralSize, centralOffset) {
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(0, 4);
  footer.writeUInt16LE(0, 6);
  footer.writeUInt16LE(entryCount, 8);
  footer.writeUInt16LE(entryCount, 10);
  footer.writeUInt32LE(centralSize, 12);
  footer.writeUInt32LE(centralOffset, 16);
  footer.writeUInt16LE(0, 20);
  return footer;
}

function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const local = localHeader(nameBuffer, data, offset);
    localParts.push(local.buffer);
    centralParts.push(centralHeader(nameBuffer, data, local.offset));
    offset += local.buffer.length;
  }
  const central = Buffer.concat(centralParts);
  return Buffer.concat([Buffer.concat(localParts), central, eocd(entries.length, central.length, offset)]);
}

const dicomBytes = Buffer.alloc(180, 0);
dicomBytes.write("DICM", 128, "ascii");
const zip = buildStoredZip([
  { name: "Иванова Марина/КТ/IMG0001.dcm", data: dicomBytes },
  { name: "Петров Алексей/OPG/petrov_opg.png", data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  { name: "Админ/price.csv", data: "Service;Price\nImplant crown;85000\nHygiene;6000\n" }
]);

const { extractDocument } = await import(pathToFileURL(extractorPath).href);
const response = extractDocument({
  fileName: "Иванова_Петров_КТ_и_прайс.zip",
  mimeType: "application/zip",
  fileBase64: zip.toString("base64"),
  target: "smart_import"
});

const serialized = JSON.stringify(response);
const forbidden = ["Иванова", "Петров", "Марина", "Алексей", "IMG0001", "petrov_opg", "Админ"].filter((needle) =>
  serialized.includes(needle)
);
const result = {
  detectedKind: response.detectedKind,
  extractedFiles: response.extractedFiles.map((file) => file.fileName),
  textPreview: response.textPreview.slice(0, 240),
  warnings: response.warnings,
  forbidden
};
console.log(JSON.stringify(result));

if (response.detectedKind !== "zip") throw new Error(`Expected zip, got ${response.detectedKind}`);
if (response.extractedFiles.length !== 3) throw new Error(`Expected 3 extracted entries, got ${response.extractedFiles.length}`);
if (!response.extractedFiles.every((file) => file.fileName.startsWith("Файл архива #"))) {
  throw new Error("Archive entries were not redacted to safe labels.");
}
if (forbidden.length) throw new Error(`Raw archive names leaked: ${forbidden.join(", ")}`);
if (!response.parserNotes.some((note) => note.includes("Имена файлов внутри архива скрыты"))) {
  throw new Error("Expected Russian parser note about archive entry redaction.");
}

const legacyDb = extractDocument({
  fileName: "Пациенты_Иванова_старый_архив.fdb",
  mimeType: "application/octet-stream",
  fileBase64: Buffer.from("not-a-real-firebird-db-but-extension-is-authoritative").toString("base64"),
  target: "smart_import"
});
const legacySerialized = JSON.stringify(legacyDb);
const legacyForbidden = ["Пациенты", "Иванова", "старый"].filter((needle) => legacySerialized.includes(needle));

if (legacyDb.detectedKind !== "legacy_database") throw new Error(`Expected legacy_database, got ${legacyDb.detectedKind}`);
if (legacyForbidden.length) throw new Error(`Legacy DB raw filename leaked: ${legacyForbidden.join(", ")}`);
if (!legacyDb.extractedText.includes("Источник старой базы")) throw new Error("Legacy DB must become a clinic-readable staging manifest.");
if (legacyDb.extractedText.includes("Legacy migration source")) throw new Error("Legacy DB manifest must not expose English migration source jargon.");
if (legacyDb.extractedText.includes("staging parser")) throw new Error("Legacy DB manifest must not expose staging parser jargon.");
if (legacyDb.extractedText.includes("офлайн-копию")) throw new Error("Legacy DB manifest must not expose offline-copy jargon.");
if (legacyDb.quality.signals.includes("legacy_database_input")) throw new Error("Legacy DB quality signals must not expose internal signal ids.");
if (!legacyDb.quality.signals.includes("старая база")) throw new Error("Legacy DB quality signals must use clinic-readable wording.");
if (legacyDb.quality.nextAction.includes("манифест")) throw new Error("Legacy DB next action must use clinic-readable list wording.");
if (legacyDb.quality.nextAction.includes("старой БД")) throw new Error("Legacy DB next action must not expose DB abbreviations.");
if (legacyDb.extractedText.includes("not-a-real-firebird")) throw new Error("Legacy DB binary content must not be decoded into extracted text.");
if (!legacyDb.warnings.includes("legacy_source_staging_manifest_only")) throw new Error("Legacy DB must warn about staging-only handling.");
if (!legacyDb.routes.some((route) => route.target === "smart_import" && route.enabled)) throw new Error("Legacy DB must route to smart import preview.");
if (legacyDb.routes.some((route) => route.target === "patients" && route.enabled)) throw new Error("Legacy DB must not route directly to patient commit preview.");
