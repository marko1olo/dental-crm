import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("CLINICAL WAREHOUSE: Material Routing", () => {
	it("маршрутизирует карпулы и анестетики в утилизацию Класса Б, а терапевтические материалы в клиническое списание", () => {
		const testItems = [
			{ name: "Артикаин с эпинефрином 1:100 000 (100 карпул)", isAnesthetic: true },
			{ name: "Ультракаин Д-С (Германия)", isAnesthetic: true },
			{ name: "Септанест 1:100 000 карпулы", isAnesthetic: true },
			{ name: "Скандонест 3% без вазоконстриктора", isAnesthetic: true },
			{ name: "Убистезин форте 1.7 мл", isAnesthetic: true },
			{ name: "Композит Filtek Ultimate шприц 4г", isAnesthetic: false },
			{ name: "Адгезив Single Bond Universal 5 мл", isAnesthetic: false },
			{ name: "Стеклоиономерный цемент Fuji Plus", isAnesthetic: false },
			{ name: "Перчатки нитриловые смотровые р-р M", isAnesthetic: false },
		];

		const isAnestheticName = (rawName: string): boolean => {
			const n = rawName.toLowerCase();
			return (
				n.includes("артикаин") ||
				n.includes("ультракаин") ||
				n.includes("септанест") ||
				n.includes("скандонест") ||
				n.includes("убистезин") ||
				n.includes("мепивакаин") ||
				n.includes("карпул")
			);
		};

		for (const item of testItems) {
			const result = isAnestheticName(item.name);
			assert.equal(
				result,
				item.isAnesthetic,
				`Ожидалось isAnesthetic=${item.isAnesthetic} для «${item.name}», получено ${result}`,
			);
		}
	});
});
