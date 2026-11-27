import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceItemEditModal } from "../components/settings/pricesTab/PriceItemEditModal.js";
import { normalizeRubAmountInput, validateRubAmountInput } from "../rubAmountInput.js";
import { money } from "../AppHelpers.js";

describe("ручной ввод цены услуги держит копейки", () => {
	it("рендерит текстовое поле цены с inputMode='decimal', пустым значением для новой услуги и без step", () => {
		const html = renderToStaticMarkup(
			React.createElement(PriceItemEditModal, {
				isOpen: true,
				isNew: true,
				priceRubInput: "",
				editServiceForm: {
					code: "",
					title: "",
					category: "therapy",
					specialty: "therapist",
					basePriceRub: 0,
					materialsCostRub: 0,
					durationMinutes: 30,
					warrantyMonths: 12,
				},
				onClose: () => {},
				onSave: () => {},
			}),
		);

		assert.ok(html.includes('id="service-price-input"'));
		assert.ok(html.includes('type="text"'));
		assert.ok(html.includes('inputMode="decimal"'));
		assert.equal(html.includes('type="number"'), false);
		assert.equal(/\bstep=/.test(html), false);
		assert.ok(html.includes('value=""'));
	});

	it("normalizeRubAmountInput сохраняет копейки при запятой, точке и пробелах разрядов", () => {
		assert.equal(normalizeRubAmountInput("1500,50"), 1500.5);
		assert.equal(normalizeRubAmountInput("1 500,50"), 1500.5);
		assert.equal(normalizeRubAmountInput("6850.25"), 6850.25);
		assert.equal(normalizeRubAmountInput("0,50"), 0.5);
		assert.equal(normalizeRubAmountInput("12.345"), null);
		assert.equal(normalizeRubAmountInput(""), null);
		assert.ok(validateRubAmountInput("0") !== null);
		assert.equal(validateRubAmountInput("1500,50"), null);
	});

	it("money форматирует копейки единообразно без потери нулей", () => {
		const formatted = money(1500.5);
		assert.ok(/1[\s\u00A0\u202F]?500,50\s*₽/.test(formatted), `Expected 1 500,50 ₽, got ${formatted}`);
	});
});
