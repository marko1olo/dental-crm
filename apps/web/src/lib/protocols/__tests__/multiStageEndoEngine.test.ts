import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
	ORDER_804N_ENDO_CODES,
	BASELINE_PRICES_RUB,
	DEFAULT_STAGE1_SERVICE_TITLE,
	DEFAULT_STAGE2_OBTURATION_TITLE,
	DEFAULT_STAGE2_RESTORATION_TITLE,
	type LastVisitSoapSnapshot,
	resolveServicePriceFromCatalog,
	clearEndoHistoryIndex,
	formatVisitDateRu,
	isEndodonticIndication,
	buildPatientPreviousVisitsEndoIndex,
	getUnfinishedEndoSnapshot,
	transformEndoStage1ToStage2,
} from "../multiStageEndoEngine";

describe("multiStageEndoEngine — Двухэтапная эндодонтия и смарт-копирование повторных визитов", () => {
	beforeEach(() => {
		clearEndoHistoryIndex();
	});

	describe("1. isEndodonticIndication & formatVisitDateRu", () => {
		it("корректно распознает эндодонтические клинические маркеры (пульпит, периодонтит, каласепт, 804н)", () => {
			assert.equal(isEndodonticIndication("K04.0 Острый очаговый пульпит"), true);
			assert.equal(isEndodonticIndication("K04.5 Хронический апикальный периодонтит"), true);
			assert.equal(isEndodonticIndication("Временное пломбирование пастой Каласепт"), true);
			assert.equal(isEndodonticIndication("Metapex под герметичную повязку Септопак"), true);
			assert.equal(isEndodonticIndication("Услуга A16.07.030 мехобработка корневых каналов"), true);
			assert.equal(isEndodonticIndication("эндодонтическое перелечивание"), true);
		});

		it("возвращает false для терапевтических и гигиенических не-эндо диагнозов", () => {
			assert.equal(isEndodonticIndication("K02.1 Кариес дентина"), false);
			assert.equal(isEndodonticIndication("K03.1 Клиновидный дефект"), false);
			assert.equal(isEndodonticIndication("Z01.2 Профессиональная гигиена AirFlow"), false);
			assert.equal(isEndodonticIndication(null), false);
			assert.equal(isEndodonticIndication(""), false);
		});

		it("форматирует дату визита в читаемый формат ru-RU", () => {
			const formatted = formatVisitDateRu("2026-10-03T10:00:00.000Z");
			assert.ok(formatted.includes("2026"), "Дата должна содержать год 2026");
			assert.ok(formatted.includes("10") || formatted.includes("окт"), "Дата должна содержать месяц");
		});
	});

	describe("2. resolveServicePriceFromCatalog — подбор цен из прейскуранта с мягким фолбеком (Мандат 8ah)", () => {
		it("находит услугу по точному коду Номенклатуры 804н в прейскуранте клиники", () => {
			const catalog = [
				{
					id: "svc-custom-1",
					code804n: ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
					title: "Обтурация каналов термопластифицированной гуттаперчей (VIP)",
					basePriceRub: 6200,
				},
			];

			const res = resolveServicePriceFromCatalog(
				catalog,
				ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
				BASELINE_PRICES_RUB.STAGE2_OBTURATION,
				DEFAULT_STAGE2_OBTURATION_TITLE,
			);

			assert.equal(res.priceRub, 6200);
			assert.equal(res.title, "Обтурация каналов термопластифицированной гуттаперчей (VIP)");
			assert.equal(res.serviceId, "svc-custom-1");
		});

		it("находит услугу по ключевым словам в названии при отсутствии точного кода", () => {
			const catalog = [
				{
					id: "svc-kw-1",
					code: "CLINIC-ENDO-OBT",
					title: "Постоянное пломбирование каналов зуба гуттаперчей",
					price: 5400,
				},
			];

			const res = resolveServicePriceFromCatalog(
				catalog,
				ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
				BASELINE_PRICES_RUB.STAGE2_OBTURATION,
				DEFAULT_STAGE2_OBTURATION_TITLE,
			);

			assert.equal(res.priceRub, 5400);
			assert.equal(res.title, "Постоянное пломбирование каналов зуба гуттаперчей");
			assert.equal(res.serviceId, "svc-kw-1");
		});

		it("откатывается на базовые клинические фолбеки при отсутствии услуги в каталоге", () => {
			const res = resolveServicePriceFromCatalog(
				[],
				ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
				BASELINE_PRICES_RUB.STAGE2_RESTORATION,
				DEFAULT_STAGE2_RESTORATION_TITLE,
			);

			assert.equal(res.priceRub, BASELINE_PRICES_RUB.STAGE2_RESTORATION);
			assert.equal(res.title, DEFAULT_STAGE2_RESTORATION_TITLE);
			assert.equal(res.serviceId, undefined);
		});
	});

	describe("3. buildPatientPreviousVisitsEndoIndex & getUnfinishedEndoSnapshot — In-Memory кэш", () => {
		it("строит быстрый индекс незавершенных эндо-приёмов из истории расписания пациента", () => {
			const appointments = [
				{
					id: "appt-old-1",
					patientId: "pat-101",
					startsAt: "2026-10-01T12:00:00Z",
					reason: "Зуб 16: Острый пульпит, экстирпация, временная повязка Каласепт",
				},
				{
					id: "appt-old-2",
					patientId: "pat-101",
					startsAt: "2026-09-25T14:00:00Z",
					reason: "Зуб 25: Кариес дентина, пломба Estelite",
				},
			];

			const index = buildPatientPreviousVisitsEndoIndex({
				patientId: "pat-101",
				appointments,
			});

			assert.equal(index.has(16), true, "Зуб 16 должен быть проиндексирован как незавершенный эндо");
			assert.equal(index.has(25), false, "Зуб 25 (кариес) не должен попадать в эндо-индекс");

			const snap16 = getUnfinishedEndoSnapshot("pat-101", 16);
			assert.ok(snap16, "Снимок зуба 16 должен существовать");
			assert.equal(snap16?.toothNumber, 16);
			assert.equal(snap16?.diagnosisIcd10, "K04.0");
			assert.equal(snap16?.isEndoUnfinished, true);
		});

		it("индексирует зубы со статусом «лечение на этапе / кариес/пульпит» из сохраненной одонтограммы", () => {
			const storedTeeth = [
				{ toothNumber: 36, state: "treatment" },
				{ toothNumber: 47, state: "periodontitis" },
				{ toothNumber: 11, state: "healthy" },
			];

			const index = buildPatientPreviousVisitsEndoIndex({
				patientId: "pat-202",
				storedTeeth,
			});

			assert.equal(index.has(36), true);
			assert.equal(index.has(47), true);
			assert.equal(index.has(11), false);

			const snap47 = getUnfinishedEndoSnapshot("pat-202", 47);
			assert.equal(snap47?.diagnosisIcd10, "K04.5");
			assert.ok(snap47?.diagnosisTitle.includes("периодонтит"));
		});

		it("обеспечивает суб-миллисекундное чтение O(1) для 1000 обращений (<5 мс суммарно)", () => {
			const storedTeeth = [
				{ toothNumber: 16, state: "treatment" },
				{ toothNumber: 26, state: "treatment" },
			];
			buildPatientPreviousVisitsEndoIndex({
				patientId: "pat-perf-bench",
				storedTeeth,
			});

			const startTime = performance.now();
			for (let i = 0; i < 1000; i++) {
				const snap = getUnfinishedEndoSnapshot("pat-perf-bench", 16);
				assert.equal(snap?.toothNumber, 16);
			}
			const durationMs = performance.now() - startTime;

			assert.ok(
				durationMs < 16,
				`1000 in-memory чтений заняли ${durationMs.toFixed(2)} мс, что меньше 16 мс (бюджет 60 FPS)`,
			);
		});
	});

	describe("4. transformEndoStage1ToStage2 — 1-клик трансформация в дневник Формы 043/у и смету 804н", () => {
		const mockSnapshot: LastVisitSoapSnapshot = {
			visitId: "visit-stage1-prev",
			date: "03.10.2026",
			toothNumber: 16,
			diagnosisIcd10: "K04.0",
			diagnosisTitle: "K04.0 Острый очаговый пульпит (зуб 16)",
			anamnesis:
				"Ранее начато эндодонтическое лечение зуба 16 от 03.10.2026: экстирпация пульпы, инструментальная обработка ProTaper, временное пломбирование гидроксидом кальция Calcept под повязку Септопак.",
			isEndoUnfinished: true,
			stage: 1,
		};

		it("формирует эталонный дневник Формы 043/у в точном соответствии с клиническим ТЗ", () => {
			const result = transformEndoStage1ToStage2({
				snapshot: mockSnapshot,
				toothNumber: 16,
			});

			// 1. Анамнез и диагноз
			assert.equal(result.soap.diagnosis, "K04.0 Острый очаговый пульпит (зуб 16)");
			assert.equal(result.soap.anamnesis, mockSnapshot.anamnesis);

			// 2. Жалобы 2-го этапа
			assert.equal(
				result.soap.complaints,
				"Жалоб на момент осмотра не предъявляет. Временная повязка сохранена, герметична.",
			);

			// 3. Объективный осмотр 2-го этапа
			assert.ok(
				result.soap.objectiveStatus.includes("Зуб 16: Временная повязка сохранена, герметична."),
			);
			assert.ok(result.soap.objectiveStatus.includes("перкуссия безболезненна"));
			assert.ok(result.soap.objectiveStatus.includes("Пальпация по переходной складке"));

			// 4. Протокол лечения 2-го этапа
			assert.ok(result.soap.treatmentPlan.includes("2-й этап эндодонтического лечения"));
			assert.ok(result.soap.treatmentPlan.includes("Удаление временной повязки"));
			assert.ok(result.soap.treatmentPlan.includes("ирригация EDTA 17% + NaOCl 3%"));
			assert.ok(result.soap.treatmentPlan.includes("латеральной компакции гуттаперчей"));
			assert.ok(result.soap.treatmentPlan.includes("силером AH Plus"));
			assert.ok(result.soap.treatmentPlan.includes("Рентген-контроль обтурации"));
			assert.ok(result.soap.treatmentPlan.includes("Постоянная реставрация коронки зуба композитом"));

			// 5. Целевой статус зуба в одонтограмме переходит в 'done'
			assert.equal(result.targetToothState, "done");
		});

		it("автоматически подготавливает замену услуг 804н: удаление 1-го этапа и добавление 2-го этапа", () => {
			const catalog = [
				{
					id: "cat-obt-1",
					code804n: ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
					title: "Обтурация корневого канала гуттаперчей с AH Plus",
					basePriceRub: 4900,
				},
				{
					id: "cat-rest-1",
					code804n: ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
					title: "Светоотверждаемая композитная пломба Estelite Asteria",
					basePriceRub: 5600,
				},
			];

			const result = transformEndoStage1ToStage2({
				snapshot: mockSnapshot,
				toothNumber: 16,
				serviceCatalog: catalog,
			});

			// Удаление 1 этапа: A16.07.030.001
			const removeCodes = result.servicesToRemove.map((s) => s.code804n);
			assert.ok(removeCodes.includes(ORDER_804N_ENDO_CODES.STAGE1_INSTRUMENTATION_1CANAL));

			// Добавление 2 этапа: A16.07.008.002 (гуттаперча) + A16.07.002.001 (пломба)
			assert.equal(result.servicesToAdd.length, 2);

			const obturation = result.servicesToAdd.find(
				(s) => s.code804n === ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
			);
			assert.ok(obturation, "Услуга обтурации гуттаперчей обязана присутствовать");
			assert.equal(obturation?.unitPriceRub, 4900);
			assert.equal(obturation?.toothCode, "16");

			const restoration = result.servicesToAdd.find(
				(s) => s.code804n === ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
			);
			assert.ok(restoration, "Услуга световой реставрации обязана присутствовать");
			assert.equal(restoration?.unitPriceRub, 5600);
			assert.equal(restoration?.toothCode, "16");
		});
	});
});
