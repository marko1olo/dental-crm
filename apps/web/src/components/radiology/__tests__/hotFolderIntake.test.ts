import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	INITIAL_HOT_FOLDER_ITEMS,
	FILTER_PRESETS,
	CLINICAL_PURPOSES,
	type HotFolderItem,
	type FilterPresetKey,
} from "../HotFolderIntakeModal";
import {
	ADULT_FDI_TEETH,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "../radiologyMath";

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
});
