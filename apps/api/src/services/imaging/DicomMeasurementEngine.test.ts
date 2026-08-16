/**
 * DicomMeasurementEngine.test.ts — Модульные тесты математического и калибровочного движка КТ / DICOM.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DICOM_WINDOW_PRESETS,
	DicomMeasurementEngine,
	applyWindowLevel,
	applyWindowPreset,
	batchApplyWindowLevel,
	checkNerveSafetyClearance,
	classifyMischBoneDensity,
	computePhysicalAreaMm2,
	computePhysicalDistanceMm,
	computePolylineLengthMm,
	evaluateImplantNerveProximity,
	hounsfieldUnitToRaw,
	interpolateCatmullRom3D,
	normalizePoint2D,
	normalizePoint3D,
	normalizeVoxelSpacing,
	rawToHounsfieldUnit,
	sampleDentalArchSpline,
	transformRawBufferToHU,
} from "./DicomMeasurementEngine.js";

describe("DicomMeasurementEngine — 1. Преобразование Voxel Value <-> Hounsfield Unit (HU)", () => {
	it("преобразует сырые значения вокселей в HU по стандартным DICOM параметрам (slope=1, intercept=-1024)", () => {
		// Воздух
		assert.equal(rawToHounsfieldUnit(0, 1.0, -1024.0), -1024.0);
		// Вода
		assert.equal(rawToHounsfieldUnit(1024, 1.0, -1024.0), 0.0);
		// Мышечная/мягкая ткань (+40 HU)
		assert.equal(rawToHounsfieldUnit(1064, 1.0, -1024.0), 40.0);
		// Кортикальная кость (+1200 HU)
		assert.equal(rawToHounsfieldUnit(2224, 1.0, -1024.0), 1200.0);
		// Титан имплантата (+3000 HU)
		assert.equal(rawToHounsfieldUnit(4024, 1.0, -1024.0), 3000.0);
	});

	it("корректно обрабатывает нестандартные rescale slope и intercept (например, slope=0.5, intercept=-500)", () => {
		const val = 1000;
		const hu = rawToHounsfieldUnit(val, 0.5, -500.0);
		assert.equal(hu, 0.0);
	});

	it("выполняет обратное преобразование HU -> Raw Voxel Value", () => {
		const hu = 450.0;
		const raw = hounsfieldUnitToRaw(hu, 1.0, -1024.0);
		assert.equal(raw, 1474.0);
		assert.equal(rawToHounsfieldUnit(raw, 1.0, -1024.0), hu);
	});

	it("выбрасывает ошибки валидации при невалидных входных данных калибровки", () => {
		assert.throws(() => rawToHounsfieldUnit(Number.NaN), TypeError);
		assert.throws(() => hounsfieldUnitToRaw(Number.POSITIVE_INFINITY), TypeError);
		assert.throws(() => hounsfieldUnitToRaw(100, 0, -1024), RangeError);
	});

	it("выполняет массовое векторное преобразование буфера вокселей в HU", () => {
		const raw = new Int16Array([0, 1024, 2048, 3072]);
		const huBuffer = transformRawBufferToHU(raw, 1.0, -1024.0);
		assert.equal(huBuffer.length, 4);
		assert.equal(huBuffer[0], -1024.0);
		assert.equal(huBuffer[1], 0.0);
		assert.equal(huBuffer[2], 1024.0);
		assert.equal(huBuffer[3], 2048.0);
	});

	it("работает через статические методы DicomMeasurementEngine", () => {
		assert.equal(DicomMeasurementEngine.rawToHU(1024), 0.0);
		assert.equal(DicomMeasurementEngine.huToRaw(0.0), 1024);
	});
});

describe("DicomMeasurementEngine — 2. Пресеты Window/Level и оконное преобразование", () => {
	it("содержит требуемые клинические пресеты согласно спецификации", () => {
		// Bone: W:1500 L:300
		assert.equal(DICOM_WINDOW_PRESETS.bone.windowWidth, 1500);
		assert.equal(DICOM_WINDOW_PRESETS.bone.windowLevel, 300);

		// Soft Tissue: W:400 L:40
		assert.equal(DICOM_WINDOW_PRESETS.soft_tissue.windowWidth, 400);
		assert.equal(DICOM_WINDOW_PRESETS.soft_tissue.windowLevel, 40);

		// Enamel: W:2000 L:500
		assert.equal(DICOM_WINDOW_PRESETS.enamel.windowWidth, 2000);
		assert.equal(DICOM_WINDOW_PRESETS.enamel.windowLevel, 500);

		// Nerve: W:800 L:200
		assert.equal(DICOM_WINDOW_PRESETS.nerve.windowWidth, 800);
		assert.equal(DICOM_WINDOW_PRESETS.nerve.windowLevel, 200);

		// Air/Sinus: W:600 L:-700
		assert.equal(DICOM_WINDOW_PRESETS.air_sinus.windowWidth, 600);
		assert.equal(DICOM_WINDOW_PRESETS.air_sinus.windowLevel, -700);
	});

	it("применяет формулу Window/Level с обрезкой и масштабированием в диапазон [0, 255]", () => {
		const width = 1000;
		const level = 200;
		// Границы: min = 200 - 500 = -300, max = 200 + 500 = +700

		// Ниже минимума -> 0
		assert.equal(applyWindowLevel(-400, width, level), 0);
		assert.equal(applyWindowLevel(-300, width, level), 0);

		// Выше максимума -> 255
		assert.equal(applyWindowLevel(800, width, level), 255);
		assert.equal(applyWindowLevel(700, width, level), 255);

		// В центре окна -> 127.5
		assert.equal(applyWindowLevel(200, width, level), 127.5);
	});

	it("поддерживает произвольные выходные диапазоны (например, нормализованный [0.0, 1.0])", () => {
		const width = 1000;
		const level = 0;
		const res = applyWindowLevel(0, width, level, [0.0, 1.0]);
		assert.equal(res, 0.5);
	});

	it("применяет функцию applyWindowPreset корректно для всех пресетов", () => {
		// Bone (W:1500, L:300) -> min: -450, max: +1050
		assert.equal(applyWindowPreset(-500, "bone"), 0);
		assert.equal(applyWindowPreset(1200, "bone"), 255);
		assert.equal(applyWindowPreset(300, "bone"), 127.5);

		// Soft tissue (W:400, L:40) -> min: -160, max: +240
		assert.equal(applyWindowPreset(40, "soft_tissue"), 127.5);

		// Nerve (W:800, L:200) -> min: -200, max: +600
		assert.equal(applyWindowPreset(200, "nerve"), 127.5);

		// Enamel (W:2000, L:500) -> min: -500, max: +1500
		assert.equal(applyWindowPreset(500, "enamel"), 127.5);
	});

	it("пакетирует оконное преобразование для буфера среза в 8-битный массив (градации серого)", () => {
		const hu = new Float32Array([-1000, 300, 2000]);
		const output = batchApplyWindowLevel(hu, 1500, 300); // Bone preset
		assert.equal(output.length, 3);
		assert.equal(output[0], 0);
		assert.equal(output[1], 128); // 127.5 -> round 128
		assert.equal(output[2], 255);
	});

	it("выбрасывает ошибки при некорректных параметрах окна", () => {
		assert.throws(() => applyWindowLevel(100, 0, 100), RangeError);
		assert.throws(() => applyWindowLevel(100, -500, 100), RangeError);
		assert.throws(
			// @ts-expect-error Тестирование некорректного ключа в runtime
			() => applyWindowPreset(100, "unknown_preset"),
			RangeError,
		);
	});
});

describe("DicomMeasurementEngine — 3. Калиброванные 2D/3D расстояния и геометрия", () => {
	it("вычисляет 2D евклидово расстояние с изотропным шагом вокселя", () => {
		const p1: [number, number] = [0, 0];
		const p2: [number, number] = [3, 4];
		const dist = computePhysicalDistanceMm(p1, p2, [1.0, 1.0]);
		assert.equal(dist, 5.0);
	});

	it("вычисляет 2D расстояние с анизотропным PixelSpacing (dx=0.2 мм, dy=0.25 мм)", () => {
		// dx = 10 пикс * 0.2 = 2.0 мм
		// dy = 0 пикс * 0.25 = 0.0 мм
		assert.equal(
			computePhysicalDistanceMm([0, 0], [10, 0], [0.2, 0.25]),
			2.0,
		);
		// dy = 8 пикс * 0.25 = 2.0 мм
		assert.equal(
			computePhysicalDistanceMm([0, 0], [0, 8], [0.2, 0.25]),
			2.0,
		);
		// Диагональ: dx=2.0, dy=2.0 -> sqrt(4 + 4) = sqrt(8) ≈ 2.8284 мм
		const diag = computePhysicalDistanceMm([0, 0], [10, 8], [0.2, 0.25]);
		assert.ok(Math.abs(diag - Math.SQRT2 * 2.0) < 1e-6);
	});

	it("вычисляет 3D расстояние с шагом вокселя КЛКТ (dx=0.2, dy=0.2, dz=0.4)", () => {
		// p1 = [0, 0, 0], p2 = [10, 10, 5]
		// deltaX = 10 * 0.2 = 2.0 мм
		// deltaY = 10 * 0.2 = 2.0 мм
		// deltaZ = 5 * 0.4 = 2.0 мм
		// dist = sqrt(4 + 4 + 4) = sqrt(12) ≈ 3.4641 мм
		const p1: [number, number, number] = [0, 0, 0];
		const p2: [number, number, number] = [10, 10, 5];
		const dist = computePhysicalDistanceMm(p1, p2, [0.2, 0.2, 0.4]);
		assert.ok(Math.abs(dist - Math.sqrt(12)) < 1e-6);
	});

	it("поддерживает точки и шаг в виде объектов { x, y, z } и { dx, dy, dz }", () => {
		const p1 = { x: 0, y: 0, z: 0 };
		const p2 = { x: 3, y: 4, z: 0 };
		const spacing = { dx: 1.0, dy: 1.0, dz: 1.0 };
		assert.equal(computePhysicalDistanceMm(p1, p2, spacing), 5.0);
	});

	it("рассчитывает суммарную длину ломаной линии (трассировка канала)", () => {
		const points: Array<[number, number, number]> = [
			[0, 0, 0],
			[10, 0, 0], // +2.0 мм
			[10, 10, 0], // +2.0 мм
			[10, 10, 10], // +2.0 мм
		];
		const totalLength = computePolylineLengthMm(points, [0.2, 0.2, 0.2]);
		assert.equal(Number(totalLength.toFixed(2)), 6.0);
	});

	it("рассчитывает площадь замкнутого 2D полигона по формуле Гаусса", () => {
		// Квадрат 10x10 вокселей с шагом dx=0.5, dy=0.5 -> физический размер 5x5 мм = 25 мм²
		const polygon: Array<[number, number]> = [
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		];
		const area = computePhysicalAreaMm2(polygon, [0.5, 0.5]);
		assert.equal(area, 25.0);
	});

	it("выбрасывает ошибку при отрицательном или нулевом шаге вокселя", () => {
		assert.throws(() => normalizeVoxelSpacing([0, 0.2, 0.2]), RangeError);
		assert.throws(() => normalizeVoxelSpacing([-0.2, 0.2, 0.2]), RangeError);
	});
});

describe("DicomMeasurementEngine — 4. Контроль безопасности имплантации и коллизий с нервом", () => {
	it("определяет БЕЗОПАСНУЮ позицию при зазоре >= 2.0 мм", () => {
		const apex: [number, number, number] = [10, 10, 15];
		const nerve: [number, number, number] = [10, 10, 10]; // Зазор = 5.0 мм
		const result = checkNerveSafetyClearance(apex, nerve, 2.0);

		assert.equal(result.status, "safe");
		assert.equal(result.isSafe, true);
		assert.equal(result.distanceMm, 5.0);
		assert.deepEqual(result.closestNervePointMm, [10, 10, 10]);
		assert.ok(result.message.includes("Безопасное позиционирование"));
	});

	it("определяет ОПАСНУЮ ЗОНУ (warning) при зазоре < 2.0 мм", () => {
		const apex: [number, number, number] = [10, 10, 11.2];
		const nerve: [number, number, number] = [10, 10, 10]; // Зазор = 1.2 мм
		const result = checkNerveSafetyClearance(apex, nerve, 2.0);

		assert.equal(result.status, "warning");
		assert.equal(result.isSafe, false);
		assert.equal(result.distanceMm, 1.2);
		assert.ok(result.message.includes("ОПАСНАЯ ЗОНА"));
	});

	it("определяет КРИТИЧЕСКУЮ КОЛЛИЗИЮ (collision) при перфорации канала (зазор = 0)", () => {
		const apex: [number, number, number] = [10, 10, 10];
		const nerve: [number, number, number] = [10, 10, 10];
		const result = checkNerveSafetyClearance(apex, nerve, 2.0);

		assert.equal(result.status, "collision");
		assert.equal(result.isSafe, false);
		assert.equal(result.distanceMm, 0.0);
		assert.ok(result.message.includes("КРИТИЧЕСКАЯ КОЛЛИЗИЯ"));
	});

	it("находит ближайшую точку из массива точек трассировки нижнечелюстного канала", () => {
		const apex: [number, number, number] = [0, 5, 0];
		const nervePath: Array<[number, number, number]> = [
			[0, 0, -10],
			[0, 0, 0], // Ближайшая точка: расстояние = 5.0 мм
			[0, 0, 10],
		];
		const result = checkNerveSafetyClearance(apex, nervePath, 2.0);
		assert.equal(result.status, "safe");
		assert.equal(result.distanceMm, 5.0);
		assert.deepEqual(result.closestNervePointMm, [0, 0, 0]);
	});

	it("выполняет полный 3D расчет сближения тела имплантата (evaluateImplantNerveProximity)", () => {
		// Имплантат: Apex = [0, 0, 0] (r=1.75 мм), Collar = [0, 0, 10] (r=2.0 мм)
		// Канал нерва: радиус R=1.5 мм
		const implant = {
			apexWorld: [0, 0, 0] as [number, number, number],
			collarWorld: [0, 0, 10] as [number, number, number],
			radiusApexMm: 1.75,
			radiusCollarMm: 2.0,
		};

		// Точка нерва на расстоянии 10 мм по оси X: центр d=10, поверхность = 10 - 1.75 - 1.5 = 6.75 мм -> SAFE
		const nervePointsSafe: Array<[number, number, number]> = [[10, 0, 0]];
		const resSafe = evaluateImplantNerveProximity(implant, nervePointsSafe, 1.5, 2.0);
		assert.equal(resSafe.status, "safe");
		assert.equal(resSafe.minDistanceMm, 6.75);

		// Точка нерва на расстоянии 4.5 мм: поверхность = 4.5 - 1.75 - 1.5 = 1.25 мм -> WARNING (< 2.0 мм)
		const nervePointsWarning: Array<[number, number, number]> = [[4.5, 0, 0]];
		const resWarn = evaluateImplantNerveProximity(implant, nervePointsWarning, 1.5, 2.0);
		assert.equal(resWarn.status, "warning");
		assert.equal(resWarn.minDistanceMm, 1.25);

		// Точка нерва на расстоянии 3.0 мм: поверхность = 3.0 - 1.75 - 1.5 = -0.25 мм -> COLLISION (<= 0)
		const nervePointsCollision: Array<[number, number, number]> = [[3.0, 0, 0]];
		const resCollision = evaluateImplantNerveProximity(implant, nervePointsCollision, 1.5, 2.0);
		assert.equal(resCollision.status, "collision");
		assert.equal(resCollision.minDistanceMm, -0.25);
	});
});

describe("DicomMeasurementEngine — 5. Классификация плотности кости по Мишу (D1–D5)", () => {
	it("классифицирует кость D1 (> 1250 HU)", () => {
		const res = classifyMischBoneDensity(1450);
		assert.equal(res.boneClass, "D1");
		assert.ok(res.description.includes("D1"));
		assert.ok(res.expectedPrimaryStability.includes("> 45-50 Нсм"));
	});

	it("классифицирует кость D2 (850 - 1250 HU)", () => {
		const res = classifyMischBoneDensity(950);
		assert.equal(res.boneClass, "D2");
		assert.ok(res.description.includes("D2"));
	});

	it("классифицирует кость D3 (350 - 850 HU)", () => {
		const res = classifyMischBoneDensity(600);
		assert.equal(res.boneClass, "D3");
		assert.ok(res.description.includes("D3"));
		assert.ok(res.implantProtocolAdvice.includes("under-drilling"));
	});

	it("классифицирует кость D4 (150 - 350 HU)", () => {
		const res = classifyMischBoneDensity(220);
		assert.equal(res.boneClass, "D4");
		assert.ok(res.description.includes("D4"));
	});

	it("классифицирует кость D5 (< 150 HU)", () => {
		const res = classifyMischBoneDensity(80);
		assert.equal(res.boneClass, "D5");
		assert.ok(res.description.includes("D5"));
	});
});

describe("DicomMeasurementEngine — 6. Сплайн зубной дуги Катмулла-Рома (Catmull-Rom)", () => {
	it("интерполирует точки сплайна без разрывов", () => {
		const p0: [number, number, number] = [0, 0, 0];
		const p1: [number, number, number] = [10, 5, 0];
		const p2: [number, number, number] = [20, 5, 0];
		const p3: [number, number, number] = [30, 0, 0];

		const mid = interpolateCatmullRom3D(p0, p1, p2, p3, 0.5);
		assert.ok(mid[0] > 10 && mid[0] < 20);
	});

	it("дискретизирует зубную дугу с расчетом касательных и нормалей", () => {
		const archControlPoints: Array<[number, number, number]> = [
			[-20, -10, 0],
			[-10, 0, 0],
			[0, 5, 0],
			[10, 0, 0],
			[20, -10, 0],
		];

		const samples = sampleDentalArchSpline(archControlPoints, 1.0);
		assert.ok(samples.length >= 5);

		// Проверка монотонного возрастания длины дуги
		for (let i = 1; i < samples.length; i++) {
			assert.ok(samples[i]!.arcLengthMm >= samples[i - 1]!.arcLengthMm);
		}

		// Проверка ортогональности нормали и касательной (скалярное произведение = 0 в XY)
		for (const sample of samples) {
			const dot =
				sample.tangent[0] * sample.normal[0] +
				sample.tangent[1] * sample.normal[1];
			assert.ok(Math.abs(dot) < 1e-4);
		}
	});
});
