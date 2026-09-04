/**
 * dentalLabWorkflowEngine.test.ts — Модульные тесты для движка зуботехнической лаборатории (ЗТЛ).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ORTHOPEDIC_WORK_TYPES,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	LAB_PRODUCTION_STAGES,
	LAB_PRODUCTION_STAGE_ORDER,
	canAdvanceLabStage,
	getNextLabProductionStage,
	addWorkingDaysRu,
	formatDateToIsoDay,
	formatRussianDate,
	checkLabDeadlineAndAlert,
	calculateLabWorkflowFinancials,
	createDentalLabOrder,
	advanceLabOrderStage,
	generateOdontogramSvg,
	generateBarcodeSvg,
	generateQrCodeSvg,
	generateDentalLabOrderA4PrintBlank,
	exportDentalLabOrdersToCsv,
	sendOrderToWarrantyRework,
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
			assert.ok(Number.isInteger(def.defaultPriceKopecks) && def.defaultPriceKopecks > 0, `Цена ${id} должна быть целыми копейками`);
			assert.ok(Number.isInteger(def.defaultCostKopecks) && def.defaultCostKopecks > 0, `Себестоимость ${id} должна быть целыми копейками`);
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

		// Проверка соответствия алиасов
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
		assert.equal(canAdvanceLabStage("fitting_scheduled", "sent_to_lab"), true); // возврат на доработку в ЗТЛ
	});

	test("getNextLabProductionStage возвращает следующий клинический статус или null для финального", () => {
		assert.equal(getNextLabProductionStage("draft"), "sent_to_lab");
		assert.equal(getNextLabProductionStage("sent_to_lab"), "fitting_scheduled");
		assert.equal(getNextLabProductionStage("fitting_scheduled"), "installed_completed");
		assert.equal(getNextLabProductionStage("installed_completed"), null);
	});
});

describe("3. Date Utilities & Working Days Math", () => {
	test("addWorkingDaysRu пропускает субботу и воскресенье", () => {
		// Пятница: 2026-08-28
		const friday = new Date(2026, 7, 28);
		// +1 рабочий день должен быть понедельник 2026-08-31
		const monday = addWorkingDaysRu(friday, 1);
		assert.equal(monday.getDay(), 1, "Должен быть понедельник");
		assert.equal(monday.getDate(), 31);

		// +5 рабочих дней от пятницы: пн(31), вт(1), ср(2), чт(3), пт(4)
		const nextFriday = addWorkingDaysRu(friday, 5);
		assert.equal(nextFriday.getDay(), 5, "Должна быть следующая пятница");
		assert.equal(nextFriday.getDate(), 4);
		assert.equal(nextFriday.getMonth(), 8); // Сентябрь
	});

	test("formatDateToIsoDay и formatRussianDate форматируют даты", () => {
		const d = new Date(2026, 7, 28);
		const iso = formatDateToIsoDay(d);
		assert.equal(iso, "2026-08-28");
		const ru = formatRussianDate(iso);
		assert.equal(ru, "28.08.2026");
	});
});

describe("4. Deadline Detection, fittingDate & isDelayedAlert Engine", () => {
	const baseDate = new Date(2026, 7, 28); // 28.08.2026

	test("Возвращает ON_TRACK, когда срок ЗТЛ в будущем и примерка назначена после готовности", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 8, 5), // 05.09.2026
			fittingDate: new Date(2026, 8, 6),     // 06.09.2026 (после ЗТЛ)
			appointmentId: "appt-100",
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, false);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.lab_delay_alert, false);
		assert.equal(alert.status, "ON_TRACK");
		assert.equal(alert.severity, "OK");
		assert.equal(alert.appointmentId, "appt-100");
		assert.ok(alert.daysDifference > 0);
	});

	test("Возвращает VISIT_CONFLICT и isDelayedAlert=true, если готовность ЗТЛ ПОЗЖЕ даты примерки (fittingDate)", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 8, 10), // ЗТЛ сдаст 10 сентября
			fittingDate: new Date(2026, 8, 5),     // Пациент записан на примерку 5 сентября!
			appointmentId: "appt-101",
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, true);
		assert.equal(alert.lab_delay_alert, true);
		assert.equal(alert.status, "VISIT_CONFLICT");
		assert.equal(alert.severity, "CRITICAL");
		assert.ok(alert.alertMessageRu.includes("КРИТИЧЕСКИЙ КОНФЛИКТ"));
		assert.ok(alert.recommendedActionRu.includes("переноса визита"));
	});

	test("Возвращает OVERDUE и isDelayedAlert=true, если текущая дата превысила срок готовности ЗТЛ", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 25), // Срок ЗТЛ был 25 августа
			fittingDate: new Date(2026, 8, 1),
			currentDate: baseDate, // Сегодня 28 августа
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, true);
		assert.equal(alert.lab_delay_alert, true);
		assert.equal(alert.status, "OVERDUE");
		assert.equal(alert.severity, "CRITICAL");
		assert.ok(alert.daysDifference < 0);
		assert.ok(alert.alertMessageRu.includes("ПРОСРОЧЕНО ЗТЛ"));
	});

	test("Возвращает URGENT_TODAY, если срок готовности ЗТЛ сегодня", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 28), // Сегодня
			currentDate: baseDate,
			isInstalledOrCompleted: false,
		});

		assert.equal(alert.hasAlert, true);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.status, "URGENT_TODAY");
		assert.equal(alert.severity, "WARNING");
		assert.equal(alert.daysDifference, 0);
	});

	test("Если заказ уже сдан пациенту (isInstalledOrCompleted), задержка не выставляется", () => {
		const alert = checkLabDeadlineAndAlert({
			expectedLabDate: new Date(2026, 7, 20),
			fittingDate: new Date(2026, 7, 15),
			currentDate: baseDate,
			isInstalledOrCompleted: true,
		});

		assert.equal(alert.hasAlert, false);
		assert.equal(alert.isDelayedAlert, false);
		assert.equal(alert.status, "ON_TRACK");
		assert.equal(alert.severity, "OK");
	});
});

describe("5. Integer-Kopeck Financial Accounting & Doctor Piece-Rate Clearing", () => {
	test("Рассчитывает себестоимость ЗТЛ в целочисленных копейках и вычитает из сдельной базы врача", () => {
		// 2 единицы коронки E.max: цена 24 000 руб (2 400 000 коп), себестоимость ЗТЛ 8 000 руб (800 000 коп), ЗП врача 25%
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 2,
			pricePerUnitKopecks: 2400000,
			costPerUnitKopecks: 800000,
			doctorPercent: 25,
		});

		assert.equal(fin.unitsCount, 2);
		assert.equal(fin.patientPriceTotalKopecks, 4800000); // 48 000 руб
		assert.equal(fin.labCostKopecks, 1600000);           // 16 000 руб себестоимость ЗТЛ
		assert.equal(fin.labCostTotalKopecks, 1600000);
		assert.equal(fin.clinicGrossMarginKopecks, 3200000); // 32 000 руб маржа клиники
		assert.equal(fin.grossMarginPercent, 66.7);

		// База для ЗП врача = Маржа (48 000 - 16 000 = 32 000 руб = 3 200 000 коп)
		assert.equal(fin.doctorWageBaseKopecks, 3200000);
		assert.equal(fin.doctorWageKopecks, 800000); // 25% от 32 000 = 8 000 руб = 800 000 коп
		assert.equal(fin.clinicNetProfitKopecks, 2400000); // 32 000 - 8 000 = 24 000 руб = 2 400 000 коп

		// Проверка строгой сбалансированности (Zero Penny-Drift)
		assert.equal(fin.isBalanced, true);
		assert.equal(fin.doctorWageKopecks + fin.clinicNetProfitKopecks, fin.doctorWageBaseKopecks);

		// Рублевые поля
		assert.equal(fin.patientPriceTotalRub, 48000);
		assert.equal(fin.labCostTotalRub, 16000);
		assert.equal(fin.clinicGrossMarginRub, 32000);
		assert.equal(fin.doctorWageRub, 8000);
		assert.equal(fin.clinicNetProfitRub, 24000);
	});

	test("Корректно обрабатывает ввод в рублях с переводом в целочисленные копейки", () => {
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 1,
			pricePerUnitRub: 22000,
			costPerUnitRub: 7000,
			doctorPercent: 20,
		});

		assert.equal(fin.patientPriceTotalKopecks, 2200000);
		assert.equal(fin.labCostKopecks, 700000);
		assert.equal(fin.clinicGrossMarginKopecks, 1500000);
		assert.equal(fin.doctorWageKopecks, 300000); // 20% от 15 000 = 3 000 руб
		assert.equal(fin.clinicNetProfitKopecks, 1200000);
		assert.equal(fin.isBalanced, true);
	});

	test("Защита от отрицательной маржи и нулевых значений", () => {
		const fin = calculateLabWorkflowFinancials({
			unitsCount: 1,
			pricePerUnitRub: 5000,
			costPerUnitRub: 6000, // Себестоимость выше цены
			doctorPercent: 20,
		});

		assert.equal(fin.clinicGrossMarginKopecks, 0);
		assert.equal(fin.doctorWageKopecks, 0);
		assert.equal(fin.clinicNetProfitKopecks, 0);
		assert.equal(fin.isBalanced, true);
	});
});

describe("6. Lab Order Factory & 4-Stage Transitions", () => {
	test("createDentalLabOrder создает наряд со всеми полями, fittingDate и appointmentId", () => {
		const order = createDentalLabOrder({
			patientId: "pat-1",
			patientName: "Смирнова Е. А.",
			patientChartNumber: "043/у-100",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев С. П.",
			clinicName: "Клиника DENTE",
			labName: "CAD/CAM Центр",
			workTypeId: "crown_emax",
			selectedTeeth: [11, 21],
			shadeCode: "A2",
			stumpShadeCode: "ND2",
			pricePerUnitRub: 24000,
			costPerUnitRub: 8000,
			doctorPercent: 25,
			fittingDate: "2026-09-05",
			appointmentId: "appt-9901",
			initialStatus: "draft",
		});

		assert.ok(order.id.startsWith("ztl-ord-"));
		assert.ok(order.orderNumber.startsWith("ЗТЛ-"));
		assert.equal(order.patientName, "Смирнова Е. А.");
		assert.equal(order.workTypeId, "crown_emax");
		assert.deepEqual(order.selectedTeeth, [11, 21]);
		assert.equal(order.currentStage, "draft");
		assert.equal(order.fittingDate, "2026-09-05");
		assert.equal(order.appointmentId, "appt-9901");
		assert.equal(order.stageHistory.length, 1);
		assert.equal(order.financials.unitsCount, 2);
		assert.equal(order.financials.labCostKopecks, 1600000);
		assert.equal(order.financials.patientPriceTotalRub, 48000);
		assert.equal(order.financials.labCostTotalRub, 16000);
		assert.equal(typeof order.isDelayedAlert, "boolean");
	});

	test("advanceLabOrderStage переводит наряд по 4 клиническим статусам", () => {
		const order = createDentalLabOrder({
			patientId: "pat-1",
			patientName: "Смирнова Е. А.",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев",
			workTypeId: "crown_emax",
			selectedTeeth: [11],
			initialStatus: "draft",
		});

		assert.equal(order.currentStage, "draft");

		// 1 -> 2: sent_to_lab
		const s2 = advanceLabOrderStage(order, "sent_to_lab", "Курьер ЗТЛ", "Передано в лабораторию");
		assert.equal(s2.currentStage, "sent_to_lab");
		assert.equal(s2.stageHistory.length, 2);

		// 2 -> 3: fitting_scheduled
		const s3 = advanceLabOrderStage(s2, "fitting_scheduled", "Администратор", "Назначена примерка на 05.09.2026");
		assert.equal(s3.currentStage, "fitting_scheduled");
		assert.equal(s3.stageHistory.length, 3);

		// 3 -> 4: installed_completed
		const s4 = advanceLabOrderStage(s3, "installed_completed", "Д-р Ковалев", "Коронка зафиксирована на RelyX U200");
		assert.equal(s4.currentStage, "installed_completed");
		assert.equal(s4.stageHistory.length, 4);
		assert.equal(s4.isDelayedAlert, false);
	});
});

describe("7. Vector SVG Generators (Одонтограмма, Barcode, QR)", () => {
	test("generateOdontogramSvg генерирует SVG с выбранными зубами", () => {
		const svg = generateOdontogramSvg([11, 21, 46]);
		assert.ok(svg.includes("<svg"), "Должен быть тег svg");
		assert.ok(svg.includes("11"), "Должен содержать зуб 11");
		assert.ok(svg.includes("21"), "Должен содержать зуб 21");
		assert.ok(svg.includes("46"), "Должен содержать зуб 46");
		assert.ok(svg.includes("fill=\"#0d9488\""), "Выбранные зубы должны подсвечиваться teal");
	});

	test("generateBarcodeSvg генерирует векторный штрихкод Code128", () => {
		const svg = generateBarcodeSvg("ЗТЛ-2026/08-1042", 240, 50);
		assert.ok(svg.includes("<svg"));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("ЗТЛ-2026/08-1042"));
	});

	test("generateQrCodeSvg генерирует матричный QR-код", () => {
		const svg = generateQrCodeSvg("DENTE-ZTL:1042", 90);
		assert.ok(svg.includes("<svg"));
		assert.ok(svg.includes("viewBox=\"0 0 90 90\""));
		assert.ok(svg.includes("<rect"));
	});
});

describe("8. A4 Printable Blank for Courier & CSV Export", () => {
	const sampleOrder = createDentalLabOrder({
		patientId: "pat-1",
		patientName: "Барабаш Сергей Владимирович",
		patientChartNumber: "043/у-7711",
		doctorId: "doc-1",
		doctorName: "Д-р Ковалев С. П.",
		clinicName: "Клиника DENTE",
		labName: "CAD/CAM Центр Дентал-Мастер",
		workTypeId: "crown_emax",
		selectedTeeth: [11, 21],
		shadeCode: "A2",
		stumpShadeCode: "ND2",
		pricePerUnitRub: 24000,
		costPerUnitRub: 8000,
		fittingDate: "2026-09-04",
		appointmentId: "appt-7701",
		clinicalNotes: "Индивидуальный придесневой контур",
	});

	test("generateDentalLabOrderA4PrintBlank генерирует полный валидный HTML бланк А4 для курьера", () => {
		const html = generateDentalLabOrderA4PrintBlank(sampleOrder);
		const normalizedHtml = html.replace(/[\u00a0\u202f]/g, " ");
		assert.ok(html.includes("<!DOCTYPE html>"), "Должен быть DOCTYPE html");
		assert.ok(html.includes("Наряд-заказ"), "Должен быть заголовок");
		assert.ok(html.includes(sampleOrder.orderNumber), "Должен содержать номер наряда");
		assert.ok(html.includes("Барабаш Сергей Владимирович"), "Должен содержать имя пациента");
		assert.ok(html.includes("Д-р Ковалев С. П."), "Должен содержать врача");
		assert.ok(html.includes("CAD/CAM Центр Дентал-Мастер"), "Должен содержать лабораторию");
		assert.ok(normalizedHtml.includes("48 000 ₽"), "Должен содержать общую стоимость");
		assert.ok(normalizedHtml.includes("16 000 ₽"), "Должен содержать себестоимость ЗТЛ");
		assert.ok(html.includes("Индивидуальный придесневой контур"), "Должен содержать примечания");
		assert.ok(html.includes("Курьер (Принял / Передал)"), "Должен содержать блок подписи курьера");
		assert.ok(html.includes("Примерка"), "Должен содержать статус примерки");
	});

	test("exportDentalLabOrdersToCsv генерирует корректный CSV с BOM и колонками примерки и себестоимости", () => {
		const csv = exportDentalLabOrdersToCsv([sampleOrder]);
		assert.ok(csv.startsWith("\uFEFF"), "Должен начинаться с UTF-8 BOM");
		assert.ok(csv.includes("Номер наряда;Пациент;№ Медкарты;Врач-ортопед;Лаборатория"));
		assert.ok(csv.includes("Дата примерки;ID Приема"));
		assert.ok(csv.includes(sampleOrder.orderNumber));
		assert.ok(csv.includes("Барабаш Сергей Владимирович"));
		assert.ok(csv.includes("CAD/CAM Центр Дентал-Мастер"));
		assert.ok(csv.includes("48000"));
		assert.ok(csv.includes("16000"));
	});
});

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
	});
});

