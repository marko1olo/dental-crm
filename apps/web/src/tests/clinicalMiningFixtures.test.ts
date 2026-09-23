import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root tests/fixtures/clinical-mining path
const FIXTURES_DIR = path.resolve(__dirname, "../../../../tests/fixtures/clinical-mining");

describe("DENTAL ARCHIVE MINER — DENTALIA CLINIC EXTRACT FIXTURES [MANDATE 8k, 8s]", () => {
	it("verifies samara_dentalia_health_reports.json contains valid ICD-10 & 804n mappings", () => {
		const filePath = path.join(FIXTURES_DIR, "samara_dentalia_health_reports.json");
		assert.ok(fs.existsSync(filePath), "samara_dentalia_health_reports.json must exist");

		const raw = fs.readFileSync(filePath, "utf-8");
		const items = JSON.parse(raw);
		assert.ok(Array.isArray(items) && items.length >= 10, "Must contain at least 10 clinical conditions");

		for (const item of items) {
			assert.ok(item.typeCode && typeof item.typeCode === "string", "Must have typeCode");
			assert.ok(item.clinicalTitleRu && typeof item.clinicalTitleRu === "string", "Must have Russian title");
			assert.ok(item.description && typeof item.description === "string", "Must have description");
			assert.ok(item.treatmentGuidance && typeof item.treatmentGuidance === "string", "Must have treatmentGuidance");
			assert.match(item.icd10, /^[A-Z]\d{2}(\.\d{1,3})?$/, `Valid ICD-10 code format: ${item.icd10}`);
			assert.match(item.code804n, /^A16\.07\.\d{3}(\.\d{3})?$/, `Valid 804n service code format: ${item.code804n}`);
			assert.ok(item.recommendedRecallMonths >= 1 && item.recommendedRecallMonths <= 12, "Valid recall period");
		}
	});

	it("verifies samara_dentalia_prosthetic_cases.json contains valid real-world prosthetics data", () => {
		const filePath = path.join(FIXTURES_DIR, "samara_dentalia_prosthetic_cases.json");
		assert.ok(fs.existsSync(filePath), "samara_dentalia_prosthetic_cases.json must exist");

		const raw = fs.readFileSync(filePath, "utf-8");
		const cases = JSON.parse(raw);
		assert.ok(Array.isArray(cases) && cases.length >= 10, "Must contain at least 10 real patient cases");

		for (const c of cases) {
			assert.ok(c.anonymousCaseId && c.anonymousCaseId.startsWith("CASE-SAMARA-"), "Valid anonymousCaseId");
			assert.ok(Array.isArray(c.targetTeeth) && c.targetTeeth.length > 0, "Must have target teeth");
			for (const t of c.targetTeeth) {
				assert.ok(t >= 11 && t <= 48, `Valid FDI tooth number: ${t}`);
			}
			assert.ok(Array.isArray(c.treatmentPlan) && c.treatmentPlan.length > 0, "Must have treatment plan items");
			for (const planItem of c.treatmentPlan) {
				assert.ok(["CROWN_ANATOMIC", "PONTIC_ANATOMIC", "MISSING_TOOTH", "CROWN_PRESSED"].includes(planItem.preparation), `Valid prep: ${planItem.preparation}`);
				assert.ok(["ZIRCONIA", "NONE", "NP"].includes(planItem.material), `Valid material: ${planItem.material}`);
			}
		}
	});

	it("verifies runyes_3ds_scan_metadata.json contains valid optical scan structure", () => {
		const filePath = path.join(FIXTURES_DIR, "runyes_3ds_scan_metadata.json");
		assert.ok(fs.existsSync(filePath), "runyes_3ds_scan_metadata.json must exist");

		const raw = fs.readFileSync(filePath, "utf-8");
		const scans = JSON.parse(raw);
		assert.ok(Array.isArray(scans) && scans.length > 0, "Must contain scan records");

		for (const scan of scans) {
			assert.equal(scan.device, "3ds", "Device must be Runyes 3DS");
			assert.ok(scan.caseUuid, "Must have case UUID");
			assert.ok(Array.isArray(scan.meshFiles), "Must list required mesh files");
			assert.ok(scan.meshFiles.includes("implant_upper.ply"), "Must include upper mesh");
			assert.ok(scan.meshFiles.includes("implant_lower.ply"), "Must include lower mesh");
		}
	});
});
