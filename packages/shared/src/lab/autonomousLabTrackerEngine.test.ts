import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createAutonomousLabOrder,
	advanceLabOrderStage,
	evaluateLabSlaRisk,
	anonymizePatientForExternalLab,
	generateLabQrPayload,
	verifyLabQrPayload,
	formatLabTelegramAlert,
	type AutonomousLabOrder,
} from "./autonomousLabTrackerEngine.js";

describe("autonomousLabTrackerEngine («Лаба в кармане»)", () => {
	it("создает заказ-наряд с деперсонализацией ПДн по 152-ФЗ", () => {
		const order = createAutonomousLabOrder({
			organizationId: "org_test_1",
			branchName: "Филиал Арбат",
			patientFullName: "Константинопольский Александр Сергеевич",
			doctorName: "Др. Смирнов А.В.",
			doctorTelegramChatId: "tg_doctor_123",
			labName: "ЗТЛ ДенталАрт",
			labTelegramChatId: "tg_lab_456",
			teethFdi: [16, 17],
			constructionType: "bridge",
			material: "zirconia_multilayer",
			vitaShade: "A2",
			impressionType: "digital_scan",
			patientAppointmentAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
			clinicTrayNumber: "Лоток №4 (Полка Б)",
		});

		assert.ok(order.orderId.startsWith("lab_"));
		assert.match(order.orderRef, /^L-[A-Z0-9]{5}$/);
		assert.equal(order.currentStage, "created");
		assert.equal(order.clinicTrayNumber, "Лоток №4 (Полка Б)");

		// Проверка 152-ФЗ: фамилия и отчество замаскированы
		assert.equal(order.patientToken.tokenizedInitials, "К***й А. С.");
		assert.equal(order.patientToken.anonymizedSaltedHash.length, 64);
		assert.equal(order.history.length, 1);
		assert.equal(order.history[0]?.actorRole, "doctor");
	});

	it("соблюдает матрицу ролей при переходах этапов (Role-Based State Machine)", () => {
		const order = createAutonomousLabOrder({
			organizationId: "org_test_1",
			patientFullName: "Иванов Иван Иванович",
			doctorName: "Др. Петров",
			labName: "ЗТЛ Премиум",
			teethFdi: [21],
			constructionType: "single_crown",
			material: "emax_lithium_disilicate",
			vitaShade: "A1",
			impressionType: "a_silicone",
			patientAppointmentAt: new Date(Date.now() + 96 * 3600 * 1000).toISOString(),
		});

		// 1. Назначение курьера администратором или врачом
		const step1 = advanceLabOrderStage(order, "courier_assigned", "clinic_admin", "Администратор Анна", {
			notes: "Слепочный бокс передан на ресепшн",
		});
		assert.equal(step1.currentStage, "courier_assigned");

		// 2. Курьер забрал слепок в клинике
		const step2 = advanceLabOrderStage(step1, "in_transit_to_lab", "courier", "Курьер Руслан");
		assert.equal(step2.currentStage, "in_transit_to_lab");

		// 3. Недопустимое действие: курьер НЕ может перевести заказ сразу в ready_in_lab (минуя ЗТЛ)
		assert.throws(() => {
			advanceLabOrderStage(step2, "ready_in_lab", "courier", "Курьер Руслан");
		}, /Недопустимый переход этапа/);

		// 4. Техник принял слепок в ЗТЛ
		const step3 = advanceLabOrderStage(step2, "received_by_lab", "technician", "Техник Дмитрий");
		assert.equal(step3.currentStage, "received_by_lab");

		// 5. Врач не может перевести заказ в in_production (только техник!)
		assert.throws(() => {
			advanceLabOrderStage(step3, "in_production", "doctor", "Др. Петров");
		}, /Роль 'doctor' не имеет прав/);

		// 6. Техник взял в производство
		const step4 = advanceLabOrderStage(step3, "in_production", "technician", "Техник Дмитрий");
		assert.equal(step4.currentStage, "in_production");

		// 7. Техник завершил работу (готов в ЗТЛ)
		const step5 = advanceLabOrderStage(step4, "ready_in_lab", "technician", "Техник Дмитрий");
		assert.equal(step5.currentStage, "ready_in_lab");

		// 8. Доставка в клинику и помещение в лоток
		const step6 = advanceLabOrderStage(step5, "delivered_to_clinic", "clinic_admin", "Администратор Анна", {
			assignedTray: "Лоток №12",
			notes: "Работа проверена, сколов нет",
		});
		assert.equal(step6.currentStage, "delivered_to_clinic");
		assert.equal(step6.clinicTrayNumber, "Лоток №12");

		// 9. Врач сдал работу пациенту в кресле
		const step7 = advanceLabOrderStage(step6, "fitted_to_patient", "doctor", "Др. Петров");
		assert.equal(step7.currentStage, "fitted_to_patient");
		assert.equal(step7.slaRiskLevel, "safe");
	});

	it("точно вычисляет риски срыва дедлайна SLA до приёма пациента", () => {
		const baseOrder: AutonomousLabOrder = createAutonomousLabOrder({
			organizationId: "org_test_1",
			patientFullName: "Сидорова Елена",
			doctorName: "Др. Сидоров",
			labName: "ЗТЛ Орто",
			teethFdi: [46],
			constructionType: "single_crown",
			material: "zirconia_multilayer",
			vitaShade: "A3",
			impressionType: "digital_scan",
			patientAppointmentAt: new Date(Date.now() + 60 * 3600 * 1000).toISOString(),
		});

		const now = new Date();

		// Сценарий 1: До приёма 60 часов -> safe
		assert.equal(evaluateLabSlaRisk(baseOrder, now), "safe");

		// Сценарий 2: До приёма 30 часов -> warning_approaching
		const order30h = {
			...baseOrder,
			patientAppointmentAt: new Date(now.getTime() + 30 * 3600 * 1000).toISOString(),
		};
		assert.equal(evaluateLabSlaRisk(order30h, now), "warning_approaching");

		// Сценарий 3: До приёма 12 часов, а работа еще в ЗТЛ -> critical_under_24h
		const order12h = {
			...baseOrder,
			currentStage: "in_production" as const,
			patientAppointmentAt: new Date(now.getTime() + 12 * 3600 * 1000).toISOString(),
		};
		assert.equal(evaluateLabSlaRisk(order12h, now), "critical_under_24h");

		// Сценарий 4: Приём уже наступил, а работа не доставлена -> breached_overdue
		const orderOverdue = {
			...baseOrder,
			currentStage: "in_transit_to_clinic" as const,
			patientAppointmentAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
		};
		assert.equal(evaluateLabSlaRisk(orderOverdue, now), "breached_overdue");

		// Сценарий 5: Работа уже в клинике -> всегда safe
		const orderDelivered = {
			...orderOverdue,
			currentStage: "delivered_to_clinic" as const,
		};
		assert.equal(evaluateLabSlaRisk(orderDelivered, now), "safe");
	});

	it("генерирует и проверяет защищенный HMAC QR-код стикера коробки", () => {
		const orderRef = "L-AB982";
		const secretKey = "super-secret-clinic-key-321";

		const payload = generateLabQrPayload(orderRef, secretKey);
		assert.ok(payload.startsWith(`DNT-LAB:${orderRef}:`));

		// Валидный QR код верифицируется успешно
		assert.equal(verifyLabQrPayload(payload, orderRef, secretKey), true);

		// Поддельный QR код (другой orderRef) отклоняется
		assert.equal(verifyLabQrPayload(payload, "L-FAKE0", secretKey), false);

		// Поддельный ключ отклоняется
		assert.equal(verifyLabQrPayload(payload, orderRef, "wrong-key"), false);
	});

	it("форматирует специализированные оповещения для Telegram бота", () => {
		const order = createAutonomousLabOrder({
			organizationId: "org_test_1",
			patientFullName: "Соколова Марина Петровна",
			doctorName: "Др. Козлов",
			labName: "ЗТЛ Эстетик",
			teethFdi: [11],
			constructionType: "veneer",
			material: "emax_lithium_disilicate",
			vitaShade: "B1",
			impressionType: "digital_scan",
			patientAppointmentAt: "2026-10-15T14:30:00.000Z",
			clinicTrayNumber: "Лоток №7",
		});

		const deliveredOrder = {
			...order,
			currentStage: "delivered_to_clinic" as const,
		};

		const docMsg = formatLabTelegramAlert(deliveredOrder, "doctor");
		assert.ok(docMsg.includes("Работа прибыла в клинику!"));
		assert.ok(docMsg.includes("С***а М. П."));
		assert.ok(docMsg.includes("Лоток №7"));
		assert.ok(docMsg.includes("Зубы: 11"));

		const techMsg = formatLabTelegramAlert(order, "technician");
		assert.ok(techMsg.includes("Наряд #"));
		assert.ok(techMsg.includes("Врач: Др. Козлов"));

		const courierMsg = formatLabTelegramAlert(order, "courier");
		assert.ok(courierMsg.includes("Заказ #"));
		assert.ok(courierMsg.includes("Куда: Основной филиал"));
	});
});
