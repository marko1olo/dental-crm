import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	canAdvanceLabStage,
	createDentalLabOrder,
	sendOrderToWarrantyRework,
} from "../dentalLabWorkflowEngine";

describe("9. Warranty Rework & Reclamation Lifecycle (Гарантийные переделки)", () => {
	test("canAdvanceLabStage разрешает переход из installed_completed в warranty_rework", () => {
		assert.equal(canAdvanceLabStage("installed_completed", "warranty_rework"), true);
		assert.equal(canAdvanceLabStage("warranty_rework", "sent_to_lab"), true);
	});

	test("sendOrderToWarrantyRework корректно переводит наряд в warranty_rework с сохранением исходного номера наряда", () => {
		const completedOrder = createDentalLabOrder({
			patientId: "pat-rework-1",
			patientName: "Смирнова Елена Александровна",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев С. П.",
			workTypeId: "crown_emax",
			selectedTeeth: [11],
			initialStatus: "installed_completed",
		});

		assert.equal(completedOrder.currentStage, "installed_completed");

		const reworkOrder = sendOrderToWarrantyRework(
			completedOrder,
			"Скол керамики режущего края через 3 дня после фиксации",
			"Д-р Ковалев С. П.",
		);

		assert.equal(reworkOrder.currentStage, "warranty_rework");
		assert.equal(reworkOrder.isWarrantyRework, true);
		assert.equal(reworkOrder.originalOrderId, completedOrder.id);
		assert.equal(reworkOrder.originalOrderNumber, completedOrder.orderNumber);
		assert.ok(reworkOrder.reworkReason?.includes("Скол керамики"));
		assert.ok(reworkOrder.stageHistory.some((h) => h.stage === "warranty_rework"));

		// Проверка финансовой честности: пациент платит строго 0 ₽, клиника несет гарантийные обязательства
		assert.equal(reworkOrder.financials.patientPriceTotalKopecks, 0, "Пациент не оплачивает повторный заказ (0 ₽)");
		assert.equal(reworkOrder.financials.patientPriceTotalRub, 0);
		assert.equal(reworkOrder.financials.warrantyLiabilityType, "clinic_warranty");
		assert.equal(reworkOrder.financials.warrantyLiabilityKopecks, completedOrder.financials.costPerUnitKopecks);
		assert.equal(reworkOrder.financials.labCostKopecks, completedOrder.financials.costPerUnitKopecks);
		assert.equal(reworkOrder.financials.doctorWageKopecks, 0, "Врач не получает отрицательных штрафов");
		assert.equal(reworkOrder.financials.isBalanced, true);
	});

	test("Гарантийный протокол: при браке ЗТЛ (lab_defect) лаборатория переделывает за свой счет (0 ₽ клинике и пациенту)", () => {
		const originalOrder = createDentalLabOrder({
			patientId: "pat-defect-1",
			patientName: "Иванов Петр Сергеевич",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев С. П.",
			workTypeId: "crown_zirconia",
			selectedTeeth: [26],
			initialStatus: "installed_completed",
		});

		const labDefectOrder = sendOrderToWarrantyRework(
			originalOrder,
			"Брак ЗТЛ: балансир каркаса и дефект спекания циркония",
			"Д-р Ковалев С. П.",
			new Date(),
			"lab_defect",
		);

		assert.equal(labDefectOrder.currentStage, "warranty_rework");
		assert.equal(labDefectOrder.isWarrantyRework, true);
		assert.equal(labDefectOrder.warrantyLiabilityType, "lab_defect");
		assert.equal(labDefectOrder.financials.patientPriceTotalKopecks, 0, "Пациент платит 0 ₽");
		assert.equal(labDefectOrder.financials.labCostKopecks, 0, "Себестоимость для клиники 0 ₽ (за счет ЗТЛ)");
		assert.equal(labDefectOrder.financials.warrantyLiabilityKopecks, 0);
		assert.equal(labDefectOrder.financials.clinicNetProfitKopecks, 0);
		assert.equal(labDefectOrder.financials.isBalanced, true);
	});
});
