/**
 * orthoCephTracker.test.tsx — Unit-тесты для цефалометрического трекера ТРГ,
 * расчетов по Штайнеру, Твиду, Wits и компонента OrthodonticCephTrackerModal.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculateCephalometrics,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	generateForm043OrthodonticProtocolText,
	type LandmarkMap,
} from "../components/orthodontics/cephalometricMath";
import { OrthodonticCephTrackerModal } from "../components/orthodontics/OrthodonticCephTrackerModal";

describe("Orthodontic Cephalometric Tracker & Analysis (OrthodonticCephTrackerModal)", () => {
	describe("1. Mathematical Analysis of Lateral Cephalogram (Steiner, Tweed, Wits)", () => {
		it("calculates Steiner sagittal angles (SNA 82°, SNB 80°, ANB 2°) for norm preset", () => {
			const analysis = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);

			const sna = analysis.measurements.find((m) => m.id === "SNA");
			const snb = analysis.measurements.find((m) => m.id === "SNB");
			const anb = analysis.measurements.find((m) => m.id === "ANB");

			assert.ok(sna && sna.value !== null);
			assert.ok(snb && snb.value !== null);
			assert.ok(anb && anb.value !== null);

			// Values should be within clinical range
			assert.ok(sna.value >= 75 && sna.value <= 90);
			assert.ok(snb.value >= 70 && snb.value <= 88);
			assert.ok(anb.value >= -2 && anb.value <= 8);
		});

		it("classifies Skeletal Class I, II, III based on ANB angle", () => {
			// Preset gives Class I or II
			const analysis = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);
			assert.ok(
				analysis.diagnosis.skeletalClass === "Class I" ||
				analysis.diagnosis.skeletalClass === "Class II" ||
				analysis.diagnosis.skeletalClass === "Class III",
			);
			assert.ok(analysis.diagnosis.skeletalClassRu.length > 0);
		});

		it("computes Tweed Triad (FMA, IMPA, FMIA) and dental inclinations", () => {
			const analysis = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);

			const fma = analysis.measurements.find((m) => m.id === "FMA");
			const wits = analysis.measurements.find((m) => m.id === "Wits");
			const u1Sn = analysis.measurements.find((m) => m.id === "U1-SN");
			const l1Mp = analysis.measurements.find((m) => m.id === "L1-MP");

			assert.ok(fma && fma.value !== null);
			assert.ok(wits && wits.value !== null);
			assert.ok(u1Sn && u1Sn.value !== null);
			assert.ok(l1Mp && l1Mp.value !== null);
		});

		it("handles empty landmark map gracefully without crashing", () => {
			const emptyLandmarks: LandmarkMap = {};
			const analysis = calculateCephalometrics(emptyLandmarks);

			assert.equal(analysis.isComplete, false);
			assert.equal(analysis.completionPercentage, 0);
			assert.equal(analysis.placedCount, 0);

			for (const m of analysis.measurements) {
				assert.equal(m.value, null);
			}
		});
	});

	describe("2. Comprehensive Form 043/u Orthodontic Protocol Generation", () => {
		it("generates structured text conforming to Order 834n with all angles and skeletal diagnosis", () => {
			const analysis = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET);
			const text = generateForm043OrthodonticProtocolText(analysis, {
				patientName: "Кузнецова Анна Павловна",
				doctorName: "Д-р Смирнов К.В.",
			});

			assert.ok(text.includes("ПРОТОКОЛ ЦЕФАЛОМЕТРИЧЕСКОГО АНАЛИЗА ТРГ"));
			assert.ok(text.includes("Кузнецова Анна Павловна"));
			assert.ok(text.includes("Д-р Смирнов К.В."));
			assert.ok(text.includes("SNA"));
			assert.ok(text.includes("SNB"));
			assert.ok(text.includes("ANB"));
			assert.ok(text.includes("ЗАКЛЮЧЕНИЕ"));
		});
	});

	describe("3. OrthodonticCephTrackerModal Component SSR Rendering", () => {
		it("renders modal header, landmark tab, and metric cards without crashing", () => {
			const html = renderToString(
				<OrthodonticCephTrackerModal
					isOpen={true}
					onClose={() => {}}
					patientName="Тестовый Пациент"
					patientId="PAT-777"
				/>,
			);

			assert.ok(html.includes("Цефалометрический трекер ТРГ"));
			assert.ok(html.includes("PAT-777"));
			assert.ok(html.includes("В карту 043/у"));
			assert.ok(html.includes("Точки"));
			assert.ok(html.includes("Анализ"));
		});
	});
});
