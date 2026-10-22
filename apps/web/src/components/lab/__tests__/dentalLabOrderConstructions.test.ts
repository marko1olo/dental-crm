import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
	LAB_ORDER_STAGES,
} from "../labMath";

describe("DentalLabOrderModal — Prosthetic Construction Types", () => {
	test("Содержит все ключевые ортопедические конструкции (Коронка, Мост, Винир, All-on-4/6, Абатмент, Бюгель, Элайнеры)", () => {
		const typeIds = CONSTRUCTION_TYPES.map((c) => c.id);
		assert.ok(typeIds.includes("single_crown"), "Должна быть одиночная коронка");
		assert.ok(typeIds.includes("bridge"), "Должен быть мостовидный протез");
		assert.ok(typeIds.includes("veneer"), "Должен быть винир");
		assert.ok(typeIds.includes("inlay_onlay"), "Должна быть вкладка Inlay/Onlay");
		assert.ok(typeIds.includes("all_on_arch"), "Должен быть тотал All-on-4/6");
		assert.ok(typeIds.includes("implant_abutment"), "Должен быть индивидуальный абатмент");
		assert.ok(typeIds.includes("clasp_denture"), "Должен быть бюгельный протез");
		assert.ok(typeIds.includes("aligners_nightguard"), "Должны быть элайнеры/каппы");
		assert.ok(typeIds.includes("endocrown"), "Должна быть эндокоронка");
	});

	test("Каждая конструкция имеет понятное русскоязычное название, описание, категорию и иконку", () => {
		for (const item of CONSTRUCTION_TYPES) {
			assert.ok(item.name.length > 0, "Имя конструкции не должно быть пустым");
			assert.ok(item.desc.length > 0, "Описание конструкции не должно быть пустым");
			assert.ok(item.icon.length > 0, "Иконка должна присутствовать");
			assert.ok(item.category.length > 0, "Категория должна присутствовать");
		}
	});
});

describe("DentalLabOrderModal — Dental Lab CAD/CAM Materials", () => {
	test("Содержит цирконий Multi-layer, E.max, металлокерамику CoCr, PMMA и титан Grade 5", () => {
		const matIds = LAB_MATERIALS.map((m) => m.id);
		assert.ok(matIds.includes("zirconia_multilayer"));
		assert.ok(matIds.includes("emax_lithium_disilicate"));
		assert.ok(matIds.includes("pfm_cocr"));
		assert.ok(matIds.includes("pmma_temporary"));
		assert.ok(matIds.includes("titanium_custom_abutment"));
		assert.ok(matIds.includes("peek_biohpp"));
		assert.ok(matIds.includes("biocompatible_3d_resin"));
	});

	test("Каждый материал снабжен категорией и прочностными характеристиками", () => {
		for (const mat of LAB_MATERIALS) {
			assert.ok(mat.name.length > 0);
			assert.ok(mat.desc.length > 0);
			assert.ok(mat.tag.length > 0);
			assert.ok(mat.category.length > 0);
		}
	});
});

describe("DentalLabOrderModal — Occlusion, Contact Points & Texture Specs", () => {
	test("Окклюзионные схемы включают взаимно-защищенную, клыковое ведение, групповую функцию и сбалансированную", () => {
		const schemes = OCCLUSAL_SCHEMES.map((s) => s.id);
		assert.ok(schemes.includes("mutually_protected"));
		assert.ok(schemes.includes("canine_guidance"));
		assert.ok(schemes.includes("group_function"));
		assert.ok(schemes.includes("balanced_articulation"));
	});

	test("Плотность контактов поддерживает нормальный (50 мкм), плотный, пассивный и промывной для мостов", () => {
		const contacts = CONTACT_TIGHTNESS_OPTIONS.map((c) => c.id);
		assert.ok(contacts.includes("normal"));
		assert.ok(contacts.includes("tight"));
		assert.ok(contacts.includes("light"));
		assert.ok(contacts.includes("open_pontic"));
	});

	test("Текстура поверхности содержит анатомическую микротекстуру, сатин и глянец", () => {
		const textures = SURFACE_TEXTURE_OPTIONS.map((t) => t.id);
		assert.ok(textures.includes("natural_anatomy"));
		assert.ok(textures.includes("satin_semi_matte"));
		assert.ok(textures.includes("high_gloss_glaze"));
	});
});

describe("DentalLabOrderModal — 4-Step Clinical Lab Stages Tracker", () => {
	test("Трекер этапов ЗТЛ содержит 4 клинических статуса: В работе, Примерка, Сдано, Коррекция", () => {
		assert.equal(LAB_ORDER_STAGES.length, 4);
		const stageIds = LAB_ORDER_STAGES.map((s) => s.id);
		assert.deepEqual(stageIds, [
			"in_progress",
			"fitting_scheduled",
			"delivered_completed",
			"correction_remake",
		]);

		for (let i = 0; i < LAB_ORDER_STAGES.length; i++) {
			const stage = LAB_ORDER_STAGES[i];
			assert.ok(stage);
			assert.equal(stage.step, i + 1);
			assert.ok(stage.name.length > 0);
			assert.ok(stage.desc.length > 0);
		}
	});
});
