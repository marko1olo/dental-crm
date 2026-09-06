import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	createBactericidalEquipmentDtoSchema,
	createTemperatureHumidityEquipmentDtoSchema,
} from "@dental/shared";
import {
	CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET,
	provisionCanonicalBactericidalEquipment,
} from "../BactericidalRegisterTab";
import {
	CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS,
	provisionCanonicalTemperatureEquipments,
} from "../TemperatureHumidityRegisterTab";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("SanPiN Microclimate & Bactericidal Zero-Setup Provisioning (Mandates 8e, 8k, 8n)", () => {
	describe("1. Canonical Temperature & Humidity Presets", () => {
		it("provides standard presets for Pozis pharmacy refrigerator and dental cabinet VIT-2", () => {
			assert.equal(CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS.length, 2);

			const pozis = CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS[0]!;
			assert.equal(pozis.equipmentType, "refrigerator_cold");
			assert.ok(pozis.name.includes("Pozis ХФ-250"));
			assert.equal(pozis.targetTempMinCelsius, 2.0);
			assert.equal(pozis.targetTempMaxCelsius, 8.0);
			assert.equal(pozis.targetHumidityMinPercent, undefined);
			assert.equal(pozis.targetHumidityMaxPercent, undefined);

			// Validate with DTO schema
			const validatedPozis = createTemperatureHumidityEquipmentDtoSchema.parse(pozis);
			assert.equal(validatedPozis.equipmentType, "refrigerator_cold");
			assert.equal(validatedPozis.isActive, true);

			const vit2 = CANONICAL_TEMPERATURE_EQUIPMENT_PRESETS[1]!;
			assert.equal(vit2.equipmentType, "storage_room");
			assert.ok(vit2.name.includes("ВИТ-2"));
			assert.equal(vit2.targetTempMinCelsius, 15.0);
			assert.equal(vit2.targetTempMaxCelsius, 25.0);
			assert.equal(vit2.targetHumidityMinPercent, 30);
			assert.equal(vit2.targetHumidityMaxPercent, 65);

			// Validate with DTO schema
			const validatedVit2 = createTemperatureHumidityEquipmentDtoSchema.parse(vit2);
			assert.equal(validatedVit2.equipmentType, "storage_room");
			assert.equal(validatedVit2.targetHumidityMinPercent, 30);
			assert.equal(validatedVit2.targetHumidityMaxPercent, 65);
		});
	});

	describe("2. Canonical Bactericidal Recirculator Preset", () => {
		it("provides standard preset for closed recirculator Dezar-4 (ОРУБн-3-3) for Cabinet #1", () => {
			assert.ok(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET);
			assert.ok(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.deviceBrand.includes("Дезар-4"));
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.deviceType, "recirculator_closed");
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.roomVolumeM3, 45.0);
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.maxLampHours, 8000);
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.lampCount, 3);

			// Validate with DTO schema
			const validatedDezar = createBactericidalEquipmentDtoSchema.parse(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET);
			assert.equal(validatedDezar.deviceType, "recirculator_closed");
			assert.equal(validatedDezar.roomVolumeM3, 45.0);
			assert.equal(validatedDezar.isCommissioned, true);
		});
	});

	describe("3. Provisioning Helpers (Autonomous Zero-Setup Execution)", () => {
		it("provisionCanonicalTemperatureEquipments executes POST requests for each canonical equipment", async () => {
			const postCalls: Array<{ url: string; body: any }> = [];
			const mockFetch: typeof fetch = async (input: any, init?: any) => {
				const url = typeof input === "string" ? input : input.url;
				const body = init?.body ? JSON.parse(init.body as string) : null;
				postCalls.push({ url, body });
				return {
					ok: true,
					status: 201,
					json: async () => ({
						id: `mock-temp-${postCalls.length}`,
						...body,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					}),
				} as Response;
			};

			const result = await provisionCanonicalTemperatureEquipments({
				customFetch: mockFetch,
			});

			assert.equal(result.length, 2);
			assert.equal(postCalls.length, 2);
			assert.equal(postCalls[0]!.url, "/api/registers/temperature-humidity/equipments");
			assert.ok(postCalls[0]!.body.name.includes("Pozis"));
			assert.equal(postCalls[1]!.url, "/api/registers/temperature-humidity/equipments");
			assert.ok(postCalls[1]!.body.name.includes("ВИТ-2"));
			assert.equal(result[0]!.id, "mock-temp-1");
			assert.equal(result[1]!.id, "mock-temp-2");
		});

		it("provisionCanonicalBactericidalEquipment executes POST request for canonical recirculator", async () => {
			const postCalls: Array<{ url: string; body: any }> = [];
			const mockFetch: typeof fetch = async (input: any, init?: any) => {
				const url = typeof input === "string" ? input : input.url;
				const body = init?.body ? JSON.parse(init.body as string) : null;
				postCalls.push({ url, body });
				return {
					ok: true,
					status: 201,
					json: async () => ({
						id: "mock-bac-1",
						...body,
						remainingLampHours: 8000,
						remainingLampPercent: 100,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					}),
				} as Response;
			};

			const result = await provisionCanonicalBactericidalEquipment({
				customFetch: mockFetch,
			});

			assert.ok(result);
			assert.equal(result.id, "mock-bac-1");
			assert.equal(postCalls.length, 1);
			assert.equal(postCalls[0]!.url, "/api/registers/bactericidal/equipments");
			assert.ok(postCalls[0]!.body.deviceBrand.includes("Дезар-4"));
		});
	});

	describe("4. Static Invariants & Mandate 8e Zero-Roadblock Verification", () => {
		const tempFilePath = path.resolve(
			__dirname,
			"../TemperatureHumidityRegisterTab.tsx",
		);
		const bacFilePath = path.resolve(
			__dirname,
			"../BactericidalRegisterTab.tsx",
		);

		it("TemperatureHumidityRegisterTab has zero equipment disabled locks and contains zero-setup banner", () => {
			const tempContent = fs.readFileSync(tempFilePath, "utf8");

			// Roadblocks removed
			assert.equal(
				tempContent.includes("disabled={equipments.length === 0}"),
				false,
				"Temperature tab must not contain disabled={equipments.length === 0}",
			);

			// Zero-setup banner text present
			assert.ok(
				tempContent.includes("⚡ Подключить типовое оснащение (Холодильник Pozis + Кабинет ВИТ-2)"),
				"Temperature tab must contain canonical zero-setup button text",
			);
			assert.ok(
				tempContent.includes('data-testid="temp-zero-setup-provision-btn"'),
				"Temperature tab must contain temp-zero-setup-provision-btn testid",
			);
			assert.ok(
				tempContent.includes('data-testid="temp-manual-log-btn"'),
				"Temperature tab must contain temp-manual-log-btn testid",
			);
		});

		it("BactericidalRegisterTab has zero equipment disabled locks and contains zero-setup banner", () => {
			const bacContent = fs.readFileSync(bacFilePath, "utf8");

			// Roadblocks removed
			assert.equal(
				bacContent.includes("equipments.length === 0"),
				true, // allowed for conditional rendering of the banner: {equipments.length === 0 && (...)}
			);
			assert.equal(
				bacContent.includes("disabled={equipments.length === 0}"),
				false,
				"Bactericidal tab must not contain disabled={equipments.length === 0}",
			);
			assert.equal(
				bacContent.includes("disabled={submitting || equipments.length === 0}"),
				false,
				"Bactericidal tab must not contain disabled={submitting || equipments.length === 0}",
			);

			// Zero-setup banner text present
			assert.ok(
				bacContent.includes("⚡ Подключить типовой рециркулятор (Дезар-4, Кабинет №1)"),
				"Bactericidal tab must contain canonical zero-setup button text",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-zero-setup-provision-btn"'),
				"Bactericidal tab must contain bactericidal-zero-setup-provision-btn testid",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-open-morning-shift-btn"'),
				"Bactericidal tab must contain bactericidal-open-morning-shift-btn testid",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-close-evening-shift-btn"'),
				"Bactericidal tab must contain bactericidal-close-evening-shift-btn testid",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-quick-30min-btn"'),
				"Bactericidal tab must contain bactericidal-quick-30min-btn testid",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-shift-autopilot-btn"'),
				"Bactericidal tab must contain bactericidal-shift-autopilot-btn testid",
			);
			assert.ok(
				bacContent.includes('data-testid="bactericidal-manual-session-btn"'),
				"Bactericidal tab must contain bactericidal-manual-session-btn testid",
			);
		});
	});
});
