import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WarehousePackageWriteOffBar } from "../WarehousePackageWriteOffBar";
import { handleOneClickPackageWriteOff } from "../warehousePackageWriteOffEngine";

describe("Wave 64 (Feature 253): UI Components, Touch Targets & Zero Emojis", () => {
	it("11. WarehousePackageWriteOffBar рендерит кнопки btn-writeoff-anesthesia-packet и btn-writeoff-hygiene-packet", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
				allowSoftOverdraft: true,
			}),
		);

		assert.ok(html.includes("data-testid=\"warehouse-package-writeoff-bar\""));
		assert.ok(html.includes("btn-writeoff-anesthesia-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-anesthesia-packet\""));
		assert.ok(html.includes("Стандартная анестезия"));
		assert.ok(html.includes("btn-writeoff-hygiene-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-hygiene-packet\""));
		assert.ok(html.includes("Профгигиена"));
		assert.ok(html.includes("btn-writeoff-filling-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-filling-packet\""));
		assert.ok(html.includes("Пломба световая"));
		assert.ok(html.includes("btn-writeoff-surgery-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-surgery-packet\""));
		assert.ok(html.includes("Хирургический пакет"));
	});

	it("12. Тач-таргеты кнопок строго >= 44x44px (Мандат 8d, WCAG/HIG)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
			}),
		);

		const buttonMatches = html.match(/class="[^"]*btn-writeoff-[^"]*"/g) || [];
		assert.ok(buttonMatches.length >= 4, "Должно быть минимум 4 кнопки пакетов");

		for (const btnMatch of buttonMatches) {
			assert.ok(
				btnMatch.includes("min-h-[44px]"),
				`Кнопка ${btnMatch} обязана иметь тач-таргет >= 44x44px (min-h-[44px])`,
			);
		}
	});

	it("13. Кнопки НЕ заблокированы (disabled) при пустом складе (Мандат 8e автономия, мягкий овердрафт)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
				allowSoftOverdraft: true,
			}),
		);
		assert.ok(!html.includes("disabled"), "Кнопки не должны быть заблокированы из-за нулевого остатка");
	});

	it("14. 0 мультяшных эмодзи в разметке панели списания (Мандат 8d Sin 7)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
			}),
		);
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.ok(!emojiRegex.test(html), "В разметке панели списания запрещены любые эмодзи!");
	});

	it("15. WarehousePackageWriteOffBar содержит кнопки с тач-таргетами >= 44px", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
				organizationId: "org-test",
			}),
		);

		assert.ok(html.includes("btn-writeoff-anesthesia-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-anesthesia-packet\""));
		assert.ok(html.includes("btn-writeoff-hygiene-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-hygiene-packet\""));
		assert.ok(html.includes("min-h-[44px]") || html.includes("h-11") || html.includes("h-10"));
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.ok(!emojiRegex.test(html), "В панели пакетов списания запрещены любые эмодзи!");
	});

	it("16. Фоновое пакетное списание при пустом складе не блокирует работу клиники (Soft Negative Stock)", async () => {
		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: {},
			allowSoftOverdraft: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.isOverdraft, true);
		assert.ok(result.deductedItems.length > 0);
	});
});
