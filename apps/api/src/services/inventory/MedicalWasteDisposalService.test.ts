import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	MedicalWasteDisposalService,
	type MedicalWasteRecord,
} from "./MedicalWasteDisposalService.js";

describe("MedicalWasteDisposalService — Feature #186 SanPiN Waste Registry & Manifest", () => {
	const validClassB: MedicalWasteRecord = {
		id: "w-1",
		organizationId: "org-1",
		roomNumber: "Кабинет 3 (Хирургия)",
		wasteClass: "class_b",
		weightKg: 3.5,
		packageType: "yellow_bag_sealed",
		collectedByStaffId: "nurse-1",
		collectedAt: new Date("2026-08-17T12:00:00Z"),
		isDisposed: false,
	};

	const invalidClassB: MedicalWasteRecord = {
		id: "w-2",
		organizationId: "org-1",
		roomNumber: "Кабинет 1",
		wasteClass: "class_b",
		weightKg: 2.0,
		packageType: "white_bag_sealed", // Violates SanPiN for Class B
		collectedByStaffId: "nurse-2",
		collectedAt: new Date("2026-08-17T12:00:00Z"),
		isDisposed: false,
	};

	test("1. Validates SanPiN packaging rules for hazardous waste", () => {
		const resValid = MedicalWasteDisposalService.validateWasteRecord(validClassB);
		assert.equal(resValid.isValid, true);
		assert.equal(resValid.errors.length, 0);

		const resInvalid = MedicalWasteDisposalService.validateWasteRecord(invalidClassB);
		assert.equal(resInvalid.isValid, false);
		assert.ok(resInvalid.errors.length > 0);
	});

	test("2. Generates disposal manifest with total weights and breakdown by class", () => {
		const records: MedicalWasteRecord[] = [
			validClassB, // 3.5 kg Class B
			{
				id: "w-3",
				organizationId: "org-1",
				roomNumber: "Ординаторская",
				wasteClass: "class_a",
				weightKg: 5.0,
				packageType: "white_bag_sealed",
				collectedByStaffId: "cleaner-1",
				collectedAt: new Date("2026-08-17T13:00:00Z"),
				isDisposed: false,
			},
			{
				id: "w-4",
				organizationId: "org-1",
				roomNumber: "Рентген-кабинет",
				wasteClass: "class_g",
				weightKg: 1.2,
				packageType: "mercury_safe_container",
				collectedByStaffId: "nurse-1",
				collectedAt: new Date("2026-08-17T14:00:00Z"),
				isDisposed: false,
			},
		];

		const manifest = MedicalWasteDisposalService.generateDisposalManifest(
			"org-1",
			records,
			"ООО ЭкоМедУтиль",
			"ЛИЦ-77-01-009876",
			"Иванова М.С. (Главная медсестра)",
			new Date("2026-08-17T15:00:00Z"),
		);

		assert.equal(manifest.totalWeightKg, 3.5 + 5.0 + 1.2); // 9.7 kg
		assert.equal(manifest.breakdownByClass.class_a.weightKg, 5.0);
		assert.equal(manifest.breakdownByClass.class_b.weightKg, 3.5);
		assert.equal(manifest.breakdownByClass.class_g.weightKg, 1.2);
		assert.equal(manifest.recordIds.length, 3);
	});
});
