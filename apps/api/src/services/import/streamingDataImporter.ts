/**
 * apps/api/src/services/import/streamingDataImporter.ts
 *
 * Facade router for Streaming & Batch Data Importers.
 * Decomposed into modular sweet-spot components under ./streaming/
 *
 * Mandates:
 * - Mandate 8b: File size ceiling <= 500 lines (Sweet Spot 200-300 lines).
 * - Mandate 8z / 8wy: Zero Mocks — 100% real PostgreSQL transactions via Drizzle ORM.
 * - Mandate 8n: Solo Doctor & Scale Sovereignty — fast frictionless import from CSV/Excel.
 * - Mandate 8d: Strict tenant isolation by organizationId.
 */

export * from "./streaming/spreadsheetMatrixParser.js";
export * from "./streaming/patientImportStream.js";
export * from "./streaming/pricelistImportStream.js";
