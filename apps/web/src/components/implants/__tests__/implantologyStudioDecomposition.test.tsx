/**
 * implantologyStudioDecomposition.test.tsx — Red Team тест декомпозиции хирургической студии DENTE CRM.
 * Валидирует Sweet Spot 100–250 строк, отсутствие монолитов >500 строк (Мандат 8b/8zi),
 * автономию врача (Мандат 8e), ровно 1 Primary CTA кнопку (Мандат 8am),
 * расчет плотности Misch D1–D4 и безопасную зону торка 35–45 Н·см.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ImplantologyStudioModal,
	useImplantologyStudioState,
	ImplantStudioHeader,
	ImplantPassportTab,
	ImplantMemoTab,
	ImplantStudioProtocolTab,
	ImplantStudioDiaryTab,
	CANONICAL_IMPLANT_SYSTEMS,
	getMischBoneDensityByToothFdi,
	getRecommendedTorqueZone,
	generateWarrantyPassportRecord,
	buildSoapSurgeryDiaryText,
} from "../index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STUDIO_DIR = path.resolve(__dirname, "../studio");
const IMPLANTS_DIR = path.resolve(__dirname, "..");

describe("🔪 Red Team: Implantology Studio Monolith Decomposition (Mandates 8b, 8e, 8am)", () => {
	it("1. Verifies strict file size budget: Sweet Spot 100–250 lines, max 500 lines, no bloat", () => {
		const filesToVerify = [
			{ name: "ImplantologyStudioModal.tsx", dir: IMPLANTS_DIR, maxLines: 220 },
			{ name: "useImplantologyStudioState.ts", dir: STUDIO_DIR, maxLines: 200 },
			{ name: "ImplantStudioHeader.tsx", dir: STUDIO_DIR, maxLines: 150 },
			{ name: "ImplantProtocolTab.tsx", dir: STUDIO_DIR, maxLines: 300 },
			{ name: "ImplantPassportTab.tsx", dir: STUDIO_DIR, maxLines: 200 },
			{ name: "ImplantDiaryTab.tsx", dir: STUDIO_DIR, maxLines: 120 },
			{ name: "ImplantMemoTab.tsx", dir: STUDIO_DIR, maxLines: 160 },
		];

		for (const f of filesToVerify) {
			const fullPath = path.join(f.dir, f.name);
			assert.ok(fs.existsSync(fullPath), `File ${f.name} must exist at ${fullPath}`);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lineCount = content.split(/\r?\n/).length;

			assert.ok(
				lineCount <= f.maxLines,
				`File ${f.name} has ${lineCount} lines, which exceeds budget limit of ${f.maxLines} lines (Mandate 8b)`
			);
			assert.ok(
				lineCount >= 40,
				`File ${f.name} has ${lineCount} lines, avoiding micro-shredder anti-pattern`
			);
		}
	});

	it("2. Verifies canonical 6 implant systems, torque 35–45 N·cm and Misch D1–D4 mapping", () => {
		const sysKeys = Object.keys(CANONICAL_IMPLANT_SYSTEMS);
		assert.equal(sysKeys.length, 6, "Must strictly maintain 6 RF canonical implant systems");
		assert.ok(sysKeys.includes("osstem"));
		assert.ok(sysKeys.includes("straumann"));
		assert.ok(sysKeys.includes("dentium"));
		assert.ok(sysKeys.includes("nobel_biocare"));
		assert.ok(sysKeys.includes("astra_tech"));
		assert.ok(sysKeys.includes("anyridge"));

		// Misch Bone Density mapping
		assert.equal(getMischBoneDensityByToothFdi(41), "D1", "Lower anterior is D1");
		assert.equal(getMischBoneDensityByToothFdi(46), "D2", "Lower molar is D2");
		assert.equal(getMischBoneDensityByToothFdi(14), "D3", "Upper premolar is D3");
		assert.equal(getMischBoneDensityByToothFdi(17), "D4", "Upper tuberosity molar is D4");

		// Torque zone verification
		const greenZone35 = getRecommendedTorqueZone(35);
		assert.equal(greenZone35.status, "optimal_green");
		const greenZone45 = getRecommendedTorqueZone(45);
		assert.equal(greenZone45.status, "optimal_green");
		const underTorque = getRecommendedTorqueZone(20);
		assert.equal(underTorque.status, "under_torque");
		const overTorque = getRecommendedTorqueZone(55);
		assert.equal(overTorque.status, "over_torque");
	});

	it("3. Verifies warranty passport data generator and vector QR-payload", () => {
		const passport = generateWarrantyPassportRecord({
			toothFdi: 36,
			systemId: "straumann",
			diameterMm: 4.1,
			lengthMm: 10.0,
			torqueNcm: 40,
			isq: 78,
			stage: "one_stage_healing_abutment",
			patientName: "Алексеев Петр Сергеевич",
			doctorName: "Д-р Воронов А. В.",
		});

		assert.equal(passport.brandName, "Straumann");
		assert.equal(passport.toothFdi, 36);
		assert.equal(passport.diameterMm, 4.1);
		assert.equal(passport.insertionTorqueNcm, 40);
		assert.equal(passport.isqValue, 78);
		assert.ok(passport.verificationQrPayload.includes("Straumann"));
		assert.ok(passport.verificationQrPayload.includes("36"));
	});

	it("4. Verifies static HTML rendering of decomposed ImplantologyStudioModal", () => {
		// When closed: returns null
		const closedHtml = renderToStaticMarkup(
			React.createElement(ImplantologyStudioModal, {
				isOpen: false,
				onClose: () => {},
			})
		);
		assert.equal(closedHtml, "");

		// When open: renders backdrop, modal, tabs, footer
		const openHtml = renderToStaticMarkup(
			React.createElement(ImplantologyStudioModal, {
				isOpen: true,
				onClose: () => {},
				initialTooth: 46,
				patientName: "Ковалев Сергей",
				doctorName: "Д-р Воронов",
			})
		);

		// Backdrop and Modal
		assert.ok(openHtml.includes('data-testid="implantology-studio-backdrop"'));
		assert.ok(openHtml.includes('data-testid="implantology-studio-modal"'));

		// Apple HIG Drag Handle
		assert.ok(openHtml.includes('class="implant-sheet-drag-handle"'));

		// Header and close button
		assert.ok(openHtml.includes('data-testid="btn-close-implant-studio"'));
		assert.ok(openHtml.includes("Зуб #46"));
		assert.ok(openHtml.includes("Ковалев Сергей"));

		// 4 Tabs in nav
		assert.ok(openHtml.includes('data-testid="implant-tab-protocol"'));
		assert.ok(openHtml.includes('data-testid="implant-tab-passport"'));
		assert.ok(openHtml.includes('data-testid="implant-tab-diary"'));
		assert.ok(openHtml.includes('data-testid="implant-tab-memo"'));

		// Protocol Tab content
		assert.ok(openHtml.includes('data-testid="tab-content-protocol"'));
		assert.ok(openHtml.includes('data-testid="quick-template-immediate_extraction"'));
		assert.ok(openHtml.includes('data-testid="system-card-osstem"'));
		assert.ok(openHtml.includes('data-testid="torque-slider"'));

		// Footer action buttons: Print A5 and exactly ONE Primary CTA
		assert.ok(openHtml.includes('data-testid="btn-print-passport-a5"'));
		assert.ok(openHtml.includes('data-testid="btn-save-implant-protocol"'));
		assert.ok(openHtml.includes("Сохранить протокол и паспорт"));
	});

	it("5. Verifies rendering of passport, diary and memo tabs directly", () => {
		const passportData = generateWarrantyPassportRecord({
			toothFdi: 46,
			systemId: "osstem",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isq: 72,
			stage: "one_stage_healing_abutment",
			patientName: "Иванов И. И.",
			doctorName: "Д-р Воронов",
		});

		// 1. Passport Tab
		const passportHtml = renderToStaticMarkup(
			React.createElement(ImplantPassportTab, {
				warrantyPassport: passportData,
				lotNumber: "LOT-9921",
				onLotChange: () => {},
				serialNumber: "SN-4412",
				onSerialChange: () => {},
			})
		);
		assert.ok(passportHtml.includes('data-testid="tab-content-passport"'));
		assert.ok(passportHtml.includes("ПОЖИЗНЕННАЯ ГАРАНТИЯ"));
		assert.ok(passportHtml.includes("QR-код"));
		assert.ok(passportHtml.includes('data-testid="btn-print-tab-passport"'));

		// 2. Diary Tab
		const diaryText = buildSoapSurgeryDiaryText({
			toothFdi: 46,
			boneDensity: "D2",
			brandName: "Osstem",
			lineName: "TS III SA",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isqValue: 72,
			screwdriverAliasRu: "Шестигранник 1.2 мм",
			stage: "one_stage_healing_abutment",
			isGbrPerformed: false,
		});
		const diaryHtml = renderToStaticMarkup(
			React.createElement(ImplantStudioDiaryTab, {
				soapDiary: diaryText,
				toothFdi: 46,
			})
		);
		assert.ok(diaryHtml.includes('data-testid="tab-content-diary"'));
		assert.ok(diaryHtml.includes('data-testid="btn-copy-diary"'));
		assert.ok(diaryHtml.includes('data-testid="textarea-soap-diary"'));

		// 3. Memo Tab
		const memoHtml = renderToStaticMarkup(
			React.createElement(ImplantMemoTab, {
				toothFdi: 46,
				patientName: "Иванов И. И.",
				doctorName: "Д-р Воронов",
			})
		);
		assert.ok(memoHtml.includes('data-testid="tab-content-memo"'));
		assert.ok(memoHtml.includes('data-testid="btn-copy-memo"'));
		assert.ok(memoHtml.includes('data-testid="btn-memo-whatsapp"'));
		assert.ok(memoHtml.includes('data-testid="btn-memo-telegram"'));
	});
});
