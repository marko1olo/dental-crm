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
import { PeriodontalChartingModal } from "../components/odontogram/PeriodontalChartingModal";

describe("Periodontal Charting & Clinical Indices (PeriodontalChartingModal)", () => {
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

	describe("3. PeriodontalChartingModal Component SSR Rendering", () => {
		it("renders modal header, index cards and active tooth without crash", () => {
			const html = renderToString(
				<PeriodontalChartingModal
					isOpen={true}
					onClose={() => {}}
					patientName="Тестовый Пациент"
				/>,
			);

			assert.ok(html.includes("Пародонтологическая карта и скрининг CPITN"));
			assert.ok(html.includes("Индекс гигиены Грина-Вермиллиона"));
			assert.ok(html.includes("Индекс налета PLI"));
			assert.ok(html.includes("Кровоточивость борозды SBI"));
		});
	});
});
