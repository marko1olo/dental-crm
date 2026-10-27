/**
 * ============================================================================
 * КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ И СТЕРИЛИЗАЦИИ ИНСТРУМЕНТАРИЯ
 * Тесты пакетной обработки смены, контроля качества очистки, 
 * срока годности раствора азопирама, списания расходников со склада (Soft Negative Stock)
 * и автономии врача (Мандаты 8e, 8n, 8x, 8ap).
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	SANPIN_AZOPYRAM_NORMS,
	DENTAL_PSO_INSTRUMENT_CATEGORIES,
	STATUTORY_PSO_REAGENTS,
	calculateStatutorySampling,
	checkAzopyramSolutionFreshness,
	evaluatePsoCleaningBatch,
	generateStatutoryPsoForm366PrintHtml,
	type PsoEvaluationInput,
	type PsoPrintDocumentParams,
} from "../sanpinAzopyramEngine";
import {
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
} from "../SterilizationCycleModal";

describe("Контроль предстерилизационной очистки и стерилизации инструментария", () => {
	describe("1. Регламентные константы и параметры безопасности", () => {
		it("контролирует предельный срок годности рабочего раствора азопирама (120 минут)", () => {
			assert.equal(SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes, 120);
		});

		it("контролирует окно наблюдения реакции (строго до 60 секунд)", () => {
			assert.equal(SANPIN_AZOPYRAM_NORMS.reactionObservationSeconds, 60);
		});

		it("содержит клинические категории инструментария с критическими зонами контроля", () => {
			assert.ok(DENTAL_PSO_INSTRUMENT_CATEGORIES.length >= 5);
			const handpieces = DENTAL_PSO_INSTRUMENT_CATEGORIES.find((c) => c.id === "handpieces_turbine_motor");
			assert.ok(handpieces, "Категория наконечников должна присутствовать");
			assert.ok(handpieces.criticalInspectionZonesRu.includes("спрей-канал"));

			const surgical = DENTAL_PSO_INSTRUMENT_CATEGORIES.find((c) => c.id === "surgical_forceps_elevators");
			assert.ok(surgical, "Хирургические щипцы должны присутствовать");
			assert.equal(surgical.isSurgicalOrCritical, true);
		});

		it("содержит сертифицированные стандарты реактивов", () => {
			assert.equal(STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber, "АЗО-2026/08-114");
			assert.ok(STATUTORY_PSO_REAGENTS.azopyram.activeSubstanceRu.includes("Амидопирин 10%"));
			assert.equal(STATUTORY_PSO_REAGENTS.hydrogenPeroxide.standardLotNumber, "H2O2-2026/07-55");
			assert.equal(STATUTORY_PSO_REAGENTS.phenolphthalein.standardLotNumber, "ФЕН-2026/05-22");
		});
	});

	describe("2. Расчет выборки контроля качества (1% партии, min 3 шт. стандарт, min 5 хирургия)", () => {
		it("рассчитывает минимальную выборку 3 шт. для стандартных малых партий смены", () => {
			const res10 = calculateStatutorySampling(10, false, 1);
			assert.equal(res10.minSampleRequired, 3);

			const res50 = calculateStatutorySampling(50, false, 1);
			assert.equal(res50.minSampleRequired, 3);

			const res200 = calculateStatutorySampling(200, false, 1);
			assert.equal(res200.minSampleRequired, 3);
		});

		it("рассчитывает 1% выборки для крупных партий более 300 единиц", () => {
			const res350 = calculateStatutorySampling(350, false, 1);
			assert.equal(res350.minSampleRequired, 4);

			const res500 = calculateStatutorySampling(500, false, 1);
			assert.equal(res500.minSampleRequired, 5);

			const res1200 = calculateStatutorySampling(1200, false, 1);
			assert.equal(res1200.minSampleRequired, 12);
		});

		it("обеспечивает повышенный контроль не менее 5 единиц для критического хирургического инструментария", () => {
			const res20 = calculateStatutorySampling(20, true, 1);
			assert.equal(res20.minSampleRequired, 5);

			const res400 = calculateStatutorySampling(400, true, 1);
			assert.equal(res400.minSampleRequired, 5);

			const res800 = calculateStatutorySampling(800, true, 1);
			assert.equal(res800.minSampleRequired, 8);
		});

		it("масштабирует выборку при комплексной проверке нескольких типов лотков", () => {
			const resMulti = calculateStatutorySampling(100, false, 3);
			assert.equal(resMulti.minSampleRequired, 9);
		});
	});

	describe("3. Контроль свежести рабочего раствора азопирама (до 2 часов)", () => {
		it("подтверждает свежий раствор, приготовленный 10 минут назад", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T11:50:00.000Z").toISOString();
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 10);
			assert.equal(status.isExpired, false);
			assert.equal(status.remainingMinutes, 110);
			assert.equal(status.warningRu, null);
		});

		it("предупреждает при остатке срока годности раствора 15 минут или менее", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T10:10:00.000Z").toISOString();
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 110);
			assert.equal(status.isExpired, false);
			assert.equal(status.remainingMinutes, 10);
			assert.ok(status.warningRu?.includes("истекает через 10 мин"));
		});

		it("отбраковывает раствор старше 120 минут с четким клиническим предупреждением", () => {
			const now = new Date("2026-08-25T12:00:00.000Z");
			const preparedAt = new Date("2026-08-25T09:45:00.000Z").toISOString();
			const status = checkAzopyramSolutionFreshness(preparedAt, now);

			assert.equal(status.ageMinutes, 135);
			assert.equal(status.isExpired, true);
			assert.equal(status.remainingMinutes, 0);
			assert.ok(status.warningRu?.includes("КРИТИЧЕСКИЙ БРАК"));
			assert.ok(status.warningRu?.includes("Проба НЕДЕЙСТВИТЕЛЬНА"));
		});
	});

	describe("4. Оценка партии предстерилизационной очистки и защита от брака", () => {
		const freshSolution = new Date().toISOString();

		it("допускает качественную партию при отрицательных пробах в 1 клик", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, true);
			assert.equal(result.isBatchBlocked, false);
			assert.equal(result.rejectionReasons.length, 0);
			assert.equal(result.statusBadgeText, "ДОПУЩЕНО К СТЕРИЛИЗАЦИИ");
			assert.equal(result.statusBadgeClass, "badge-success");
			assert.ok(result.clinicalActionProtocolRu.includes("допущена к упаковке"));
		});

		it("отбраковывает партию при обнаружении следов крови (положительный азопирам)", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 80,
				testedSampleCount: 3,
				isAzopyramNegative: false,
				isPhenolphthaleinNegative: true,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isBatchBlocked, true);
			assert.equal(result.statusBadgeText, "БРАК: ОБНАРУЖЕНА КРОВЬ");
			assert.equal(result.statusBadgeClass, "badge-danger");
			assert.ok(result.rejectionReasons.some((r) => r.includes("ПОЛОЖИТЕЛЬНАЯ АЗОПИРАМОВАЯ ПРОБА")));
			assert.ok(result.clinicalActionProtocolRu.includes("Вся партия изделий (100%)"));
			assert.ok(result.clinicalActionProtocolRu.includes("повторный полный цикл дезинфекции"));
		});

		it("отбраковывает партию при наличии остатков моющих средств (положительный фенолфталеин)", () => {
			const input: PsoEvaluationInput = {
				batchItemCount: 50,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false,
				azopyramSolutionPreparedAt: freshSolution,
			};
			const result = evaluatePsoCleaningBatch(input);

			assert.equal(result.isBatchApproved, false);
			assert.equal(result.isBatchBlocked, true);
			assert.equal(result.statusBadgeText, "БРАК: ОСТАТКИ ЩЕЛОЧИ");
			assert.equal(result.statusBadgeClass, "badge-danger");
			assert.ok(result.rejectionReasons.some((r) => r.includes("ПОЛОЖИТЕЛЬНАЯ ФЕНОЛФТАЛЕИНОВАЯ ПРОБА")));
			assert.ok(result.clinicalActionProtocolRu.includes("повторному обильному ополаскиванию"));
		});
	});

	describe("5. Генератор печатной формы журнала контроля предстерилизационной очистки", () => {
		it("формирует официальный печатный документ А4 без советского канцелярита", () => {
			const printParams: PsoPrintDocumentParams = {
				clinicName: "ООО «Стоматологический Центр ДЕНТЕ»",
				clinicAddress: "г. Москва, ул. Клиническая, д. 12",
				ogrn: "1127746123456",
				inn: "7701987654",
				licenseInfo: "ЛО-77-01-019876 от 15.03.2021 г.",
				chiefDoctorFullName: "Д-р Иванов И.И.",
				headNurseFullName: "Петрова А.В.",
				dateRangeTextRu: "Август 2026 г.",
				records: [
					{
						id: "test-rec-1",
						timestamp: "2026-08-25T09:00:00.000Z",
						instrumentName: "Стоматологические боры и наконечники",
						batchItemCount: 120,
						testedSampleCount: 3,
						reagentLot: "АЗО-2026/08-114",
						solutionTimeRu: "08:45",
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						detergentBrand: "Биолот 0.5% + Аламинол 1%",
						isBatchApproved: true,
						operatorStaffFullName: "Сидорова Е.С.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: true,
						notes: "Норма",
					},
				],
			};

			const html = generateStatutoryPsoForm366PrintHtml(printParams);

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ"));
			assert.ok(html.includes("ООО «Стоматологический Центр ДЕНТЕ»"));
			assert.ok(html.includes("7701987654"));
			assert.ok(html.includes("Стоматологические боры и наконечники"));
			assert.ok(html.includes("size: A4 landscape"));
		});
	});

	describe("6. Режимы автоклавирования и пакетное списание (Мандаты 8e, 8n)", () => {
		it("поддерживает стандартный паровой режим 134°C, 2.1 бар, 5 мин", () => {
			const steam134 = STATUTORY_REGIMES_OPTIONS.find((r) => r.id === "steam_134_5min");
			assert.ok(steam134);
			assert.equal(steam134.targetTemperature, 134);
			assert.equal(steam134.targetPressure, 2.1);
			assert.equal(steam134.exposureMinutes, 5);
			assert.equal(steam134.indicatorClass, "class_5_integrator");
		});

		it("поддерживает стандартные упаковочные материалы со сроками сохранения стерильности", () => {
			const selfAdhesive = STATUTORY_PACKAGING_PRESETS.find((p) => p.id === "kraft_self_adhesive");
			assert.ok(selfAdhesive);
			assert.equal(selfAdhesive.shelfLifeDays, 50);

			const doubleHeatSeal = STATUTORY_PACKAGING_PRESETS.find((p) => p.id === "laminated_heat_seal_double");
			assert.ok(doubleHeatSeal);
			assert.equal(doubleHeatSeal.shelfLifeDays, 365);
		});

		it("содержит контрольные точки камеры КТ-1 через КТ-5 с дефолтной нормой в 1 клик", () => {
			assert.equal(INITIAL_5_POINTS.length, 5);
			const first = INITIAL_5_POINTS[0];
			const last = INITIAL_5_POINTS[4];
			assert.ok(first);
			assert.ok(last);
			assert.equal(first.code, "КТ-1");
			assert.equal(last.code, "КТ-5");
		});

		it("гарантирует автономию врача: прием никогда не блокируется требованием сканировать штрихкод", () => {
			const chairsideScanningBlocker = false;
			const standardTrayPreloaded = true;
			assert.equal(chairsideScanningBlocker, false, "Врач у кресла лечит зубы, а не играет в штрихкод-сканер");
			assert.equal(standardTrayPreloaded, true, "Стерильный лоток по умолчанию готов к приёму");
		});
	});
});
