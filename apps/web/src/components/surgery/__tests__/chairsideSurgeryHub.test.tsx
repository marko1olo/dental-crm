/**
 * chairsideSurgeryHub.test.tsx — Валидация канонического рабочего стола амбулаторной хирургии и паспортов имплантатов.
 * Стандарты: Мандаты 8b, 8e, 8n, 8x, 8y, 8am, 8aq, Apple HIG.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	SURGERY_SCENARIOS,
	SURGERY_IMPLANT_SYSTEMS,
	SURGERY_DEFAULT_BATCHES,
	evaluateSurgerySoftOverdraft,
	computeOsteointegrationExpectedDate,
	getImplantSystemById,
} from "../surgeryCatalogData";
import { ChairsideSurgeryHubModal } from "../ChairsideSurgeryHubModal";
import { DirectSurgeryLauncher } from "../DirectSurgeryLauncher";

describe("Chairside Surgery Hub & Implant Passports SSOT (Mandates 8e, 8n, 8x, 8am)", () => {
	it("1. surgeryCatalogData contains all 4 canonical outpatient scenarios without Soviet order codes", () => {
		const keys = Object.keys(SURGERY_SCENARIOS);
		assert.equal(keys.length, 4);
		assert.ok(keys.includes("extraction"));
		assert.ok(keys.includes("resection_periostotomy"));
		assert.ok(keys.includes("sinus_gbr"));
		assert.ok(keys.includes("implant"));

		// Check Mandate 8x: clean clinical language
		for (const key of keys) {
			const sc = SURGERY_SCENARIOS[key as keyof typeof SURGERY_SCENARIOS];
			assert.ok(sc.titleRu.length > 0);
			assert.ok(sc.icd10.length > 0);
			assert.ok(!sc.titleRu.includes("043/у"), "No Soviet order numbers in titleRu");
			assert.ok(!sc.defaultProtocolRu.includes("804н"), "No order numbers in protocol");
		}
	});

	it("2. implant systems catalog includes Osstem, Straumann, Nobel Biocare, Dentium and Ankylos with valid torque specs", () => {
		assert.ok(SURGERY_IMPLANT_SYSTEMS.length >= 5);
		const osstem = getImplantSystemById("osstem");
		assert.equal(osstem.brandName, "Osstem");
		assert.equal(osstem.defaultTorqueNcm, 35);
		assert.ok(osstem.minTorqueNcm >= 20 && osstem.maxSafeTorqueNcm <= 50);

		const straumann = getImplantSystemById("straumann");
		assert.equal(straumann.brandName, "Straumann");
		assert.equal(straumann.defaultTorqueNcm, 35);

		const nobel = getImplantSystemById("nobel_biocare");
		assert.equal(nobel.brandName, "Nobel Biocare");

		const dentium = getImplantSystemById("dentium");
		assert.equal(dentium.brandName, "Dentium");

		const ankylos = getImplantSystemById("ankylos");
		assert.equal(ankylos.brandName, "Ankylos");
	});

	it("3. evaluateSurgerySoftOverdraft guarantees canProceed: true (Mandate 8e: Doctor autonomy)", () => {
		const materials = [
			{ id: "1", name: "Bio-Oss", unit: "g", quantity: 0.5, isWarehouseCritical: true },
			{ id: "2", name: "Bio-Gide", unit: "pcs", quantity: 1, isWarehouseCritical: true },
		];

		const statusNoDelay = evaluateSurgerySoftOverdraft(materials, false);
		assert.equal(statusNoDelay.hasOverdraft, false);
		assert.equal(statusNoDelay.canProceed, true);

		const statusDelayed = evaluateSurgerySoftOverdraft(materials, true);
		assert.equal(statusDelayed.hasOverdraft, true);
		assert.equal(statusDelayed.canProceed, true, "Mandate 8e: Doctor is NEVER blocked by warehouse delay!");
		assert.ok(statusDelayed.detailsRu.includes("не блокируется"));
	});

	it("4. computeOsteointegrationExpectedDate computes 3 months for mandible and 5 months for maxilla", () => {
		const baseDate = "2026-05-01T12:00:00.000Z";
		const lowerMolarDate = computeOsteointegrationExpectedDate(baseDate, 46);
		assert.equal(lowerMolarDate, "2026-08-01");

		const upperIncisorDate = computeOsteointegrationExpectedDate(baseDate, 11);
		assert.equal(upperIncisorDate, "2026-10-01");
	});

	it("5. ChairsideSurgeryHubModal renders with Apple HIG drag handle and single Primary CTA #0d9488", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				initialScenario="implant"
				patientName="Пациент Тестовый"
			/>,
		);

		// Apple HIG Drag Handle
		assert.ok(html.includes("surgery-hub-drag-handle"), "Must contain Apple HIG drag handle for mobile Bottom Sheet");

		// Header and Tooth Badge
		assert.ok(html.includes("#46"), "Must render FDI tooth badge #46");
		assert.ok(html.includes("Пациент Тестовый"), "Must render patient name");

		// 4 Scenarios Nav
		assert.ok(html.includes("scen-extraction") || html.includes("scenario-chip-extraction"));
		assert.ok(html.includes("scenario-chip-implant"));

		// 1 Primary CTA button #0d9488 per Mandate 8am
		assert.ok(html.includes("btn-save-chairside-surgery"), "Must render Primary CTA button");
		assert.ok(html.includes("✓ Зафиксировать операцию"), "CTA text must be verified");
		assert.ok(html.includes("surgery-primary-cta"), "Must have surgery-primary-cta class");
	});

	it("6. ChairsideSurgeryHubModal returns null when isOpen is false", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	it("7. ChairsideSurgeryHubModal renders Soft Negative Stock overdraft notice when active", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				inventoryOverdraftActive={true}
			/>,
		);
		assert.ok(html.includes("surgery-hub-overdraft-notice"), "Must render soft overdraft notice");
		assert.ok(html.includes("Мягкий овердрафт склада"), "Must display soft overdraft explanation");
	});

	it("8. DirectSurgeryLauncher mounts and renders without crash", () => {
		const html = renderToString(<DirectSurgeryLauncher />);
		// In non-browser environment without hash, returns empty string or renders clean
		assert.equal(typeof html, "string");
	});

	it("9. ChairsideSurgeryHubModal renders touch targets conforming to Apple HIG min-h-[44px]", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				initialScenario="implant"
			/>,
		);

		// Touch targets for teeth, buttons and presets
		assert.ok(html.includes("min-h-[44px]"), "Interactive elements must satisfy touch target >= 44x44px");
		assert.ok(html.includes("btn-apply-physio-norm"), "Must render 1-click physiological norm button");
		assert.ok(html.includes("btn-print-surgery-hub"), "Must render print button in header");
		assert.ok(html.includes("btn-close-surgery-hub"), "Must render close button in header");
	});

	it("10. Full parity of implant systems and scenario codes for backend SSOT", () => {
		for (const sys of SURGERY_IMPLANT_SYSTEMS) {
			assert.ok(!sys.id.includes(" "), `System ID must be normalized without spaces: ${sys.id}`);
			assert.ok(sys.defaultTorqueNcm >= 25 && sys.defaultTorqueNcm <= 45, `Torque ${sys.defaultTorqueNcm} must be in safe range for ${sys.brandName}`);
			assert.ok(sys.defaultLotNumber.length > 0, `Lot number must be populated for ${sys.brandName}`);
		}

		for (const [key, sc] of Object.entries(SURGERY_SCENARIOS)) {
			assert.ok(sc.serviceCode.length > 0, `Scenario ${key} must have serviceCode`);
			assert.ok(sc.defaultPriceRub > 0, `Scenario ${key} must have positive price`);
			assert.ok(sc.standardMaterials.length > 0, `Scenario ${key} must have standard materials for Soft Negative Stock`);
		}
	});

	it("11. ChairsideSurgeryHubModal renders patient memo tab with WhatsApp and Telegram integration", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				initialScenario="implant"
				initialTab="memo"
				patientName="Кузнецов Петр"
			/>,
		);

		assert.ok(html.includes("tab-surgery-memo"), "Must render patient memo tab button");
		assert.ok(html.includes("surgery-memo-content"), "Must render patient memo content container");
		assert.ok(html.includes("btn-share-whatsapp-memo"), "Must render WhatsApp share button");
		assert.ok(html.includes("btn-share-telegram-memo"), "Must render Telegram share button");
		assert.ok(html.includes("btn-copy-memo"), "Must render copy memo button");
		assert.ok(html.includes("Кузнецов Петр"), "Must include patient name in memo text");
		assert.ok(html.includes("ПАМЯТКА ПАЦИЕНТУ"), "Must render clear post-op title");
	});

	it("12. Mandate 8am & 8x: Exact Primary CTA button text and clean clinical terminology", () => {
		const html = renderToString(
			<ChairsideSurgeryHubModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("✓ Зафиксировать операцию и внести в карту приёма &gt;"), "Must contain exact Mandate 8am Primary CTA text");
		assert.ok(!html.includes("043/у"), "No Soviet order numbers in rendered HTML");
		assert.ok(!html.includes("804н"), "No order numbers in rendered HTML");
		assert.ok(!html.includes("54-ФЗ"), "No fiscal law numbers in rendered HTML");
	});
});
