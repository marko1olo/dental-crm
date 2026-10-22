/**
 * DENTE CRM — CBCT Clinical Export & EMR Planning Report Engine Suite
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Decomposed into 3 modular suites:
 * 1-7. exportSnapshots.suite.ts
 * 8-10. exportHtmlAndDiary.suite.ts
 * 11-24. planningAuditAndPrintPdf.suite.ts
 */

import { describe } from "node:test";
import { runExportSnapshotsTests } from "./exportEngine/exportSnapshots.suite";
import { runExportHtmlAndDiaryTests } from "./exportEngine/exportHtmlAndDiary.suite";
import { runPlanningAuditAndPrintPdfTests } from "./exportEngine/planningAuditAndPrintPdf.suite";

describe("CBCT Clinical Export & EMR Planning Report Engine Suite", () => {
	runExportSnapshotsTests();
	runExportHtmlAndDiaryTests();
	runPlanningAuditAndPrintPdfTests();
});
