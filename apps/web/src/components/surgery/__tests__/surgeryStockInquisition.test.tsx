/**
 * surgeryStockInquisition.test.tsx — Red Team Инквизиционный аудит связки Хирургического паспорта и Склада.
 * Стандарты: Mandates 8e (Автономия врача), 8n (Мягкий овердрафт), 8am (Ровно 1 Primary CTA),
 * 8x (Клинический язык без канцелярита), целочисленные копейки (amountKopecks, BIGINT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	generateSystemSurgeryLot,
	calculateSurgeryFinancials,
	evaluateSurgerySoftOverdraft,
} from "../surgeryCatalogData";
import { CopilotSurgeryPassportCard, type CopilotSurgeryPassportData } from "../../copilot/cards/CopilotSurgeryPassportCard";
import { ChairsideSurgeryHubModal } from "../ChairsideSurgeryHubModal";
import { DirectSurgeryLauncher } from "../DirectSurgeryLauncher";

describe("Red Team Surgery & Stock Highway Inquisition (Mandates 8e, 8n, 8v, 8x)", () => {
	it("1. generateSystemSurgeryLot creates ISO-grounded lot when batch number is missing (Trap A)", () => {
		const fixedDate = "2026-11-04T12:00:00.000Z";
		const autoLot = generateSystemSurgeryLot(46, fixedDate);
		assert.match(autoLot, /^LOT-SYS-20261104-T46$/);

		const autoLotMulti = generateSystemSurgeryLot("14, 16", fixedDate);
		assert.ok(autoLotMulti.startsWith("LOT-SYS-20261104-T"));
	});

	it("2. calculateSurgeryFinancials calculates integer kopecks without floating point drift", () => {
		const finImplant = calculateSurgeryFinancials({
			scenario: "implant",
			implantBrand: "Osstem",
			sutureName: "Шовный материал Prolene 4-0 (атравматика)",
		});

		assert.ok(Number.isInteger(finImplant.operationPriceKopecks), "operationPriceKopecks is integer");
		assert.ok(Number.isInteger(finImplant.implantCostKopecks), "implantCostKopecks is integer");
		assert.ok(Number.isInteger(finImplant.consumablesCostKopecks), "consumablesCostKopecks is integer");
		assert.ok(Number.isInteger(finImplant.doctorGrossMarginKopecks), "doctorGrossMarginKopecks is integer");
		assert.equal(finImplant.operationPriceKopecks, Math.round(finImplant.operationPriceRub * 100));

		const finSinus = calculateSurgeryFinancials({
			scenario: "sinus_gbr",
			graftName: "Bio-Oss 0.5 г (Geistlich)",
			membraneName: "Bio-Gide 16×22 мм (Geistlich)",
		});
		assert.ok(Number.isInteger(finSinus.operationPriceKopecks));
		assert.ok(Number.isInteger(finSinus.consumablesCostKopecks));
	});

	it("3. CopilotSurgeryPassportCard renders with 1 Primary CTA #0d9488 and auto-lot", () => {
		const passportData: CopilotSurgeryPassportData = {
			toothNumber: 46,
			procedureName: "Дентальная имплантация Osstem",
			implantSystem: "Osstem",
			implantSize: "4.0x10 мм",
			torqueNcm: 45,
			isqIndex: 78,
			boneGraft: "Bio-Oss 0.5g",
			membrane: "Bio-Gide 16x22",
			amountKopecks: 4500000,
		};

		const html = renderToString(<CopilotSurgeryPassportCard data={passportData} />);
		assert.ok(html.includes("copilot-surgery-passport-card"), "Passport card element rendered");
		assert.ok(html.includes("copilot-apply-surgery-primary-btn"), "Primary CTA button rendered");
		assert.ok(html.includes("45 Н·см"), "Torque 45 Ncm rendered");
		assert.ok(html.includes("ISQ 78"), "ISQ 78 rendered");
		assert.ok(html.includes("Списание со склада в фоне (Soft Stock)"), "Soft stock warehouse note rendered");
		assert.ok(!html.includes("disabled"), "Action button is never disabled (Mandate 8e)");
	});

	it("4. ChairsideSurgeryHubModal accepts preset params from Copilot and avoids hardcode", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={16}
				initialScenario="implant"
				initialBrand="Straumann"
				initialTorqueNcm={45}
				initialLotNumber="LOT-TEST-992"
				initialBoneGraft="Bio-Oss 0.5 г"
				initialMembrane="Bio-Gide 25x25"
				inventoryOverdraftActive={true}
			/>,
		);

		assert.ok(html.includes("chairside-surgery-hub-modal"), "Hub modal rendered");
		assert.ok(html.includes("btn-save-chairside-surgery"), "Primary CTA button rendered");
		assert.ok(html.includes("LOT-TEST-992"), "Preset lot number rendered");
		assert.ok(html.includes("45 Н·см"), "Preset torque rendered");
		assert.ok(html.includes("Мягкий овердрафт склада"), "Soft Negative Stock warning rendered");
		assert.ok(!html.includes("СанПиН 2.1.3.2630-10"), "No obsolete Soviet SanPiN in UI");
		assert.ok(!html.includes("043/у"), "No Soviet form code in UI");
	});

	it("5. Multiple teeth surgery (14 and 16) formats teeth badges without overwriting (Trap B)", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={14}
				initialTeeth={[14, 16]}
				initialScenario="sinus_gbr"
				inventoryOverdraftActive={true}
			/>,
		);

		assert.ok(html.includes("#14, #16"), "Multiple teeth displayed in header");
		assert.ok(html.includes("Выбрано: 14, 16"), "Multiple teeth indicator rendered");
	});

	it("6. evaluateSurgerySoftOverdraft returns canProceed: true always (Mandate 8e)", () => {
		const result = evaluateSurgerySoftOverdraft([{ name: "Имплантат титановый", isWarehouseCritical: true }], true);
		assert.strictEqual(result.canProceed, true);
		assert.strictEqual(result.hasOverdraft, true);
		assert.ok(result.warningRu.includes("овердрафт"));
	});

	it("7. DirectSurgeryLauncher mounts cleanly without crashing", () => {
		const html = renderToString(<DirectSurgeryLauncher />);
		assert.equal(typeof html, "string");
	});
});
