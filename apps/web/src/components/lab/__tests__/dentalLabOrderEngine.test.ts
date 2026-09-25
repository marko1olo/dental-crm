import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	DENTAL_LAB_STATUS_ORDER,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapOrderStatusToCanonical5,
	mapCanonical5ToOrderStatus,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_NATURAL_DIE_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	VALID_FDI_TEETH,
	isValidFdiTooth,
	parseFdiTeethString,
	formatFdiTeethDisplay,
	calculateZtlWageFinancials,
	detectLabDeadlineAlert,
	getNextLabStatus,
	canTransitionLabStatus,
	createDentalLabOrderRecord,
	type DentalLabConstructionType,
	type DentalLabOrderStatus,
} from "../dentalLabOrderEngine";

describe("dentalLabOrderEngine: Стоматологический трекер нарядов ЗТЛ", () => {
	describe("1. Чистый каталог ортопедических конструкций ЗТЛ (без общемедицинского блоата)", () => {
		it("содержит ровно 6 ключевых стоматологических конструкций ортопедии и ортодонтии", () => {
			const expectedKeys: DentalLabConstructionType[] = [
				"crown_zirconia",
				"crown_emax",
				"metal_ceramic",
				"clasp_denture",
				"aligner_splint",
				"surgical_guide",
			];

			assert.deepEqual(Object.keys(DENTAL_LAB_CONSTRUCTIONS).sort(), expectedKeys.sort());

			// Проверка отсутствия общемедицинского блоата
			const namesAll = Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => c.nameRu.toLowerCase()).join(" ");
			assert.ok(!namesAll.includes("биохим"));
			assert.ok(!namesAll.includes("онкомаркер"));
			assert.ok(!namesAll.includes("цитолог"));
			assert.ok(!namesAll.includes("мазок"));
			assert.ok(!namesAll.includes("моч"));
		});

		it("каждая конструкция имеет корректные русские названия, сроки и целочисленные копейки", () => {
			for (const [key, c] of Object.entries(DENTAL_LAB_CONSTRUCTIONS)) {
				assert.equal(c.id, key);
				assert.ok(c.nameRu.length > 5, `Слишком короткое название у ${key}`);
				assert.ok(c.shortNameRu.length > 3, `Слишком короткое краткое название у ${key}`);
				assert.ok(c.standardTurnaroundDays > 0, `Некорректный срок у ${key}`);
				assert.ok(Number.isInteger(c.defaultPatientPriceKopecks), `Цена должна быть целым числом копеек у ${key}`);
				assert.ok(Number.isInteger(c.defaultZtlCostKopecks), `Себестоимость ЗТЛ должна быть целым числом копеек у ${key}`);
				assert.ok(
					c.defaultPatientPriceKopecks > c.defaultZtlCostKopecks,
					`Цена для пациента должна превышать себестоимость ЗТЛ у ${key}`,
				);
			}
		});
	});

	describe("2. Канонические статусы наряда ЗТЛ и переходы жизненного цикла", () => {
		it("содержит ровно 6 канонических статусов ЗТЛ", () => {
			const expectedStatuses: DentalLabOrderStatus[] = [
				"sent_to_lab",
				"in_progress",
				"ready_in_clinic",
				"try_in",
				"delivered_to_patient",
				"warranty_rework",
			];

			assert.deepEqual(DENTAL_LAB_STATUS_ORDER, expectedStatuses);
			assert.equal(DENTAL_LAB_STATUSES.sent_to_lab.labelRu, "Отправлен в ЗТЛ");
			assert.equal(DENTAL_LAB_STATUSES.in_progress.labelRu, "В работе");
			assert.equal(DENTAL_LAB_STATUSES.ready_in_clinic.labelRu, "Готов / В клинике");
			assert.equal(DENTAL_LAB_STATUSES.try_in.labelRu, "Примерка");
			assert.equal(DENTAL_LAB_STATUSES.delivered_to_patient.labelRu, "Сдан пациенту");
			assert.equal(DENTAL_LAB_STATUSES.warranty_rework.labelRu, "Переделка (гарантия)");
		});

		it("getNextLabStatus последовательно продвигает наряд по клиническому маршруту", () => {
			assert.equal(getNextLabStatus("sent_to_lab"), "in_progress");
			assert.equal(getNextLabStatus("in_progress"), "ready_in_clinic");
			assert.equal(getNextLabStatus("ready_in_clinic"), "try_in");
			assert.equal(getNextLabStatus("try_in"), "delivered_to_patient");
			assert.equal(getNextLabStatus("delivered_to_patient"), null);
			assert.equal(getNextLabStatus("warranty_rework"), "sent_to_lab");
		});

		it("canTransitionLabStatus поддерживает гибкие переходы и гарантийную рекламацию", () => {
			assert.ok(canTransitionLabStatus("sent_to_lab", "in_progress"));
			assert.ok(canTransitionLabStatus("delivered_to_patient", "warranty_rework"));
			assert.ok(canTransitionLabStatus("try_in", "warranty_rework"));
			assert.ok(canTransitionLabStatus("warranty_rework", "sent_to_lab"));
		});

		it("поддерживает 5 канонических статусов (CANONICAL_5_CLINICAL_LAB_STATUSES) и взаимный маппинг", () => {
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[0].id, "sent");
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[1].id, "in_progress");
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[2].id, "fitting");
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[3].id, "ready");
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[4].id, "completed");

			assert.equal(mapOrderStatusToCanonical5("sent_to_lab"), "sent");
			assert.equal(mapOrderStatusToCanonical5("in_progress"), "in_progress");
			assert.equal(mapOrderStatusToCanonical5("try_in"), "fitting");
			assert.equal(mapOrderStatusToCanonical5("ready_in_clinic"), "ready");
			assert.equal(mapOrderStatusToCanonical5("delivered_to_patient"), "completed");

			assert.equal(mapCanonical5ToOrderStatus("sent"), "sent_to_lab");
			assert.equal(mapCanonical5ToOrderStatus("in_progress"), "in_progress");
			assert.equal(mapCanonical5ToOrderStatus("fitting"), "try_in");
			assert.equal(mapCanonical5ToOrderStatus("ready"), "ready_in_clinic");
			assert.equal(mapCanonical5ToOrderStatus("completed"), "delivered_to_patient");
		});
	});

	describe("3. Зубная формула FDI (11–48) и валидация", () => {
		it("проверяет корректность номеров зубов взрослого прикуса", () => {
			assert.ok(isValidFdiTooth(11));
			assert.ok(isValidFdiTooth(16));
			assert.ok(isValidFdiTooth(24));
			assert.ok(isValidFdiTooth(36));
			assert.ok(isValidFdiTooth(48));

			// Несуществующие номера зубов
			assert.ok(!isValidFdiTooth(10));
			assert.ok(!isValidFdiTooth(19));
			assert.ok(!isValidFdiTooth(29));
			assert.ok(!isValidFdiTooth(99));
			assert.equal(VALID_FDI_TEETH.size, 32);
		});

		it("parseFdiTeethString парсит одиночные зубы, списки и диапазоны", () => {
			assert.deepEqual(parseFdiTeethString("16"), [16]);
			assert.deepEqual(parseFdiTeethString("11, 21, 22"), [11, 21, 22]);
			assert.deepEqual(parseFdiTeethString("46; 47 48"), [46, 47, 48]);
			assert.deepEqual(parseFdiTeethString("11, 11, 21"), [11, 21]); // исключение дубликатов
			assert.deepEqual(parseFdiTeethString("не_зуб, 99"), []);
		});

		it("formatFdiTeethDisplay форматирует зубы для вывода в карточке", () => {
			assert.equal(formatFdiTeethDisplay([16]), "16");
			assert.equal(formatFdiTeethDisplay([11, 21]), "11, 21");
			assert.equal(formatFdiTeethDisplay([]), "—");
			assert.equal(formatFdiTeethDisplay("14, 15"), "14, 15");
		});
	});

	describe("4. Шкалы расцветки VITA, Bleach, прозрачность и культя", () => {
		it("содержит все 16 классических оттенков VITA A1–D4", () => {
			assert.equal(VITA_CLASSICAL_SHADES.length, 16);
			assert.ok(VITA_CLASSICAL_SHADES.includes("A1"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("A2"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("A3"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("A3.5"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("B1"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("C2"));
			assert.ok(VITA_CLASSICAL_SHADES.includes("D3"));
		});

		it("содержит ультрасветлые оттенки Bleach (BL1–BL4, 0M1–0M3)", () => {
			assert.ok(VITA_BLEACH_SHADES.includes("BL1"));
			assert.ok(VITA_BLEACH_SHADES.includes("BL2"));
			assert.ok(VITA_BLEACH_SHADES.includes("BL3"));
			assert.ok(VITA_BLEACH_SHADES.includes("BL4"));
			assert.ok(VITA_BLEACH_SHADES.includes("0M1"));
		});

		it("содержит градации прозрачности эмали и оттенки культи ND1–ND9", () => {
			assert.equal(ENAMEL_TRANSLUCENCY_OPTIONS.length, 5);
			assert.ok(ENAMEL_TRANSLUCENCY_OPTIONS.some((t) => t.id === "HT"));
			assert.ok(ENAMEL_TRANSLUCENCY_OPTIONS.some((t) => t.id === "LT"));

			assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9);
			assert.equal(STUMP_NATURAL_DIE_SHADES[0]?.id, "ND1");
			assert.equal(STUMP_NATURAL_DIE_SHADES[8]?.id, "ND9");
		});
	});

	describe("5. Финансовый расчет: вычет себестоимости ЗТЛ из сдельной базы врача", () => {
		it("вычитает себестоимость ЗТЛ из выручки и рассчитывает ЗП врача строго в копейках", () => {
			// 1 коронка цирконий: Пациент 24 000 руб (2 400 000 коп), Себестоимость ЗТЛ 7 500 руб (750 000 коп), Врач 20%
			const fin = calculateZtlWageFinancials({
				unitsCount: 1,
				patientPriceKopecks: 2400000,
				ztlCostKopecks: 750000,
				doctorSharePercent: 20,
			});

			assert.equal(fin.patientPriceKopecks, 2400000);
			assert.equal(fin.ztlCostKopecks, 750000);
			// База врача = 24 000 - 7 500 = 16 500 руб (1 650 000 коп)
			assert.equal(fin.doctorWageBaseKopecks, 1650000);
			// ЗП врача 20% от 16 500 = 3 300 руб (330 000 коп)
			assert.equal(fin.doctorWageKopecks, 330000);
			// Маржа клиники = 16 500 - 3 300 = 13 200 руб (1 320 000 коп)
			assert.equal(fin.clinicMarginKopecks, 1320000);

			// Инвариант нулевого копеечного дрейфа (Zero Penny-Drift)
			assert.ok(fin.isBalanced);
			assert.equal(fin.doctorWageKopecks + fin.clinicMarginKopecks, fin.doctorWageBaseKopecks);
			assert.equal(fin.patientPriceRub, 24000);
			assert.equal(fin.ztlCostRub, 7500);
			assert.equal(fin.doctorWageRub, 3300);
			assert.equal(fin.clinicMarginRub, 13200);
		});

		it("корректно масштабирует финансовый расчет на несколько единиц коронок (мост из 3 единиц)", () => {
			const fin = calculateZtlWageFinancials({
				unitsCount: 3,
				patientPriceRub: 25000,
				ztlCostRub: 8000,
				doctorSharePercent: 25,
			});

			// 3 * 25 000 = 75 000 руб
			assert.equal(fin.patientPriceRub, 75000);
			// 3 * 8 000 = 24 000 руб
			assert.equal(fin.ztlCostRub, 24000);
			// База врача = 75 000 - 24 000 = 51 000 руб
			assert.equal(fin.doctorWageBaseRub, 51000);
			// ЗП врача 25% от 51 000 = 12 750 руб
			assert.equal(fin.doctorWageRub, 12750);
			// Клиника = 51 000 - 12 750 = 38 250 руб
			assert.equal(fin.clinicMarginRub, 38250);
			assert.ok(fin.isBalanced);
		});
	});

	describe("6. Алерты дедлайнов и критический контроль непоступления работы в клинику", () => {
		const fixedToday = "2026-09-25";

		it("срабатывает КРИТИЧЕСКИЙ АЛЕРТ «Работа из ЗТЛ еще не поступила в клинику!», если визит назначен на сегодня, а статус «В работе»", () => {
			const alert = detectLabDeadlineAlert({
				status: "in_progress",
				deadlineDate: "2026-09-25",
				scheduledVisitDate: "2026-09-25", // Визит назначен на СЕГОДНЯ!
				todayDate: fixedToday,
				patientName: "Барабаш С.В.",
				toothNotation: "16",
			});

			assert.ok(alert.hasAlert);
			assert.ok(alert.isDelayedAlert);
			assert.equal(alert.severity, "CRITICAL_TODAY");
			assert.ok(alert.badgeTextRu.includes("Работа еще не поступила в клинику"));
			assert.ok(alert.messageRu.includes("⚠️ Работа из ЗТЛ еще не поступила в клинику!"));
			assert.ok(alert.messageRu.includes("Барабаш С.В."));
			assert.ok(alert.messageRu.includes("16"));
		});

		it("срабатывает критический алерт, если статус «Отправлен в ЗТЛ», а визит уже сегодня", () => {
			const alert = detectLabDeadlineAlert({
				status: "sent_to_lab",
				deadlineDate: "2026-09-26",
				scheduledVisitDate: "2026-09-25",
				todayDate: fixedToday,
				patientName: "Смирнова Е.А.",
			});

			assert.ok(alert.hasAlert);
			assert.equal(alert.severity, "CRITICAL_TODAY");
		});

		it("выставляет алерт OVERDUE, если дедлайн просрочен, а работа все еще в производстве", () => {
			const alert = detectLabDeadlineAlert({
				status: "in_progress",
				deadlineDate: "2026-09-20", // 5 дней назад
				scheduledVisitDate: "2026-09-28", // визит на следующей неделе
				todayDate: fixedToday,
			});

			assert.ok(alert.hasAlert);
			assert.ok(alert.isDelayedAlert);
			assert.equal(alert.severity, "OVERDUE");
			assert.ok(alert.badgeTextRu.includes("Просрочено ЗТЛ на 5 дн."));
		});

		it("не выставляет критический алерт, если статус «Готов / В клинике»", () => {
			const alert = detectLabDeadlineAlert({
				status: "ready_in_clinic",
				deadlineDate: "2026-09-25",
				scheduledVisitDate: "2026-09-25",
				todayDate: fixedToday,
			});

			assert.ok(!alert.hasAlert);
			assert.ok(!alert.isDelayedAlert);
			assert.equal(alert.severity, "OK");
			assert.equal(alert.badgeTextRu, "В клинике (Готов)");
		});

		it("не выставляет алерт, если заказ успешно «Сдан пациенту»", () => {
			const alert = detectLabDeadlineAlert({
				status: "delivered_to_patient",
				deadlineDate: "2026-09-20",
				todayDate: fixedToday,
			});

			assert.ok(!alert.hasAlert);
			assert.equal(alert.severity, "OK");
			assert.equal(alert.badgeTextRu, "Сдан пациенту");
		});
	});

	describe("7. Фабрика нарядов ЗТЛ createDentalLabOrderRecord", () => {
		it("создает полный наряд ЗТЛ с каноническими дефолтами и расчетом финансов", () => {
			const order = createDentalLabOrderRecord({
				patientName: "Кузнецов И.П.",
				doctorName: "Д-р Орлов А.В.",
				labName: "ArtDent Премиум Лаб",
				teethFdi: [21, 22],
				constructionType: "crown_emax",
				vitaShade: "A1",
			});

			assert.ok(order.id.startsWith("ztl-ord-"));
			assert.ok(order.orderNumber.startsWith("ЗТЛ-"));
			assert.equal(order.patientName, "Кузнецов И.П.");
			assert.equal(order.doctorName, "Д-р Орлов А.В.");
			assert.equal(order.labName, "ArtDent Премиум Лаб");
			assert.deepEqual(order.teethFdi, [21, 22]);
			assert.equal(order.constructionType, "crown_emax");
			assert.equal(order.vitaShade, "A1");
			assert.equal(order.status, "sent_to_lab");

			// 2 единицы e.max: 2 * 26 000 = 52 000 руб = 5 200 000 коп
			assert.equal(order.patientPriceKopecks, 5200000);
			// 2 * 8 500 = 17 000 руб = 1 700 000 коп
			assert.equal(order.ztlCostKopecks, 1700000);
		});
	});
});
