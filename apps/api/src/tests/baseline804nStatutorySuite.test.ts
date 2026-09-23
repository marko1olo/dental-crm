import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASELINE_804N_PRICELIST_SERVICES } from "../services/clinical/statutoryCatalogs.js";
import { seedBaseline804nServicesInDb } from "../db/pricelistQuery.js";

describe("Серверный каталог базовых услуг 804н и функция сидирования", () => {
	it("содержит ровно 30 канонических услуг", () => {
		assert.equal(BASELINE_804N_PRICELIST_SERVICES.length, 30);
	});

	it("каждая услуга имеет валидный код 804н (класс A или B)", () => {
		const code804nRegex = /^A\d{2}\.\d{2}\.\d{3}(\.\d{3})?$|^B\d{2}\.\d{3}\.\d{3}(\.\d{3})?$/;
		for (const service of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(
				code804nRegex.test(service.code),
				`Некорректный код 804н у услуги «${service.title}»: ${service.code}`,
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
