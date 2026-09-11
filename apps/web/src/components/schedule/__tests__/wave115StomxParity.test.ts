/**
 * wave115StomxParity.test.ts
 *
 * Wave 115: StomX Desktop Parity & Clinical Ergonomics Test Suite
 *
 * Scope:
 * 1. 4-State Workplace Palettes from StomX depot (Lavender, Blue, Rose, Olive, Sand).
 * 2. Palette helpers: getStomxWorkplacePalette, STOMX_WORKPLACE_PALETTES_MAP, DEFAULT_STOMX_WORKPLACE_PALETTE.
 * 3. ScheduleGrid integration: chair palette badges, data-chair-palette attributes on headers and cells.
 * 4. 1-Click Refusal Reasons catalog and AppointmentCard banner / chips / dropdown integration.
 * 5. Touch targets >= 44x44px in PatientBillingModal (Tabs, Discounts, Express Pay, Tenders, Footer Actions).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_STOMX_WORKPLACE_PALETTE,
	getStomxWorkplacePalette,
	STOMX_REFUSE_REASONS_CATALOG,
	STOMX_WORKPLACE_PALETTES,
	STOMX_WORKPLACE_PALETTES_MAP,
	stomxWorkplacePaletteSchema,
	type StomxWorkplacePalette,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 115: StomX 4-State Workplace Palettes Parity", () => {
	it("should have exactly 5 canonical StomX workplace palettes", () => {
		assert.equal(STOMX_WORKPLACE_PALETTES.length, 5);
		const expectedIds = [1, 5, 6, 8, 9];
		const actualIds = STOMX_WORKPLACE_PALETTES.map((p) => p.id);
		assert.deepEqual(actualIds, expectedIds);
	});

	it("should contain exact 4-state hex colors matching StomX reverse engineering depot", () => {
		// Lavender
		const lavender = STOMX_WORKPLACE_PALETTES_MAP.lavender;
		assert.ok(lavender);
		assert.equal(lavender.bright_code, "#AEA7D3");
		assert.equal(lavender.bright_dark, "#292541");
		assert.equal(lavender.code, "#D3CFE7");
		assert.equal(lavender.dark, "#3E3862");
		assert.equal(lavender.nameRu, "Лаванда");

		// Blue
		const blue = STOMX_WORKPLACE_PALETTES_MAP.blue;
		assert.ok(blue);
		assert.equal(blue.bright_code, "#91B9E9");
		assert.equal(blue.bright_dark, "#25313F");
		assert.equal(blue.code, "#BBD4F1");
		assert.equal(blue.dark, "#394B60");
		assert.equal(blue.nameRu, "Синий");

		// Rose
		const rose = STOMX_WORKPLACE_PALETTES_MAP.rose;
		assert.ok(rose);
		assert.equal(rose.bright_code, "#EF8AAF");
		assert.equal(rose.bright_dark, "#392029");
		assert.equal(rose.code, "#F8CCDC");
		assert.equal(rose.dark, "#623746");
		assert.equal(rose.nameRu, "Роза");

		// Olive
		const olive = STOMX_WORKPLACE_PALETTES_MAP.olive;
		assert.ok(olive);
		assert.equal(olive.bright_code, "#C1DE9B");
		assert.equal(olive.bright_dark, "#2C381C");
		assert.equal(olive.code, "#D7EABF");
		assert.equal(olive.dark, "#506633");
		assert.equal(olive.nameRu, "Олива");

		// Sand
		const sand = STOMX_WORKPLACE_PALETTES_MAP.sand;
		assert.ok(sand);
		assert.equal(sand.bright_code, "#E1EF8A");
		assert.equal(sand.bright_dark, "#413425");
		assert.equal(sand.code, "#F2F8CC");
		assert.equal(sand.dark, "#624E38");
		assert.equal(sand.nameRu, "Песок");
	});

	it("should validate each palette against Zod schema", () => {
		for (const palette of STOMX_WORKPLACE_PALETTES) {
			const parsed = stomxWorkplacePaletteSchema.safeParse(palette);
			assert.equal(parsed.success, true, `Palette ${palette.nameRu} failed Zod validation`);
		}
	});

	it("getStomxWorkplacePalette should correctly resolve by id, number, index, or fallback", () => {
		// By ID
		assert.equal(getStomxWorkplacePalette("lavender").nameRu, "Лаванда");
		assert.equal(getStomxWorkplacePalette("blue").nameRu, "Синий");
		assert.equal(getStomxWorkplacePalette("rose").nameRu, "Роза");
		assert.equal(getStomxWorkplacePalette("olive").nameRu, "Олива");
		assert.equal(getStomxWorkplacePalette("sand").nameRu, "Песок");

		// By index / number
		assert.equal(getStomxWorkplacePalette(0).nameRu, "Лаванда");
		assert.equal(getStomxWorkplacePalette(1).nameRu, "Лаванда"); // id 1 is lavender
		assert.equal(getStomxWorkplacePalette(5).nameRu, "Синий"); // id 5 is blue
		assert.equal(getStomxWorkplacePalette(6).nameRu, "Роза"); // id 6 is rose
		assert.equal(getStomxWorkplacePalette(8).nameRu, "Олива"); // id 8 is olive
		assert.equal(getStomxWorkplacePalette(9).nameRu, "Песок"); // id 9 is sand

		// Invalid string / fallback
		assert.equal(getStomxWorkplacePalette("").nameRu, DEFAULT_STOMX_WORKPLACE_PALETTE.nameRu);
		assert.equal(getStomxWorkplacePalette(null as any).nameRu, DEFAULT_STOMX_WORKPLACE_PALETTE.nameRu);
		assert.equal(getStomxWorkplacePalette(undefined as any).nameRu, DEFAULT_STOMX_WORKPLACE_PALETTE.nameRu);
	});
});

describe("Wave 115: ScheduleGrid Workplace Palette Integration", () => {
	it("ScheduleGrid source should contain data-chair-palette and getStomxWorkplacePalette", () => {
		const filePath = path.resolve(
			__dirname,
			"../ScheduleGrid.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.match(content, /getStomxWorkplacePalette/);
		assert.match(content, /data-chair-palette/);
		assert.match(content, /chair-palette-badge-/);
		assert.match(content, /STOMX_WORKPLACE_PALETTES/);
	});
});

describe("Wave 115: AppointmentCard Refusal Reasons & Categorization", () => {
	it("should export 10 refusal reasons from shared catalog", () => {
		assert.equal(STOMX_REFUSE_REASONS_CATALOG.length, 10);
		const codes = STOMX_REFUSE_REASONS_CATALOG.map((r) => r.code);
		assert.ok(codes.includes("no_show_confirmed"));
		assert.ok(codes.includes("no_show_unconfirmed"));
		assert.ok(codes.includes("patient_cancelled"));
		assert.ok(codes.includes("patient_refused_clinic"));
		assert.ok(codes.includes("clinic_cancelled"));
		assert.ok(codes.includes("clinic_error"));
	});

	it("AppointmentCard should contain 1-click refusal menu trigger, dropdown, banner and quick chips", () => {
		const filePath = path.resolve(
			__dirname,
			"../AppointmentCard.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		// Refusal dropdown menu trigger and list in card menu
		assert.match(content, /appointment-card-refusal-menu-trigger/);
		assert.match(content, /appointment-card-refusal-reasons-dropdown/);
		assert.match(content, /appointment-card-refusal-reason-/);

		// Refusal banner and quick categorization chips on card body
		assert.match(content, /appointment-card-refusal-banner/);
		assert.match(content, /appointment-card-refusal-chips/);
		assert.match(content, /appointment-card-refusal-chip-/);
		assert.match(content, /\[Отмена:/);
	});
});

describe("Wave 115: PatientBillingModal Touch Targets >= 44x44px", () => {
	const billingModalPath = path.resolve(
		__dirname,
		"../../finance/PatientBillingModal.tsx",
	);
	const content = fs.readFileSync(billingModalPath, "utf-8");

	it("tab buttons should have min-h-[44px]", () => {
		assert.match(content, /data-testid="btn-tab-friendly-bill"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-tab-preview-act"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-tab-details-act"[\s\S]*?min-h-\[44px\]/);
	});

	it("discount select, quick rounding, percentage pills, and reset should have min-h-[44px]", () => {
		assert.match(content, /data-testid="select-loyalty-discount"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-round-hundreds"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-3"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-5"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-10"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-warranty"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-colleague"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-discount-reset"[\s\S]*?min-h-\[44px\]/);
	});

	it("express pay buttons should have min-h-[44px]", () => {
		assert.match(content, /data-testid="btn-express-pay-card"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-express-pay-cash"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-express-pay-sbp"[\s\S]*?min-h-\[44px\]/);
	});

	it("1-click tender buttons should have min-h-[44px]", () => {
		assert.match(content, /data-testid="tender-btn-card"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="tender-btn-sbp"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="tender-btn-cash"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="tender-btn-family"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="tender-btn-deposit"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="tender-btn-installment"[\s\S]*?min-h-\[44px\]/);
	});

	it("footer action buttons should have min-h-[44px]", () => {
		assert.match(content, /data-testid="btn-print-billing-act"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-fiscalize-54fz"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-footer-send-whatsapp"[\s\S]*?min-h-\[44px\]/);
		assert.match(content, /data-testid="btn-footer-partial-refund"[\s\S]*?min-h-\[44px\]/);
	});
});
