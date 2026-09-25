import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	generateBatchForm257Records,
	exportForm257ToCsv,
	generateForm257PrintHtml,
	generateRegulatorySanpinInspectionHtml,
	filterForm257Records,
	type Form257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
} from "../components/sanpin/autoclaveLog/autoclaveLogEngine.js";

describe("Sterilization Form 257/u Batch Reporting & Backoffice Archival (СанПиН 3.3686-21)", () => {
	it("1. генерирует нормативный батч циклов автоклавирования за Сентябрь 2026 г. (26 рабочих дней, 52 цикла)", () => {
		const records = generateBatchForm257Records({
			startDate: "2026-09-01",
			endDate: "2026-09-30",
			excludeSundays: true,
			cyclesPerDay: 2,
			packsPerCycle: 14,
			sterilizerId: "autoclave-melag-vacuklav-23b",
			operatorStaffFullName: "Иванова М.С.",
			operatorStaffPosition: "Медицинская сестра ЦСО",
			headNurseSignatureFullName: "Петрова Е.В.",
			isHeadNurseVerified: true,
		});

		// В сентябре 2026 ровно 30 дней: 4 воскресенья (6, 13, 20, 27 сентября). 30 - 4 = 26 рабочих дней.
		// При 2 циклах в день = ровно 52 цикла.
		assert.equal(records.length, 52, "За сентябрь 2026 должно быть сформировано 52 цикла (26 рабочих дней * 2)");

		for (const rec of records) {
			assert.ok(rec.date >= "2026-09-01" && rec.date <= "2026-09-30", `Дата ${rec.date} вне диапазона сентября 2026`);
			// Проверка, что воскресенья исключены
			const dayOfWeek = new Date(rec.date).getDay();
			assert.notEqual(dayOfWeek, 0, `Дата ${rec.date} не должна быть воскресеньем`);

			// Все 5 точек КТ камеры должны быть проверены и пройдены
			assert.equal(rec.chamberPoints.length, 5, "В каждом цикле должно быть ровно 5 контрольных точек");
			assert.equal(rec.areAllPointsPassed, true, "Все 5 точек должны быть успешны");
			assert.equal(rec.isCyclePassed, true, "Цикл должен быть признан стерильным");
			assert.equal(rec.status, "sterile_passed");

			// Физические параметры СанПиН 3.3686-21
			assert.ok(rec.actualTemperatureCelsius >= 134.0, "Температура не ниже 134°C");
			assert.ok(rec.actualPressureBar >= 2.1, "Давление не ниже 2.1 бар");
			assert.ok(rec.actualExposureMinutes >= 5.0, "Экспозиция не менее 5 минут");

			// Подписи и штамп
			assert.equal(rec.operatorStaffFullName, "Иванова М.С.");
			assert.equal(rec.isHeadNurseVerified, true);
			assert.ok(rec.digitalStampHash.startsWith("DENTE-CSO-257-"), "Цифровой штамп валидации должен присутствовать");
		}

		// Проверка чередования режимов: Цикл 1 = 134°C 5 мин (стандарт), Цикл 2 = 134°C 20 мин (хирургия/прион)
		const cycle1Records = records.filter((r) => r.cycleNumber === 1);
		const cycle2Records = records.filter((r) => r.cycleNumber === 2);
		assert.equal(cycle1Records.length, 26);
		assert.equal(cycle2Records.length, 26);

		for (const c1 of cycle1Records) {
			assert.equal(c1.regimeId, "steam_134_5min");
			assert.equal(c1.actualExposureMinutes, 5.5);
			assert.equal(c1.packsCount, 14);
		}

		for (const c2 of cycle2Records) {
			assert.equal(c2.regimeId, "steam_134_20min_prion");
			assert.equal(c2.actualExposureMinutes, 20.0);
			assert.equal(c2.packsCount, 10);
		}
	});

	it("2. формирует циклы за произвольные периоды: 1 день, 1 неделя, квартал", () => {
		// Одиночный день (25 сентября 2026)
		const singleDay = generateBatchForm257Records({
			startDate: "2026-09-25",
			endDate: "2026-09-25",
			cyclesPerDay: 3,
		});
		assert.equal(singleDay.length, 3, "За 1 день с 3 циклами должно быть 3 записи");
		assert.equal(singleDay[0]?.date, "2026-09-25");

		// Неделя (21-27 сентября 2026: пн-вс, 6 рабочих дней без воскресенья)
		const week = generateBatchForm257Records({
			startDate: "2026-09-21",
			endDate: "2026-09-27",
			excludeSundays: true,
			cyclesPerDay: 2,
		});
		assert.equal(week.length, 12, "За 6 рабочих дней недели при 2 циклах = 12 записей");

		// Некорректный диапазон (start > end)
		const invalid = generateBatchForm257Records({
			startDate: "2026-09-30",
			endDate: "2026-09-01",
		});
		assert.equal(invalid.length, 0, "При некорректном диапазоне возвращается пустой массив");
	});

	it("3. экспортирует журнал Формы 257/у в RFC 4180 CSV с кодировкой UTF-8 BOM", () => {
		const records = generateBatchForm257Records({
			startDate: "2026-09-25",
			endDate: "2026-09-25",
			cyclesPerDay: 2,
		});

		const csv = exportForm257ToCsv(records);

		// Проверка UTF-8 BOM
		assert.ok(csv.startsWith("\uFEFF"), "CSV обязан начинаться с UTF-8 BOM для корректного открытия в Excel");

		// Проверка обязательных заголовков
		assert.ok(csv.includes('"ID Записи";"Дата";"Номер цикла";"Код аппарата"'));
		assert.ok(csv.includes('"T° фактическая (°C)";"Давление заданное (бар)";"Давление фактическое (бар)";"Время выдержки (мин)"'));
		assert.ok(csv.includes('"КТ-1 (Верхний угол)";"КТ-2 (Нижний угол)";"КТ-3 (Центр камеры)";"КТ-4 (У дверцы)";"КТ-5 (Задняя стенка)"'));
		assert.ok(csv.includes('"Все 5 точек ОК";"Результат цикла"'));

		// Проверка наличия данных цикла
		assert.ok(csv.includes("2026-09-25"));
		assert.ok(csv.includes("СТЕРИЛЬНО"));
		assert.ok(csv.includes("DENTE-CSO-257-"));
	});

	it("4. генерирует альбомную печатную форму А4 (Форма № 257/у) и нормативное досье для Роспотребнадзора", () => {
		const records = generateBatchForm257Records({
			startDate: "2026-09-01",
			endDate: "2026-09-10",
			cyclesPerDay: 2,
		});

		const printHtml = generateForm257PrintHtml(records, DEFAULT_CLINIC_LEGAL_INFO, "за Сентябрь 2026 г.");
		assert.ok(printHtml.includes("Форма № 257/у"), "HTML должен содержать штамп Формы № 257/у");
		assert.ok(printHtml.includes("СанПиН 3.3686-21"), "HTML должен ссылаться на СанПиН 3.3686-21");
		assert.ok(printHtml.includes("size: A4 landscape"), "Печатный стиль должен быть A4 landscape");
		assert.ok(printHtml.includes("Химический контроль (5 точек)"));
		assert.ok(printHtml.includes("Ответственный за стерилизацию в ЦСО"));

		const regulatoryHtml = generateRegulatorySanpinInspectionHtml({
			form257Records: records,
			clinicInfo: DEFAULT_CLINIC_LEGAL_INFO,
			periodLabelRu: "за Сентябрь 2026 г.",
		});
		assert.ok(regulatoryHtml.includes("СВОДНЫЙ РЕГЛАМЕНТНЫЙ ОТЧЕТ СТЕРИЛИЗАЦИИ И ПСО"));
		assert.ok(regulatoryHtml.includes("ФОРМА № 366/у"));
		assert.ok(regulatoryHtml.includes("Презумпция стерильности лотка у кресла врача"));
		assert.ok(regulatoryHtml.includes("Азопирам (кровь)"));
		assert.ok(regulatoryHtml.includes("Фенолфталеин (СМС)"));
	});

	it("5. проверяет доступность журнала Формы 257/у из документов клиники (PrimaryIntakePackageModal, SettingsProtocolsTab, DocumentsView)", () => {
		const webSrc = path.resolve(process.cwd(), "apps/web/src");

		// PrimaryIntakePackageModal.tsx
		const intakeModalPath = path.join(webSrc, "components/documents/PrimaryIntakePackageModal.tsx");
		const intakeModalContent = fs.readFileSync(intakeModalPath, "utf8");
		assert.ok(
			intakeModalContent.includes("onOpenAutoclaveLog257"),
			"PrimaryIntakePackageModal должен поддерживать проп onOpenAutoclaveLog257",
		);
		assert.ok(
			intakeModalContent.includes("primary-intake-open-autoclave-log-btn"),
			"PrimaryIntakePackageModal должен содержать кнопку вызова журнала стерилизации 257/у",
		);

		// SettingsProtocolsTab.tsx
		const protocolsTabPath = path.join(webSrc, "components/settings/SettingsProtocolsTab.tsx");
		const protocolsTabContent = fs.readFileSync(protocolsTabPath, "utf8");
		assert.ok(
			protocolsTabContent.includes("protocols-open-autoclave-log-btn"),
			"SettingsProtocolsTab должен содержать кнопку protocols-open-autoclave-log-btn",
		);
		assert.ok(
			protocolsTabContent.includes("AutoclaveLog257Modal"),
			"SettingsProtocolsTab должен монтировать AutoclaveLog257Modal",
		);

		// DocumentsView.tsx
		const documentsViewPath = path.join(webSrc, "DocumentsView.tsx");
		const documentsViewContent = fs.readFileSync(documentsViewPath, "utf8");
		assert.ok(
			documentsViewContent.includes("documents-open-autoclave-log-257-btn"),
			"DocumentsView должен содержать 1-клик кнопку вызова журнала стерилизации 257/у",
		);
		assert.ok(
			documentsViewContent.includes("onOpenAutoclaveLog257={() => setIsAutoclaveLogOpen(true)}"),
			"DocumentsView должен пробрасывать вызов журнала стерилизации в PrimaryIntakePackageModal",
		);
	});

	it("6. подтверждает абсолютную чистоту рабочих экранов врача (VisitView, VisitSoapEditor, OdontogramModule, Мандаты 8e, 8v)", () => {
		const webSrc = path.resolve(process.cwd(), "apps/web/src");

		const visitViewPath = path.join(webSrc, "VisitView.tsx");
		const visitViewContent = fs.readFileSync(visitViewPath, "utf8");
		assert.ok(
			!visitViewContent.includes("ChairsideSterilizationPouchWidget"),
			"VisitView.tsx не должен содержать ChairsideSterilizationPouchWidget",
		);
		assert.ok(
			!visitViewContent.includes("AutoclaveLog257Modal"),
			"VisitView.tsx не должен содержать AutoclaveLog257Modal (документы стерилизации — бэк-офис)",
		);

		const visitSoapPath = path.join(webSrc, "components/visit/VisitSoapEditor.tsx");
		const visitSoapContent = fs.readFileSync(visitSoapPath, "utf8");
		assert.ok(
			!visitSoapContent.includes("ChairsideSterilizationPouchWidget"),
			"VisitSoapEditor.tsx не должен содержать ChairsideSterilizationPouchWidget",
		);

		const odontogramPath = path.join(webSrc, "components/odontogram/OdontogramModule.tsx");
		const odontogramContent = fs.readFileSync(odontogramPath, "utf8");
		assert.ok(
			!odontogramContent.includes("ChairsideSterilizationPouchWidget"),
			"OdontogramModule.tsx не должен содержать виджеты стерилизации",
		);
		assert.ok(
			!odontogramContent.includes("AutoclaveLog"),
			"OdontogramModule.tsx не должен содержать виджеты стерилизации",
		);
	});
});
