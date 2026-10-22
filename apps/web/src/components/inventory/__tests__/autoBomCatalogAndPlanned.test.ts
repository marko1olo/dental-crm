import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	calculateAutoVisitConsumables,
} from "@dental/shared";

const EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("BOM Deduction: Canonical 804n Catalog & Planned Calculation", () => {
	it("содержит обязательные нормативы 804н для ключевых стоматологических процедур", () => {
		assert.ok(DEFAULT_804N_CONSUMABLE_LINKS.length >= 20);

		const serviceCodes = new Set(DEFAULT_804N_CONSUMABLE_LINKS.map((l) => l.service804nCode));
		assert.ok(serviceCodes.has("A11.07.012"), "Анестезия должна быть в каталоге");
		assert.ok(serviceCodes.has("A16.07.002"), "Лечение кариеса должно быть в каталоге");
		assert.ok(serviceCodes.has("A16.07.030"), "Эндодонтия должна быть в каталоге");
		assert.ok(serviceCodes.has("A16.07.001"), "Удаление зуба должно быть в каталоге");
		assert.ok(serviceCodes.has("A16.07.051"), "Профгигиена должна быть в каталоге");
		assert.ok(serviceCodes.has("A16.07.002.009"), "Коффердам должен быть в каталоге");
		assert.ok(serviceCodes.has("B01.065.001"), "Базовый СИЗ приёма должен быть в каталоге");
	});

	it("каждая позиция каталога имеет корректные единицы, количество и цену в копейках", () => {
		for (const link of DEFAULT_804N_CONSUMABLE_LINKS) {
			assert.ok(link.id.length > 0);
			assert.ok(link.service804nCode.length > 0);
			assert.ok(link.itemName.length > 0);
			assert.ok(link.quantityPerService > 0);
			assert.ok(link.costPriceKopecks > 0);
			assert.ok(link.unit.length > 0);
			assert.ok(!EMOJI_REGEX.test(link.itemName));
		}
	});

	it("анестезия A11.07.012 включает карпулу артикаина 1.7 мл со стеклом и иглу 30G", () => {
		const anesthLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter((l) => l.service804nCode === "A11.07.012");
		assert.ok(anesthLinks.length >= 3);

		const carpule = anesthLinks.find((l) => l.category === "anesthetic");
		assert.ok(carpule);
		assert.ok(carpule.unit.startsWith("карп"));
		assert.equal(carpule.quantityPerService, 1);
		assert.ok(carpule.itemName.toLowerCase().includes("артикаин"));

		const needle = anesthLinks.find((l) => l.unit === "шт" && l.itemName.includes("Игла"));
		assert.ok(needle);
		assert.equal(needle.quantityPerService, 1);
	});

	it("автоматически добавляет базовый набор СИЗ (B01.065.001), если он не указан явно", () => {
		const rendered = [
			{ serviceCode: "A16.07.002", serviceTitle: "Восстановление зуба пломбой", quantity: 1, toothNumber: 36 },
		];

		const planned = calculateAutoVisitConsumables(rendered);
		assert.ok(planned.length > 0);

		const ppeItems = planned.filter((p) => p.service804nCode === "B01.065.001");
		assert.ok(ppeItems.length >= 3);
		assert.ok(ppeItems.some((p) => p.itemName.includes("Перчатки")));
		assert.ok(ppeItems.some((p) => p.itemName.includes("Слюноотсос")));
	});

	it("корректно масштабирует количество расходников при оказании нескольких услуг", () => {
		const rendered = [
			{ serviceCode: "A11.07.012", serviceTitle: "Проводниковая анестезия", quantity: 2, toothNumber: 46 },
		];

		const planned = calculateAutoVisitConsumables(rendered, { includeStandardPpe: false });
		const carpule = planned.find((p) => p.category === "anesthetic");
		assert.ok(carpule);
		assert.equal(carpule.requiredQuantity, 2);
	});

	it("поддерживает сопоставление по базовому коду 804н (A16.07.002.001 -> A16.07.002)", () => {
		const rendered = [
			{ serviceCode: "A16.07.002.001", serviceTitle: "Восстановление зуба пломбой I класс", quantity: 1, toothNumber: 24 },
		];

		const planned = calculateAutoVisitConsumables(rendered, { includeStandardPpe: false });
		assert.ok(planned.length >= 4);
		assert.ok(planned.some((p) => p.itemName.includes("нанокомпозит") || p.itemName.includes("Filtek")));
	});
});
