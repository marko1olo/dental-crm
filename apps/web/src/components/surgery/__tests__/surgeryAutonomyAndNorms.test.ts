/**
 * surgeryAutonomyAndNorms.test.ts — Тесты автономии хирурга, 1-клик норм и мягкого овердрафта (Мандаты 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_IMPLANTATION_NORM_TEXT,
	SIMPLE_EXTRACTION_NORM_TEXT,
	COMPLEX_EXTRACTION_NORM_TEXT,
	CLOSED_SINUS_LIFT_NORM_TEXT,
	PERIOSTOTOMY_NORM_TEXT,
	SURGICAL_OPERATION_NORMS,
	evaluateWarehouseOverdraft,
	quickDeductSurgicalMaterials,
} from "../surgeryProtocols";

describe("Surgery Autonomy & 1-Click Operation Norms (DENTE CRM)", () => {
	it("1. Dental Implantation 1-click norm matches canonical text and 35 N·см torque", () => {
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("первичная торк-стабильность 35 Н·см"),
			"Must contain 35 N*cm torque specification",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл"),
			"Must contain 1.7 ml articaine anesthesia",
		);
		assert.ok(
			DENTAL_IMPLANTATION_NORM_TEXT.includes("Ушивание раны шовным материалом ПГА 4-0"),
			"Must contain PGA 4-0 suture material",
		);
	});

	it("2. Surgical Operation Norms catalog has all canonical procedures with ICD-10", () => {
		const ids = SURGICAL_OPERATION_NORMS.map((n) => n.id);
		assert.ok(ids.includes("surgery_implant_standard"), "Must include implant standard norm");
		assert.ok(ids.includes("surgery_extraction_simple"), "Must include simple extraction norm");
		assert.ok(ids.includes("surgery_extraction_complex"), "Must include complex extraction norm");
		assert.ok(ids.includes("surgery_extraction_atypical"), "Must include atypical wisdom tooth norm");
		assert.ok(ids.includes("surgery_sinus_lift_closed"), "Must include closed sinus-lift norm");
		assert.ok(ids.includes("surgery_periostotomy"), "Must include emergency periostotomy norm");

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

		const normalStatus = evaluateWarehouseOverdraft(materials, false);
		assert.equal(normalStatus.hasOverdraft, false);
		assert.equal(normalStatus.canProceed, true);

		const delayedStatus = evaluateWarehouseOverdraft(materials, true);
		assert.equal(delayedStatus.hasOverdraft, true);
		assert.equal(delayedStatus.canProceed, true, "Mandate 8e: Operation MUST NOT be blocked!");
		assert.ok(delayedStatus.detailsRu.includes("мягкий овердрафт"));
		assert.ok(delayedStatus.pendingItems.includes("Имплантат Osstem TS III"));
	});

	it("4. Suture material and sponge warehouse delays NEVER block surgery", () => {
		const surgicalMaterials = [
			{ name: "Шовный материал Викрил 4-0", isWarehouseCritical: false },
			{ name: "Губка Альвожил", isWarehouseCritical: false },
		];

		const overdraftStatus = evaluateWarehouseOverdraft(
			surgicalMaterials,
			false,
			["Шовный материал Викрил 4-0", "Губка Альвожил"],
		);

		assert.equal(overdraftStatus.hasOverdraft, true);
		assert.equal(overdraftStatus.canProceed, true, "Mandate 8e: Operation CANNOT be blocked!");
		assert.ok(overdraftStatus.pendingItems.includes("Шовный материал Викрил 4-0"));
		assert.ok(overdraftStatus.detailsRu.includes("Операция не блокируется"));
	});

	it("5. quickDeductSurgicalMaterials provides 1-click write-off with soft overdraft guarantee", async () => {
		const materials = [
			{ name: "Имплантат Osstem TS III", unit: "шт", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 4-0", unit: "шт", quantity: 1, isWarehouseCritical: false },
		];

		const normalResult = await quickDeductSurgicalMaterials({
			materials,
			hasWarehouseDelay: false,
			operationTitle: "Дентальная имплантация",
		});
		assert.equal(normalResult.success, true);
		assert.equal(normalResult.isOverdraft, false);
		assert.equal(normalResult.deductedItems.length, 2);

		const overdraftResult = await quickDeductSurgicalMaterials({
			materials,
			hasWarehouseDelay: true,
			operationTitle: "Дентальная имплантация",
		});
		assert.equal(overdraftResult.success, true);
		assert.equal(overdraftResult.isOverdraft, true);
		assert.ok(overdraftResult.messageRu.includes("мягкий овердрафт"));
	});
});
