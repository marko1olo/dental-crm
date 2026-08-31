import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	createSterilizerEquipmentDtoSchema,
	sterilizerDeviceClassSchema,
	sterilizerEquipmentStatusSchema,
	type SterilizerEquipment,
} from "@dental/shared";
import {
	type ClinicAutoclaveDevice,
} from "../AutoclaveEquipmentModal";

describe("SanPiN 3.3686-21 — Clinic Sterilizer Equipment Fleet Management", () => {
	it("provides popular sterilizer presets (Melag 23B/43B, Euronda E9/E10, DAC Universal, ГП-20 СПУ, DGM AND-20/24)", () => {
		assert.ok(POPULAR_STERILIZER_BRAND_PRESETS.length >= 7);

		const melag23 = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "melag_vacuklav_23b");
		assert.ok(melag23);
		assert.equal(melag23.brandModel, "Melag Vacuklav 23 B+");
		assert.equal(melag23.deviceClass, "autoclave_class_b");
		assert.equal(melag23.chamberVolumeLiters, 22);

		const euronda = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "euronda_e9_next");
		assert.ok(euronda);
		assert.equal(euronda.brandModel, "Euronda E9 Next");
		assert.equal(euronda.chamberVolumeLiters, 24);

		const dacUniversal = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dentsply_dac_universal");
		assert.ok(dacUniversal);
		assert.equal(dacUniversal.deviceClass, "autoclave_class_s");
		assert.equal(dacUniversal.chamberVolumeLiters, 6);

		const gp20 = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dryheat_gp20");
		assert.ok(gp20);
		assert.equal(gp20.deviceClass, "dry_heat_air");
		assert.equal(gp20.deviceType, "dry_heat");
		assert.equal(gp20.chamberVolumeLiters, 20);

		const dgm = POPULAR_STERILIZER_BRAND_PRESETS.find((p) => p.id === "dgm_and_20");
		assert.ok(dgm);
		assert.equal(dgm.chamberVolumeLiters, 20);
	});

	it("validates createSterilizerEquipmentDtoSchema against Zod contract", () => {
		const validDto = {
			name: "Автоклав Melag Vacuklav 23 B+ (№1)",
			brandModel: "Melag Vacuklav 23 B+",
			serialNumber: "MEL-2026-8812",
			inventoryNumber: "ИНВ-00412",
			deviceType: "autoclave_steam" as const,
			deviceClass: "autoclave_class_b" as const,
			chamberVolumeLiters: 22,
			locationRoom: "ЦСО (Стерилизационная)",
			verificationExpiryDate: "2027-08-31",
			lastMaintenanceDate: "2026-08-31",
			nextMaintenanceDate: "2027-02-28",
			commissioningDate: "2026-08-31",
			status: "active" as const,
			notes: "Введен в эксплуатацию по СанПиН 3.3686-21",
		};

		const parsed = createSterilizerEquipmentDtoSchema.parse(validDto);
		assert.equal(parsed.name, "Автоклав Melag Vacuklav 23 B+ (№1)");
		assert.equal(parsed.chamberVolumeLiters, 22);
		assert.equal(parsed.status, "active");
	});

	it("validates sterilizer lifecycle statuses: active, in_maintenance, decommissioned", () => {
		assert.equal(sterilizerEquipmentStatusSchema.parse("active"), "active");
		assert.equal(sterilizerEquipmentStatusSchema.parse("in_maintenance"), "in_maintenance");
		assert.equal(sterilizerEquipmentStatusSchema.parse("decommissioned"), "decommissioned");
		assert.throws(() => sterilizerEquipmentStatusSchema.parse("broken_unknown"));
	});

	it("verifies autoclave fleet supports Class B, S, N, Dry Heat and Plasma according to SanPiN 3.3686-21", () => {
		const supportedClasses = sterilizerDeviceClassSchema.options;
		assert.ok(supportedClasses.includes("autoclave_class_b"));
		assert.ok(supportedClasses.includes("autoclave_class_s"));
		assert.ok(supportedClasses.includes("autoclave_class_n"));
		assert.ok(supportedClasses.includes("dry_heat_air"));
		assert.ok(supportedClasses.includes("plasma"));
	});
});
