import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { patients, imagingStudies, auditEvents } from "../../telegram/legacyMocks.js";
import { commitImagingImport } from "../imaging.js";
describe("commitImagingImport", () => {
    let initialStudiesSnapshot;
    let initialAuditEventsSnapshot;
    before(() => {
        initialStudiesSnapshot = [...imagingStudies];
        initialAuditEventsSnapshot = [...auditEvents];
    });
    after(() => {
        // Restore exact length to prevent leakage to state tests.
        imagingStudies.splice(0, imagingStudies.length, ...initialStudiesSnapshot);
        auditEvents.splice(0, auditEvents.length, ...initialAuditEventsSnapshot);
    });
    it("processes valid records only and maps properties to the created study correctly", async () => {
        it("processes valid records only and maps properties to the created study correctly", () => {
            const patient = patients[0];
            assert.ok(patient, "Expected at least one patient in sample data");
            const input = {
                sourceName: "test_import",
                sourceKind: "folder_watch",
                rawText: [
                    "fio|modality|filePath|title|phone|tooth|region|date",
                    // Valid row
                    `${patient.fullName}|opg|C:\\scans\\valid.dcm|Test OPG|${patient.phone}|12, 13|Maxilla|2023-10-27T10:00:00Z`,
                    // Invalid row (missing patient name, won't match)
                    `|opg|C:\\scans\\invalid.dcm|Invalid OPG||||`,
                    // Invalid row (no filepath)
                    `${patient.fullName}|opg||Missing Path|${patient.phone}|||`,
                ].join("\n")
            };
            const result = await commitImagingImport("mock-org", input);
            const result = commitImagingImport(input);
            assert.strictEqual(result.preview.totalRows, 3);
            assert.strictEqual(result.importedCount, 1);
            assert.strictEqual(result.skippedCount, 2);
            assert.strictEqual(result.createdStudyIds.length, 1);
            const createdStudyId = result.createdStudyIds[0];
            const newStudy = imagingStudies.find(s => s.id === createdStudyId);
            assert.ok(newStudy, "The study was not found in the global imagingStudies array");
            assert.strictEqual(newStudy.patientId, patient.id);
            assert.strictEqual(newStudy.kind, "opg");
            assert.strictEqual(newStudy.title, "Test OPG");
            assert.strictEqual(newStudy.toothCode, "12, 13");
            assert.strictEqual(newStudy.region, "Maxilla");
            assert.strictEqual(newStudy.sourceKind, "dicom_file");
            assert.strictEqual(newStudy.sourceName, "test_import");
            assert.strictEqual(newStudy.storagePath, "C:\\scans\\valid.dcm");
            assert.strictEqual(newStudy.capturedAt, "2023-10-27T10:00:00Z");
            assert.strictEqual(newStudy.aiSummary, "Импортировано из test_import. Требует проверки снимка и привязки к ЭМК.");
        });
    });
});
