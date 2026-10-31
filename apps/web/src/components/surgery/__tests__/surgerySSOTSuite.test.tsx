/**
 * surgerySSOTSuite.test.tsx — Comprehensive SSOT Test Suite for Surgery Studio (Mandates 8b, 8e, 8n, 8x, 8am, 8ze).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SURGERY_SCENARIOS,
	SURGERY_IMPLANT_SYSTEMS,
	SURGERY_ANESTHETICS,
	evaluateSurgerySoftOverdraft,
	buildStandardExtractionProtocolText,
	buildStandardImplantationProtocolText,
	buildPostExtractionMemoText,
	buildPostImplantMemoText,
	buildPostSinusGbrMemoText,
	buildPostPeriostotomyMemoText,
	buildSurgicalDiaryEntry,
	getExtractionSurgicalServices,
	computeOsteointegrationExpectedDate,
} from "../surgeryCatalogData";
import { SurgeryStudioModal, ChairsideSurgeryHubModal } from "../SurgeryStudioModal";
import { DirectSurgeryLauncher } from "../DirectSurgeryLauncher";

describe("Surgery Studio SSOT & Clinical Sovereignty Suite", () => {
	it("1. SurgeryStudioModal and ChairsideSurgeryHubModal are identical references", () => {
		assert.strictEqual(SurgeryStudioModal, ChairsideSurgeryHubModal);
	});

	it("2. Contains all 4 canonical outpatient scenarios without Soviet order jargon", () => {
		const keys = Object.keys(SURGERY_SCENARIOS);
		assert.deepStrictEqual(keys.sort(), ["extraction", "implant", "resection_periostotomy", "sinus_gbr"].sort());

		for (const [key, scen] of Object.entries(SURGERY_SCENARIOS)) {
			assert.ok(scen.titleRu, `Scenario ${key} has titleRu`);
			assert.ok(scen.defaultProtocolRu, `Scenario ${key} has defaultProtocolRu`);
			assert.ok(!scen.titleRu.includes("804н"), `Scenario ${key} titleRu must not contain 804н`);
			assert.ok(!scen.titleRu.includes("043/у"), `Scenario ${key} titleRu must not contain 043/у`);
		}
	});

	it("3. Mandate 8e: Doctor autonomy & Soft Negative Overdraft ALWAYS returns canProceed: true", () => {
		const result = evaluateSurgerySoftOverdraft(
			[{ name: "Имплантат титановый", isWarehouseCritical: true }, { name: "Шовный материал", isWarehouseCritical: false }],
			true,
			["Имплантат титановый"]
		);
		assert.strictEqual(result.canProceed, true);
		assert.strictEqual(result.hasOverdraft, true);
		assert.ok(result.detailsRu.includes("Операция не блокируется"));
	});

	it("4. Protocols and memos have ZERO emojis and clean clinical structure", () => {
		const extProtocol = buildStandardExtractionProtocolText({ toothFdi: 36, complexity: "simple" });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(extProtocol), "Extraction protocol must have zero emojis");
		assert.ok(extProtocol.includes("Sol. Articaini 4%"), "Contains proper anesthetic naming");

		const impProtocol = buildStandardImplantationProtocolText({ toothFdi: 46, brand: "Osstem", torqueNcm: 35 });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(impProtocol), "Implant protocol must have zero emojis");
		assert.ok(impProtocol.includes("35 Н·см"), "Contains torque specification");

		const memo = buildPostExtractionMemoText({ patientName: "Иванов И. И.", toothFdi: 36 });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(memo), "Patient memo must have zero emojis");
		assert.ok(memo.includes("ПАМЯТКА ПАЦИЕНТУ"), "Contains canonical title");

		const implantMemo = buildPostImplantMemoText({ patientName: "Иванов И. И.", toothFdi: 46, implantBrand: "Osstem" });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(implantMemo), "Implant memo must have zero emojis");
		assert.ok(implantMemo.includes("АНТИСЕПТИЧЕСКИЙ РЕЖИМ"));

		const sinusMemo = buildPostSinusGbrMemoText({ patientName: "Иванов И. И.", toothFdi: 16 });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(sinusMemo), "Sinus memo must have zero emojis");
		assert.ok(sinusMemo.includes("КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО СМОРКАТЬСЯ"));

		const perioMemo = buildPostPeriostotomyMemoText({ patientName: "Иванов И. И.", toothFdi: 12 });
		assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(perioMemo), "Periostotomy memo must have zero emojis");
		assert.ok(perioMemo.includes("ДРЕНАЖ"));
	});

	it("5. SOAP Diary entry generated cleanly with surgery step block", () => {
		const diary = buildSurgicalDiaryEntry({
			patientName: "Петров П. П.",
			doctorName: "Д-р Воронов А. В.",
			toothFdi: 46,
			protocolText: "Атравматичная люксация и удаление корней.",
			recommendations: "Холод 15 минут, Нимесил при болях.",
		});
		assert.ok(diary.includes("ХОД ОПЕРАЦИИ:"));
		assert.ok(diary.includes("Зуб FDI #46"));
		assert.ok(diary.includes("НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:"));
	});

	it("6. Mandate 8am & 8ze: Renders exactly ONE Primary CTA button #0d9488 and Apple HIG drag handle", () => {
		const html = renderToStaticMarkup(
			<SurgeryStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов И. И."
				patientId="PAT-123"
				doctorName="Д-р Воронов"
				initialTooth={46}
				initialScenario="implant"
				inventoryOverdraftActive={true}
			/>
		);

		// Exactly ONE surgery-primary-cta button
		const primaryCtaMatches = html.match(/surgery-primary-cta/g) || [];
		assert.strictEqual(primaryCtaMatches.length, 1, "Must contain exactly ONE surgery-primary-cta button");
		assert.ok(html.includes("data-testid=\"btn-save-chairside-surgery\""));

		// Apple HIG drag handle (36x5px) for mobile bottom sheet
		assert.ok(html.includes("surgery-hub-drag-handle") || html.includes("w-9 h-1 rounded-full") || html.includes("w-[36px] h-[5px]"), "Contains drag handle for Apple HIG mobile bottom sheet");

		// Touch targets >= 44px
		assert.ok(html.includes("min-h-[44px]") || html.includes("h-11"), "Contains touch targets conforming to Apple HIG min-h-[44px]");

		// Soft Negative Stock banner when overdraft active
		assert.ok(html.includes("Мягкий овердрафт") || html.includes("списаны в овердрафт") || html.includes("overdraft"), "Renders overdraft indication without blocking");
	});

	it("7. DirectSurgeryLauncher mounts cleanly without crashing", () => {
		const html = renderToStaticMarkup(<DirectSurgeryLauncher />);
		// Initially not open in SSR unless URL has hash/search
		assert.strictEqual(typeof html, "string");
	});

	it("8. Osteointegration date is 3 months for mandible and 5 months for maxilla", () => {
		const mandibleDate = computeOsteointegrationExpectedDate("2026-01-01T00:00:00.000Z", 46);
		const maxillaDate = computeOsteointegrationExpectedDate("2026-01-01T00:00:00.000Z", 16);
		assert.strictEqual(mandibleDate, "2026-04-01");
		assert.strictEqual(maxillaDate, "2026-06-01");
	});
});
