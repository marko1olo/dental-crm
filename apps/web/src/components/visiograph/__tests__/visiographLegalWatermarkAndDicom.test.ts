import assert from "node:assert";
import { describe, test } from "node:test";
import {
	createDicomSecondaryCaptureFile,
	generateDicomUid,
	transliterateCyrillicToLatin,
} from "../VisiographDicomExporter";
import {
	buildForm043ProtocolText,
} from "../VisiographExportService";
import {
	computeDoctorSignatureDigest,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
} from "../VisiographLegalWatermark";
import { VISIOGRAPH_WINDOW_PRESETS } from "../VisiographWindowPresets";

describe("Visiograph Legal Watermark, DICOM SC Export & Form 043/u Integration", () => {
	test("computeDoctorSignatureDigest generates deterministic Russian EDS verification stamp", () => {
		const digest1 = computeDoctorSignatureDigest(
			"Петров Петр Петрович",
			"pat_789",
			"2026-08-22T12:00:00Z",
		);
		const digest2 = computeDoctorSignatureDigest(
			"Петров Петр Петрович",
			"pat_789",
			"2026-08-22T12:00:00Z",
		);

		assert.ok(digest1.startsWith("ГОСТ Р 34.10 · ЭЦП ["));
		assert.strictEqual(digest1, digest2, "Digest must be deterministic for the same parameters");

		// Different patient -> different digest
		const digestDiff = computeDoctorSignatureDigest(
			"Петров Петр Петрович",
			"pat_999",
			"2026-08-22T12:00:00Z",
		);
		assert.notStrictEqual(digest1, digestDiff);
	});

	test("transliterateCyrillicToLatin converts Russian medical names to DICOM PN standard", () => {
		const cyrillic = "Иванов Иван Петрович";
		const latin = transliterateCyrillicToLatin(cyrillic);
		assert.strictEqual(latin, "Ivanov Ivan Petrovich");

		const complex = "Щукина Юлия Фёдоровна";
		const latinComplex = transliterateCyrillicToLatin(complex);
		assert.strictEqual(latinComplex, "Shchukina Yuliya Fedorovna");
	});

	test("generateDicomUid produces valid Dente CRM UID format", () => {
		const uid = generateDicomUid("1");
		assert.ok(uid.startsWith("1.2.826.0.1.3680043.10.1."));
		assert.ok(uid.length > 25);
	});

	test("createDicomSecondaryCaptureFile generates valid Part 10 DICOM byte stream", () => {
		// Mock a minimal canvas element
		const fakeCanvas = {
			width: 64,
			height: 64,
			getContext: () => ({
				getImageData: () => ({
					data: new Uint8ClampedArray(64 * 64 * 4).fill(128),
				}),
			}),
		} as unknown as HTMLCanvasElement;

		const dicomBytes = createDicomSecondaryCaptureFile(fakeCanvas, {
			patientId: "PAT-TEST-001",
			patientFullName: "Смирнов Алексей",
			toothCode: "46",
			scaleMmPerPixel: 0.052,
			clinicName: "DENTE CLINIC",
			doctorFullName: "Д-р Кузнецов",
		});

		assert.ok(dicomBytes instanceof Uint8Array);
		assert.ok(dicomBytes.length > 132 + 64 * 64 * 3);

		// 1. Verify 128 bytes preamble
		for (let i = 0; i < 128; i++) {
			assert.strictEqual(dicomBytes[i], 0);
		}

		// 2. Verify "DICM" magic prefix at offset 128
		const magic = String.fromCharCode(
			dicomBytes[128] ?? 0,
			dicomBytes[129] ?? 0,
			dicomBytes[130] ?? 0,
			dicomBytes[131] ?? 0,
		);
		assert.strictEqual(magic, "DICM");

		// 3. Verify presence of Secondary Capture SOP Class UID (1.2.840.10008.5.1.4.1.1.7) in buffer
		const bufferStr = new TextDecoder("latin1").decode(dicomBytes);
		assert.ok(bufferStr.includes("1.2.840.10008.5.1.4.1.1.7"));
		assert.ok(bufferStr.includes("1.2.840.10008.1.2.1")); // Explicit VR Little Endian
		assert.ok(bufferStr.includes("Smirnov Aleksey")); // Transliterated name
		assert.ok(bufferStr.includes("PAT-TEST-001"));
	});

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
			calibration: {
				scaleMmPerPx: 0.0485,
				referenceType: "Калибровочный шарик",
				referenceMm: 5.0,
			},
			measurements: {
				rulers: [
					{ label: "Длина дистального корня", lengthMm: 14.8 },
					{ label: "Ширина апекса", lengthMm: 1.2 },
				],
				angles: [
					{ label: "Наклон коронки", angleDeg: 12.5, deviationFromVerticalDeg: 8.2 },
				],
				lesions: [
					{
						areaMm2: 28.4,
						equivalentDiameterMm: 6.0,
						classificationLabel: "Радикулярная кистогранулема",
						treatmentRecommendation: "Консервативная терапия Ca(OH)2 с контролем через 3 мес",
					},
				],
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
