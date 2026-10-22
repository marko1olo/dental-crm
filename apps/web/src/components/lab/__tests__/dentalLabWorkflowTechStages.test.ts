import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createDentalLabOrder,
	advanceLabOrderTechStage,
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	generateDentalLabOrderA4PrintBlank,
	exportDentalLabOrdersToCsv,
} from "../dentalLabWorkflowEngine";
describe("10. Prosthetics Parameters, 8 Technological Stages & Mandate 8e Autonomy", () => {
	test("Поддерживает все 8 технологических этапов ЗТЛ в каноническом порядке", () => {
		assert.equal(LAB_TECHNOLOGICAL_STAGE_ORDER.length, 8);
		assert.deepEqual([...LAB_TECHNOLOGICAL_STAGE_ORDER], [
			"impression_scan",
			"waxup_cad",
			"milling_framework",
			"clinical_fitting",
			"ceramic_layering",
			"glaze_finish",
			"ready_in_clinic",
			"patient_fixation",
		]);
		for (const stageKey of LAB_TECHNOLOGICAL_STAGE_ORDER) {
			const def = LAB_TECHNOLOGICAL_STAGES[stageKey];
			assert.ok(def, `Этап ${stageKey} должен быть определен`);
			assert.ok(def.stepNumber >= 1 && def.stepNumber <= 8);
			assert.ok(def.departmentRu.length > 3);
			assert.ok(def.nameRu.length > 3);
		}
	});
	test("Поддерживает платформы имплантатов Conical и Hex, абатменты Ti-Base/Multi-Unit и типы фиксации", () => {
		assert.equal(IMPLANT_PLATFORMS.length, 2);
		assert.ok(IMPLANT_PLATFORMS.some((p) => p.id === "conical"));
		assert.ok(IMPLANT_PLATFORMS.some((p) => p.id === "hex"));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "tibase_bonded" && a.isTiBase));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "multiunit_straight" && a.isMultiUnit && a.angle === 0));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "multiunit_17" && a.isMultiUnit && a.angle === 17));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "multiunit_30" && a.isMultiUnit && a.angle === 30));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "custom_titanium"));
		assert.ok(ABUTMENT_TYPE_OPTIONS.some((a) => a.id === "custom_zirconia"));
		assert.equal(FIXATION_TYPES.length, 2);
		assert.ok(FIXATION_TYPES.some((f) => f.id === "screw_retained"));
		assert.ok(FIXATION_TYPES.some((f) => f.id === "cement_retained"));
	});
	test("advanceLabOrderTechStage последовательно переводит наряд по 8 технологическим этапам", () => {
		let order = createDentalLabOrder({
			patientId: "pat-tech-1",
			patientName: "Алексеев Владимир Дмитриевич",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев С. П.",
			workTypeId: "crown_zirconia",
			selectedTeeth: [46],
			implantPlatform: "conical",
			abutmentType: "tibase_bonded",
			fixationType: "screw_retained",
			techStage: "impression_scan",
		});
		assert.equal(order.techStage, "impression_scan");
		assert.equal(order.implantPlatform, "conical");
		assert.equal(order.abutmentType, "tibase_bonded");
		assert.equal(order.fixationType, "screw_retained");
		order = advanceLabOrderTechStage(order, "waxup_cad", "Зубной техник CAD");
		assert.equal(order.techStage, "waxup_cad");
		assert.equal(order.techStageHistory?.length, 2);
		order = advanceLabOrderTechStage(order, "milling_framework", "Оператор CAM");
		assert.equal(order.techStage, "milling_framework");
		order = advanceLabOrderTechStage(order, "clinical_fitting", "Врач-ортопед");
		assert.equal(order.techStage, "clinical_fitting");
		order = advanceLabOrderTechStage(order, "ceramic_layering", "Керамист");
		assert.equal(order.techStage, "ceramic_layering");
		order = advanceLabOrderTechStage(order, "glaze_finish", "Мастер глазуровки");
		assert.equal(order.techStage, "glaze_finish");
		order = advanceLabOrderTechStage(order, "ready_in_clinic", "Курьер ЗТЛ");
		assert.equal(order.techStage, "ready_in_clinic");
		order = advanceLabOrderTechStage(order, "patient_fixation", "Врач-ортопед");
		assert.equal(order.techStage, "patient_fixation");
	});
	test("Бланк А4 и CSV содержат платформу имплантата, абатмент, фиксацию и маршрутный лист", () => {
		const order = createDentalLabOrder({
			patientId: "pat-implant-a4",
			patientName: "Иванова Татьяна Сергеевна",
			doctorId: "doc-2",
			doctorName: "Д-р Смирнова М. В.",
			workTypeId: "custom_abutment",
			selectedTeeth: [21],
			implantPlatform: "conical",
			abutmentType: "custom_zirconia",
			fixationType: "screw_retained",
			techStage: "clinical_fitting",
		});
		const a4 = generateDentalLabOrderA4PrintBlank(order);
		assert.ok(a4.includes("Конус Морзе"), "A4 должен содержать платформу имплантата");
		assert.ok(a4.includes("Винтовая фиксация"), "A4 должен содержать тип фиксации");
		assert.ok(a4.includes("Маршрутный лист 8 технологических этапов ЗТЛ"), "A4 должен содержать маршрутный лист");
		const csv = exportDentalLabOrdersToCsv([order]);
		assert.ok(csv.includes("Платформа имплантата"));
		assert.ok(csv.includes("Тип абатмента"));
		assert.ok(csv.includes("Тип фиксации"));
		assert.ok(csv.includes("Технологический этап ЗТЛ"));
		assert.ok(csv.includes("Конус Морзе"));
		assert.ok(csv.includes("Винтовая"));
	});
});
