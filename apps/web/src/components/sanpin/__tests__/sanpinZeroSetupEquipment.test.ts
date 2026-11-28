import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createBactericidalEquipmentDtoSchema } from "@dental/shared";
import {
	BactericidalRegisterTab,
	CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET,
	provisionCanonicalBactericidalEquipment,
} from "../BactericidalRegisterTab";
import { CleaningControlTab } from "../CleaningControlTab";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("SanPiN Bactericidal & Sterilizer Zero-Setup Provisioning (Mandates 8e, 8k, 8n)", () => {
	describe("1. Canonical Bactericidal Recirculator Preset", () => {
		it("provides standard preset for closed recirculator Dezar-4 (ОРУБн-3-3) for Cabinet #1", () => {
			assert.ok(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET);
			assert.ok(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.deviceBrand.includes("Дезар-4"));
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.deviceType, "recirculator_closed");
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.roomVolumeM3, 45.0);
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.maxLampHours, 8000);
			assert.equal(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET.lampCount, 3);

			const validatedDezar = createBactericidalEquipmentDtoSchema.parse(CANONICAL_BACTERICIDAL_EQUIPMENT_PRESET);
			assert.equal(validatedDezar.deviceType, "recirculator_closed");
			assert.equal(validatedDezar.roomVolumeM3, 45.0);
			assert.equal(validatedDezar.isCommissioned, true);
		});
	});

	describe("2. Provisioning Helpers (Autonomous Zero-Setup Execution)", () => {
		it("provisionCanonicalBactericidalEquipment executes POST request for canonical recirculator", async () => {
			const postCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
			const mockFetch: typeof fetch = async (input, init) => {
				const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
				const parsed: unknown = init?.body ? JSON.parse(String(init.body)) : {};
				const body: Record<string, unknown> = {};
				if (typeof parsed === "object" && parsed !== null) {
					for (const [k, v] of Object.entries(parsed)) body[k] = v;
				}
				postCalls.push({ url, body });
				return new Response(
					JSON.stringify({
						id: "mock-bac-1",
						...body,
						remainingLampHours: 8000,
						remainingLampPercent: 100,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			};

			const result = await provisionCanonicalBactericidalEquipment({
				customFetch: mockFetch,
			});

			assert.ok(result);
			assert.equal(result.id, "mock-bac-1");
			assert.equal(postCalls.length, 1);
			assert.equal(postCalls[0]?.url, "/api/registers/bactericidal/equipments");
			assert.ok(String(postCalls[0]?.body.deviceBrand ?? "").includes("Дезар-4"));
		});
	});

	describe("3. Rendered UI Zero-Roadblock Verification (Mandate 8e & P2-1.2)", () => {
		it("BactericidalRegisterTab renders with zero disabled button locks", () => {
			const html = renderToStaticMarkup(React.createElement(BactericidalRegisterTab));
			assert.ok(html.length > 0);
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		});

		it("CleaningControlTab renders pso-quick-mark-shift-btn without disabled buttons or inline style tag", () => {
			const html = renderToStaticMarkup(React.createElement(CleaningControlTab));
			assert.ok(html.includes("pso-quick-mark-shift-btn"));
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
			assert.equal(html.includes("<style>"), false);
		});
	});
});
