/**
 * apps/web/src/components/sterilization/__tests__/sterilizationPresetsAndPurge.test.tsx
 *
 * Тесты клинических пресетов автоклава, отсутствия советского канцелярита в заголовках
 * и автономии врача (Мандат 8e / 8x / Apple HIG).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CLINICAL_AUTOCLAVE_1CLICK_PRESETS } from "../../sanpin/sterilizationModules/sterilizationCycleTypes";
import { SterilizationCycleDrawer } from "../SterilizationCycleDrawer";
import { SterilizationJournalTable } from "../SterilizationJournalTable";
import { SanPinJournalView } from "../../sanpin/SanPinJournalView";

describe("Sterilization Presets & Red Team Jargon Purge", () => {
	it("provides 3 standard 1-click clinical presets for autoclaves with correct parameters", () => {
		expect(CLINICAL_AUTOCLAVE_1CLICK_PRESETS).toHaveLength(3);

		const [standard, delicate, quick] = CLINICAL_AUTOCLAVE_1CLICK_PRESETS;

		// 1. Стандарт 134°C / 2.1 бар — 5 мин (Упакованные инструменты)
		expect(standard.id).toBe("standard_134_5");
		expect(standard.temperatureC).toBe(134);
		expect(standard.pressureBar).toBe(2.1);
		expect(standard.durationMin).toBe(5);
		expect(standard.title).toContain("134°C");
		expect(standard.title).toContain("5 мин");
		expect(standard.subtitle).toContain("Упакованные инструменты");

		// 2. Деликатный 121°C / 1.1 бар — 20 мин (Резина, оптика, наконечники)
		expect(delicate.id).toBe("delicate_121_20");
		expect(delicate.temperatureC).toBe(121);
		expect(delicate.pressureBar).toBe(1.1);
		expect(delicate.durationMin).toBe(20);
		expect(delicate.title).toContain("121°C");
		expect(delicate.title).toContain("20 мин");
		expect(delicate.subtitle).toContain("Резина, оптика, наконечники");

		// 3. Быстрый 134°C / 2.1 бар — 3 мин (Неупакованный инструмент)
		expect(quick.id).toBe("quick_134_3");
		expect(quick.temperatureC).toBe(134);
		expect(quick.pressureBar).toBe(2.1);
		expect(quick.durationMin).toBe(3);
		expect(quick.title).toContain("134°C");
		expect(quick.title).toContain("3 мин");
		expect(quick.subtitle).toContain("Неупакованный инструмент");
	});

	it("SterilizationCycleDrawer renders all 3 presets and unblocked approval CTA", () => {
		const html = renderToStaticMarkup(
			<SterilizationCycleDrawer
				isOpen={true}
				onClose={() => {}}
			/>
		);

		// Header is clean clinical
		expect(html).toContain("Утверждение цикла автоклава");
		expect(html).toContain("Журнал работы стерилизаторов • 1-Click пресеты смены");

		// Check all 3 presets in rendered output
		expect(html).toContain("drawer-preset-btn-standard_134_5");
		expect(html).toContain("drawer-preset-btn-delicate_121_20");
		expect(html).toContain("drawer-preset-btn-quick_134_3");

		// Primary CTA button is never blocked (disabled=false)
		expect(html).toContain("approve-cycle-primary-cta");
		expect(html).toContain("✓ Утвердить цикл стерилизации");
		expect(html).not.toMatch(/id="approve-cycle-primary-cta"[^>]*disabled/);

		// Automatic indicator 5 class verification is visible
		expect(html).toContain("Химический индикатор 5 класса пройден");
	});

	it("SterilizationJournalTable renders clean clinical table and action controls", () => {
		const html = renderToStaticMarkup(
			<SterilizationJournalTable
				onOpenNewCycle={() => {}}
				onQuickBatchShift={() => {}}
				onPrintJournal={() => {}}
				onExportCsv={() => {}}
			/>
		);

		expect(html).toContain("sterilization-journal-search-input");
		expect(html).toContain("sterilization-journal-device-filter");
		expect(html).toContain("sterilization-journal-new-cycle-btn");
		expect(html).toContain("sterilization-journal-quick-shift-btn");
		expect(html).toContain("+ Новый цикл");
		expect(html).toContain("Сдать смену ЦСО");
		expect(html).toContain("Печать");
		expect(html).toContain("CSV");
	});

	it("SanPinJournalView displays clean title without soviet decree numbers", () => {
		const html = renderToStaticMarkup(<SanPinJournalView />);

		// Screen title must be "Журнал стерилизации и автоклава"
		expect(html).toContain("Журнал стерилизации и автоклава");

		// Header must not contain bureaucratic codes in titles
		expect(html).not.toContain("СанПиН 3.3686-21");
		expect(html).not.toContain("Форма 257/у");

		// New cycle CTA
		expect(html).toContain("journal-view-new-cycle-cta");
	});
});
