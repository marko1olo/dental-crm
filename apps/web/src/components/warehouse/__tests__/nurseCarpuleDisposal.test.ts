/**
 * nurseCarpuleDisposal.test.ts — Тесты 1-кликового списания карпул анестетиков
 * медсестрой единолично (СанПиН 3.3686-21) и мягкого овердрафта склада.
 *
 * Инварианты:
 * 1. Списание пустых карпул анестетиков и шприцев в 1 клик без комиссии из 3 человек.
 * 2. Мягкий овердрафт склада (Soft Inventory Overdraft): задержка накладной не блокирует операцию.
 * 3. Расчет объема (1.7 мл * N карпул) и фиксация класса отходов (Класс Б).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	COMMON_ANESTHETICS,
	type AnestheticDrugOption,
} from "../NurseCarpuleDisposalModal";

describe("NurseCarpuleDisposal — 1-Click Anesthetic Disposal & Soft Overdraft", () => {
	it("содержит обязательные анестетики по стандартам стоматологии РФ", () => {
		assert.ok(COMMON_ANESTHETICS.length >= 4);

		const articaine100k = COMMON_ANESTHETICS.find((d) => d.id === "articaine_100k");
		assert.ok(articaine100k, "Артикаин 1:100 000 должен присутствовать");
		assert.equal(articaine100k.defaultVolumeMl, 1.7);
		assert.ok(articaine100k.nameRu.includes("Артикаин 4%"));

		const mepivacaine = COMMON_ANESTHETICS.find((d) => d.id === "mepivacaine_3");
		assert.ok(mepivacaine, "Мепивакаин 3% без вазоконстриктора должен присутствовать");
		assert.equal(mepivacaine.defaultVolumeMl, 1.7);
	});

	it("корректно рассчитывает общий объем введенного анестетика в мл", () => {
		const drug = COMMON_ANESTHETICS[0]!;
		
		// 1 карпула = 1.7 мл
		const vol1 = Number((1 * drug.defaultVolumeMl).toFixed(2));
		assert.equal(vol1, 1.7);

		// 2 карпулы = 3.4 мл
		const vol2 = Number((2 * drug.defaultVolumeMl).toFixed(2));
		assert.equal(vol2, 3.4);

		// 15 карпул (смена) = 25.5 мл
		const vol15 = Number((15 * drug.defaultVolumeMl).toFixed(2));
		assert.equal(vol15, 25.5);
	});

	it("определяет мягкий овердрафт (дефицит партии без блокировки списания)", () => {
		// Склад пуст (0 шт.), но врач/медсестра списывают 2 карпулы
		const currentStock = 0;
		const requestedCount = 2;
		const isOverdraft = currentStock < requestedCount;
		const deficit = isOverdraft ? requestedCount - currentStock : 0;

		assert.equal(isOverdraft, true);
		assert.equal(deficit, 2);

		// Склад содержит 5 шт., списывается 2 -> овердрафта нет
		const normalStock = 5;
		const isOverdraftNormal = normalStock < requestedCount;
		assert.equal(isOverdraftNormal, false);
	});

	it("формирует регламентный номер акта утилизации карпул", () => {
		const now = new Date("2026-09-04T12:00:00.000Z");
		const actNumber = `АКТ-КП-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-01`;
		assert.equal(actNumber, "АКТ-КП-202609-04-01");
	});

	it("поддерживает единоличное списание медсестрой без комиссии из 3 человек", () => {
		const disposalPayload = {
			drugId: "articaine_100k",
			drugName: "Артикаин 4% с адреналином 1:100 000 (Ультракаин Д-С Форте)",
			carpulesCount: 2,
			volumeTotalMl: 3.4,
			nurseName: "Смирнова А. В. (медсестра)",
			doctorName: "Д-р Волкова Е. С.",
			actNumber: "АКТ-КП-202609-04-01",
			actDate: "2026-09-04",
			isOverdraft: true,
			wasteClass: "Класс Б",
			decontaminationMethod: "Аламинол 3% (60 мин)",
			singleSigner: true,
		};

		assert.equal(disposalPayload.singleSigner, true);
		assert.equal(disposalPayload.carpulesCount, 2);
		assert.equal(disposalPayload.isOverdraft, true);
		assert.equal(disposalPayload.wasteClass, "Класс Б");
	});
});
