import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ORTHOPEDIC_WORK_TYPES,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	LAB_PRODUCTION_STAGE_ORDER,
	canAdvanceLabStage,
	getNextLabProductionStage,
} from "../dentalLabWorkflowEngine";

describe("1. Orthopedic Work Types Catalog (Каталог ортопедических конструкций)", () => {
	test("Содержит все 7 ключевых типов ортопедических работ", () => {
		const types = Object.keys(ORTHOPEDIC_WORK_TYPES);
		assert.ok(types.includes("crown_emax"), "Должна быть коронка E.max");
		assert.ok(types.includes("crown_zirconia"), "Должен быть диоксид циркония");
		assert.ok(types.includes("metal_ceramic"), "Должна быть металлокерамика");
		assert.ok(types.includes("clasp_prosthesis"), "Должен быть бюгельный протез");
		assert.ok(types.includes("removable_acrylic"), "Должен быть съемный акриловый протез");
		assert.ok(types.includes("custom_abutment"), "Должен быть индивидуальный абатмент");
		assert.ok(types.includes("aligners"), "Должны быть элайнеры");
	});

	test("Каждая конструкция имеет корректные русские наименования, сроки и целочисленные копейки", () => {
		for (const [id, def] of Object.entries(ORTHOPEDIC_WORK_TYPES)) {
			assert.equal(def.id, id);
			assert.ok(def.nameRu.length > 5, `Имя ${id} должно быть заполнено`);
			assert.ok(def.shortNameRu.length > 0, `Короткое имя ${id} должно быть заполнено`);
			assert.ok(def.categoryRu.length > 0, `Категория ${id} должна быть заполнена`);
			assert.ok(def.defaultMaterialRu.length > 0, `Материал ${id} должен быть указан`);
			assert.ok(def.standardTurnaroundWorkingDays > 0, `Срок ${id} должен быть > 0`);
			assert.ok(
				Number.isInteger(def.defaultPriceKopecks) && def.defaultPriceKopecks > 0,
				`Цена ${id} должна быть целыми копейками`,
			);
			assert.ok(
				Number.isInteger(def.defaultCostKopecks) && def.defaultCostKopecks > 0,
				`Себестоимость ${id} должна быть целыми копейками`,
			);
			assert.ok(def.defaultPriceKopecks > def.defaultCostKopecks, `Цена ${id} должна превышать себестоимость ЗТЛ`);
		}
	});
});

describe("2. 4 Clean Clinical Statuses (4 понятных клинических статуса)", () => {
	test("Содержит ровно 4 клинических статуса без заводского блоата", () => {
		assert.equal(LAB_WORKFLOW_STATUS_ORDER.length, 4);
		assert.deepEqual(LAB_WORKFLOW_STATUS_ORDER, [
			"draft",
			"sent_to_lab",
			"fitting_scheduled",
			"installed_completed",
		]);

		assert.deepEqual(LAB_PRODUCTION_STAGE_ORDER, LAB_WORKFLOW_STATUS_ORDER);

		for (let i = 0; i < LAB_WORKFLOW_STATUS_ORDER.length; i++) {
			const statusId = LAB_WORKFLOW_STATUS_ORDER[i]!;
			const statusDef = LAB_WORKFLOW_STATUSES[statusId];
			assert.ok(statusDef, `Статус ${statusId} должен быть определен`);
			assert.equal(statusDef.stepIndex, i + 1, `Индекс статуса ${statusId} должен быть ${i + 1}`);
			assert.ok(statusDef.nameRu.length > 0);
			assert.ok(statusDef.shortTitleRu.length > 0);
			assert.ok(statusDef.icon.length > 0);
		}
	});

	test("canAdvanceLabStage корректно проверяет допустимость перехода между 4 статусами", () => {
		assert.equal(canAdvanceLabStage("draft", "sent_to_lab"), true);
		assert.equal(canAdvanceLabStage("sent_to_lab", "fitting_scheduled"), true);
		assert.equal(canAdvanceLabStage("fitting_scheduled", "installed_completed"), true);
		assert.equal(canAdvanceLabStage("fitting_scheduled", "sent_to_lab"), true);
	});

	test("getNextLabProductionStage возвращает следующий клинический статус или null для финального", () => {
		assert.equal(getNextLabProductionStage("draft"), "sent_to_lab");
		assert.equal(getNextLabProductionStage("sent_to_lab"), "fitting_scheduled");
		assert.equal(getNextLabProductionStage("fitting_scheduled"), "installed_completed");
		assert.equal(getNextLabProductionStage("installed_completed"), null);
	});
});
