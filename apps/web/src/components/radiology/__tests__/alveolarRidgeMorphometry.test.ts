import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	getAlveolarRidgeMeasurement,
	buildAlveolarRidgeSoapProtocol,
	exportAlveolarRidgeToEmr,
	measureAlveolarRidgeFromVolume,
} from "../alveolarRidgeMorphometry.js";

describe("Domain 20/6: Alveolar Ridge Morphometry (Canonical Domain)", () => {
	it("returns reference morphometry for tooth #26 (crestal deficit, Summers closed sinus lift)", () => {
		const measurement = getAlveolarRidgeMeasurement(26);

		assert.equal(measurement.toothFdi, 26);
		assert.equal(measurement.crestHeightH_Mm, 5.8);
		assert.equal(measurement.crestWidthW2_Mm, 6.4);
		assert.equal(measurement.basalWidthW6_Mm, 8.2);
		assert.equal(measurement.mischBoneClass, "D3");
		assert.equal(measurement.sinusLiftRecommendation.required, true);
		assert.equal(measurement.sinusLiftRecommendation.technique, "closed_crestal_summers");
		assert.ok(measurement.caliperData.implantFeasibility.requiresBoneGrafting);
	});

	it("returns reference morphometry for tooth #27 (severe vertical atrophy, lateral window sinus lift)", () => {
		const measurement = getAlveolarRidgeMeasurement(27);

		assert.equal(measurement.toothFdi, 27);
		assert.equal(measurement.crestHeightH_Mm, 5.2);
		assert.equal(measurement.crestWidthW2_Mm, 6.1);
		assert.equal(measurement.basalWidthW6_Mm, 7.8);
		assert.equal(measurement.mischBoneClass, "D4");
		assert.equal(measurement.sinusLiftRecommendation.required, true);
		assert.equal(measurement.sinusLiftRecommendation.technique, "open_lateral_window");
	});

	it("builds structured SOAP clinical protocol with ICD-10 K08.1", () => {
		const measurement = getAlveolarRidgeMeasurement(26);
		const soap = buildAlveolarRidgeSoapProtocol(measurement, "Тестовый Пациент");

		assert.equal(soap.diagnosisIcd10, "K08.1");
		assert.equal(soap.diagnosisTooth, "26");
		assert.ok(soap.statusLocalis.includes("КЛКТ-диагностика"));
		assert.ok(soap.statusLocalis.includes("Тестовый Пациент"));
		assert.ok(soap.statusLocalis.includes("H (остаточная высота"));
		assert.ok(soap.statusLocalis.includes("W2 (ширина гребня"));
		assert.ok(soap.treatmentDescription.includes("План хирургического лечения"));
		assert.ok(soap.treatmentDescription.includes("Саммерса"));
	});

	it("exports alveolar ridge documentation to EMR callback and triggers events safely", () => {
		const measurement = getAlveolarRidgeMeasurement(26);
		let exportedDiary = "";

		exportAlveolarRidgeToEmr(measurement, "Тестовый Пациент", (text) => {
			exportedDiary = text;
		});

		assert.ok(exportedDiary.includes("КЛКТ-диагностика"));
		assert.ok(exportedDiary.includes("Тестовый Пациент"));
	});

	it("computes morphometry from volumetric CBCT voxel data", () => {
		const dimX = 64;
		const dimY = 64;
		const dimZ = 40;
		const data = new Int16Array(dimX * dimY * dimZ);
		data.fill(450);

		const mockVolume = {
			id: "test-morphometry-volume",
			dimensions: { width: dimX, height: dimY, depth: dimZ },
			spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
			originMm: {
				x: -(dimX * 0.5) / 2,
				y: -(dimY * 0.5) / 2,
				z: -(dimZ * 0.5) / 2,
			},
			physicalSizeMm: { x: dimX * 0.5, y: dimY * 0.5, z: dimZ * 0.5 },
			data,
			minHU: -1000,
			maxHU: 3000,
		};

		const result = measureAlveolarRidgeFromVolume(mockVolume as any, 26);
		assert.equal(result.toothFdi, 26);
		assert.ok(result.crestHeightH_Mm > 0);
		assert.ok(result.crestWidthW2_Mm > 0);
		assert.ok(result.basalWidthW6_Mm > 0);
		assert.ok(result.caliperData.id.includes("caliper-tooth-26"));
	});
});
