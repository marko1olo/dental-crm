import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateAnnotationStats,
	getPresetColorMapStops,
	createAnnotationMeasure,
	filterVisibleAnnotations,
	formatAnnotationReportForm043A4,
	CLINICAL_3D_VOLUME_PRESETS,
	VOLUME_3D_QUALITY_PRESETS,
	VOLUME_3D_COLORMAPS,
	CS_TOOL_KEYS,
	ANNOTATION_TOOL_NAMES_RU,
	annotationMeasureSchema,
	volumeTransferFunctionPresetSchema,
	type AnnotationMeasure,
	type Vec3,
} from "../cbctAnnotationEngine.js";

describe("Wave 135: CBCT 2D/3D Annotation Layer & 3D Volume Preset Engine", () => {
	it("1. calculateAnnotationStats: computes 3D Length distance accurately", () => {
		const p1: Vec3 = [0, 0, 0];
		const p2: Vec3 = [30, 40, 0]; // 3-4-5 triangle -> 50 mm
		const result = calculateAnnotationStats({
			toolType: "Length",
			points: [p1, p2],
		});
		assert.equal(result.formattedValue, "50.0 мм");
		assert.ok(result.stats.lengthMm !== undefined);
		assert.ok(Math.abs(result.stats.lengthMm - 50) < 1e-4);
	});

	it("2. calculateAnnotationStats: computes 3D Angle correctly", () => {
		const p1: Vec3 = [10, 0, 0];
		const vertex: Vec3 = [0, 0, 0];
		const p2: Vec3 = [0, 10, 0];
		const result = calculateAnnotationStats({
			toolType: "Angle",
			points: [p1, vertex, p2],
		});
		assert.equal(result.formattedValue, "90.0°");
		assert.ok(result.stats.angleDeg !== undefined);
		assert.ok(Math.abs(result.stats.angleDeg - 90) < 1e-4);
	});

	it("3. calculateAnnotationStats: computes Bidirectional measurements", () => {
		const p1: Vec3 = [0, 0, 0];
		const p2: Vec3 = [20, 0, 0]; // Length 20 mm
		const p3: Vec3 = [10, -5, 0];
		const p4: Vec3 = [10, 5, 0]; // Width 10 mm
		const result = calculateAnnotationStats({
			toolType: "Bidirectional",
			points: [p1, p2, p3, p4],
		});
		assert.equal(result.formattedValue, "20.0 × 10.0 мм");
		assert.equal(result.stats.lengthMm, 20);
		assert.equal(result.stats.widthMm, 10);
	});

	it("4. calculateAnnotationStats: calculates Probe HU densitometry", () => {
		const p: Vec3 = [12.5, 45.0, -10.0];
		const result = calculateAnnotationStats({
			toolType: "Probe",
			points: [p],
			huValues: [850],
		});
		assert.equal(result.formattedValue, "850 HU");
		assert.equal(result.stats.probeHu, 850);
		assert.equal(result.stats.mean, 850);
	});

	it("5. calculateAnnotationStats: calculates EllipticalROI area, perimeter and HU stats", () => {
		// Semi-axes: a = 10 mm, b = 5 mm
		const center: Vec3 = [0, 0, 0];
		const p1: Vec3 = [10, 0, 0];
		const p2: Vec3 = [0, 5, 0];
		const huValues = [350, 400, 450, 500, 550]; // mean = 450
		const result = calculateAnnotationStats({
			toolType: "EllipticalROI",
			points: [center, p1, p2],
			huValues,
		});
		assert.ok(result.stats.areaMm2 !== undefined);
		const expectedArea = Math.PI * 10 * 5;
		assert.ok(Math.abs(result.stats.areaMm2 - expectedArea) < 1e-2);
		assert.ok(result.formattedValue.includes("450 ±"));
		assert.ok(result.formattedValue.includes("HU"));
	});

	it("6. calculateAnnotationStats: calculates RectangleROI and FreehandROI areas", () => {
		// 10x20 rectangle
		const rectPoints: Vec3[] = [
			[0, 0, 0],
			[10, 0, 0],
			[10, 20, 0],
			[0, 20, 0],
		];
		const rectResult = calculateAnnotationStats({
			toolType: "RectangleROI",
			points: rectPoints,
		});
		assert.ok(rectResult.stats.areaMm2 !== undefined);
		assert.ok(Math.abs(rectResult.stats.areaMm2 - 200) < 1e-2);

		const freehandResult = calculateAnnotationStats({
			toolType: "FreehandROI",
			points: rectPoints,
		});
		assert.ok(freehandResult.stats.areaMm2 !== undefined);
		assert.ok(Math.abs(freehandResult.stats.areaMm2 - 200) < 1e-2);
	});

	it("7. getPresetColorMapStops: generates valid colormap stops across HU range", () => {
		for (const cmap of VOLUME_3D_COLORMAPS) {
			const stops = getPresetColorMapStops(cmap, { wc: 400, ww: 1600 });
			assert.ok(stops.length >= 2);
			assert.equal(stops[0]!.t, 0);
			assert.equal(stops[stops.length - 1]!.t, 1);
			assert.equal(stops[0]!.hu, -400); // 400 - 800
			assert.equal(stops[stops.length - 1]!.hu, 1200); // 400 + 800
			for (const stop of stops) {
				assert.ok(stop.hex.startsWith("#"));
				assert.equal(stop.hex.length, 7);
			}
		}
	});

	it("8. CLINICAL_3D_VOLUME_PRESETS: adheres strictly to Zod schema and ranges", () => {
		const presetKeys = Object.keys(CLINICAL_3D_VOLUME_PRESETS) as (keyof typeof CLINICAL_3D_VOLUME_PRESETS)[];
		assert.equal(presetKeys.length, 6);
		for (const key of presetKeys) {
			const preset = CLINICAL_3D_VOLUME_PRESETS[key];
			const parsed = volumeTransferFunctionPresetSchema.parse(preset);
			assert.equal(parsed.id, key);
			assert.ok(parsed.windowWidth > 0);
			assert.ok(parsed.maxOpacity >= 0 && parsed.maxOpacity <= 1);
		}
	});

	it("9. createAnnotationMeasure & filterVisibleAnnotations: factory and spatial filtering", () => {
		const ann1 = createAnnotationMeasure({
			id: "ann-axial-01",
			toolType: "Length",
			points: [[0, 0, 10], [10, 0, 10]],
			sliceView: "Axial",
			sliceCoordinate: 10,
			label: "Высота гребня 3.6",
		});
		const ann2 = createAnnotationMeasure({
			id: "ann-sagittal-01",
			toolType: "Probe",
			points: [[25, 0, 50]],
			sliceView: "Sagittal",
			sliceCoordinate: 25,
			label: "Плотность кости",
		});
		const annHidden = createAnnotationMeasure({
			id: "ann-hidden",
			toolType: "Angle",
			points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
			isVisible: false,
		});

		annotationMeasureSchema.parse(ann1);
		annotationMeasureSchema.parse(ann2);
		annotationMeasureSchema.parse(annHidden);

		const all = [ann1, ann2, annHidden];

		// Filter only visible
		const visible = filterVisibleAnnotations(all);
		assert.equal(visible.length, 2);

		// Filter by slice coordinate Axial Z=10 with tolerance 1.5mm
		const matchAxial = filterVisibleAnnotations(all, {
			sliceView: "Axial",
			sliceCoordinate: 10.5,
			maxDistanceMm: 1.0,
		});
		assert.equal(matchAxial.length, 1);
		assert.equal(matchAxial[0]!.id, "ann-axial-01");

		// Filter by query
		const queried = filterVisibleAnnotations(all, { searchQuery: "гребня" });
		assert.equal(queried.length, 1);
		assert.equal(queried[0]!.id, "ann-axial-01");
	});

	it("10. formatAnnotationReportForm043A4: generates clean A4 protocol with 0 cartoon emojis (Mandate 8d point 7)", () => {
		const ann1 = createAnnotationMeasure({
			id: "ann-1",
			toolType: "Length",
			points: [[0, 0, 0], [15, 0, 0]],
			sliceView: "Axial",
			sliceCoordinate: 15.0,
			label: "Ширина гребня 1.6",
		});
		const ann2 = createAnnotationMeasure({
			id: "ann-2",
			toolType: "Probe",
			points: [[5, 5, 5]],
			huValues: [650],
			label: "Кость D2",
		});

		const report = formatAnnotationReportForm043A4({
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			patientName: "Алексеев Алексей Алексеевич",
			patientBirthDate: "1985-04-12",
			patientCardNumber: "043-1284",
			studyDate: "2026-09-12",
			doctorName: "Д-р Иванов И.И.",
			selectedPreset: "Bone",
			annotations: [ann1, ann2],
			identifiedPathologies: [
				"Горизонтальная резорбция альвеолярного гребня в области 1.6",
				"Оптическая плотность костной ткани соответствует классу D2 по Мишу",
			],
			clinicalNotes: "Рекомендована направленная костная регенерация (НКР) перед установкой имплантата.",
		});

		assert.ok(report.includes("ПРОТОКОЛ РЕНТГЕНОМОРФОМЕТРИЧЕСКИХ ИЗМЕРЕНИЙ"));
		assert.ok(report.includes("Форма 043/у"));
		assert.ok(report.includes("Алексеев Алексей Алексеевич"));
		assert.ok(report.includes("Ширина гребня 1.6"));
		assert.ok(report.includes("Костная ткань"));

		// Strict cartoon emoji ban check per Mandate 8d item 7
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(report), false, "Report must contain 0 cartoon emojis");
	});
});
