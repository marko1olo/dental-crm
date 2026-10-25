import assert from "node:assert";
import { describe, test } from "node:test";
import { buildForm043ProtocolText } from "../VisiographExportService";
import { VISIOGRAPH_WINDOW_PRESETS } from "../VisiographWindowPresets";

describe("Visiograph Protocol Clinical Export", () => {
	test("buildForm043ProtocolText includes calibration, rulers, angles, and lesion destruction details", () => {
		const text = buildForm043ProtocolText({
			patientId: "pat_987",
			imageDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			fdiToothCode: "36",
			preset: VISIOGRAPH_WINDOW_PRESETS.bone,
			brightness: 10,
			contrast: 20,
			gamma: 1.2,
			sharpness: 30,
			calibration: { scaleMmPerPx: 0.0485, referenceType: "Калибровочный шарик", referenceMm: 5.0 },
			measurements: {
				rulers: [
					{ label: "Длина дистального корня", lengthMm: 14.8 },
					{ label: "Ширина апекса", lengthMm: 1.2 },
				],
				angles: [{ label: "Наклон коронки", angleDeg: 12.5, deviationFromVerticalDeg: 8.2 }],
				lesions: [{
					areaMm2: 28.4,
					equivalentDiameterMm: 6.0,
					classificationLabel: "Радикулярная кистогранулема",
					treatmentRecommendation: "Консервативная терапия Ca(OH)2 с контролем через 3 мес",
				}],
			},
			radiologicalFinding: "Очаг разрежения костной ткани округлой формы у верхушки дистального корня зуба 36.",
		});

		assert.ok(text.includes("--- ПРОТОКОЛ ЛУЧЕВОГО ОБСЛЕДОВАНИЯ И 3D-ПЛАНИРОВАНИЯ (ФОРМА № 043/У) ---"));
		assert.ok(text.includes("Область зуба (FDI): № 36"));
		assert.ok(text.includes("Яркость: 10%"));
		assert.ok(text.includes("Контрастность: 20%"));
		assert.ok(text.includes("Гамма: 1.20"));
		assert.ok(text.includes("Резкость (USM): 30%"));
		assert.ok(text.includes("Калибровка масштаба: 1 px = 0.0485 мм"));
		assert.ok(text.includes("Калибровочный шарик 5 мм"));
		assert.ok(text.includes("Длина дистального корня: 14.8 мм"));
		assert.ok(text.includes("Ширина апекса: 1.2 мм"));
		assert.ok(text.includes("Наклон коронки: 12.5° (наклон: 8.2°)"));
		assert.ok(text.includes("Очаг деструкции #1: Радикулярная кистогранулема — площадь: 28.4 мм² (экв. Ø: 6.0 мм)"));
		assert.ok(text.includes("Консервативная терапия Ca(OH)2"));
		assert.ok(text.includes("Снимок и протокол прикреплены к электронной медицинской карте 043/у"));
	});
});
