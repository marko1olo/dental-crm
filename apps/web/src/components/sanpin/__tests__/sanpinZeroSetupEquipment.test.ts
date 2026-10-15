import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	createBactericidalEquipmentDtoSchema,
} from "@dental/shared";
import {
	CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET,
	provisionCanonicalBactericidalEquipment,
} from "../BactericidalRegisterTab";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("SanPiN Bactericidal & Sterilizer Zero-Setup Provisioning (Mandates 8e, 8k, 8n)", () => {
	describe("1. Canonical Bactericidal Recirculator Preset", () => {
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

	describe("2. Provisioning Helpers (Autonomous Zero-Setup Execution)", () => {
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

	describe("3. Static Invariants & Mandate 8e Zero-Roadblock Verification", () => {
		const bacFilePath = path.resolve(
			__dirname,
			"../BactericidalRegisterTab.tsx",
		);
		const psoFilePath = path.resolve(
			__dirname,
			"../PsoRegisterTab.tsx",
		);

		it("BactericidalRegisterTab has zero equipment disabled locks", () => {
			const bacContent = fs.readFileSync(bacFilePath, "utf8");

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
		});

		it("PsoRegisterTab has zero disabled buttons and instant 1-click batch CTA", () => {
			const psoContent = fs.readFileSync(psoFilePath, "utf8");

			assert.equal(
				psoContent.includes("disabled={true}"),
				false,
				"PsoRegisterTab must not contain permanent disabled buttons",
			);
			assert.ok(
				psoContent.includes("pso-quick-mark-shift-btn"),
				"PsoRegisterTab must contain 1-click batch mark CTA",
			);
		});
	});
});
