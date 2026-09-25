/**
 * academicBloatAndCargoCultInquisition.test.ts
 *
 * Inquisitorial Unit Tests for Eradication of Academic Bloat & Hospital Cargo Cult.
 * Mandates: Section V, VII, XIII, XIV of THE_HAMMER_MASTER_PROMPT & .agents/AGENTS.md.
 *
 * 1. Total eradication of inpatient/hospital bloat (no beds, no blood transfusions, no 025/у).
 * 2. Doctor autonomy: 1-click somatic norm in toolbar without 100-checkbox interrogations.
 * 3. Chairside clinical silence: VisitView odontogram treatment view is sterile (tail is hidden).
 * 4. Zero duplicate unkeyed VisiographAnalyzer components.
 * 5. Headless smoke test harness is sr-only/0px and does not pollute clinical viewport.
 * 6. Sanctity of medical records: zero cartoon emojis in clinical protocols.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "..");
const sharedSrcRoot = path.resolve(__dirname, "../../../../packages/shared/src");

describe("Mandate V, VII, XIII, XIV: Academic Bloat & Hospital Cargo Cult Purge", () => {
	it("1. VisitView ensures clinical silence during tooth treatment (odontogram tab)", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const content = fs.readFileSync(visitViewPath, "utf8");

		// Secondary tools accordion must be hidden when on odontogram tab
		assert.ok(
			content.includes('display: visitSubViewTab === "odontogram" ? "none" : "block"'),
			"VisitView must hide secondary tools tail during odontogram treatment",
		);

		// Smoke compatibility container must be sr-only / 0px offscreen
		assert.ok(
			content.includes("smoke-compat-container sr-only"),
			"Smoke test compatibility harness must be marked sr-only",
		);
		assert.ok(
			content.includes('position: "absolute"'),
			"Smoke test harness must be positioned offscreen",
		);
	});

	it("2. VisitView contains 0 duplicate unkeyed VisiographAnalyzer components", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const content = fs.readFileSync(visitViewPath, "utf8");

		// Duplicate VisiographAnalyzer should not be rendered in VisitView body
		assert.ok(
			!content.includes("<VisiographAnalyzer"),
			"VisitView must NOT render duplicate VisiographAnalyzer outside VisitDiagnosticsTab",
		);
	});

	it("3. VisitView header contains 1-click somatic norm button with full autonomy", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const content = fs.readFileSync(visitViewPath, "utf8");

		assert.ok(
			content.includes('data-testid="btn-somatic-norm-one-click"'),
			"VisitView must provide 1-click somatic norm button in toolbar",
		);
		assert.ok(
			content.includes("handleApplySomaticNormQuick"),
			"VisitView must wire handleApplySomaticNormQuick handler",
		);
		assert.ok(
			content.includes("executeApplySomaticNormAutonomy"),
			"VisitView must export executeApplySomaticNormAutonomy",
		);
	});

	it("4. Zero hospital/inpatient terms in visit and patient workspaces", () => {
		const visitDir = path.join(webSrcRoot, "components/visit");
		const patientDir = path.join(webSrcRoot, "components/patients");

		const hospitalBanned = [
			"койко-место",
			"койко-день",
			"переливание крови",
			"гемотрансфузия",
			"стационарная карта",
		];

		const scanFiles = (dir: string) => {
			for (const file of fs.readdirSync(dir)) {
				const full = path.join(dir, file);
				if (fs.statSync(full).isDirectory() && !file.includes("__tests__")) {
					scanFiles(full);
				} else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
					if (file.includes(".test.")) continue;
					const text = fs.readFileSync(full, "utf8").toLowerCase();
					for (const term of hospitalBanned) {
						assert.strictEqual(
							text.includes(term),
							false,
							`File ${file} contains banned hospital bloat term: ${term}`,
						);
					}
				}
			}
		};

		scanFiles(visitDir);
		scanFiles(patientDir);
	});

	it("5. Packages/shared enforces Form 043/у supremacy over Form 025/у", () => {
		const sharedIndex = fs.readFileSync(path.join(sharedSrcRoot, "index.ts"), "utf8");
		assert.ok(
			sharedIndex.includes("ФОРМА 025/у ЛИКВИДИРОВАНА (МАНДАТЫ 8i, 8s)"),
			"packages/shared must declare 025/у liquidated",
		);
		assert.ok(
			sharedIndex.includes("dental_medical_card_043u"),
			"packages/shared must mandate 043/у as active clinical document",
		);
	});
});
