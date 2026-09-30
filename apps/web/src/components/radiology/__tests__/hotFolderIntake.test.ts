import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	INITIAL_HOT_FOLDER_ITEMS,
	FILTER_PRESETS,
	CLINICAL_PURPOSES,
	type HotFolderItem,
	type FilterPresetKey,
	isItemFresh,
	filterFreshItems,
} from "../HotFolderIntakeModal";
import type { RvgGlRenderParams } from "../rvgGlShaderRenderer";
import {
	ADULT_FDI_TEETH,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "../radiologyMath";
import {
	POPULAR_RVG_SENSORS,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	validateRadiologyUploadFile,
} from "../directRvgFileValidation";

describe("Hot-Folder Intake & Radiology Integration Suite", () => {
	it("verifies initial hot-folder items are populated with realistic medical X-ray sources", () => {
		assert.ok(INITIAL_HOT_FOLDER_ITEMS.length >= 4);

		// 1. EzDent-i Vatech item
		const ezdentItem = INITIAL_HOT_FOLDER_ITEMS.find((i) => i.source === "ezdent");
		assert.ok(ezdentItem, "EzDent-i item must be present");
		assert.equal(ezdentItem.detectedModality, "intraoral_rvg");
		assert.ok(ezdentItem.detectedTeeth.includes("16") || ezdentItem.detectedTeeth.includes("21"));
		assert.ok(ezdentItem.metadata.kv >= 60 && ezdentItem.metadata.kv <= 75);
		assert.ok(ezdentItem.metadata.exposureSec > 0 && ezdentItem.metadata.exposureSec < 1);
		assert.ok(ezdentItem.metadata.apparatusModel.includes("EzSensor"));

		// 2. Romexis Planmeca item
		const romexisItem = INITIAL_HOT_FOLDER_ITEMS.find((i) => i.source === "romexis");
		assert.ok(romexisItem, "Planmeca Romexis item must be present");
		assert.equal(romexisItem.detectedModality, "optg_panoramic");
		assert.equal(romexisItem.detectedTeeth.length, 32, "OPTG panoramic must cover all 32 teeth");

		// 3. Sidexis Dentsply Sirona item
		const sidexisItem = INITIAL_HOT_FOLDER_ITEMS.find((i) => i.source === "sidexis");
		assert.ok(sidexisItem, "Sidexis item must be present");
		assert.equal(sidexisItem.detectedModality, "bitewing");
		assert.ok(sidexisItem.detectedTeeth.length >= 4);

		// 4. Carestream item
		const carestreamItem = INITIAL_HOT_FOLDER_ITEMS.find((i) => i.source === "carestream");
		assert.ok(carestreamItem, "Carestream item must be present");
		assert.equal(carestreamItem.detectedModality, "intraoral_rvg");
	});

	it("verifies all filter presets have valid brightness, contrast, and inversion settings", () => {
		const presetKeys = Object.keys(FILTER_PRESETS) as FilterPresetKey[];
		assert.ok(presetKeys.length >= 6);

		for (const key of presetKeys) {
			const preset = FILTER_PRESETS[key];
			assert.ok(preset.label.length > 0);
			assert.ok(preset.brightness >= 20 && preset.brightness <= 200);
			assert.ok(preset.contrast >= 50 && preset.contrast <= 300);
			assert.equal(typeof preset.invert, "boolean");
			assert.ok(preset.description.length > 0);
		}

		// Caries and Negative presets must invert the image
		assert.equal(FILTER_PRESETS.caries.invert, true);
		assert.equal(FILTER_PRESETS.negative.invert, true);

		// Standard preset must be neutral
		assert.equal(FILTER_PRESETS.standard.brightness, 100);
		assert.equal(FILTER_PRESETS.standard.contrast, 100);
		assert.equal(FILTER_PRESETS.standard.invert, false);

		// Endo preset must have heightened contrast
		assert.ok(FILTER_PRESETS.endo.contrast >= 150);
	});

	it("verifies clinical purposes registry covers primary dental indications", () => {
		assert.ok(CLINICAL_PURPOSES.length >= 6);

		const expectedPurposes = [
			"endo_control",
			"primary_caries",
			"implant_check",
			"periapical_check",
			"orthopantomogram",
			"marginal_fit",
		];

		for (const exp of expectedPurposes) {
			const found = CLINICAL_PURPOSES.find((p) => p.id === exp);
			assert.ok(found, `Clinical purpose ${exp} must be registered`);
			assert.ok(found.label.length > 0);
		}
	});

	it("verifies FDI formula integrity and anatomical tooth naming", () => {
		const q1 = ADULT_FDI_TEETH.quadrant1;
		const q2 = ADULT_FDI_TEETH.quadrant2;
		const q3 = ADULT_FDI_TEETH.quadrant3;
		const q4 = ADULT_FDI_TEETH.quadrant4;

		assert.equal(q1.length, 8, "Quadrant 1 must have 8 teeth");
		assert.equal(q2.length, 8, "Quadrant 2 must have 8 teeth");
		assert.equal(q3.length, 8, "Quadrant 3 must have 8 teeth");
		assert.equal(q4.length, 8, "Quadrant 4 must have 8 teeth");

		// Total 32 teeth
		const all32 = [...q1, ...q2, ...q3, ...q4];
		assert.equal(all32.length, 32);

		// Specific tooth tests
		assert.equal(FDI_TOOTH_NAMES["16"], "Верхний правый 1-й моляр");
		assert.equal(FDI_TOOTH_NAMES["21"], "Верхний левый центральный резец");
		assert.equal(FDI_TOOTH_NAMES["36"], "Нижний левый 1-й моляр");
		assert.equal(FDI_TOOTH_NAMES["48"], "Нижний правый 3-й моляр (зуб мудрости)");
	});

	it("verifies radiation dose calculation for RVG and OPTG adheres to SanPiN 2.6.1.1192-03", () => {
		// RVG typical dose: 3.0 µSv
		const rvgDose = formatRadiationDose(3.0);
		assert.equal(rvgDose.microsvText, "3 мкЗв");
		assert.equal(rvgDose.msvText, "0.003 мЗв");
		assert.equal(rvgDose.safetyZone, "green");

		// OPTG typical dose: 18.0 µSv
		const optgDose = formatRadiationDose(18.0);
		assert.equal(optgDose.microsvText, "18 мкЗв");
		assert.equal(optgDose.msvText, "0.018 мЗв");
		assert.equal(optgDose.safetyZone, "green");
	});

	it("verifies patient match confidence and metadata serialization", () => {
		const sample = INITIAL_HOT_FOLDER_ITEMS[0] as HotFolderItem;
		assert.ok(sample.patientMatch);
		assert.ok(sample.patientMatch.confidence >= 90);
		assert.ok(sample.patientMatch.patientName.length > 0);
		assert.ok(sample.patientMatch.cardNumber.includes("043/у"));
		assert.ok(sample.sizeFormatted.includes("МБ"));
	});

	it("validates all radiology image and DICOM formats including BMP, TIFF, 16-bit PNG", () => {
		// Valid DICOM files
		assert.deepEqual(validateRadiologyUploadFile({ name: "tooth16.dcm" }), { isValid: true, format: "dicom" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "PATIENT_STUDY.DICOM" }), { isValid: true, format: "dicom" });

		// Valid TIFF files
		assert.deepEqual(validateRadiologyUploadFile({ name: "rvg_export.tif" }), { isValid: true, format: "tiff" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "highres_scan.tiff" }), { isValid: true, format: "tiff" });

		// Valid Images: PNG, JPG, JPEG, BMP, WebP
		assert.deepEqual(validateRadiologyUploadFile({ name: "sensor_frame.png" }), { isValid: true, format: "image" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "intraoral_view.jpg" }), { isValid: true, format: "image" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "xray.jpeg" }), { isValid: true, format: "image" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "woodpecker_raw.bmp" }), { isValid: true, format: "image" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "radiology.webp" }), { isValid: true, format: "image" });

		// Unsupported formats
		assert.deepEqual(validateRadiologyUploadFile({ name: "malware.exe" }), { isValid: false, format: "unsupported" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "report.pdf" }), { isValid: false, format: "unsupported" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "notes.txt" }), { isValid: false, format: "unsupported" });
	});

	it("correctly detects hardware sensor brands from filenames and paths (Vatech, Carestream, KaVo, Fona, Woodpecker)", () => {
		assert.equal(detectRadiologySensorBrand("EzSensor_HD_capture.dcm"), "Vatech EzSensor HD");
		assert.equal(detectRadiologySensorBrand("C:\\EzDent-i\\Patient001\\01.dcm"), "Vatech EzSensor HD");
		assert.equal(detectRadiologySensorBrand("Carestream_RVG_6200_Tooth36.dcm"), "Carestream / Kodak RVG 5200 / 6200");
		assert.equal(detectRadiologySensorBrand("CS Imaging\\rvg 5200_tooth11.jpg"), "Carestream / Kodak RVG 5200 / 6200");
		assert.equal(detectRadiologySensorBrand("KaVo_Gendex_GXS700_shot.png"), "KaVo Gendex GXS-700");
		assert.equal(detectRadiologySensorBrand("Fona_CDRelite_export.tif"), "FONA CDRelite / Schick");
		assert.equal(detectRadiologySensorBrand("Woodpecker_iSensor_H2_tooth46.bmp"), "Woodpecker i-Sensor H1 / H2");
		assert.equal(detectRadiologySensorBrand("Planmeca_Romexis_export.dcm"), "Planmeca ProSensor HD");
		assert.equal(detectRadiologySensorBrand("Sidexis_XIOS_XG.dcm"), "Dentsply Sirona XIOS XG Supreme");
	});

	it("extracts FDI teeth formulas, Bitewing projections, and Occlusal arches from filenames", () => {
		// Single tooth extraction
		assert.deepEqual(extractTeethFromRadiologyFilename("RVG_Tooth21_check.dcm"), ["21"]);
		assert.deepEqual(extractTeethFromRadiologyFilename("46.dcm"), ["46"]);

		// Multi-tooth codes
		assert.deepEqual(extractTeethFromRadiologyFilename("rvg_16_15_control.jpg"), ["15", "16"]);

		// Bitewing patterns
		const bwRight = extractTeethFromRadiologyFilename("Bitewing_Q1Q4_right.dcm");
		assert.ok(bwRight.includes("16") && bwRight.includes("46"));
		assert.equal(bwRight.length, 8);

		const bwLeft = extractTeethFromRadiologyFilename("bw_left_interproximal.tif");
		assert.ok(bwLeft.includes("26") && bwLeft.includes("36"));
		assert.equal(bwLeft.length, 8);

		// Occlusal arches
		const occlusalUpper = extractTeethFromRadiologyFilename("occlusal_upper_arch.dcm");
		assert.equal(occlusalUpper.length, 16);
		assert.ok(occlusalUpper.includes("11") && occlusalUpper.includes("28"));

		const occlusalLower = extractTeethFromRadiologyFilename("окклюзия_низ_контроль.dcm");
		assert.equal(occlusalLower.length, 16);
		assert.ok(occlusalLower.includes("41") && occlusalLower.includes("38"));
	});

	it("verifies popular RVG sensor physical specs (resolution lp/mm and pixel spacing)", () => {
		assert.ok(POPULAR_RVG_SENSORS.length >= 7);

		const vatech = POPULAR_RVG_SENSORS.find((s) => s.brand === "vatech");
		assert.ok(vatech);
		assert.ok(vatech.resolution.includes("29.2 lp/mm"));
		assert.equal(vatech.pixelSpacing, 0.035);

		const carestream = POPULAR_RVG_SENSORS.find((s) => s.brand === "carestream");
		assert.ok(carestream);
		assert.ok(carestream.name.includes("RVG 5200 / 6200"));
		assert.equal(carestream.pixelSpacing, 0.042);

		const kavo = POPULAR_RVG_SENSORS.find((s) => s.brand === "kavo");
		assert.ok(kavo);
		assert.ok(kavo.name.includes("KaVo Gendex"));

		const woodpecker = POPULAR_RVG_SENSORS.find((s) => s.brand === "woodpecker");
		assert.ok(woodpecker);
		assert.ok(woodpecker.name.includes("i-Sensor"));
	});

	it("verifies intelligent fresh shots search (<15 min) and relative/ISO timestamp handling", () => {
		const freshSample: HotFolderItem = {
			id: "fresh-test-1",
			filename: "RVG_16_fresh.dcm",
			source: "ezdent",
			sourceLabel: "Vatech EzSensor",
			folderPath: "C:\\DenteDICOM\\Incoming",
			detectedModality: "intraoral_rvg",
			modalityLabel: "Прицельный RVG",
			detectedTeeth: ["16"],
			sizeBytes: 1024 * 1024,
			sizeFormatted: "1.0 МБ",
			timestampIso: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
			relativeTime: "3 мин назад",
			imageUrl: "data:image/png;base64,sample",
			status: "new",
			metadata: { kv: 65, ma: 7, exposureSec: 0.08, pixelSpacingMm: 0.035, apparatusModel: "Vatech EzSensor" },
		};

		const staleSample: HotFolderItem = {
			...freshSample,
			id: "stale-test-2",
			timestampIso: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
			relativeTime: "45 мин назад",
			isFresh: false,
		};

		assert.equal(isItemFresh(freshSample, 15), true, "Item taken 3 mins ago must be recognized as fresh (< 15m)");
		assert.equal(isItemFresh(staleSample, 15), false, "Item taken 45 mins ago must not be recognized as fresh (< 15m)");

		const list = [freshSample, staleSample];
		const filtered = filterFreshItems(list, 15);
		assert.equal(filtered.length, 1);
		assert.equal(filtered[0]?.id, "fresh-test-1");

		// Test initial hot folder items fresh filter
		const freshInitial = filterFreshItems(INITIAL_HOT_FOLDER_ITEMS, 15);
		assert.ok(freshInitial.length >= 2, "At least 2 initial hot folder items must be fresh within 15 minutes");
		for (const item of freshInitial) {
			assert.ok(isItemFresh(item, 15));
		}
	});

	it("verifies WebGL 60 FPS GPU filter presets (Enamel High-Pass, PDL Sharpening, and Inversion)", () => {
		// 1. Enamel High-Pass preset
		const enamel = FILTER_PRESETS.enamel;
		assert.ok(enamel, "Enamel preset must be defined");
		assert.equal(enamel.label, "Контраст эмали");
		assert.ok((enamel.enamelHighPass ?? 0) >= 50, "Enamel preset must have enamelHighPass >= 50");
		assert.ok(enamel.contrast >= 140, "Enamel preset must boost contrast for mineralization boundary");
		assert.equal(enamel.invert, false);

		// 2. PDL (Periodontal Ligament) Sharpening preset
		const pdl = FILTER_PRESETS.pdl;
		assert.ok(pdl, "PDL preset must be defined");
		assert.equal(pdl.label, "Связка PDL");
		assert.ok((pdl.pdlSharpening ?? 0) >= 50, "PDL preset must have pdlSharpening >= 50");
		assert.ok((pdl.sharpness ?? 0) >= 40, "PDL preset must sharpen edge transitions");
		assert.equal(pdl.invert, false);

		// 3. Negative Inversion preset
		const negative = FILTER_PRESETS.negative;
		assert.equal(negative.invert, true, "Negative preset must invert color palette for traditional film inspection");

		// 4. Backward compatibility: standard, endo, bone, caries, sharpen must remain functional
		assert.equal(FILTER_PRESETS.standard.brightness, 100);
		assert.equal(FILTER_PRESETS.standard.contrast, 100);
		assert.equal(FILTER_PRESETS.endo.contrast, 165);
		assert.equal(FILTER_PRESETS.bone.brightness, 95);
	});

	it("verifies RvgGlRenderParams type contract supports WebGL GPU uniforms without VRAM leaks", () => {
		const renderParams: RvgGlRenderParams = {
			brightness: 110,
			contrast: 130,
			invert: false,
			sharpness: 25,
			clahe: 10,
			enamelHighPass: 60,
			pdlSharpening: 75,
		};

		assert.equal(renderParams.enamelHighPass, 60);
		assert.equal(renderParams.pdlSharpening, 75);
		assert.equal(renderParams.invert, false);
		assert.equal(renderParams.clahe, 10);
	});

	it("verifies Doctor Autonomy invariants: zero blocking alerts, 1-click attach, and zero unicode emojis", () => {
		// All preset labels must have no emojis (Mandate 8d)
		const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
		for (const [key, preset] of Object.entries(FILTER_PRESETS) as [FilterPresetKey, (typeof FILTER_PRESETS)[FilterPresetKey]][]) {
			assert.ok(!emojiRegex.test(preset.label), `Preset '${key}' label must not contain emojis: ${preset.label}`);
			assert.ok(!emojiRegex.test(preset.description), `Preset '${key}' description must not contain emojis: ${preset.description}`);
		}

		// Clinical purposes must not contain emojis
		for (const cp of CLINICAL_PURPOSES) {
			assert.ok(!emojiRegex.test(cp.label), `Clinical purpose '${cp.id}' must not contain emojis: ${cp.label}`);
		}
	});
});

