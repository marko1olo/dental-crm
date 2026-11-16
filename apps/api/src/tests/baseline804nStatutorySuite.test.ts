import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASELINE_804N_PRICELIST_SERVICES } from "../services/clinical/statutoryCatalogs.js";
import { seedBaseline804nServicesInDb } from "../db/pricelistQuery.js";

describe("Серверный каталог базовых услуг 804н и функция сидирования", () => {
	it("содержит ровно 30 канонических услуг", () => {
		assert.equal(BASELINE_804N_PRICELIST_SERVICES.length, 30);
	});

	it("каждая услуга имеет понятное клиническое название и валидную категорию", () => {
		const validCategories = new Set(["therapy", "prosthetics", "surgery", "hygiene", "consultation", "imaging"]);
		for (const service of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(
				service.title && service.title.trim().length >= 5,
				`Слишком короткое или пустое название услуги: ${service.code}`,
			);
			assert.ok(
				validCategories.has(service.category),
				`Невалидная категория услуги «${service.title}»: ${service.category}`,
			);
		}
	});

	it("цены в рублях и копейках точны до копейки (Мандат 8b)", () => {
		for (const service of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(service.basePriceRub > 0, `Услуга ${service.code} имеет нулевую или отрицательную цену`);
			assert.equal(
				service.basePriceKopecks,
				Math.round(service.basePriceRub * 100),
				`Расхождение копеек у ${service.code}`,
			);
		}
	});

	it("каждая услуга имеет налоговый вычет (taxDeductible: true) и активный статус", () => {
		for (const service of BASELINE_804N_PRICELIST_SERVICES) {
			assert.equal(service.taxDeductible, true);
			assert.equal(service.active, true);
			assert.ok(service.durationMinutes > 0);
		}
	});

	it("функция seedBaseline804nServicesInDb экспортирована и является функцией", () => {
		assert.equal(typeof seedBaseline804nServicesInDb, "function");
	});
});
