import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_IMPLANTATION_NORM_TEXT,
	SIMPLE_EXTRACTION_NORM_TEXT,
	ATYPICAL_EXTRACTION_NORM_TEXT,
	SINUS_LIFT_GBR_NORM_TEXT,
	PERICORONITIS_NORM_TEXT,
	SURGICAL_OPERATION_NORMS,
	evaluateWarehouseOverdraft,
	buildSurgicalDiaryEntry,
} from "../surgeryProtocols";

describe("Surgical Protocols & 1-Click Operation Norms (DENTE CRM)", () => {
	it("1. Dental Implantation 1-click norm matches canonical text and 35 N/cm torque", () => {
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("первичная торк-стабильность 35 Н/см"),
			"Must contain 35 N/cm torque specification",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл"),
			"Must contain 1.7 ml articaine anesthesia",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Ушивание раны шовным материалом ПГА 4-0"),
			"Must contain PGA 4-0 suture material",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Гемостаз полный. Рекомендации даны."),
			"Must contain complete hemostasis and post-op recommendations",
		);
	});

	it("2. Surgical Operation Norms catalog has all canonical procedures with ICD-10", () => {
		const ids = SURGICAL_OPERATION_NORMS.map((n) => n.id);
		assert.ok(ids.includes("surgery_implant_standard"), "Must include implant standard norm");
		assert.ok(ids.includes("surgery_extraction_simple"), "Must include simple extraction norm");
		assert.ok(ids.includes("surgery_extraction_atypical"), "Must include atypical wisdom tooth norm");
		assert.ok(ids.includes("surgery_sinus_lift_gbr"), "Must include sinus-lift/GBR norm");
		assert.ok(ids.includes("surgery_pericoronitis"), "Must include pericoronitis norm");

		for (const norm of SURGICAL_OPERATION_NORMS) {
			assert.ok(norm.icd10.length > 0, `Norm ${norm.id} must have valid ICD-10 code`);
			assert.ok(norm.standardProtocolTextRu.length > 50, `Norm ${norm.id} must have complete clinical text`);
			assert.ok(norm.requiredMaterials.length > 0, `Norm ${norm.id} must declare required materials`);
		}
	});

	it("3. Soft warehouse overdraft NEVER blocks surgery (canProceed is always true)", () => {
		const materials = [
			{ name: "Имплантат Osstem TS III", isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 4-0", isWarehouseCritical: false },
		];

		// Case A: Warehouse normal
		const normalStatus = evaluateWarehouseOverdraft(materials, false);
		assert.equal(normalStatus.hasOverdraft, false);
		assert.equal(normalStatus.canProceed, true);

		// Case B: Supplier invoice delayed (задержка оприходования накладной)
		const delayedStatus = evaluateWarehouseOverdraft(materials, true);
		assert.equal(delayedStatus.hasOverdraft, true);
		assert.equal(delayedStatus.canProceed, true, "CRITICAL: Operation MUST NOT be blocked!");
		assert.ok(delayedStatus.detailsRu.includes("мягкий овердрафт"));
		assert.ok(delayedStatus.pendingItems.includes("Имплантат Osstem TS III"));
	});

	it("4. buildSurgicalDiaryEntry creates complete Form 043/u record without loss", () => {
		const diary = buildSurgicalDiaryEntry({
			patientName: "Смирнов А. В.",
			patientId: "PAT-2026-99",
			doctorName: "Др. Харитонов",
			toothFdi: 46,
			protocolText: DENTAL_IMPLANTATION_NORM_TEXT,
			recommendations: "Холод 15 минут, Нимесил при болях.",
			implantDetails: {
				brand: "Osstem TS III",
				diameterMm: 4.0,
				lengthMm: 10.0,
				torqueNcm: 35,
				lot: "LOT-88124",
			},
		});

		assert.ok(diary.includes("Зуб FDI #46"));
		assert.ok(diary.includes("Osstem TS III"));
		assert.ok(diary.includes("35 Н/см"));
		assert.ok(diary.includes("LOT-88124"));
		assert.ok(diary.includes("ХОД ОПЕРАЦИИ:"));
		assert.ok(diary.includes("Холод 15 минут"));
	});
});
