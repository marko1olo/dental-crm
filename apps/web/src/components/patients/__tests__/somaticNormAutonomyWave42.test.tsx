import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner.js";
import {
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	isSomaticProfilePhysiologicalNorm,
} from "../safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Somatic Anamnesis 1-Click Physiological Norm (Mandates 8e, 8k, 8n)", () => {
	const bannerPath = path.resolve(
		__dirname,
		"../tabs/generalInfo/PatientSafetyBanner.tsx",
	);
	const bannerSource = fs.readFileSync(bannerPath, "utf8");

	it("3.1. guarantees createHealthySomaticNormProfile produces 100% clean profile", () => {
		const norm = createHealthySomaticNormProfile();
		assert.strictEqual(norm.hasLidocaineAllergy, false);
		assert.strictEqual(norm.hasArticaineAllergy, false);
		assert.strictEqual(norm.takesAnticoagulants, false);
		assert.strictEqual(norm.hasPacemakerExs, false);
		assert.ok(norm.customChronicNotes!.includes("Соматически здоров"));
		assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
	});

	it("3.2. guarantees evaluatePatientSafetyFlags gives zero active stop flags on norm profile", () => {
		const norm = createHealthySomaticNormProfile();
		const evalResult = evaluatePatientSafetyFlags(norm);
		assert.strictEqual(evalResult.hasCriticalStopFlags, false);
		assert.strictEqual(evalResult.totalAlertCount, 0);
	});

	it("3.3. guarantees PatientSafetyBanner contains 1-click button btn-somatic-healthy-norm", () => {
		assert.ok(bannerSource.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(bannerSource.includes("handleApplyNormAction"));
		assert.ok(bannerSource.includes("DEFAULT_SOMATIC_HEALTHY_NORM"));
	});

	it("3.4. renders PatientSafetyBanner and displays 1-click somatic norm preset button", () => {
		const norm = createHealthySomaticNormProfile();
		const html = renderToString(
			React.createElement(PatientSafetyBanner, {
				mode: "full",
				currentProfile: norm,
				patientId: "pat-autonomy-001",
				patientName: "Васильев Игорь Олегович",
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(html.includes("Норма"));
	});

	it("3.5. isSomaticProfilePhysiologicalNorm detects non-norm flags correctly", () => {
		const norm = createHealthySomaticNormProfile();
		assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, hasArticaineAllergy: true }),
			false,
		);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, takesAnticoagulants: true }),
			false,
		);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, hasPacemakerExs: true }),
			false,
		);
	});
});
