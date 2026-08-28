/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIT TESTS: CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Real-world Visigraph File Intake (EzDent-i, Romexis, Sidexis, CliniView)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	HotFolderSyncEngine,
	calculateAutoContrastLevels,
	calculateLevenshteinDistance,
	detectRadiologySoftwareVendor,
	extractRadiologyMetadata,
	isValidToothFdi,
	matchRadiologyStudyWithVisits,
	normalizeCyrillicName,
	normalizeRadiologyBuffer,
	type ActiveVisitContext,
	type ExtractedRadiologyMetadata,
} from "../radiology/hotFolderSyncEngine.js";

/**
 * Вспомогательная функция для генерации синтетического бинарного DICOM-буфера.
 */
function createSyntheticDicomBuffer(options: {
	readonly patientName?: string;
	readonly patientId?: string;
	readonly modality?: string;
	readonly studyDate?: string;
	readonly rows?: number;
	readonly columns?: number;
	readonly bitsAllocated?: number;
	readonly windowCenter?: string;
	readonly windowWidth?: string;
	readonly hasPreamble?: boolean;
}): Uint8Array {
	const elements: { tag: [number, number]; vr: string; value: string | number | Uint8Array }[] = [];

	if (options.modality) {
		elements.push({ tag: [0x0008, 0x0060], vr: "CS", value: options.modality });
	}
	if (options.studyDate) {
		elements.push({ tag: [0x0008, 0x0020], vr: "DA", value: options.studyDate });
	}
	if (options.patientName) {
		elements.push({ tag: [0x0010, 0x0010], vr: "PN", value: options.patientName });
	}
	if (options.patientId) {
		elements.push({ tag: [0x0010, 0x0020], vr: "LO", value: options.patientId });
	}
	if (options.rows) {
		elements.push({ tag: [0x0028, 0x0010], vr: "US", value: options.rows });
	}
	if (options.columns) {
		elements.push({ tag: [0x0028, 0x0011], vr: "US", value: options.columns });
	}
	if (options.bitsAllocated) {
		elements.push({ tag: [0x0028, 0x0100], vr: "US", value: options.bitsAllocated });
	}
	if (options.windowCenter) {
		elements.push({ tag: [0x0028, 0x1050], vr: "DS", value: options.windowCenter });
	}
	if (options.windowWidth) {
		elements.push({ tag: [0x0028, 0x1051], vr: "DS", value: options.windowWidth });
	}

	const preambleSize = options.hasPreamble !== false ? 132 : 0;
	let totalSize = preambleSize;

	for (const el of elements) {
		const isUS = el.vr === "US";
		const valLen = isUS ? 2 : typeof el.value === "string" ? el.value.length : (el.value as Uint8Array).length;
		totalSize += 8 + valLen;
	}

	const buf = new Uint8Array(totalSize);
	const view = new DataView(buf.buffer);

	if (options.hasPreamble !== false) {
		buf[128] = "D".charCodeAt(0);
		buf[129] = "I".charCodeAt(0);
		buf[130] = "C".charCodeAt(0);
		buf[131] = "M".charCodeAt(0);
	}

	let offset = preambleSize;

	for (const el of elements) {
		const [group, elem] = el.tag;
		view.setUint16(offset, group, true);
		view.setUint16(offset + 2, elem, true);
		buf[offset + 4] = el.vr.charCodeAt(0);
		buf[offset + 5] = el.vr.charCodeAt(1);

		if (el.vr === "US" && typeof el.value === "number") {
			view.setUint16(offset + 6, 2, true);
			view.setUint16(offset + 8, el.value, true);
			offset += 10;
		} else if (typeof el.value === "string") {
			const strBytes = new TextEncoder().encode(el.value);
			view.setUint16(offset + 6, strBytes.length, true);
			buf.set(strBytes, offset + 8);
			offset += 8 + strBytes.length;
		}
	}

	return buf;
}

