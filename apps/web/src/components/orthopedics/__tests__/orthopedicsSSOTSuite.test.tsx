/**
 * orthopedicsSSOTSuite.test.tsx — Red Team Inquisitor Test Suite для ортопедии, коронок и паспорта изделия.
 * Полная проверка канонического каталога, студии, лаунчера, автономии врача (Мандат 8e) и Apple HIG.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
	FIXATION_TYPE_PRESETS,
	STUMP_SHADE_PRESETS,
	VITA_CLASSIC_SHADES,
	VITA_3D_MASTER_SHADE_GROUPS,
	ORTHOPEDIC_MANUFACTURING_STAGES,
	getZtlPresetById,
	getPreparationMarginById,
	getFixationPresetById,
	getStumpShadeByCode,
	calculateOrthopedicEconomics,
	generateWarrantyPassportNumber,
	formatToothFormulaDisplay,
	validateOrthopedicTooth,
} from "../orthopedicCatalogData";
import { OrthopedicsStudioModal } from "../OrthopedicsStudioModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orthopedicsDir = path.resolve(__dirname, "..");

describe("1. Orthopedics Catalog SSOT Data & File Budgets (Mandate 8b, 8e, 8n)", () => {
	it("catalog file line count is strictly within range 280–350 lines", () => {
		const catalogPath = path.join(orthopedicsDir, "orthopedicCatalogData.ts");
		const content = fs.readFileSync(catalogPath, "utf8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 280 && lines <= 350,
			`Catalog line count ${lines} must be within 280–350 lines`,
		);
	});

	it("studio modal file line count is strictly within range 380–480 lines", () => {
		const studioPath = path.join(orthopedicsDir, "OrthopedicsStudioModal.tsx");
		const content = fs.readFileSync(studioPath, "utf8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 380 && lines <= 480,
			`Studio line count ${lines} must be within 380–480 lines`,
		);
	});

	it("launcher file line count is strictly within range 60–100 lines", () => {
		const launcherPath = path.join(orthopedicsDir, "DirectOrthopedicsLauncher.tsx");
		const content = fs.readFileSync(launcherPath, "utf8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 60 && lines <= 100,
			`Launcher line count ${lines} must be within 60–100 lines`,
		);
	});

	it("contains zero mojibake or CP1251 decoding artifacts across catalog and studio files", () => {
		const filesToCheck = [
			"orthopedicCatalogData.ts",
			"OrthopedicsStudioModal.tsx",
			"DirectOrthopedicsLauncher.tsx",
		];
		const mojibakeRegex = /[\uFFFD]|Р—|Рў|РЎ|Р“|Рђ|В·/u;
		for (const f of filesToCheck) {
			const fullPath = path.join(orthopedicsDir, f);
			const text = fs.readFileSync(fullPath, "utf8");
			assert.ok(
				!mojibakeRegex.test(text),
				`File ${f} must not contain mojibake or corrupt byte sequences`,
			);
		}
	});

	it("contains full set of construction presets including Zirconia, E-max, Veneers, Bridges and All-on-4", () => {
		assert.ok(STANDARD_ZTL_ORDER_PRESETS.length >= 7, "Must contain at least 7 canonical presets");
		const ids = STANDARD_ZTL_ORDER_PRESETS.map((p) => p.id);
		assert.ok(ids.includes("zirconia"), "Must include zirconia preset");
		assert.ok(ids.includes("emax"), "Must include emax preset");
		assert.ok(ids.includes("veneer_emax"), "Must include veneer preset");
		assert.ok(ids.includes("bridge"), "Must include bridge preset");
		assert.ok(ids.includes("metal_ceramic"), "Must include metal_ceramic preset");
		assert.ok(ids.includes("pmma_temp"), "Must include pmma_temp preset");
		assert.ok(ids.includes("clasp_denture"), "Must include clasp_denture preset");
		assert.ok(ids.includes("all_on_4"), "Must include all_on_4 preset");
	});

	it("contains 4 canonical preparation margins (Chamfer, Shoulder 90°, Knife edge, Shoulder bevel)", () => {
		assert.equal(PREPARATION_MARGIN_PRESETS.length, 4);
		const marginIds = PREPARATION_MARGIN_PRESETS.map((m) => m.id);
		assert.ok(marginIds.includes("chamfer"));
		assert.ok(marginIds.includes("shoulder_90"));
		assert.ok(marginIds.includes("knife_edge"));
		assert.ok(marginIds.includes("shoulder_bevel"));
	});

	it("contains 3 fixation types (cement, screw, clasp)", () => {
		assert.equal(FIXATION_TYPE_PRESETS.length, 3);
		const fixationIds = FIXATION_TYPE_PRESETS.map((f) => f.id);
		assert.ok(fixationIds.includes("cement"));
		assert.ok(fixationIds.includes("screw"));
		assert.ok(fixationIds.includes("clasp"));
	});

	it("contains 9 stump shades (Natural Die ND1 to ND9) with valid hex colors", () => {
		assert.equal(STUMP_SHADE_PRESETS.length, 9);
		for (let i = 1; i <= 9; i++) {
			const expectedCode = `ND${i}`;
			const item = STUMP_SHADE_PRESETS.find((s) => s.code === expectedCode);
			assert.ok(item, `Must include ${expectedCode}`);
			assert.ok(item.colorHex.startsWith("#"), `${expectedCode} must have hex color`);
		}
	});

	it("contains full Vita Classical palette (A1..D4 plus Bleach BL1..BL4)", () => {
		assert.ok(VITA_CLASSIC_SHADES.length >= 19, "Must contain at least 19 shades");
		const shades = VITA_CLASSIC_SHADES.map((s) => s.code);
		assert.ok(shades.includes("BL1"));
		assert.ok(shades.includes("BL2"));
		assert.ok(shades.includes("A1"));
		assert.ok(shades.includes("A2"));
		assert.ok(shades.includes("A3"));
		assert.ok(shades.includes("B1"));
		assert.ok(shades.includes("C2"));
		assert.ok(shades.includes("D3"));
	});

	it("contains Vita 3D-Master 6 groups (0M..5M)", () => {
		assert.equal(VITA_3D_MASTER_SHADE_GROUPS.length, 6);
	});

	it("contains 6 manufacturing stages with sequential steps", () => {
		assert.equal(ORTHOPEDIC_MANUFACTURING_STAGES.length, 6);
		const steps = ORTHOPEDIC_MANUFACTURING_STAGES.map((s) => s.stepNumber);
		assert.deepEqual(steps, [1, 2, 3, 4, 5, 6]);
	});
});

describe("2. Orthopedic Economics & Utility Logic (Mandates 8n, 8e)", () => {
	it("calculateOrthopedicEconomics computes correct financial totals in rub and kopecks", () => {
		const eco = calculateOrthopedicEconomics("zirconia", 2);
		assert.equal(eco.unitsCount, 2);
		assert.equal(eco.grossPriceRub, 48000);
		assert.equal(eco.grossPriceKopecks, 4800000n);
		assert.equal(eco.ztlCostRub, 15000);
		assert.equal(eco.ztlCostKopecks, 1500000n);
		assert.equal(eco.materialsCostRub, 2400);
		assert.equal(eco.netMarginRub, 48000 - 15000 - 2400);
		assert.equal(eco.netMarginKopecks, BigInt(48000 - 15000 - 2400) * 100n);
		assert.ok(eco.marginPercent > 0);
	});

	it("generateWarrantyPassportNumber creates canonical warranty number format", () => {
		assert.equal(generateWarrantyPassportNumber("ЗТЛ-402"), "ГП-ЗТЛ-402");
		assert.equal(generateWarrantyPassportNumber("ГП-ЗТЛ-402"), "ГП-ЗТЛ-402");
		assert.equal(generateWarrantyPassportNumber(""), "ГП-ЗТЛ-402");
	});

	it("validateOrthopedicTooth accurately validates FDI tooth numbers", () => {
		assert.equal(validateOrthopedicTooth(16), true);
		assert.equal(validateOrthopedicTooth("21"), true);
		assert.equal(validateOrthopedicTooth(48), true);
		assert.equal(validateOrthopedicTooth("36"), true);
		assert.equal(validateOrthopedicTooth(99), false);
		assert.equal(validateOrthopedicTooth("invalid"), false);
	});

	it("getZtlPresetById, getPreparationMarginById, getFixationPresetById return exact records", () => {
		const preset = getZtlPresetById("emax");
		assert.ok(preset);
		assert.equal(preset.name, "Прессованная керамика E-max");

		const margin = getPreparationMarginById("chamfer");
		assert.ok(margin);
		assert.ok(margin.labelRu.includes("Chamfer"));

		const fixation = getFixationPresetById("screw");
		assert.ok(fixation);
		assert.equal(fixation.id, "screw");

		const stump = getStumpShadeByCode("ND2");
		assert.ok(stump);
		assert.equal(stump.code, "ND2");
	});
});

describe("3. OrthopedicsStudioModal UI, Autonomy & Apple HIG (Mandates 8e, 8am, 8ze, 8x)", () => {
	it("renders OrthopedicsStudioModal with root testid, surface, and active tooth", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
				patientName="Ковалев Дмитрий Сергеевич"
				doctorName="Д-р Смирнова Е. В. (Ортопед)"
			/>,
		);

		assert.ok(html.includes('data-testid="orthopedics-studio-modal"'), "Must render modal container");
		assert.ok(html.includes('data-testid="orthopedics-studio-surface"'), "Must render modal surface");
		assert.ok(html.includes("Ортопедический протокол и коронки"), "Must render header title");
		assert.ok(html.includes("Ковалев Дмитрий Сергеевич"), "Must render patient name");
		assert.ok(html.includes("Д-р Смирнова Е. В."), "Must render doctor name");
	});

	it("complies with Mandate 8e: Primary CTA button is NEVER disabled", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		assert.ok(html.includes('data-testid="commit-orthopedic-stage-btn"'));
		assert.ok(html.includes("✓ Зафиксировать ортопедический этап"));
		// Must not have disabled attribute on the primary CTA button
		assert.ok(!html.includes('data-testid="commit-orthopedic-stage-btn" disabled'));
	});

	it("complies with Mandate 8am: Exactly ONE Primary CTA with #0d9488", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		// Check for the unique primary CTA button
		const primaryCtaMatches = html.match(/bg-\[#0d9488\]/g);
		assert.ok(primaryCtaMatches, "Must contain primary CTA teal color");
		assert.equal(primaryCtaMatches.length, 1, "Must contain exactly ONE primary CTA button with #0d9488");
	});

	it("complies with Mandate 8ze / Apple HIG: Renders mobile drag handle and touch targets >= 44px", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		assert.ok(html.includes('data-testid="mobile-drag-handle"'), "Must render Apple HIG mobile drag handle");
		assert.ok(html.includes("min-h-[44px]"), "Must enforce 44px minimum touch target on interactive elements");
		assert.ok(html.includes("min-h-[48px]"), "Must enforce 48px on primary actions");
		assert.ok(html.includes("rounded-t-[24px]"), "Must render 24px top border radius for mobile bottom sheet");
	});

	it("renders 1-screen orthopedic workflow: tooth input, presets grid, margins, swatches, ZTL and economics", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="21"
				initialLabOrder={{
					orderNumber: "ЗТЛ-881",
					technicianName: "Петров И.С.",
					warrantyPassport: "ГП-ЗТЛ-881",
					status: "delivered_to_clinic",
				}}
			/>,
		);

		assert.ok(html.includes('data-testid="ortho-fdi-input"'), "Must render FDI tooth input");
		assert.ok(html.includes('data-testid="ortho-construction-presets-grid"'), "Must render construction presets grid");
		assert.ok(html.includes('data-testid="vita-classical-swatches"'), "Must render Vita Classical swatches");
		assert.ok(html.includes('data-testid="stump-shade-swatches"'), "Must render stump shade swatches");
		assert.ok(html.includes('data-testid="ztl-order-input"'), "Must render ZTL order input");
		assert.ok(html.includes('data-testid="ztl-technician-input"'), "Must render ZTL technician input");
		assert.ok(html.includes('data-testid="confirm-fitting-btn"'), "Must render fitting confirmation button");
		assert.ok(html.includes("✓ Примерка подтверждена"), "Must show confirmed fitting state");
		assert.ok(html.includes("Себестоимость ЗТЛ"), "Must render economics section");
		assert.ok(html.includes("Маржа клиники"), "Must render clinic margin");
	});

	it("renders Passport A4 button and links with printable modal", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		assert.ok(html.includes('data-testid="open-passport-a4-btn"'), "Must render open passport A4 button");
		assert.ok(html.includes("Паспорт изделия А4"), "Must contain clean label for passport button");
	});

	it("strictly adheres to Mandate 8x & 8ap: Zero Soviet decree numbers or bureaucratic abbreviations in UI labels", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		assert.ok(!html.includes("043/у"), "Must not contain raw 043/u in UI text");
		assert.ok(!html.includes("804н"), "Must not contain raw 804n decree number in UI text");
		assert.ok(!html.includes("54-ФЗ"), "Must not contain raw 54-FZ in UI text");
		assert.ok(!html.includes("1051н"), "Must not contain raw 1051n decree number in UI text");
	});

	it("does not render when isOpen=false", () => {
		const html = renderToString(
			<OrthopedicsStudioModal
				isOpen={false}
				onClose={() => {}}
				initialToothFdi="16"
			/>,
		);

		assert.equal(html, "", "Must return empty string when closed");
	});
});
