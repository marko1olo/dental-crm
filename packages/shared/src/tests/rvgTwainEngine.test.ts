import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	KNOWN_RVG_SENSOR_CATALOG,
	RvgTwainCaptureEngine,
	applySensorHardwareCalibration,
	createSyntheticRvgRawFrame,
	generateDicomUid,
	formatDicomDate,
	formatDicomTime,
	getFdiAnatomicRegionDescription,
	toothFdiCodeSchema,
	rvgPatientStudyBindingSchema,
	TWAIN_CONSTANTS,
	WIA_CONSTANTS,
	type RvgHardwareCalibrationProfile,
	type RvgRawFrame,
} from "../radiology/rvgTwainEngine.js";
import {
	RadiologyHotFolderProcessor,
	parseRadiologyFilename,
	isValidFdiCode,
	calculateFastBufferHash,
	SUPPORTED_RADIOLOGY_EXTENSIONS,
} from "../radiology/hotFolderWatcher.js";
import {
	applyClahe16Bit,
	applyUnsharpMask16Bit,
	fastGaussianBlur16Bit,
	applyInvertFilter16Bit,
	applyMedianFilter3x3,
	applyPeriodontalReliefFilter,
	map16BitTo8BitGrayscale,
	map16BitToRgbaClamped,
	applyClinicalRadiologyPreset,
} from "../radiology/radiologyFilterEngine.js";

