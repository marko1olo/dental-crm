/**
 * anesthesiaDosagePrintAutonomyWave54.test.tsx
 *
 * Unit tests for Wave 54 / Feature 242:
 * «анестезия_калькулятор::печать_протокола_анестезиологического_пособия_а4_и_1_клик_копирование_памятки_для_пациента»
 *
 * CONSTITUTION & MANDATES:
 * - THE_HAMMER_MASTER_PROMPT.md & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants (touch target >= 44x44px)
 * - Mandate 8d (pt 2, 7): Hick's Density & Zero cartoon emojis in medical documents
 * - Mandate 8e (pt 1, 5): Doctor Autonomy & Print on Demand (Лист анестезиологического пособия)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u)
 * - Mandate 8k: CRM != Reality Simulator (1-click patient memo for messengers)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import assert from "node:assert/strict";
const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AnesthesiaQuickBar,
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
} from "../AnesthesiaQuickBar";

describe("Wave 54 / Feature 242: Anesthesia Protocol Print and 1-Click Patient Memo", () => {
	describe("1. Pure Function: formatAnesthesiaPatientMemo", () => {
		it("formats structured patient anesthesia memo with all required clinical attributes", () => {
			const memo = formatAnesthesiaPatientMemo({
				clinicName: "Стоматологическая клиника DENTE",
				clinicPhone: "+7 (495) 123-45-67",
				patientName: "Иванов Иван Иванович",
				doctorName: "Д-р Петров П.П.",
				drugTradeName: "Ультракаин Д-С (Артикаин 4% + 1:200 000)",
				carpulesCount: 1.5,
				targetArea: "зуб 16 (инфильтрационная анестезия)",
				expectedDurationHours: "2–3 часа",
				date: "08.09.2026",
			});

			assert.ok(memo.includes("Памятка пациенту после проведения местной анестезии"));
			assert.ok(memo.includes("Стоматологическая клиника DENTE"));
			assert.ok(memo.includes("Иванов Иван Иванович"));
			assert.ok(memo.includes("Д-р Петров П.П."));
			assert.ok(memo.includes("08.09.2026"));
			assert.ok(memo.includes("Ультракаин Д-С (Артикаин 4% + 1:200 000)"));
			assert.ok(memo.includes("1.5 карп."));
			assert.ok(memo.includes("зуб 16 (инфильтрационная анестезия)"));
			assert.ok(memo.includes("2–3 часа"));
			assert.ok(memo.includes("Не принимайте горячую пищу"));
			assert.ok(memo.includes("+7 (495) 123-45-67"));
		});

		it("contains strictly ZERO cartoon emojis (Mandate 8d pt 7)", () => {
			const memo = formatAnesthesiaPatientMemo({
				clinicName: "Клиника",
				clinicPhone: "+79991112233",
				patientName: "Пациент",
				doctorName: "Врач",
				drugTradeName: "Скандонест 3%",
				carpulesCount: 1,
				targetArea: "зуб 36 (мандибулярная анестезия)",
				expectedDurationHours: "1.5–2 часа",
			});

			const emojiRegex = /[🌀-🧿]|[☀-⛿]|[✀-➿]/u;
			assert.equal(emojiRegex.test(memo), false, "Memo must not contain cartoon emojis");
		});

		it("falls back to robust clinical defaults when optional parameters are omitted", () => {
			const memo = formatAnesthesiaPatientMemo({
				clinicName: "",
				clinicPhone: "",
				patientName: "",
				doctorName: "",
				drugTradeName: "Артикаин",
				carpulesCount: 1,
				targetArea: "зуб 21",
			});

			assert.ok(memo.includes("Стоматологическая клиника DENTE"));
			assert.ok(!memo.includes("+7 (495) 123-45-67"));
			assert.ok(memo.includes("Пациент"));
			assert.ok(memo.includes("Лечащий врач-стоматолог"));
			assert.ok(memo.includes("2–3 часа"));
		});
	});

	describe("2. UI Rendering and 1-Click Action Buttons in QuickBar", () => {
		it("renders quick presets and 1-click carpule buttons in AnesthesiaQuickBar", () => {
			const html = renderToString(
				<AnesthesiaQuickBar
					targetToothNumberFdi={16}
					patientWeightKg={70}
					onApplyAnesthesia={() => {}}
				/>,
			);

			assert.ok(
				html.includes('data-testid="anesthesia-quick-bar"'),
				"Must render anesthesia-quick-bar container",
			);
			assert.ok(
				html.includes('data-testid="anesthesia-dose-norm-preset"'),
				"Must render anesthesia-dose-norm-preset button",
			);
			assert.ok(
				html.includes("Норма: Артикаин 1:100k"),
				"Must show standard norm preset label",
			);
			assert.ok(
				html.includes("МДД по массе тела 70 кг"),
				"Must show weight-adjusted MRD label",
			);
		});

		it("renders disabled state cleanly when disabled prop is set", () => {
			const html = renderToString(
				<AnesthesiaQuickBar
					disabled={true}
					onApplyAnesthesia={() => {}}
				/>,
			);
			assert.ok(html.includes("disabled"), "Buttons must receive disabled attribute");
		});

		it("renders 1-click carpule buttons with compliant touch target (min-height >= 44px)", () => {
			const html = renderToString(
				<AnesthesiaQuickBar
					targetToothNumberFdi={24}
					onApplyAnesthesia={() => {}}
				/>,
			);

			assert.ok(
				html.includes('data-testid="anesthesia-dose-1carp"'),
				"Must render anesthesia-dose-1carp button",
			);
			assert.ok(
				html.includes("min-h-[44px]") || html.includes("min-height: 44px"),
				"1-carpule button must have min-height >= 44px for gloved/touch operation",
			);
		});
	});

	describe("3. Touch Target and Ergonomic Standards (Mandate 8c, 8d)", () => {
		it("emergency shock action button has min-height 48px", () => {
			const html = renderToString(
				<AnesthesiaQuickBar
					onOpenEmergencyProtocol={() => {}}
					onApplyAnesthesia={() => {}}
				/>,
			);

			assert.ok(
				html.includes('data-testid="btn-anesthesia-quick-emergency"'),
				"Must render emergency shock button",
			);
			assert.ok(
				html.includes("min-h-[48px]") || html.includes("min-height: 48px"),
				"Emergency button must enforce min-height: 48px",
			);
		});
	});
});
