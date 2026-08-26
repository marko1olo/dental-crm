import assert from "node:assert";
import { describe, it } from "node:test";
import {
	DEFAULT_804N_BOM_SEEDS,
} from "../../services/inventory/defaultBomSeeds.js";

describe("Inventory 804n Material BOM Auto-Deduction Engine", () => {
	it("содержит валидные технологические карты 804н для ключевых клинических процедур", () => {
		assert.ok(DEFAULT_804N_BOM_SEEDS.length >= 7, "Должно быть не менее 7 базовых процедур");

		const filling = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === "A16.07.002.001");
		assert.ok(filling, "Должна присутствовать процедура пломбирования A16.07.002.001");
		assert.equal(filling.specialty, "therapist");

		// Проверяем наличие композита с нормой 0.35 г
		const composite = filling.materials.find((m) => m.name.toLowerCase().includes("композит"));
		assert.ok(composite, "В пломбировании должен быть композит");
		assert.equal(composite.quantityToDeduct, 0.35);
		assert.equal(composite.unit, "г");

		// Проверяем наличие анестетика с нормой 1 карпула
		const anesthetic = filling.materials.find((m) => m.name.toLowerCase().includes("артикаин"));
		assert.ok(anesthetic);
		assert.equal(anesthetic.quantityToDeduct, 1);
		assert.equal(anesthetic.unit, "карп.");

		// Проверяем эндодонтию 3-канального зуба (A16.07.030.003)
		const endo3 = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === "A16.07.030.003");
		assert.ok(endo3);
		const naocl = endo3.materials.find((m) => m.name.toLowerCase().includes("гипохлорит"));
		assert.ok(naocl);
		assert.equal(naocl.quantityToDeduct, 30, "Для 3 каналов должно быть 30 мл NaOCl");

		// Проверяем хирургическое удаление зуба (A16.07.001.001)
		const surgery = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === "A16.07.001.001");
		assert.ok(surgery);
		const alvostaz = surgery.materials.find((m) => m.name.toLowerCase().includes("альвостаз"));
		assert.ok(alvostaz);
		assert.equal(alvostaz.quantityToDeduct, 1);

		// Проверяем дентальную имплантацию (A16.07.054)
		const implant = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === "A16.07.054");
		assert.ok(implant);
		const saline = implant.materials.find((m) => m.name.toLowerCase().includes("физиологический"));
		assert.ok(saline);
		assert.equal(saline.quantityToDeduct, 1);
		assert.equal(saline.unit, "шт.");
	});

	it("гарантирует положительные нормы расхода и валидные единицы измерения", () => {
		for (const procedure of DEFAULT_804N_BOM_SEEDS) {
			assert.ok(procedure.serviceCode.startsWith("A16.07."), `Неверный код 804н: ${procedure.serviceCode}`);
			assert.ok(procedure.serviceTitle.length > 5, `Слишком короткое название: ${procedure.serviceTitle}`);
			assert.ok(procedure.materials.length > 0, `Процедура ${procedure.serviceCode} не содержит материалов`);

			for (const mat of procedure.materials) {
				assert.ok(Number.isFinite(mat.quantityToDeduct) && mat.quantityToDeduct > 0, `Некорректное количество ${mat.quantityToDeduct} для ${mat.name}`);
				assert.ok(mat.unit && mat.unit.length > 0, `Отсутствует единица измерения для ${mat.name}`);
				assert.ok(Number.isFinite(mat.defaultUnitCostRub) && mat.defaultUnitCostRub >= 0, `Некорректная цена для ${mat.name}`);
			}
		}
	});

	it("корректно рассчитывает суммарную плановую себестоимость расходников на процедуру", () => {
		const filling = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === "A16.07.002.001")!;
		let totalPrimeCost = 0;
		for (const mat of filling.materials) {
			totalPrimeCost += mat.quantityToDeduct * mat.defaultUnitCostRub;
		}

		assert.ok(totalPrimeCost > 300 && totalPrimeCost < 3000, `Себестоимость пломбирования ${totalPrimeCost} должна быть в разумных пределах`);
	});
});
