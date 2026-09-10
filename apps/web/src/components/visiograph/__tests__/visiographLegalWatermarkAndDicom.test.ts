import assert from "node:assert";
import { describe, test } from "node:test";
import {
	createDicomIntraoral16File,
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

	test("createDicomIntraoral16File generates valid Part 10 DICOM with DICM header, Group 0002/0008/0028/7FE0 tags and uncompressed 16-bit pixel words", () => {
		const width = 16;
		const height = 16;
		const pixelData16 = new Uint16Array(width * height);
		for (let i = 0; i < pixelData16.length; i++) {
			pixelData16[i] = (i * 137) % 4096; // 12-bit sensor range [0..4095]
		}

		const dicomBytes = createDicomIntraoral16File({
			width,
			height,
			pixelData16,
			patientId: "PAT-IO-16-001",
			patientFullName: "Воронова Елена Михайловна",
			patientBirthDate: "19880512",
			patientSex: "F",
			toothCode: "21",
			scaleMmPerPixel: 0.02,
			clinicName: "DENTE CLINIC PREMIUM",
			doctorFullName: "Д-р Семенов",
			bitsAllocated: 16,
			bitsStored: 12,
			highBit: 11,
			windowCenter: 2048,
			windowWidth: 4096,
		});

		assert.ok(dicomBytes instanceof Uint8Array);
		// 128 preamble + 4 magic + tags + 12 (OW header) + 512 (pixel data)
		assert.ok(dicomBytes.length > 132 + width * height * 2);

		// 1. 128-byte preamble must be zeroed
		for (let i = 0; i < 128; i++) {
			assert.strictEqual(dicomBytes[i], 0);
		}

		// 2. DICM magic prefix at bytes 128..131
		const magic = String.fromCharCode(
			dicomBytes[128] ?? 0,
			dicomBytes[129] ?? 0,
			dicomBytes[130] ?? 0,
			dicomBytes[131] ?? 0,
		);
		assert.strictEqual(magic, "DICM");

		// Helper to find exact tag (group, element) offset in buffer
		const findTag = (group: number, element: number): number => {
			for (let i = 132; i <= dicomBytes.length - 8; i++) {
				if (
					dicomBytes[i] === (group & 0xff) &&
					dicomBytes[i + 1] === ((group >> 8) & 0xff) &&
					dicomBytes[i + 2] === (element & 0xff) &&
					dicomBytes[i + 3] === ((element >> 8) & 0xff)
				) {
					return i;
				}
			}
			return -1;
		};

		// 3. Group 0002: File Meta Information tags
		// (0002, 0000) FileMetaInformationGroupLength
		const tag0002GroupLen = findTag(0x0002, 0x0000);
		assert.ok(tag0002GroupLen >= 132, "Tag (0002,0000) must be present");

		// (0002, 0002) MediaStorageSOPClassUID = 1.2.840.10008.5.1.4.1.1.1.3 (Digital Intra-Oral X-Ray Image Storage)
		const tag0002SopClass = findTag(0x0002, 0x0002);
		assert.ok(tag0002SopClass >= 132, "Tag (0002,0002) must be present");

		// (0002, 0010) TransferSyntaxUID = 1.2.840.10008.1.2.1 (Explicit VR Little Endian)
		const tag0002TransferSyntax = findTag(0x0002, 0x0010);
		assert.ok(tag0002TransferSyntax >= 132, "Tag (0002,0010) must be present");

		const bufferStr = new TextDecoder("latin1").decode(dicomBytes);
		assert.ok(bufferStr.includes("1.2.840.10008.5.1.4.1.1.1.3"), "Must contain Intra-Oral SOP Class UID");
		assert.ok(bufferStr.includes("1.2.840.10008.1.2.1"), "Must contain Explicit VR Little Endian UID");

		// 4. Group 0008: General Study & Equipment tags
		// (0008, 0016) SOPClassUID
		const tag0008SopClass = findTag(0x0008, 0x0016);
		assert.ok(tag0008SopClass >= 132, "Tag (0008,0016) must be present");

		// (0008, 0060) Modality ("IO")
		const tag0008Modality = findTag(0x0008, 0x0060);
		assert.ok(tag0008Modality >= 132, "Tag (0008,0060) must be present");
		const modalityVR = String.fromCharCode(dicomBytes[tag0008Modality + 4] ?? 0, dicomBytes[tag0008Modality + 5] ?? 0);
		assert.strictEqual(modalityVR, "CS");

		assert.ok(bufferStr.includes("Voronova Elena Mikhaylovna"), "Must contain transliterated patient name");
		assert.ok(bufferStr.includes("PAT-IO-16-001"), "Must contain patient ID");
		assert.ok(bufferStr.includes("ORIGINAL\\PRIMARY"), "Must contain ImageType ORIGINAL\\PRIMARY");

		// 5. Group 0028: Image Pixel tags
		// (0028, 0002) SamplesPerPixel = 1
		const tag0028Samples = findTag(0x0028, 0x0002);
		assert.ok(tag0028Samples >= 132, "Tag (0028,0002) must be present");

		// (0028, 0004) PhotometricInterpretation = "MONOCHROME2"
		const tag0028Photometric = findTag(0x0028, 0x0004);
		assert.ok(tag0028Photometric >= 132, "Tag (0028,0004) must be present");
		assert.ok(bufferStr.includes("MONOCHROME2"), "Must contain PhotometricInterpretation MONOCHROME2");

		// (0028, 0010) Rows & (0028, 0011) Columns
		const tag0028Rows = findTag(0x0028, 0x0010);
		const tag0028Cols = findTag(0x0028, 0x0011);
		assert.ok(tag0028Rows >= 132, "Tag (0028,0010) Rows must be present");
		assert.ok(tag0028Cols >= 132, "Tag (0028,0011) Columns must be present");

		// (0028, 0100) BitsAllocated = 16
		const tag0028BitsAllocated = findTag(0x0028, 0x0100);
		assert.ok(tag0028BitsAllocated >= 132, "Tag (0028,0100) BitsAllocated must be present");

		// 6. Group 7FE0: Pixel Data (7FE0, 0010)
		const tag7fe0PixelData = findTag(0x7fe0, 0x0010);
		assert.ok(tag7fe0PixelData >= 132, "Tag (7FE0,0010) must be present");

		// Verify VR is "OW"
		const vr7fe0 = String.fromCharCode(
			dicomBytes[tag7fe0PixelData + 4] ?? 0,
			dicomBytes[tag7fe0PixelData + 5] ?? 0,
		);
		assert.strictEqual(vr7fe0, "OW", "Pixel Data VR must be OW for 16-bit sensor words");

		// Verify 32-bit length of pixel data (offset + 8 in 12-byte extended VR header)
		const view = new DataView(dicomBytes.buffer, dicomBytes.byteOffset, dicomBytes.byteLength);
		const pixelDataByteLen = view.getUint32(tag7fe0PixelData + 8, true);
		assert.strictEqual(pixelDataByteLen, width * height * 2, "PixelData byte length must be width * height * 2");

		// Verify that raw 16-bit words match input byte-for-byte
		const pixelDataOffset = tag7fe0PixelData + 12;
		for (let i = 0; i < width * height; i++) {
			const word = view.getUint16(pixelDataOffset + i * 2, true);
			assert.strictEqual(word, pixelData16[i], `Pixel word at index ${i} must match input exactly`);
		}
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
