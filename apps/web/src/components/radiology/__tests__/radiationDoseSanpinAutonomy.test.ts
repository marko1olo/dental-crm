import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getStatutoryDosePreset,
	STATUTORY_RADIATION_DOSE_PRESETS,
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
} from "../doseSheet/radiationDosePresets";
import {
	evaluateDoseCompliance,
	formatRadiationDoseDisplay,
	generateDoseSheetHtml,
	exportDoseJournalToCsv,
	createDoseRecord,
	type DoseRecord,
} from "../doseSheet/radiationDoseEngine";
import { RADIOLOGY_MODALITIES } from "../types";

describe("SanPiN 2.6.1.1192-03 Radiation Dose Limits & Doctor Autonomy (Mandates 8e, 8i)", () => {
	it("1. Прицельный визиограф строго соответствует диапазону 1–3 мкЗв (СанПиН 2.6.1.1192-03)", () => {
		const rvg = getStatutoryDosePreset("visiography_intraoral");
		assert.ok(rvg, "Пресет прицельного визиографа должен существовать");
		assert.equal(rvg.id, "visiography_intraoral");
		assert.ok(
			rvg.typicalDoseMicrosv >= 1.0 && rvg.typicalDoseMicrosv <= 3.0,
			`Типовая доза визиографа (${rvg.typicalDoseMicrosv} мкЗв) должна быть в диапазоне 1–3 мкЗв`,
		);
		assert.ok(
			rvg.minDoseMsv >= 0.001 && rvg.maxDoseMsv <= 0.003,
			`Диапазон доз визиографа [${rvg.minDoseMsv * 1000}..${rvg.maxDoseMsv * 1000} мкЗв] должен быть в пределах 1–3 мкЗв`,
		);
		assert.equal(rvg.typicalDoseMsv, Number((rvg.typicalDoseMicrosv / 1000).toFixed(4)));
	});

	it("2. Цифровая ОПТГ строго соответствует диапазону 10–15 мкЗв (СанПиН 2.6.1.1192-03)", () => {
		const optg = getStatutoryDosePreset("optg_panoramic");
		assert.ok(optg, "Пресет ОПТГ должен существовать");
		assert.equal(optg.id, "optg_panoramic");
		assert.ok(
			optg.typicalDoseMicrosv >= 10.0 && optg.typicalDoseMicrosv <= 15.0,
			`Типовая доза ОПТГ (${optg.typicalDoseMicrosv} мкЗв) должна быть в пределах 10–15 мкЗв`,
		);
		assert.ok(
			optg.minDoseMsv >= 0.010 && optg.maxDoseMsv <= 0.015,
			`Диапазон доз ОПТГ [${optg.minDoseMsv * 1000}..${optg.maxDoseMsv * 1000} мкЗв] должен быть 10–15 мкЗв`,
		);
		assert.equal(optg.typicalDoseMsv, Number((optg.typicalDoseMicrosv / 1000).toFixed(4)));

		// Проверка в реестре RADIOLOGY_MODALITIES
		assert.ok(
			RADIOLOGY_MODALITIES.optg_panoramic.typicalDoseMicrosv >= 10.0 &&
			RADIOLOGY_MODALITIES.optg_panoramic.typicalDoseMicrosv <= 15.0,
			"RADIOLOGY_MODALITIES.optg_panoramic должен быть в диапазоне 10–15 мкЗв",
		);
	});

	it("3. Дентальная КЛКТ строго соответствует диапазону 30–60 мкЗв (СанПиН 2.6.1.1192-03)", () => {
		const cbctSegmental = getStatutoryDosePreset("cbct_segmental");
		assert.ok(cbctSegmental, "Пресет сегментарной КЛКТ 5х5 должен существовать");
		assert.ok(
			cbctSegmental.typicalDoseMicrosv >= 30.0 && cbctSegmental.typicalDoseMicrosv <= 60.0,
			`Типовая доза КЛКТ 5х5 (${cbctSegmental.typicalDoseMicrosv} мкЗв) должна быть в диапазоне 30–60 мкЗв`,
		);
		assert.ok(
			cbctSegmental.minDoseMsv >= 0.030 && cbctSegmental.maxDoseMsv <= 0.060,
			"Сегментарная КЛКТ должна укладываться в диапазон 30–60 мкЗв",
		);

		const cbctJaws = getStatutoryDosePreset("cbct_full_jaws");
		assert.ok(cbctJaws, "Пресет КЛКТ челюстей 8х8 должен существовать");
		assert.ok(
			cbctJaws.typicalDoseMicrosv >= 30.0 && cbctJaws.typicalDoseMicrosv <= 60.0,
			`Типовая доза КЛКТ челюстей (${cbctJaws.typicalDoseMicrosv} мкЗв) должна быть в диапазоне 30–60 мкЗв`,
		);
		assert.ok(
			cbctJaws.maxDoseMsv <= 0.060,
			`Максимальная доза стандартной дентальной КЛКТ (${cbctJaws.maxDoseMsv * 1000} мкЗв) не должна превышать 60 мкЗв`,
		);

		// Проверка в реестре RADIOLOGY_MODALITIES
		assert.ok(
			RADIOLOGY_MODALITIES.cbct_3d.typicalDoseMicrosv >= 30.0 &&
			RADIOLOGY_MODALITIES.cbct_3d.typicalDoseMicrosv <= 60.0,
			"RADIOLOGY_MODALITIES.cbct_3d должен быть в диапазоне 30–60 мкЗв",
		);
	});

	it("4. Мандат 8e: Запрет блокировок съемки и стационарных комиссий (Doctor Autonomy)", () => {
		// Оценка при нормальной дозе (< 0.5 мЗв)
		const normalCheck = evaluateDoseCompliance(0.1, 0.002);
		assert.equal(normalCheck.status, "safe");
		assert.equal(normalCheck.isCaptureBlocked, false, "Съемка никогда не блокируется");
		assert.equal(normalCheck.requiresDoctorClinicalJustification, false);
		assert.equal(normalCheck.requiresMedicalCouncilJustification, false);

		// Оценка при критическом превышении годового предела (>= 1.0 мЗв)
		const criticalCheck = evaluateDoseCompliance(1.05, 0.05);
		assert.equal(criticalCheck.status, "limit_exceeded");
		assert.equal(criticalCheck.zone, "red");
		assert.equal(criticalCheck.isExceeded, true);

		// КРИТИЧЕСКИЙ ТЕСТ МАНДАТА 8e: блокировка аппарата ЗАПРЕЩЕНА!
		assert.equal(
			criticalCheck.isCaptureBlocked,
			false,
			"МАНДАТ 8e: аппаратная съемка НИКОГДА не блокируется софтом!",
		);

		// КРИТИЧЕСКИЙ ТЕСТ МАНДАТА 8i: никаких стационарных консилиумов и комиссий ВК!
		assert.equal(
			criticalCheck.requiresMedicalCouncilJustification,
			false,
			"МАНДАТ 8i: в частной амбулаторной стоматологии нет стационарных консилиумов/комиссий",
		);

		// Автономия врача: требуется клиническое обоснование лечащего врача в карте 043/у
		assert.equal(
			criticalCheck.requiresDoctorClinicalJustification,
			true,
			"Требуется личное клиническое обоснование лечащего врача в карте 043/у",
		);

		// Проверка текста сообщений на отсутствие комиссий и подтверждение автономии
		assert.ok(
			criticalCheck.warningMessage.includes("Мандату 8e"),
			"Предупреждение должно ссылаться на Мандат 8e и запрет блокировки",
		);
		assert.ok(
			criticalCheck.protocolActionRequired.includes("Никаких стационарных комиссий"),
			"Протокол действий должен прямо исключать стационарные комиссии",
		);
	});

	it("5. Экспорт журнала в CSV не навязывает стационарный 'Консилиум' (Мандат 8i)", () => {
		const records: DoseRecord[] = [
			createDoseRecord({
				id: "rec-1",
				studyDate: "2026-09-23",
				modalityId: "visiography_intraoral",
				anatomicalArea: "Зуб 16",
				effectiveDoseMicrosv: 2.0,
				effectiveDoseMsv: 0.002,
				isEmergencyJustified: true,
				emergencyJustificationReason: undefined, // Не задано явно
			}),
		];

		const csv = exportDoseJournalToCsv(records);
		assert.ok(!csv.includes("Консилиум"), "CSV не должен содержать стационарный 'Консилиум'");
		assert.ok(
			csv.includes("По острой боли / Обоснование врача"),
			"CSV должен по умолчанию подставлять обоснование врача по острой боли",
		);
	});

	it("6. Генерация печатного вкладыша Формы 043/у содержит статутарные нормы СанПиН", () => {
		const records: DoseRecord[] = [
			createDoseRecord({
				id: "rec-1",
				studyDate: "2026-09-23",
				modalityId: "optg_panoramic",
				anatomicalArea: "Обе челюсти",
				effectiveDoseMicrosv: 13.0,
				effectiveDoseMsv: 0.013,
			}),
		];

		const html = generateDoseSheetHtml(records, {
			patientFullName: "Тестовый Пациент",
			medicalCardNumber: "043/у-9999",
			reportingYear: 2026,
		});

		assert.ok(html.includes("СанПиН 2.6.1.1192-03"), "Должна быть ссылка на СанПиН 2.6.1.1192-03");
		assert.ok(html.includes("ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК"), "Должен быть заголовок листа 043/у");
		assert.ok(html.includes("без стационарных комиссий"), "Должно быть примечание об автономии врача");
		assert.ok(html.includes("13.0"), "Доза 13 мкЗв должна отображаться в таблице");
	});

	it("7. Форматирование дозы formatRadiationDoseDisplay работает корректно", () => {
		const formatted = formatRadiationDoseDisplay(13.0);
		assert.equal(formatted.microsvText, "13 мкЗв");
		assert.equal(formatted.msvText, "0.013 мЗв");
		assert.equal(formatted.safetyZone, "green");
	});
});
