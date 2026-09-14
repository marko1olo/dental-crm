/**
 * periodontalCharting.test.tsx — Unit-тесты для пародонтологической карты,
 * расчета клинических индексов (OHI-S, PLI, SBI/BOP, CPITN/PSR) и генерации протокола 043/у.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculatePerioIndices,
	calculatePsrSextants,
	formatPsrSextantsSummary,
	createDefaultPerioTeeth,
	generateComprehensivePerio043Text,
} from "@dental/shared";
import { PeriodontogramChart } from "../components/perio/PeriodontogramChart";

describe("Periodontal Charting & Clinical Indices (PeriodontogramChart)", () => {
	describe("1. Mathematical Calculation of Periodontal Indices", () => {
		it("calculates 0% FMBS and 0% FMPS for healthy default dentition", () => {
			const teeth = createDefaultPerioTeeth();
			const indices = calculatePerioIndices(teeth);

			assert.equal(indices.fmbsPercent, 0);
			assert.equal(indices.fmpsPercent, 0);
			assert.equal(indices.deepPocketsCount, 0);
			assert.equal(indices.moderatePocketsCount, 0);
		});

		it("correctly calculates BOP % (SBI / FMBS) when multiple sites have bleeding", () => {
			const teeth = createDefaultPerioTeeth();
			// Mark 6 sites with bleeding on tooth 16
			const tooth16 = teeth.find((t) => t.toothNumber === 16)!;
			tooth16.mesioBuccal.bleedingOnProbing = true;
			tooth16.midBuccal.bleedingOnProbing = true;
			tooth16.distoBuccal.bleedingOnProbing = true;
			tooth16.mesioLingual.bleedingOnProbing = true;
			tooth16.midLingual.bleedingOnProbing = true;
			tooth16.distoLingual.bleedingOnProbing = true;

			const indices = calculatePerioIndices(teeth);
			assert.ok(indices.fmbsPercent > 0);
		});

		it("detects deep periodontal pockets (>= 5mm) and moderate pockets (4mm)", () => {
			const teeth = createDefaultPerioTeeth();
			const tooth46 = teeth.find((t) => t.toothNumber === 46)!;
			tooth46.mesioBuccal.probingDepthMm = 6;
			tooth46.distoBuccal.probingDepthMm = 4;

			const indices = calculatePerioIndices(teeth);
			assert.equal(indices.deepPocketsCount, 1);
			assert.equal(indices.moderatePocketsCount, 1);
			assert.equal(indices.maxPocketDepthMm, 6);
		});

		it("computes PSR/CPITN sextant screening codes accurately", () => {
			const teeth = createDefaultPerioTeeth();
			// Tooth 16 has 6mm pocket -> Sextant S1 gets code 4
			const tooth16 = teeth.find((t) => t.toothNumber === 16)!;
			tooth16.mesioBuccal.probingDepthMm = 6;

			const sextants = calculatePsrSextants(teeth);
			const formatted = formatPsrSextantsSummary(sextants);
			assert.ok(formatted.includes("S1: 4") || formatted.includes("S1:4"));
		});
	});

	describe("2. Comprehensive Form 043/u Periodontal Protocol Generation", () => {
		it("generates structured text conforming to Order 834n/804n with PSR sextants and indices", () => {
			const teeth = createDefaultPerioTeeth();
			const tooth16 = teeth.find((t) => t.toothNumber === 16)!;
			tooth16.mesioBuccal.probingDepthMm = 5;
			tooth16.mesioBuccal.bleedingOnProbing = true;

			const indices = calculatePerioIndices(teeth);
			const text = generateComprehensivePerio043Text(teeth, indices, {
				doctorName: "Д-р Иванов А.С.",
			});

			assert.ok(
				text.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ") ||
				text.includes("ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС"),
			);
			assert.ok(text.includes("Д-р Иванов А.С."));
		});
	});

	describe("3. PeriodontogramChart Component SSR Rendering", () => {
		it("renders chart container, rapid screening and active tooth without crash", () => {
			const html = renderToString(
				<PeriodontogramChart
					patientName="Тестовый Пациент"
				/>,
			);

			assert.ok(html.includes("interactive-periodontogram"));
			assert.ok(html.includes("Экспресс-скрининг пародонта PSR / CPITN"));
			assert.ok(html.includes("perio-toolbar-norm-1click-btn"));
		});

		it("renders 1-click clinical presets toolbar (Norm, Gingivitis, Mild/Moderate/Severe Periodontitis, Prophy, Form 043/u) without cartoon emojis", () => {
			const html = renderToString(
				<PeriodontogramChart
					patientName="Тестовый Пациент"
				/>,
			);

			// Check all clinical presets and 043/u actions
			assert.ok(html.includes("perio-preset-norm-card"));
			assert.ok(html.includes("perio-preset-gingivitis-card"));
			assert.ok(html.includes("perio-preset-periodontitis-card"));
			assert.ok(html.includes("perio-preset-severe-periodontitis-card"));
			assert.ok(html.includes("perio-preset-prophy-card"));
			assert.ok(html.includes("perio-insert-protocol-btn") || html.includes("perio-express-insert-043-btn"));

			// Mandate 8d, sin #7: Zero cartoon emojis in medical/clinical forms
			assert.equal(html.includes("⚡"), false, "Must not contain lightning bolt emoji");
			assert.equal(html.includes("💡"), false, "Must not contain lightbulb emoji");
			assert.equal(html.includes("🦷"), false, "Must not contain tooth emoji");
			assert.equal(html.includes("🔬"), false, "Must not contain microscope emoji");
		});
	});

	describe("4. HygieneIndicesPanel Component & Express Presets (Mandates 8e, 8k)", () => {
		it("renders all 5 express clinical presets and 043/u action without cartoon emojis", async () => {
			const { HygieneIndicesPanel } = await import("../components/hygiene/HygieneIndicesPanel");
			const html = renderToString(
				<HygieneIndicesPanel
					readOnly={false}
				/>,
			);

			assert.ok(html.includes("Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)"));
			assert.ok(html.includes('data-testid="hygiene-preset-norm"'));
			assert.ok(html.includes('data-testid="hygiene-preset-gingivitis"'));
			assert.ok(html.includes('data-testid="hygiene-preset-mild-periodontitis"'));
			assert.ok(html.includes('data-testid="hygiene-preset-periodontitis"'));
			assert.ok(html.includes('data-testid="hygiene-preset-pro-hygiene"'));
			assert.ok(html.includes('data-testid="hygiene-insert-to-043-btn"'));

			// Zero cartoon emojis in buttons or labels
			assert.equal(html.includes("⚡"), false, "Must not contain lightning bolt emoji");
			assert.equal(html.includes("💡"), false, "Must not contain lightbulb emoji");
			assert.equal(html.includes("🦷"), false, "Must not contain tooth emoji");
			assert.equal(html.includes("🔬"), false, "Must not contain microscope emoji");
		});
	});
});
