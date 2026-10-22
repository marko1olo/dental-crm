import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { WarehouseInventoryAuditModal } from "../WarehouseInventoryAuditModal.js";

describe("WarehouseInventoryAuditModal React Component Rendering", () => {
	it("Успешно рендерится через SSR renderToStaticMarkup без падений", () => {
		const markup = renderToStaticMarkup(
			createElement(WarehouseInventoryAuditModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(markup.includes("Складская инвентаризация и контроль сроков"));
		assert.ok(markup.includes("Книжный остаток"));
		assert.ok(markup.includes("Фактический остаток"));
		assert.ok(markup.includes("Сальдо сличительной сверки"));
		assert.ok(markup.includes("Контроль сроков годности"));
		assert.ok(markup.includes("Опись"));
		assert.ok(markup.includes("Сличительная"));
		assert.ok(markup.includes("Провести инвентаризацию"));
		assert.ok(markup.includes("Категории ТМЦ:"));
		assert.ok(markup.includes("Все категории"));
		assert.ok(markup.includes("Анестетики"));
		assert.ok(markup.includes("Пломбировочные"));
		assert.ok(markup.includes("Стерилизация"));
		assert.ok(markup.includes("Одноразовые"));
	});

	it("Возвращает пустую разметку при isOpen = false", () => {
		const markup = renderToStaticMarkup(
			createElement(WarehouseInventoryAuditModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);

		assert.equal(markup, "");
	});
});
