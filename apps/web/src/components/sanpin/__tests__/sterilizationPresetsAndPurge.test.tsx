/**
 * apps/web/src/components/sterilization/__tests__/sterilizationPresetsAndPurge.test.tsx
 *
 * Тесты клинических пресетов автоклава, отсутствия советского канцелярита в заголовках
 * и автономии врача (Мандат 8e / 8x / Apple HIG).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SanPinJournalView } from "../SanPinJournalView";
import { CLINICAL_AUTOCLAVE_1CLICK_PRESETS } from "../sterilizationModules/sterilizationCycleTypes";
import { SterilizationCycleDrawer } from "../sterilization/SterilizationCycleDrawer";
import { SterilizationJournalTable } from "../sterilization/SterilizationJournalTable";

describe("Sterilization Presets & Red Team Jargon Purge", () => {
	it("provides 3 standard 1-click clinical presets for autoclaves with correct parameters", () => {
		assert.equal(CLINICAL_AUTOCLAVE_1CLICK_PRESETS.length, 3);

		const standard = CLINICAL_AUTOCLAVE_1CLICK_PRESETS[0];
		const delicate = CLINICAL_AUTOCLAVE_1CLICK_PRESETS[1];
		const quick = CLINICAL_AUTOCLAVE_1CLICK_PRESETS[2];
		assert.ok(standard);
		assert.ok(delicate);
		assert.ok(quick);
		if (!standard || !delicate || !quick) return;

		// 1. Стандарт 134°C / 2.1 бар — 5 мин (Упакованные инструменты)
		assert.equal(standard.id, "standard_134_5");
		assert.equal(standard.temperatureC, 134);
		assert.equal(standard.pressureBar, 2.1);
		assert.equal(standard.durationMin, 5);
		assert.ok(standard.title.includes("134°C"));
		assert.ok(standard.title.includes("5 мин"));
		assert.ok(standard.subtitle.includes("Упакованные инструменты"));

		// 2. Деликатный 121°C / 1.1 бар — 20 мин (Резина, оптика, наконечники)
		assert.equal(delicate.id, "delicate_121_20");
		assert.equal(delicate.temperatureC, 121);
		assert.equal(delicate.pressureBar, 1.1);
		assert.equal(delicate.durationMin, 20);
		assert.ok(delicate.title.includes("121°C"));
		assert.ok(delicate.title.includes("20 мин"));
		assert.ok(delicate.subtitle.includes("Резина, оптика, наконечники"));

		// 3. Быстрый 134°C / 2.1 бар — 3 мин (Неупакованный инструмент)
		assert.equal(quick.id, "quick_134_3");
		assert.equal(quick.temperatureC, 134);
		assert.equal(quick.pressureBar, 2.1);
		assert.equal(quick.durationMin, 3);
		assert.ok(quick.title.includes("134°C"));
		assert.ok(quick.title.includes("3 мин"));
		assert.ok(quick.subtitle.includes("Неупакованный инструмент"));
	});

	it("SterilizationCycleDrawer renders all 3 presets and unblocked approval CTA", () => {
		const html = renderToStaticMarkup(
			<SterilizationCycleDrawer isOpen={true} onClose={() => {}} />,
		);

		// Header is clean clinical
		assert.ok(html.includes("Утверждение цикла автоклава"));
		assert.ok(
			html.includes("Журнал работы стерилизаторов • 1-Click пресеты смены"),
		);

		// Check all 3 presets in rendered output
		assert.ok(html.includes("drawer-preset-btn-standard_134_5"));
		assert.ok(html.includes("drawer-preset-btn-delicate_121_20"));
		assert.ok(html.includes("drawer-preset-btn-quick_134_3"));

		// Primary CTA button is never blocked (disabled=false)
		assert.ok(html.includes("approve-cycle-primary-cta"));
		assert.ok(html.includes("Утвердить цикл стерилизации"));
		assert.ok(!html.match(/id="approve-cycle-primary-cta"[^>]*disabled/));

		// Automatic indicator 5 class verification is visible
		assert.ok(html.includes("Химический индикатор 5 класса пройден"));
	});

	it("SterilizationJournalTable renders clean clinical table and action controls", () => {
		const html = renderToStaticMarkup(
			<SterilizationJournalTable
				onOpenNewCycle={() => {}}
				onQuickBatchShift={() => {}}
				onPrintJournal={() => {}}
				onExportCsv={() => {}}
			/>,
		);

		assert.ok(html.includes("sterilization-journal-search-input"));
		assert.ok(html.includes("sterilization-journal-device-filter"));
		assert.ok(html.includes("sterilization-journal-new-cycle-btn"));
		assert.ok(html.includes("sterilization-journal-quick-shift-btn"));
		assert.ok(html.includes("+ Новый цикл"));
		assert.ok(html.includes("Сдать смену ЦСО"));
		assert.ok(html.includes("Печать"));
		assert.ok(html.includes("CSV"));
	});

	it("SanPinJournalView displays clean title without soviet decree numbers", () => {
		const html = renderToStaticMarkup(<SanPinJournalView />);

		// Screen title must be "Журнал стерилизации и автоклава"
		assert.ok(html.includes("Журнал стерилизации и автоклава"));

		// Header must not contain bureaucratic codes in titles
		assert.ok(!html.includes("СанПиН 3.3686-21"));
		assert.ok(!html.includes("Форма 257/у"));

		// New cycle CTA
		assert.ok(html.includes("journal-view-new-cycle-cta"));
	});
});
