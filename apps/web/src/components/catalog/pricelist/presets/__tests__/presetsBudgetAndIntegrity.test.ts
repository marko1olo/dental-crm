import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it as test } from "node:test";
import {
	ANESTHESIA_STATUTORY_PRESETS,
	BASELINE_804N_PRICELIST_SERVICES,
	BASELINE_PRICELIST_SERVICES,
	CANONICAL_SERVICE_PRESETS,
	CATEGORY_LABELS,
	CONSULTATION_BASELINE_SERVICES,
	HYGIENE_BASELINE_SERVICES,
	HYGIENE_STATUTORY_PRESETS,
	ORTHODONTIC_STATUTORY_PRESETS,
	ORTHOPEDIC_BASELINE_SERVICES,
	ORTHOPEDIC_STATUTORY_PRESETS,
	PACKAGE_STATUTORY_PRESETS,
	PEDIATRIC_STATUTORY_PRESETS,
	PRICE_TIER_LABELS,
	RADIOLOGY_BASELINE_SERVICES,
	RADIOLOGY_STATUTORY_PRESETS,
	SPECIALTY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	SURGERY_BASELINE_SERVICES,
	SURGERY_STATUTORY_PRESETS,
	THERAPY_BASELINE_SERVICES,
	THERAPY_STATUTORY_PRESETS,
} from "../index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Service Pricelist Presets: Budget & Canonical Data Integrity", () => {
	test("Gate 1 Line Budget: All preset files are strictly <= 120 lines (Mandate 8b)", () => {
		const presetsDir = path.resolve(__dirname, "..");
		const files = fs
			.readdirSync(presetsDir)
			.filter((f) => f.endsWith(".ts") && !f.includes(".test."));

		assert.ok(files.length >= 10, "Expected modular preset files");

		for (const file of files) {
			const fullPath = path.join(presetsDir, file);
			const lineCount = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lineCount <= 120,
				`File ${file} exceeds 120-line budget: currently ${lineCount} lines`,
			);
		}
	});

	test("Preserves 100% of Statutory Order 804n Presets (exactly 50 items)", () => {
		assert.strictEqual(STATUTORY_ORDER_804N_PRESETS.length, 50);
		assert.strictEqual(CANONICAL_SERVICE_PRESETS.length, 50);
		assert.strictEqual(CANONICAL_SERVICE_PRESETS, STATUTORY_ORDER_804N_PRESETS);

		const totalSubArrays =
			THERAPY_STATUTORY_PRESETS.length +
			HYGIENE_STATUTORY_PRESETS.length +
			SURGERY_STATUTORY_PRESETS.length +
			ORTHOPEDIC_STATUTORY_PRESETS.length +
			ORTHODONTIC_STATUTORY_PRESETS.length +
			PEDIATRIC_STATUTORY_PRESETS.length +
			RADIOLOGY_STATUTORY_PRESETS.length +
			ANESTHESIA_STATUTORY_PRESETS.length +
			PACKAGE_STATUTORY_PRESETS.length +
			5; // consultation presets

		assert.strictEqual(totalSubArrays, 50);

		for (const item of STATUTORY_ORDER_804N_PRESETS) {
			assert.ok(item.id.startsWith("srv-"));
			assert.ok(item.code804n.length > 3);
			assert.ok(item.statutoryTitle804n.length > 0);
			assert.ok(item.commercialTitle.length > 0);
			assert.strictEqual(item.vatRate, 0);
			assert.strictEqual(item.vatExemptionArticle, STATUTORY_VAT_EXEMPTION_NOTE);
			assert.strictEqual(item.basePriceKopecks, item.basePriceRub * 100);
		}
	});

	test("Preserves 100% of Baseline 804n Catalog Presets (exactly 30 items srv-base-01 to srv-base-30)", () => {
		assert.strictEqual(BASELINE_804N_PRICELIST_SERVICES.length, 30);
		assert.strictEqual(BASELINE_PRICELIST_SERVICES.length, 30);
		assert.strictEqual(BASELINE_PRICELIST_SERVICES, BASELINE_804N_PRICELIST_SERVICES);

		BASELINE_804N_PRICELIST_SERVICES.forEach((item, index) => {
			const expectedIndexStr = String(index + 1).padStart(2, "0");
			const expectedId = `srv-base-${expectedIndexStr}`;
			assert.strictEqual(item.id, expectedId);
			assert.strictEqual(item.basePriceKopecks, item.basePriceRub * 100);
		});

		assert.strictEqual(THERAPY_BASELINE_SERVICES.length, 11);
		assert.strictEqual(HYGIENE_BASELINE_SERVICES.length, 3);
		assert.strictEqual(SURGERY_BASELINE_SERVICES.length, 7);
		assert.strictEqual(ORTHOPEDIC_BASELINE_SERVICES.length, 6);
		assert.strictEqual(CONSULTATION_BASELINE_SERVICES.length, 1);
		assert.strictEqual(RADIOLOGY_BASELINE_SERVICES.length, 2);
	});

	test("Metadata labels and constants dictionary integrity", () => {
		assert.strictEqual(CATEGORY_LABELS.therapy, "Терапия и эндодонтия");
		assert.strictEqual(CATEGORY_LABELS.surgery, "Хирургия и имплантация");
		assert.strictEqual(CATEGORY_LABELS.orthopedics, "Ортопедия и протезирование");
		assert.strictEqual(CATEGORY_LABELS.orthodontics, "Ортодонтия");
		assert.strictEqual(SPECIALTY_LABELS.therapist, "Стоматолог-терапевт");
		assert.strictEqual(SPECIALTY_LABELS.surgeon, "Стоматолог-хирург / имплантолог");
		assert.strictEqual(PRICE_TIER_LABELS.standard, "Основной прайс (100%)");
		assert.ok(STATUTORY_VAT_EXEMPTION_NOTE.includes("Без НДС"));
	});
});