describe("Wave 17: Pragmatic Hot-Folder & Radiology Intake Engine (No Browser TWAIN/USB)", () => {
	describe("1. Filename & Vendor Metadata Extraction", () => {
		it("1.1 parses Vatech EzDent-i filename with Barcode, Patient Card, FDI Tooth and Date", () => {
			const filename = "VIS-2026-10492_PAT-7741_T36_Ivanov_I_I_20260828.dcm";
			const meta = extractRadiologyMetadata(filename);

			assert.strictEqual(meta.visitBarcode, "VIS-2026-10492");
			assert.strictEqual(meta.patientCardNumber, "PAT-7741");
			assert.strictEqual(meta.patientLastName, "Ivanov");
			assert.strictEqual(meta.patientFirstName, "I");
			assert.strictEqual(meta.patientMiddleName, "I");
			assert.strictEqual(meta.patientFullName, "Ivanov I I");
			assert.deepStrictEqual(meta.toothFdiList, [36]);
			assert.strictEqual(meta.studyType, "PERIAPICAL");
			assert.strictEqual(meta.acquisitionDate, "20260828");
			assert.strictEqual(meta.isControlStudy, false);
		});

		it("1.2 parses Planmeca Romexis exported TIFF with tooth range and periapical type", () => {
			const filename = "Romexis_Export_Smirnov_E_A_T11-13_periapical_2026-08-28.tif";
			const meta = extractRadiologyMetadata(filename);

			assert.strictEqual(meta.vendorSoftwareHint, "romexis");
			assert.strictEqual(meta.patientLastName, "Smirnov");
			assert.strictEqual(meta.patientFirstName, "E");
			assert.strictEqual(meta.patientMiddleName, "A");
			assert.deepStrictEqual(meta.toothFdiList, [11, 12, 13]);
			assert.strictEqual(meta.studyType, "PERIAPICAL");
			assert.strictEqual(meta.acquisitionDate, "20260828");
		});

		it("1.3 parses Sirona Sidexis barcode and control post-op study flags", () => {
			const filename = "Sidexis_BARCODE_990142_zub46_kontrol.png";
			const meta = extractRadiologyMetadata(filename);

			assert.strictEqual(meta.vendorSoftwareHint, "sidexis");
			assert.strictEqual(meta.visitBarcode, "BARCODE_990142");
			assert.deepStrictEqual(meta.toothFdiList, [46]);
			assert.strictEqual(meta.isControlStudy, true);
			assert.strictEqual(meta.studyType, "PERIAPICAL");
		});

		it("1.4 parses KaVo CliniView panoramic (OPTG) study", () => {
			const filename = "CliniView_KARTA-5512_OPTG_Panoram.jpg";
			const meta = extractRadiologyMetadata(filename);

			assert.strictEqual(meta.vendorSoftwareHint, "cliniview");
			assert.strictEqual(meta.patientCardNumber, "KARTA-5512");
			assert.strictEqual(meta.studyType, "PANORAMIC");
		});

		it("1.5 detects CBCT 3D and bitewing studies correctly", () => {
			const cbctMeta = extractRadiologyMetadata("Vatech_3D_CBCT_Slice_20260828.dcm");
			assert.strictEqual(cbctMeta.studyType, "CBCT");

			const bwMeta = extractRadiologyMetadata("Bitewing_T16_T46_BW.tif");
			assert.strictEqual(bwMeta.studyType, "BITEWING");
			assert.deepStrictEqual(bwMeta.toothFdiList, [16, 46]);
		});

		it("1.6 validates FDI tooth numbers correctly (permanent 11-48 and deciduous 51-85)", () => {
			assert.strictEqual(isValidToothFdi(11), true);
			assert.strictEqual(isValidToothFdi(48), true);
			assert.strictEqual(isValidToothFdi(55), true);
			assert.strictEqual(isValidToothFdi(85), true);

			assert.strictEqual(isValidToothFdi(19), false);
			assert.strictEqual(isValidToothFdi(49), false);
			assert.strictEqual(isValidToothFdi(99), false);
			assert.strictEqual(isValidToothFdi(0), false);
		});

		it("1.7 identifies software vendor correctly by filename signatures", () => {
			assert.strictEqual(detectRadiologySoftwareVendor("C:/EzDent-i/Export/img1.dcm"), "ezdent_i");
			assert.strictEqual(detectRadiologySoftwareVendor("Planmeca_Romexis_scan.png"), "romexis");
			assert.strictEqual(detectRadiologySoftwareVendor("Sidexis4_Patient.dcm"), "sidexis");
			assert.strictEqual(detectRadiologySoftwareVendor("CliniView_KaVo.tif"), "cliniview");
			assert.strictEqual(detectRadiologySoftwareVendor("VixWin_Pro_Shot.jpg"), "vixwin");
			assert.strictEqual(detectRadiologySoftwareVendor("Handy_Dental_RVG.bmp"), "handydental");
			assert.strictEqual(detectRadiologySoftwareVendor("random_image.png"), "generic");
		});
	});

	describe("2. DICOM Header Extraction & Metadata Enrichment", () => {
		it("2.1 enriches metadata with binary DICOM dataset tags", () => {
			const dicomBytes = createSyntheticDicomBuffer({
				patientName: "Petrov^Petr^Petrovich",
				patientId: "PAT-9921",
				modality: "IO",
				studyDate: "20260828",
				rows: 1024,
				columns: 1536,
				bitsAllocated: 16,
				windowCenter: "2048",
				windowWidth: "4096",
				hasPreamble: true,
			});

			const engine = new HotFolderSyncEngine();
			const study = engine.ingestFile("shot_001.dcm", dicomBytes);

			assert.strictEqual(study.status, "SUCCESS");
			assert.strictEqual(study.isDicom, true);
			assert.strictEqual(study.metadata.patientLastName, "Petrov");
			assert.strictEqual(study.metadata.patientFirstName, "Petr");
			assert.strictEqual(study.metadata.patientMiddleName, "Petrovich");
			assert.strictEqual(study.metadata.patientCardNumber, "PAT-9921");
			assert.strictEqual(study.metadata.studyType, "PERIAPICAL");
			assert.strictEqual(study.metadata.rows, 1024);
			assert.strictEqual(study.metadata.columns, 1536);
			assert.strictEqual(study.metadata.windowCenter, 2048);
			assert.strictEqual(study.metadata.windowWidth, 4096);
		});
	});

	describe("3. Transliteration & Russian Name Normalization", () => {
		it("3.1 normalizes Cyrillic and Latin transliterated names accurately", () => {
			assert.strictEqual(normalizeCyrillicName("Иванов Иван Иванович"), "иванов иван иванович");
			assert.strictEqual(normalizeCyrillicName("Ivanov Ivan"), "иванов иван");
			assert.strictEqual(normalizeCyrillicName("Smirnov E.A."), "смирнов е а");
			assert.strictEqual(normalizeCyrillicName("Shchukin Petr"), "щукин петр");
			assert.strictEqual(normalizeCyrillicName("Kuznetsova Yulia"), "кузнецова юлиа");
		});

		it("3.2 calculates Levenshtein distance accurately", () => {
			assert.strictEqual(calculateLevenshteinDistance("иванов", "иванов"), 0);
			assert.strictEqual(calculateLevenshteinDistance("иванов", "иванова"), 1);
			assert.strictEqual(calculateLevenshteinDistance("смирнов", "смиронов"), 1);
			assert.strictEqual(calculateLevenshteinDistance("петренко", "сидоренко"), 4);
		});
	});

	describe("4. Intelligent Visit Matching Engine", () => {
		const mockActiveVisits: ActiveVisitContext[] = [
			{
				visitId: "VIS-2026-10492",
				patientId: "PAT-7741",
				patientFullName: "Иванов Иван Иванович",
				patientCardNumber: "PAT-7741",
				visitBarcode: "VIS-2026-10492",
				doctorId: "doc-1",
				cabinetName: "Кабинет 1",
				assignedToothList: [36],
				status: "in_treatment",
			},
			{
				visitId: "VIS-2026-10493",
				patientId: "PAT-8812",
				patientFullName: "Смирнова Елена Александровна",
				patientCardNumber: "KARTA-5512",
				visitBarcode: "990142",
				doctorId: "doc-2",
				cabinetName: "Кабинет 2",
				assignedToothList: [11, 12, 13],
				status: "in_treatment",
			},
			{
				visitId: "VIS-2026-10494",
				patientId: "PAT-9933",
				patientFullName: "Барабаш Сергей Владимирович",
				patientCardNumber: "PAT-9933",
				doctorId: "doc-1",
				cabinetName: "Кабинет 1",
				assignedToothList: [46],
				status: "planned",
			},
		];

		it("4.1 Strategy 1: matches by exact barcode with confidence 1.0", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: null,
				patientFirstName: null,
				patientMiddleName: null,
				patientFullName: null,
				visitId: null,
				visitBarcode: "990142",
				toothFdiList: [],
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.confidenceScore, 1.0);
			assert.strictEqual(match.matchStrategy, "EXACT_BARCODE");
			assert.strictEqual(match.matchedVisit?.patientFullName, "Смирнова Елена Александровна");
		});

		it("4.2 Strategy 2: matches by exact Visit ID with confidence 1.0", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: null,
				patientFirstName: null,
				patientMiddleName: null,
				patientFullName: null,
				visitId: "VIS-2026-10492",
				visitBarcode: null,
				toothFdiList: [],
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.confidenceScore, 1.0);
			assert.strictEqual(match.matchStrategy, "EXACT_VISIT_ID");
			assert.strictEqual(match.matchedVisit?.visitId, "VIS-2026-10492");
		});

		it("4.3 Strategy 3: matches by exact Patient Card Number with confidence 0.95", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: "KARTA-5512",
				patientCardNumber: "KARTA-5512",
				patientLastName: null,
				patientFirstName: null,
				patientMiddleName: null,
				patientFullName: null,
				visitId: null,
				visitBarcode: null,
				toothFdiList: [],
				studyType: "PANORAMIC",
				modalityCode: "PX",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.confidenceScore, 0.95);
			assert.strictEqual(match.matchStrategy, "EXACT_PATIENT_CARD");
			assert.strictEqual(match.matchedVisit?.patientFullName, "Смирнова Елена Александровна");
		});

		it("4.4 Strategy 4: matches by full transliterated name with confidence 0.90", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: "Barabash",
				patientFirstName: "Sergey",
				patientMiddleName: "Vladimirovich",
				patientFullName: "Barabash Sergey Vladimirovich",
				visitId: null,
				visitBarcode: null,
				toothFdiList: [],
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.confidenceScore, 0.9);
			assert.strictEqual(match.matchStrategy, "EXACT_NAME_MATCH");
			assert.strictEqual(match.matchedVisit?.patientFullName, "Барабаш Сергей Владимирович");
		});

		it("4.5 Strategy 5: matches fuzzy name and tooth overlap with high confidence", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: "Smirnov",
				patientFirstName: "E",
				patientMiddleName: null,
				patientFullName: "Smirnov E",
				visitId: null,
				visitBarcode: null,
				toothFdiList: [12], // Overlaps with [11, 12, 13]
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, true);
			assert.ok(match.confidenceScore >= 0.85);
			assert.strictEqual(match.matchStrategy, "FUZZY_NAME_AND_TOOTH_MATCH");
			assert.strictEqual(match.matchedVisit?.patientFullName, "Смирнова Елена Александровна");
		});

		it("4.6 Strategy 6: falls back to single in-treatment patient when unassigned", () => {
			const singleChairVisit: ActiveVisitContext[] = [
				{
					visitId: "VIS-SINGLE",
					patientId: "PAT-SINGLE",
					patientFullName: "Соколова Анна Михайловна",
					status: "in_treatment",
				},
			];

			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: null,
				patientFirstName: null,
				patientMiddleName: null,
				patientFullName: null,
				visitId: null,
				visitBarcode: null,
				toothFdiList: [],
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, singleChairVisit);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.confidenceScore, 0.6);
			assert.strictEqual(match.matchStrategy, "CABINET_TIME_WINDOW_FALLBACK");
			assert.strictEqual(match.matchedVisit?.patientFullName, "Соколова Анна Михайловна");
		});

		it("4.7 returns UNASSIGNED when no matching visits exist", () => {
			const meta: ExtractedRadiologyMetadata = {
				patientId: null,
				patientCardNumber: null,
				patientLastName: "Nonexistent",
				patientFirstName: null,
				patientMiddleName: null,
				patientFullName: "Nonexistent",
				visitId: null,
				visitBarcode: null,
				toothFdiList: [],
				studyType: "PERIAPICAL",
				modalityCode: "IO",
				acquisitionDate: "20260828",
				acquisitionTime: null,
				isControlStudy: false,
				vendorSoftwareHint: "generic",
			};

			const match = matchRadiologyStudyWithVisits(meta, mockActiveVisits);
			assert.strictEqual(match.isMatched, false);
			assert.strictEqual(match.confidenceScore, 0);
			assert.strictEqual(match.matchStrategy, "UNASSIGNED");
		});
	});

	describe("5. Image Normalization & Display Pipeline", () => {
		it("5.1 calculates auto-contrast levels based on histogram percentiles", () => {
			const pixels = new Uint16Array(100);
			for (let i = 0; i < 100; i++) {
				pixels[i] = 1000 + i * 50; // 1000..5950
			}

			const levels = calculateAutoContrastLevels(pixels);
			assert.ok(levels.windowCenter > 1000);
			assert.ok(levels.windowWidth > 100);
		});

		it("5.2 normalizes 16-bit monochrome buffer to 8-bit grayscale and 32-bit RGBA", () => {
			const width = 16;
			const height = 16;
			const raw16 = new Uint16Array(width * height);
			for (let i = 0; i < raw16.length; i++) {
				raw16[i] = i * 100;
			}

			const normalized = normalizeRadiologyBuffer(raw16, width, height, {
				windowCenter: 12000,
				windowWidth: 20000,
				brightness: 10,
				contrast: 20,
				invert: false,
				gamma: 1.2,
			});

			assert.strictEqual(normalized.width, width);
			assert.strictEqual(normalized.height, height);
			assert.strictEqual(normalized.bitDepth, 16);
			assert.strictEqual(normalized.grayscale8Bit.length, width * height);
			assert.strictEqual(normalized.rgba32Bit.length, width * height * 4);
			assert.strictEqual(normalized.appliedBrightness, 10);
			assert.strictEqual(normalized.appliedContrast, 20);
			assert.strictEqual(normalized.appliedInvert, false);
			assert.strictEqual(normalized.appliedGamma, 1.2);

			// Alpha channel must be 255 for all pixels
			for (let i = 3; i < normalized.rgba32Bit.length; i += 4) {
				assert.strictEqual(normalized.rgba32Bit[i], 255);
			}
		});

		it("5.3 applies negative / invert filter for caries detection", () => {
			const width = 4;
			const height = 4;
			const raw16 = new Uint16Array(width * height);
			raw16.fill(0); // completely black

			const normal = normalizeRadiologyBuffer(raw16, width, height, {
				windowCenter: 32768,
				windowWidth: 65536,
				invert: false,
			});
			assert.strictEqual(normal.grayscale8Bit[0], 0);

			const inverted = normalizeRadiologyBuffer(raw16, width, height, {
				windowCenter: 32768,
				windowWidth: 65536,
				invert: true,
			});
			assert.strictEqual(inverted.grayscale8Bit[0], 255);
		});
	});

	describe("6. HotFolderSyncEngine Complete Ingestion & Quarantine Lifecycles", () => {
		it("6.1 quarantines zero-byte files", () => {
			const engine = new HotFolderSyncEngine();
			let quarantineEventFired = false;
			engine.onQuarantine((study) => {
				quarantineEventFired = true;
				assert.strictEqual(study.quarantineReason, "ZERO_BYTE_FILE");
			});

			const study = engine.ingestFile("empty.dcm", new Uint8Array(0));
			assert.strictEqual(study.status, "QUARANTINED");
			assert.strictEqual(study.quarantineReason, "ZERO_BYTE_FILE");
			assert.strictEqual(quarantineEventFired, true);
		});

		it("6.2 quarantines unsupported file extensions", () => {
			const engine = new HotFolderSyncEngine();
			const study = engine.ingestFile("virus.exe", new Uint8Array([1, 2, 3, 4]));
			assert.strictEqual(study.status, "QUARANTINED");
			assert.strictEqual(study.quarantineReason, "UNSUPPORTED_EXTENSION");
		});

		it("6.3 quarantines corrupted DICOM headers", () => {
			const engine = new HotFolderSyncEngine();
			const study = engine.ingestFile("corrupt.dcm", new Uint8Array(100).fill(42));
			assert.strictEqual(study.status, "QUARANTINED");
			assert.strictEqual(study.quarantineReason, "CORRUPTED_DICOM_HEADER");
		});

		it("6.4 detects and quarantines duplicate file ingestions", () => {
			const engine = new HotFolderSyncEngine();
			const buffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]); // fake PNG header

			const first = engine.ingestFile("shot_01.png", buffer);
			assert.strictEqual(first.status, "SUCCESS");

			const second = engine.ingestFile("shot_01_duplicate.png", buffer);
			assert.strictEqual(second.status, "QUARANTINED");
			assert.strictEqual(second.quarantineReason, "DUPLICATE_INGESTION");
		});

		it("6.5 ingests batch of files and computes accurate engine statistics", () => {
			const engine = new HotFolderSyncEngine();
			// 2 in-treatment visits so fallback strategy doesn't single-match unknown studies
			engine.setActiveVisits([
				{
					visitId: "VIS-1",
					patientId: "PAT-1",
					patientFullName: "Иванов Иван",
					visitBarcode: "BC-101",
					status: "in_treatment",
				},
				{
					visitId: "VIS-2",
					patientId: "PAT-2",
					patientFullName: "Петров Петр",
					visitBarcode: "BC-102",
					status: "in_treatment",
				},
			]);

			const files = [
				{ name: "BC-101_tooth36.png", buffer: new Uint8Array([1, 2, 3, 4, 5]) },
				{ name: "unknown_study.jpg", buffer: new Uint8Array([6, 7, 8, 9, 10]) },
				{ name: "empty.dcm", buffer: new Uint8Array(0) },
			];

			const ingested = engine.ingestBatch(files);
			assert.strictEqual(ingested.length, 3);

			const stats = engine.getStats();
			assert.strictEqual(stats.totalIngested, 2); // 2 successful, 1 quarantined
			assert.strictEqual(stats.matchedCount, 1);
			assert.strictEqual(stats.unassignedCount, 1);
			assert.strictEqual(stats.quarantinedCount, 1);

			engine.reset();
			assert.strictEqual(engine.getIngestedStudies().length, 0);
			assert.strictEqual(engine.getQuarantinedStudies().length, 0);
			assert.strictEqual(engine.getActiveVisits().length, 0);
		});
	});
});
