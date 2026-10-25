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

describe("10. Prosthetics Parameters, 4 Clinical Stages & Mandate 8e Autonomy", () => {
	test("Поддерживает 4 прозрачных клинических этапа ЗТЛ в каноническом порядке", () => {
		assert.equal(LAB_TECHNOLOGICAL_STAGE_ORDER.length, 4);
		assert.deepEqual([...LAB_TECHNOLOGICAL_STAGE_ORDER], [
			"impression_scan",
			"in_lab",
			"ready_in_clinic",
			"fitting_fixation",
		]);
		for (const stageKey of LAB_TECHNOLOGICAL_STAGE_ORDER) {
			const def = LAB_TECHNOLOGICAL_STAGES[stageKey];
			assert.ok(def, `Этап ${stageKey} должен быть определен`);
			assert.ok(def.stepNumber >= 1 && def.stepNumber <= 4);
			assert.ok(def.departmentRu.length > 3);
			assert.ok(def.nameRu.length > 3);
		}
		assert.equal(LAB_TECHNOLOGICAL_STAGES.impression_scan.nameRu, "1. Скан/Слепок снят");
		assert.equal(LAB_TECHNOLOGICAL_STAGES.in_lab.nameRu, "2. В лаборатории");
		assert.equal(LAB_TECHNOLOGICAL_STAGES.ready_in_clinic.nameRu, "3. Готово в клинике");
		assert.equal(LAB_TECHNOLOGICAL_STAGES.fitting_fixation.nameRu, "4. Примерка / Фиксация");
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

	test("advanceLabOrderTechStage последовательно переводит наряд по 4 клиническим этапам", () => {
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

		order = advanceLabOrderTechStage(order, "in_lab", "Зубной техник CAD");
		assert.equal(order.techStage, "in_lab");
		assert.equal(order.techStageHistory?.length, 2);

		order = advanceLabOrderTechStage(order, "ready_in_clinic", "Курьер ЗТЛ");
		assert.equal(order.techStage, "ready_in_clinic");
		assert.equal(order.techStageHistory?.length, 3);

		order = advanceLabOrderTechStage(order, "fitting_fixation", "Врач-ортопед");
		assert.equal(order.techStage, "fitting_fixation");
		assert.equal(order.techStageHistory?.length, 4);
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
			techStage: "in_lab",
		});
		const a4 = generateDentalLabOrderA4PrintBlank(order);
		assert.ok(a4.includes("Конус Морзе"), "A4 должен содержать платформу имплантата");
		assert.ok(a4.includes("Винтовая фиксация"), "A4 должен содержать тип фиксации");
		assert.ok(a4.includes("Маршрутный лист 4 клинических этапов ЗТЛ"), "A4 должен содержать маршрутный лист");

		const csv = exportDentalLabOrdersToCsv([order]);
		assert.ok(csv.includes("Платформа имплантата"));
		assert.ok(csv.includes("Тип абатмента"));
		assert.ok(csv.includes("Тип фиксации"));
		assert.ok(csv.includes("Технологический этап ЗТЛ"));
		assert.ok(csv.includes("Конус Морзе"));
		assert.ok(csv.includes("Винтовая"));
	});
});
