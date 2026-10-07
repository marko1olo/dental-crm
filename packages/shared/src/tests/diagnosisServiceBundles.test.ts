import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CANONICAL_DIAGNOSIS_BUNDLES,
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	CROWN_DIAGNOSIS_BUNDLE,
	TOOTH_804N_PRESETS,
	type ToothClinicalServicePayload,
	getDiagnosisBundleByToothState,
	getDiagnosisBundleByIcd10,
	resolveServicePriceAgainstCatalog,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
} from "../clinical/diagnosisServiceBundles.js";

describe("Canonical Diagnosis Service Bundles & 54-FZ 1-Click Checkout Engine", () => {
	test("All 6 canonical clinical diagnosis bundles exist and have valid 804n nomenclature", () => {
		assert.equal(CANONICAL_DIAGNOSIS_BUNDLES.length, 6, "Must define exactly 6 primary clinical packages");

		const ids = CANONICAL_DIAGNOSIS_BUNDLES.map((b) => b.id);
		assert.deepEqual(
			ids,
			["caries", "endo_1", "periodontitis", "surgery_extraction", "hygiene", "crown"],
			"Bundles must match standard diagnosis IDs",
		);

		for (const bundle of CANONICAL_DIAGNOSIS_BUNDLES) {
			assert.ok(bundle.diagnosisIcd10, `Bundle ${bundle.id} must have ICD-10 code`);
			assert.ok(bundle.title, `Bundle ${bundle.id} must have title`);
			assert.ok(bundle.services.length > 0, `Bundle ${bundle.id} must contain services`);

			// Verify money invariants: exact integer kopecks
			let sumKopecks = 0;
			for (const svc of bundle.services) {
				assert.ok(
					/^[A-Z]\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/.test(svc.code804n) || svc.code804n.startsWith("A"),
					`Service ${svc.id} must have valid 804n code, got: ${svc.code804n}`,
				);
				assert.ok(Number.isInteger(svc.defaultPriceKopecks), `Price kopecks must be integer for ${svc.id}`);
				assert.equal(
					svc.defaultPriceKopecks,
					Math.round(svc.defaultPriceRub * 100),
					`Kopecks must strictly match RUB * 100 for ${svc.id}`,
				);
				sumKopecks += svc.defaultPriceKopecks;
			}

			assert.equal(
				bundle.defaultTotalPriceKopecks,
				sumKopecks,
				`Bundle total kopecks must equal sum of services for ${bundle.id}`,
			);
			assert.equal(
				bundle.defaultTotalPriceKopecks,
				Math.round(bundle.defaultTotalPriceRub * 100),
				`Bundle kopecks must strictly equal defaultTotalPriceRub * 100 for ${bundle.id}`,
			);
		}
	});

	test("Caries bundle strictly contains required 804n services matching prompt specification", () => {
		const codes = CARIES_DIAGNOSIS_BUNDLE.services.map((s) => s.code804n);
		assert.deepEqual(
			codes,
			[
				"A11.07.012", // Анестезия
				"A16.07.002.001", // Наложение коффердама
				"A16.07.002", // Препарирование кариозной полости
				"A16.07.002.010", // Восстановление пломбой светового отверждения
				"A16.07.002.011", // Шлифовка и полировка пломбы
			],
			"Caries package must match the exact 804n codes mandated for chairside 1-click ordering",
		);

		assert.equal(CARIES_DIAGNOSIS_BUNDLE.toothState, "Caries");
		assert.equal(CARIES_DIAGNOSIS_BUNDLE.diagnosisIcd10, "K02.1");
		assert.equal(CARIES_DIAGNOSIS_BUNDLE.defaultTotalPriceRub, 7500);
		assert.equal(CARIES_DIAGNOSIS_BUNDLE.defaultTotalPriceKopecks, 750000);
	});

	test("Tooth state and ICD-10 lookup functions correctly resolve bundles", () => {
		assert.equal(getDiagnosisBundleByToothState("Caries"), CARIES_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Pulpitis"), PULPITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Periodontitis"), PERIODONTITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Missing"), EXTRACTION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("ExtractionIndicated"), EXTRACTION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("Crown"), CROWN_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByToothState("UnknownState"), null);

		assert.equal(getDiagnosisBundleByIcd10("K02.1"), CARIES_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K02.0"), CARIES_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K04.0"), PULPITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K04.7"), PERIODONTITIS_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K08.1"), EXTRACTION_DIAGNOSIS_BUNDLE);
		assert.equal(getDiagnosisBundleByIcd10("K05.3"), HYGIENE_DIAGNOSIS_BUNDLE);
	});

	test("resolveServicePriceAgainstCatalog resolves against live clinic price list with exact 804n code preference", () => {
		const service = CARIES_DIAGNOSIS_BUNDLE.services[3]; // A16.07.002.010 Пломба световая
		assert.ok(service);
		assert.equal(service.code804n, "A16.07.002.010");

		const mockCatalog = [
			{
				id: "cat_fill_light",
				code: "A16.07.002.010",
				title: "Пломба светового отверждения (Filtek Z250)",
				basePriceRub: 4500,
				active: true,
			},
			{
				id: "cat_other",
				code: "A16.07.002",
				title: "Препарирование полости",
				basePriceRub: 1200,
				active: true,
			},
		];

		const resolved = resolveServicePriceAgainstCatalog(service, mockCatalog);
		assert.equal(resolved.fromCatalog, true);
		assert.equal(resolved.priceId, "cat_fill_light");
		assert.equal(resolved.priceRub, 4500);
		assert.equal(resolved.priceKopecks, 450000);
		assert.equal(resolved.title, "Пломба светового отверждения (Filtek Z250)");

		// Fallback when catalog item is inactive or missing
		const resolvedFallback = resolveServicePriceAgainstCatalog(service, []);
		assert.equal(resolvedFallback.fromCatalog, false);
		assert.equal(resolvedFallback.priceId, null);
		assert.equal(resolvedFallback.priceRub, 4000);
		assert.equal(resolvedFallback.priceKopecks, 400000);
	});

	test("createCustomizedBundle supports unchecking services with exact live kopeck calculation", () => {
		// All checked by default
		const fullCustom = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, { toothCode: 16 });
		assert.equal(fullCustom.checkedCount, 5);
		assert.equal(fullCustom.totalKopecks, 750000);
		assert.equal(fullCustom.totalRub, 7500);

		// Doctor unchecks cofferdam and polishing
		const customized = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, {
			toothCode: "16",
			checkedServiceCodes: ["A11.07.012", "A16.07.002", "A16.07.002.010"], // no cofferdam, no polishing
		});

		assert.equal(customized.checkedCount, 3);
		// Sum = 120000 + 100000 + 400000 = 620000 kopecks (6200 RUB)
		assert.equal(customized.totalKopecks, 620000);
		assert.equal(customized.totalRub, 6200);

		const checkedCodes = customized.items.filter((i) => i.checked).map((i) => i.code804n);
		assert.deepEqual(checkedCodes, ["A11.07.012", "A16.07.002", "A16.07.002.010"]);
	});

	test("exportCustomizedBundleToCashier54Fz produces strict 54-FZ receipt items with integer kopecks and VAT exemption", () => {
		const customized = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, {
			toothCode: "16",
			checkedServiceCodes: ["A11.07.012", "A16.07.002.010"],
		});

		const exported = exportCustomizedBundleToCashier54Fz(customized, {
			patientId: "pat_999",
			visitId: "vis_123",
			toothNumber: 16,
		});

		assert.equal(exported.source, "chairside_diagnosis_package");
		assert.equal(exported.patientId, "pat_999");
		assert.equal(exported.visitId, "vis_123");
		assert.equal(exported.toothNumber, 16);
		assert.equal(exported.toothCode, "16");
		assert.equal(exported.itemsCount, 2);
		// 120000 + 400000 = 520000
		assert.equal(exported.totalKopecks, 520000);
		assert.equal(exported.totalRub, 5200);

		for (const item of exported.receiptItems) {
			assert.equal(item.quantity, 1);
			assert.equal(item.taxRate, "none", "Dental medical services are exempt from VAT under Art. 149 NK RF");
			assert.equal(item.paymentSubject, 4, "Payment subject 4 = medical service under FFD 1.2");
			assert.equal(item.paymentMethod, 4, "Payment method 4 = full settlement");
			assert.ok(Number.isInteger(item.priceKopecks));
			assert.ok(Number.isInteger(item.sumKopecks));
			assert.equal(item.toothNumber, 16);
			assert.ok(item.name.includes("[A"));
			assert.ok(item.name.includes("(зуб 16)"));
		}
	});

	test("TOOTH_804N_PRESETS strictly provides required 1-click chairside 804n presets with exact integer prices", () => {
		// Caries
		assert.equal(TOOTH_804N_PRESETS.cariesFilling.code804n, "A16.07.002.010");
		assert.equal(TOOTH_804N_PRESETS.cariesFilling.priceRub, 4500);
		assert.equal(TOOTH_804N_PRESETS.cariesFilling.priceKopecks, 450000);

		// Endo
		assert.equal(TOOTH_804N_PRESETS.endoCanals.code804n, "A16.07.030");
		assert.equal(TOOTH_804N_PRESETS.endoCanals.priceRub, 3500);
		assert.equal(TOOTH_804N_PRESETS.endoCanals.priceKopecks, 350000);

		// Crown
		assert.equal(TOOTH_804N_PRESETS.crownZirconia.code804n, "A16.07.004");
		assert.equal(TOOTH_804N_PRESETS.crownZirconia.priceRub, 24000);
		assert.equal(TOOTH_804N_PRESETS.crownZirconia.priceKopecks, 2400000);

		// Extraction
		assert.equal(TOOTH_804N_PRESETS.extractionPermanent.code804n, "A16.07.001");
		assert.equal(TOOTH_804N_PRESETS.extractionPermanent.priceRub, 3500);
		assert.equal(TOOTH_804N_PRESETS.extractionPermanent.priceKopecks, 350000);

		// Anesthesia
		assert.equal(TOOTH_804N_PRESETS.anesthesiaInfiltration.code804n, "A11.07.012");
		assert.equal(TOOTH_804N_PRESETS.anesthesiaInfiltration.priceRub, 1200);
		assert.equal(TOOTH_804N_PRESETS.anesthesiaInfiltration.priceKopecks, 120000);

		// Verify building a typed ToothClinicalServicePayload attached to tooth 46
		const toothPayload: ToothClinicalServicePayload = {
			...TOOTH_804N_PRESETS.cariesFilling,
			toothNumber: 46,
			toothCode: "46",
		};

		assert.equal(toothPayload.toothNumber, 46);
		assert.equal(toothPayload.toothCode, "46");
		assert.equal(toothPayload.code804n, "A16.07.002.010");
		assert.equal(toothPayload.priceRub, 4500);
	});
});