describe("Wave 17: RVG TWAIN & Clinical Dental Radiology Hardware Suite", () => {
	describe("1. RVG TWAIN & Direct Sensor Hardware Capture Engine", () => {
		it("1.1 Catalog contains all major Russian & international RVG sensors with correct physical specs", () => {
			const vatech1 = KNOWN_RVG_SENSOR_CATALOG["vatech_ezsensor_hd_size1"]!;
			assert.ok(vatech1);
			assert.equal(vatech1.vendor, "vatech");
			assert.equal(vatech1.sensorSize, "SIZE_1");
			assert.equal(vatech1.nativeBitDepth, 14);
			assert.equal(vatech1.theoreticalResolutionLpMm, 33.7);
			assert.deepEqual(vatech1.activeAreaMm, [20.0, 30.0]);

			const kavo = KNOWN_RVG_SENSOR_CATALOG["kavo_gendex_gxs700_size2"]!;
			assert.ok(kavo);
			assert.equal(kavo.vendor, "kavo_gendex");
			assert.equal(kavo.sensorSize, "SIZE_2");
			assert.equal(kavo.pixelPitchMicrons, 19.5);

			const planmeca = KNOWN_RVG_SENSOR_CATALOG["planmeca_prosensor_hd_size2"]!;
			assert.ok(planmeca);
			assert.equal(planmeca.nativeBitDepth, 16);
			assert.deepEqual(planmeca.matrixResolutionPx, [1733, 2400]);

			const woodpecker = KNOWN_RVG_SENSOR_CATALOG["woodpecker_isensor_h1"]!;
			assert.ok(woodpecker);
			assert.equal(woodpecker.vendor, "woodpecker");
			assert.equal(woodpecker.nativeBitDepth, 16);

			const handy = KNOWN_RVG_SENSOR_CATALOG["handy_hdr_500"]!;
			assert.ok(handy);
			assert.equal(handy.vendor, "handy");
			assert.equal(handy.nativeBitDepth, 12);
		});

		it("1.2 State machine transitions: Connect, Arm, Trigger Acquisition, Calibration and Disconnect", async () => {
			const engine = new RvgTwainCaptureEngine("TWAIN_2_4");
			assert.equal(engine.getState(), "DISCONNECTED");
			assert.equal(engine.getActiveProtocol(), "TWAIN_2_4");

			const stateHistory: string[] = [];
			const unsubscribeState = engine.onStateChange((newState, prev) => {
				stateHistory.push(`${prev}->${newState}`);
			});

			let capturedFrame: RvgRawFrame | null = null;
			const unsubscribeFrame = engine.onFrameReady((frame) => {
				capturedFrame = frame;
			});

			// Connect sensor
			const spec = await engine.connectSensor("vatech_ezsensor_hd_size1");
			assert.equal(spec.modelName, "Vatech EzSensor HD Size 1.0");
			assert.equal(engine.getState(), "IDLE_READY");
			assert.equal(engine.getActiveSensor()?.modelName, spec.modelName);

			// Arm for X-ray exposure
			engine.armSensorForXRay();
			assert.equal(engine.getState(), "ARMED_WAITING_FOR_XRAY");

			// Trigger acquisition with synthetic dental anatomy
			const frame = await engine.triggerAcquisition();
			assert.ok(frame);
			assert.equal(engine.getState(), "FRAME_READY");
			assert.equal(frame.calibrationApplied, true);
			assert.equal(frame.pixelBuffer.length, frame.width * frame.height);
			assert.equal(capturedFrame, frame);

			// Disconnect
			engine.disconnect();
			assert.equal(engine.getState(), "DISCONNECTED");
			assert.equal(engine.getActiveSensor(), null);

			assert.ok(stateHistory.includes("DISCONNECTED->INITIALIZING"));
			assert.ok(stateHistory.includes("INITIALIZING->IDLE_READY"));
			assert.ok(stateHistory.includes("IDLE_READY->ARMED_WAITING_FOR_XRAY"));
			assert.ok(stateHistory.includes("ARMED_WAITING_FOR_XRAY->EXPOSURE_DETECTED"));
			assert.ok(stateHistory.includes("EXPOSURE_DETECTED->ACQUIRING_RAW_FRAME"));
			assert.ok(stateHistory.includes("ACQUIRING_RAW_FRAME->APPLYING_CALIBRATION"));
			assert.ok(stateHistory.includes("APPLYING_CALIBRATION->FRAME_READY"));
			assert.ok(stateHistory.includes("FRAME_READY->DISCONNECTED"));

			unsubscribeState();
			unsubscribeFrame();
		});

		it("1.3 Error handling & invalid transitions", async () => {
			const engine = new RvgTwainCaptureEngine("WIA_2_0");

			let errorCaptured: Error | null = null;
			engine.onError((err) => {
				errorCaptured = err;
			});

			// Cannot connect to non-existent sensor model
			await assert.rejects(async () => {
				await engine.connectSensor("non_existent_sensor_model_xyz");
			}, /Неизвестная модель датчика/);
			assert.equal(engine.getState(), "ERROR");
			assert.ok(errorCaptured);

			// Reset
			engine.disconnect();

			// Cannot arm when disconnected
			assert.throws(() => {
				engine.armSensorForXRay();
			}, /Невозможно взвести датчик/);

			// Cannot acquire when not armed
			await assert.rejects(async () => {
				await engine.triggerAcquisition();
			}, /Датчик не взведён/);
		});

		it("1.4 Hardware calibration: Dark frame subtraction, flat field gain & bad pixel map correction", () => {
			const width = 4;
			const height = 4;
			const total = width * height;

			// Raw frame with dark noise offset (e.g. 100) and one dead pixel at (1, 1) = 0
			const raw = new Uint16Array(total);
			raw.fill(500);
			raw[1 * width + 1] = 0; // Dead pixel at (1, 1)

			const darkFrame = new Uint16Array(total);
			darkFrame.fill(100);

			const gainMap = new Float32Array(total);
			gainMap.fill(1.2); // +20% scintillator sensitivity compensation

			const profile: RvgHardwareCalibrationProfile = {
				sensorSerialNumber: "VT-SN-998811",
				darkFrameMatrix: darkFrame,
				flatFieldGainMatrix: gainMap,
				badPixelMap: [{ x: 1, y: 1 }],
				exposureThresholdAdc: 800,
				calibrationDate: "2026-08-28",
			};

			const calibrated = applySensorHardwareCalibration(raw, width, height, profile, 14);

			// For normal pixels: (500 - 100) * 1.2 = 480
			assert.equal(calibrated[0], 480);
			assert.equal(calibrated[2], 480);

			// For dead pixel at (1, 1): replaced by average of 8 neighbors (all 480) -> 480
			assert.equal(calibrated[1 * width + 1], 480);
		});

		it("1.5 DICOM metadata binding & FDI tooth validation (11-48, 51-85)", async () => {
			const engine = new RvgTwainCaptureEngine();
			await engine.connectSensor("vatech_ezsensor_hd_size1");
			engine.armSensorForXRay();
			const rawFrame = await engine.triggerAcquisition();

			// Valid permanent tooth 36 (Lower left first molar)
			const enriched = engine.enrichFrameWithDicomMetadata(rawFrame, {
				patientId: "PAT-2026-00441",
				patientName: "Барабаш Сергей Владимирович",
				patientBirthDate: "19820514",
				patientSex: "M",
				doctorId: "DOC-991",
				doctorName: "Кузнецов А.П.",
				visitId: "VIS-10492",
				toothFdiNumber: 36,
				studyDescription: "Прицельная визиография 36 зуба перед депульпированием",
				xRayTubeKv: 65,
				xRayTubeMa: 7,
				xRayExposureSec: 0.12,
			});

			assert.equal(enriched.modality, "IO");
			assert.equal(enriched.patientId, "PAT-2026-00441");
			assert.equal(enriched.patientName, "Барабаш Сергей Владимирович");
			assert.equal(enriched.toothFdiNumber, 36);
			assert.equal(enriched.toothFdiString, "36");
			assert.ok(enriched.anatomicRegion.includes("Нижняя челюсть слева (квадрант 3, зуб 36)"));
			assert.equal(enriched.bitsAllocated, 16);
			assert.equal(enriched.bitsStored, 14);
			assert.equal(enriched.highBit, 13);
			assert.equal(enriched.samplesPerPixel, 1);
			assert.equal(enriched.photometricInterpretation, "MONOCHROME2");
			assert.equal(enriched.rows, rawFrame.height);
			assert.equal(enriched.columns, rawFrame.width);
			assert.ok(enriched.pixelSpacingMm[0] > 0);
			assert.ok(enriched.pixelSpacingMm[1] > 0);
			assert.equal(enriched.kvp, 65);
			assert.equal(enriched.tubeCurrentMa, 7);

			// Deciduous / milk tooth 54 (Upper right first primary molar)
			const milkEnriched = engine.enrichFrameWithDicomMetadata(rawFrame, {
				patientId: "PAT-CHILD-01",
				patientName: "Смирнова Алиса",
				doctorId: "DOC-PEDIATRIC",
				doctorName: "Детский врач",
				toothFdiNumber: 54,
			});
			assert.equal(milkEnriched.toothFdiNumber, 54);
			assert.ok(milkEnriched.anatomicRegion.includes("Молочный зуб верхний правый (54)"));

			// Invalid tooth code rejection (e.g. tooth 99)
			assert.throws(() => {
				engine.enrichFrameWithDicomMetadata(rawFrame, {
					patientId: "PAT-ERR",
					patientName: "Тест",
					doctorId: "DOC-1",
					doctorName: "Врач",
					toothFdiNumber: 99 as any,
				});
			}, /Некорректный номер зуба/);
		});

		it("1.6 Protocol constants & utility helpers verification", () => {
			assert.equal(TWAIN_CONSTANTS.DG_CONTROL, 0x0001);
			assert.equal(TWAIN_CONSTANTS.DG_IMAGE, 0x0002);
			assert.equal(TWAIN_CONSTANTS.DAT_IMAGENATIVEXFER, 0x0104);
			assert.equal(WIA_CONSTANTS.WIA_IPA_BITS_PER_PIXEL, 4104);

			const uid1 = generateDicomUid();
			const uid2 = generateDicomUid();
			assert.ok(uid1.startsWith("1.2.643.5.1.13.2."));
			assert.notEqual(uid1, uid2);

			const dateStr = formatDicomDate();
			assert.match(dateStr, /^\d{8}$/);
			const timeStr = formatDicomTime();
			assert.match(timeStr, /^\d{6}$/);

			assert.ok(isValidFdiCode(11));
			assert.ok(isValidFdiCode(48));
			assert.ok(isValidFdiCode(55));
			assert.ok(isValidFdiCode(85));
			assert.equal(isValidFdiCode(19), false);
			assert.equal(isValidFdiCode(50), false);
			assert.equal(isValidFdiCode(90), false);
		});
	});

	describe("2. Hot-Folder Watcher & Radiology Auto-Ingestion Engine", () => {
		it("2.1 Robust filename parsing for Russian clinic patterns (barcodes, patients, teeth, types)", () => {
			// Case A: Full metadata filename
			const metaA = parseRadiologyFilename("VIS-2026-10492_PAT-7741_T36_Ivanov_I_I_20260828.dcm");
			assert.equal(metaA.visitBarcode, "VIS-2026-10492");
			assert.equal(metaA.patientId, "PAT-7741");
			assert.deepEqual(metaA.toothFdiList, [36]);
			assert.equal(metaA.patientLastName, "Ivanov");
			assert.equal(metaA.acquisitionDate, "20260828");
			assert.equal(metaA.studyType, "PERIAPICAL");

			// Case B: Tooth range and control study
			const metaB = parseRadiologyFilename("BARCODE_990142_zub46-48_kontrol_obturation.png");
			assert.equal(metaB.visitBarcode, "BARCODE_990142");
			assert.deepEqual(metaB.toothFdiList, [46, 47, 48]);
			assert.equal(metaB.isControlStudy, true);
			assert.equal(metaB.studyType, "PERIAPICAL");

			// Case C: Panoramic / OPTG
			const metaC = parseRadiologyFilename("2026-08-28_KARTA-5512_Smirnov_E_A_OPTG_pano.tif");
			assert.equal(metaC.patientId, "KARTA-5512");
			assert.equal(metaC.studyType, "PANORAMIC");
			assert.equal(metaC.patientLastName, "Smirnov");

			// Case D: CBCT 3D volume
			const metaD = parseRadiologyFilename("PAT-9901_CBCT_FullJaw_3D.dcm");
			assert.equal(metaD.patientId, "PAT-9901");
			assert.equal(metaD.studyType, "CBCT");

			// Case E: Bitewing
			const metaE = parseRadiologyFilename("BC123456_d24_bitewing.jpg");
			assert.equal(metaE.visitBarcode, "BC123456");
			assert.deepEqual(metaE.toothFdiList, [24]);
			assert.equal(metaE.studyType, "BITEWING");
		});

		it("2.2 Hot-folder ingestion processor: Success, Duplicate detection, Quarantine & Events", () => {
			const processor = new RadiologyHotFolderProcessor({
				watchDirectory: "C:/XRay_Cabinet/Export",
				quarantineDirectory: "C:/XRay_Cabinet/Quarantine",
				pollingIntervalMs: 500,
			});

			const ingestedEvents: string[] = [];
			const quarantineEvents: string[] = [];

			processor.onStudyIngested((s) => ingestedEvents.push(s.id));
			processor.onQuarantine((s) => quarantineEvents.push(s.quarantineReason || "UNKNOWN"));

			// 1. Success ingestion of a valid TIFF
			const dummyTiff = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x55, 0xaa]);
			const study1 = processor.processDiscoveredFile(
				"C:/XRay_Cabinet/Export/VIS-10492_T36_Ivanov.tif",
				dummyTiff,
			);
			assert.equal(study1.status, "SUCCESS");
			assert.equal(study1.extension, ".tif");
			assert.deepEqual(study1.filenameMetadata.toothFdiList, [36]);
			assert.equal(processor.getSuccessfulStudies().length, 1);
			assert.equal(ingestedEvents.length, 1);

			// 2. Duplicate ingestion detection
			const dupStudy = processor.processDiscoveredFile(
				"C:/XRay_Cabinet/Export/VIS-10492_T36_Ivanov_copy.tif",
				dummyTiff,
			);
			assert.equal(dupStudy.status, "QUARANTINED");
			assert.equal(dupStudy.quarantineReason, "DUPLICATE_INGESTION");
			assert.equal(quarantineEvents.includes("DUPLICATE_INGESTION"), true);

			// 3. Zero byte file quarantine
			const zeroStudy = processor.processDiscoveredFile(
				"C:/XRay_Cabinet/Export/corrupt_empty.png",
				new Uint8Array(0),
			);
			assert.equal(zeroStudy.status, "QUARANTINED");
			assert.equal(zeroStudy.quarantineReason, "ZERO_BYTE_FILE");

			// 4. Unsupported extension quarantine
			const exeStudy = processor.processDiscoveredFile(
				"C:/XRay_Cabinet/Export/setup_virus.exe",
				new Uint8Array([0x4d, 0x5a, 0x90]),
			);
			assert.equal(exeStudy.status, "QUARANTINED");
			assert.equal(exeStudy.quarantineReason, "UNSUPPORTED_EXTENSION");

			// Verify supported extension set
			assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.has(".dcm"));
			assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.has(".png"));
			assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.has(".tif"));

			// Hash function integrity
			const hash = calculateFastBufferHash(dummyTiff);
			assert.ok(hash.startsWith("RAD_"));

			processor.reset();
			assert.equal(processor.getSuccessfulStudies().length, 0);
			assert.equal(processor.getQuarantinedStudies().length, 0);
		});
	});

	describe("3. Clinical Radiology Image Filter Engine (CLAHE, Unsharp Mask, Invert & Presets)", () => {
		it("3.1 CLAHE 16-bit: Contrast equalization without boundary seams and within dynamic range", () => {
			const width = 32;
			const height = 32;
			const total = width * height;
			const raw = new Uint16Array(total);

			// Create synthetic gradient with high-density enamel spot and dark background
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const idx = y * width + x;
					raw[idx] = (x * 1000 + y * 500) % 65536;
				}
			}

			const clahe = applyClahe16Bit(raw, width, height, {
				tileGridSize: [4, 4],
				clipLimit: 2.5,
				bitDepth: 16,
			});

			assert.equal(clahe.length, total);

			// Assert no out-of-bounds pixel values
			for (let i = 0; i < total; i++) {
				assert.ok(clahe[i]! >= 0 && clahe[i]! <= 65535);
			}

			// Test 8-bit CLAHE path
			const raw8 = new Uint16Array(total);
			for (let i = 0; i < total; i++) raw8[i] = i % 256;
			const clahe8 = applyClahe16Bit(raw8, width, height, {
				tileGridSize: [2, 2],
				clipLimit: 2.0,
				bitDepth: 8,
			});
			for (let i = 0; i < total; i++) {
				assert.ok(clahe8[i]! >= 0 && clahe8[i]! <= 255);
			}
		});

		it("3.2 Fast Gaussian Blur & Unsharp Mask 16-bit", () => {
			const width = 16;
			const height = 16;
			const total = width * height;
			const raw = new Uint16Array(total);
			raw.fill(5000);

			// Step edge (simulating filling margin) at column 8
			for (let y = 0; y < height; y++) {
				for (let x = 8; x < width; x++) {
					raw[y * width + x] = 20000;
				}
			}

			const blurred = fastGaussianBlur16Bit(raw, width, height, 2);
			assert.equal(blurred.length, total);
			// Smooth transition at boundary
			assert.ok(blurred[0 * width + 7]! > 5000);
			assert.ok(blurred[0 * width + 8]! < 20000);

			const sharpened = applyUnsharpMask16Bit(raw, width, height, {
				radius: 2,
				amount: 2.0,
				threshold: 50,
				bitDepth: 16,
			});

			// On high side of step edge: sharpened value > original (high boost)
			assert.ok(sharpened[0 * width + 8]! >= raw[0 * width + 8]!);
			// On low side of step edge: sharpened value <= original
			assert.ok(sharpened[0 * width + 7]! <= raw[0 * width + 7]!);
		});

		it("3.3 Invert / Negative filter: Full dynamic range inversion and reversibility", () => {
			const raw = new Uint16Array([0, 1000, 32768, 65535]);
			const inverted = applyInvertFilter16Bit(raw, 16);
			assert.equal(inverted[0], 65535);
			assert.equal(inverted[1], 64535);
			assert.equal(inverted[2], 32767);
			assert.equal(inverted[3], 0);

			const doubleInverted = applyInvertFilter16Bit(inverted, 16);
			assert.deepEqual(Array.from(doubleInverted), Array.from(raw));

			// 12-bit test (0..4095)
			const raw12 = new Uint16Array([0, 2048, 4095]);
			const inv12 = applyInvertFilter16Bit(raw12, 12);
			assert.equal(inv12[0], 4095);
			assert.equal(inv12[1], 2047);
			assert.equal(inv12[2], 0);
		});

		it("3.4 3x3 Median noise suppression filter", () => {
			const width = 5;
			const height = 5;
			const total = width * height;
			const raw = new Uint16Array(total);
			raw.fill(1000);

			// Salt and pepper noise spike at center (2, 2)
			raw[2 * width + 2] = 60000;

			const filtered = applyMedianFilter3x3(raw, width, height);
			// Spike at center must be completely eliminated to background median value (1000)
			assert.equal(filtered[2 * width + 2], 1000);
		});

		it("3.5 Periodontal Ligament (PDL) Relief Filter", () => {
			const width = 8;
			const height = 8;
			const raw = new Uint16Array(width * height);
			raw.fill(10000);

			// Diagonal edge
			for (let i = 0; i < 8; i++) {
				raw[i * width + i] = 30000;
			}

			const relief = applyPeriodontalReliefFilter(raw, width, height, 16);
			assert.equal(relief.length, width * height);
			// Non-zero edge response
			assert.ok(relief[2 * width + 2]! > 0);
		});

		it("3.6 16-bit to 8-bit Grayscale & RGBA Window/Level Canvas Mapping", () => {
			const raw = new Uint16Array([0, 5000, 10000, 20000, 40000]);
			const gray8 = map16BitTo8BitGrayscale(raw, {
				windowWidth: 20000,
				windowCenter: 10000, // Range: 0 .. 20000
				gamma: 1.0,
				invert: false,
			});

			assert.equal(gray8[0], 0);
			assert.equal(gray8[1], 64);
			assert.equal(gray8[2], 128); // Center
			assert.equal(gray8[3], 255); // Top limit
			assert.equal(gray8[4], 255); // Clamped

			const gray8Inverted = map16BitTo8BitGrayscale(raw, {
				windowWidth: 20000,
				windowCenter: 10000,
				invert: true,
			});
			assert.equal(gray8Inverted[0], 255);
			assert.equal(gray8Inverted[2], 127);
			assert.equal(gray8Inverted[3], 0);

			// RGBA mapping
			const rgba = map16BitToRgbaClamped(raw, {
				windowWidth: 20000,
				windowCenter: 10000,
			});
			assert.equal(rgba.length, raw.length * 4);
			assert.equal(rgba[0], 0); // R
			assert.equal(rgba[1], 0); // G
			assert.equal(rgba[2], 0); // B
			assert.equal(rgba[3], 255); // Alpha
			assert.equal(rgba[8], 128); // R (center pixel)
			assert.equal(rgba[11], 255); // Alpha
		});

		it("3.7 Clinical Presets Pipeline: Endodontic, Caries, Periodontal, Implant, Diagnostic", () => {
			const width = 16;
			const height = 16;
			const raw = new Uint16Array(width * height);
			for (let i = 0; i < raw.length; i++) raw[i] = (i * 300) % 65536;

			const endo = applyClinicalRadiologyPreset(raw, width, height, "ROOT_CANAL_ENDODONTIC", 16);
			assert.equal(endo.length, raw.length);

			const caries = applyClinicalRadiologyPreset(raw, width, height, "CARIES_ENAMEL_DETECTION", 16);
			assert.equal(caries.length, raw.length);

			const perio = applyClinicalRadiologyPreset(raw, width, height, "PERIODONTAL_BONE_MARGIN", 16);
			assert.equal(perio.length, raw.length);

			const implant = applyClinicalRadiologyPreset(raw, width, height, "IMPLANT_TRABECULAR_DENSITY", 16);
			assert.equal(implant.length, raw.length);

			const standard = applyClinicalRadiologyPreset(raw, width, height, "STANDARD_DIAGNOSTIC", 16);
			assert.equal(standard.length, raw.length);
		});
	});
});
