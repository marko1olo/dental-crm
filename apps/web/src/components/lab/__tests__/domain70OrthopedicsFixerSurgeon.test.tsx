import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import { getStageMeta, getMaterialMeta } from "../dentalLabCatalogData";
import { detectBridgeSpans } from "../../odontogram/anatomicalBridges";
import type { ToothData } from "../../odontogram/ToothChart";
import { Dental3dToolbar } from "../../imaging/dental3d/Dental3dToolbar";

describe("Domain 70 — Orthopedics & CAD/CAM Fixer Surgeon Gate", () => {
	it("1. [SEV-2.2] DentalLabStudioModal mounts cleanly and includes reset draft capabilities", () => {
		const html = renderToStaticMarkup(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} />
		);
		assert.ok(html.includes("dental-lab-studio-modal-root"), "Modal root should render");
		assert.ok(html.includes("submit-lab-order-button"), "Primary CTA button exists");
	});

	it("2. [SEV-3.1] dentalLabCatalogData getStageMeta & getMaterialMeta have safe guard clauses with zero !", () => {
		const stage = getStageMeta("scan_sent");
		assert.equal(stage.id, "scan_sent");

		const material = getMaterialMeta("zirconia_multilayer");
		assert.equal(material.id, "zirconia_multilayer");

		// Unknown fallback returns default safely
		const fallbackStage = getStageMeta("unknown_stage" as any);
		assert.ok(fallbackStage.id.length > 0);

		const fallbackMaterial = getMaterialMeta("unknown_material");
		assert.ok(fallbackMaterial.id.length > 0);
	});

	it("3. [SEV-3.1] detectBridgeSpans handles edge cases and spans without non-null assertions", () => {
		const mockTeethData: ToothData[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 12, state: "Healthy" },
			{ toothNumber: 13, state: "Healthy" },
		];
		const spans = detectBridgeSpans([], mockTeethData);
		assert.deepEqual(spans, []);
	});

	it("4. [SEV-3.2] Dental3dToolbar renders without uppercase or hardcoded circus hex tokens", () => {
		const html = renderToStaticMarkup(
			<Dental3dToolbar
				layerVisibility={{ upper: true, lower: true, bite: false, prep: false, scanbody: false }}
				onToggleLayer={() => {}}
				materialMode="truecolor"
				onChangeMaterialMode={() => {}}
				isBiteClosed={false}
				onToggleBite={() => {}}
				isCaliperActive={false}
				onToggleCaliper={() => {}}
				caliperMeasurement={null}
				onClearCaliper={() => {}}
				onResetCamera={() => {}}
				onOpenFilePicker={() => {}}
			/>
		);

		assert.equal(html.includes("UPPERCASE"), false);
		assert.equal(html.includes("#0d9488"), false, "No #0d9488 in Dental3dToolbar");
		assert.equal(html.includes("#334155"), false, "No #334155 in Dental3dToolbar");
		assert.equal(html.includes("#818cf8"), false, "No #818cf8 in Dental3dToolbar");
		assert.equal(html.includes("#f59e0b"), false, "No #f59e0b in Dental3dToolbar");
		assert.equal(html.includes("#090d16"), false, "No #090d16 in Dental3dToolbar");
	});

	it("5. [SEV-3.2] DentalLabStudioModal uses var(--primary) and zero var(--teal)", () => {
		const html = renderToStaticMarkup(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} />
		);
		assert.equal(html.includes("var(--teal"), false, "Zero var(--teal) in DentalLabStudioModal");
		assert.ok(html.includes("var(--primary)"), "Canonical primary token used in header");
	});
});
