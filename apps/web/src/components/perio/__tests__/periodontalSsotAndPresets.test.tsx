/**
 * apps/web/src/components/perio/__tests__/periodontalSsotAndPresets.test.tsx
 *
 * Test suite for Periodontogram SSOT Modal Consolidation, 1-Click Clinical Presets & Mobile Touch Ergonomics.
 * (Mandates 8e, 8n, 8d, Apple HIG & EBM Protocols)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	applyGingivalRecessionPreset,
	applyHealthyPeriodontiumPreset,
	createDefaultPerioTeeth,
	PERIO_EXPRESS_PRESETS,
} from "../perioMath";
import { PeriodontogramChart } from "../PeriodontogramChart";
import { PerioChartModal } from "../PerioChartModal";
import { PeriodontalPocketDepthModal } from "../PeriodontalPocketDepthModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Periodontogram SSOT Modal Consolidation & Clinical Presets Suite", () => {
	describe("1. Clinical Presets & Recession (K06.0) Domain Logic", () => {
		it("perio_norm_express preset has exact clinical SOAP text", () => {
			const normPreset = PERIO_EXPRESS_PRESETS.perio_norm_express;
			assert.ok(normPreset, "Must define perio_norm_express preset");
			assert.ok(
				normPreset.defaultProtocolRu.includes("Слизистая оболочка бледно-розовая"),
				"Must include standard healthy mucosal description",
			);
			assert.ok(
				normPreset.defaultProtocolRu.includes("десневые сосочки плотные"),
				"Must include dense gingival papillae",
			);
			assert.ok(
				normPreset.defaultProtocolRu.includes("кровоточивость отсутствует"),
				"Must state bleeding is absent",
			);
		});

		it("recession_express preset exists with ICD-10 K06.0", () => {
			const recPreset = PERIO_EXPRESS_PRESETS.recession_express;
			assert.ok(recPreset, "Must define recession_express preset");
			assert.strictEqual(recPreset.icd10, "K06.0");
			assert.ok(
				recPreset.defaultProtocolRu.includes("Рецессия десны"),
				"Protocol text must indicate gingival recession",
			);
		});

		it("applyGingivalRecessionPreset correctly sets recession margin with intact pockets and 0 BOP", () => {
			const baseTeeth = createDefaultPerioTeeth();
			const result = applyGingivalRecessionPreset(baseTeeth);

			assert.strictEqual(result.length, 32);

			// Check key representative teeth for recession
			for (const t of result) {
				assert.strictEqual(t.mobility, 0, "Recession preset must have 0 mobility");
				assert.strictEqual(t.furcation, 0, "Recession preset must have 0 furcation");

				for (const siteKey of ["distoBuccal", "midBuccal", "mesioBuccal"] as const) {
					const site = t[siteKey];
					assert.strictEqual(site.bleedingOnProbing, false, "Recession must have no BOP");
					assert.ok(site.probingDepthMm <= 2, "Pocket depth must be normal sulcus <= 2 mm");
				}
			}

			// Teeth with prominent recession (canines and premolars: 13, 14, 23, 24, 33, 43)
			const tooth13 = result.find((t) => t.toothNumber === 13);
			assert.ok(tooth13);
			assert.ok(
				(tooth13.midBuccal.gingivalMarginMm ?? 0) >= 1,
				"Tooth 13 midBuccal must have gingival recession >= 1 mm",
			);
			assert.ok(
				(tooth13.midBuccal.calMm ?? 0) >= 2,
				"Tooth 13 CAL must reflect recession + sulcus depth",
			);
		});
	});

	describe("2. SSOT Modal Consolidation", () => {
		it("PerioChartModal delegates cleanly to PeriodontogramChart in modal mode", () => {
			const html = renderToString(
				<PerioChartModal
					isOpen={true}
					onClose={() => {}}
					patientName="Иванов И. И."
				/>,
			);

			assert.ok(
				html.includes("data-testid=\"perio-chart-modal\""),
				"Must render modal container",
			);
			assert.ok(
				html.includes("data-testid=\"interactive-periodontogram\""),
				"Must render interactive periodontogram inside modal",
			);
			assert.ok(
				html.includes("Иванов И. И."),
				"Must display patient name",
			);
		});

		it("PeriodontalPocketDepthModal delegates to PeriodontogramChart with focused tooth", () => {
			const html = renderToString(
				<PeriodontalPocketDepthModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
				/>,
			);

			assert.ok(
				html.includes("data-testid=\"perio-chart-modal\""),
				"Must render modal container",
			);
			assert.ok(
				html.includes("data-testid=\"interactive-periodontogram\""),
				"Must render interactive periodontogram inside modal",
			);
		});
	});

	describe("3. 1-Click UI Controls & Apple HIG Touch Targets", () => {
		it("PeriodontogramChart renders recession preset card and toolbar button", () => {
			const html = renderToString(<PeriodontogramChart />);

			assert.ok(
				html.includes("data-testid=\"perio-preset-recession-card\""),
				"Must render recession card in express banner",
			);
			assert.ok(
				html.includes("data-testid=\"perio-preset-recession-toolbar-btn\""),
				"Must render recession button in toolbar",
			);
			assert.ok(
				html.includes("data-testid=\"perio-toolbar-norm-1click-btn\""),
				"Must render norm 1-click button in toolbar",
			);
			assert.ok(
				html.includes("data-testid=\"perio-toolbar-prophy-1click-btn\""),
				"Must render prophy button in toolbar",
			);
		});

		it("PeriodontogramChart mobile cockpit renders all 4 quick pathology presets", () => {
			const html = renderToString(<PeriodontogramChart />);

			assert.ok(
				html.includes("data-testid=\"perio-mobile-preset-gingivitis-btn\""),
				"Must render mobile gingivitis button",
			);
			assert.ok(
				html.includes("data-testid=\"perio-mobile-preset-moderate-btn\""),
				"Must render mobile moderate periodontitis button",
			);
			assert.ok(
				html.includes("data-testid=\"perio-mobile-preset-severe-btn\""),
				"Must render mobile severe periodontitis button",
			);
			assert.ok(
				html.includes("data-testid=\"perio-mobile-preset-recession-btn\""),
				"Must render mobile recession button",
			);
		});
	});

	describe("4. Code Quality & Mandate 8d Zero Cartoon Emojis", () => {
		it("ensures zero cartoon emojis in modified files", () => {
			const files = [
				"PerioChartModal.tsx",
				"PeriodontalPocketDepthModal.tsx",
				"chart/PerioExpressBanner.tsx",
				"chart/PerioToolbar.tsx",
				"chart/PerioMobileTouchCockpit.tsx",
			];

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			for (const file of files) {
				const filePath = path.resolve(__dirname, "..", file);
				const content = fs.readFileSync(filePath, "utf-8");
				assert.strictEqual(
					emojiRegex.test(content),
					false,
					`File ${file} must have 0 cartoon emojis`,
				);
			}
		});
	});
});
