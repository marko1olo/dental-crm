/**
 * autoBomDeductionAndSoftOverdraft.test.ts
 *
 * Automated Background BOM Material Deduction & 1-Click Class B Disposal Tests.
 *
 * Mandate 8e, 8k, 8n, 8s, 8d Verification:
 * 1. Automatic background BOM deduction on visit completion for 804n services.
 * 2. Soft Overdraft (Mandates 8e, 8n, 8s): zero-stock never blocks treatment or checkout.
 * 3. Class B Medical Waste Tracking (СанПиН 2.1.3684-21): auto-tracking carpules, needles, sharps.
 * 4. 1-Click Batch Class B Disposal at shift close with 1-person approval (no 3-person commission).
 * 5. Exact kopeck accounting & 0 cartoon emojis in UI/statutory documents (Mandate 8d).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	calculateAutoVisitConsumables,
	calculateClassBWasteFromItems,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import {
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
	performAutoVisitBomDeduction,
} from "../autoBomDeductionEngine.js";
import { completeClinicalVisitAndAssembleEstimate } from "../../visit/clinicalVisitWorkflow.js";

// Helper to check for forbidden cartoon emojis (Mandate 8d)
const EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("BOM Deduction & Soft Overdraft Autonomy (Mandates 8e, 8k, 8n, 8s)", () => {
	describe("1. Canonical 804n Consumable Catalog", () => {
		it("содержит обязательные нормативы 804н для ключевых стоматологических процедур", () => {
			assert.ok(DEFAULT_804N_CONSUMABLE_LINKS.length >= 20);

			const serviceCodes = new Set(DEFAULT_804N_CONSUMABLE_LINKS.map((l) => l.service804nCode));
			assert.ok(serviceCodes.has("A11.07.012"), "Анестезия должна быть в каталоге");
			assert.ok(serviceCodes.has("A16.07.002"), "Лечение кариеса должно быть в каталоге");
			assert.ok(serviceCodes.has("A16.07.030"), "Эндодонтия должна быть в каталоге");
			assert.ok(serviceCodes.has("A16.07.001"), "Удаление зуба должно быть в каталоге");
			assert.ok(serviceCodes.has("A16.07.051"), "Профгигиена должна быть в каталоге");
			assert.ok(serviceCodes.has("A16.07.002.009"), "Коффердам должен быть в каталоге");
			assert.ok(serviceCodes.has("B01.065.001"), "Базовый СИЗ приёма должен быть в каталоге");
		});

		it("каждая позиция каталога имеет корректные единицы, количество и цену в копейках", () => {
			for (const link of DEFAULT_804N_CONSUMABLE_LINKS) {
				assert.ok(link.id.length > 0, `ID пуст для ${link.itemName}`);
				assert.ok(link.service804nCode.length > 0);
				assert.ok(link.itemName.length > 0);
				assert.ok(link.quantityPerService > 0, `Количество должно быть > 0 для ${link.itemName}`);
				assert.ok(link.costPriceKopecks > 0, `Себестоимость должна быть > 0 для ${link.itemName}`);
				assert.ok(link.unit.length > 0);
				assert.ok(!EMOJI_REGEX.test(link.itemName), `Эмодзи запрещены в названии: ${link.itemName}`);
			}
		});

		it("анестезия A11.07.012 включает карпулу артикаина 1.7 мл со стеклом и иглу 30G", () => {
			const anesthLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter((l) => l.service804nCode === "A11.07.012");
			assert.ok(anesthLinks.length >= 3);

			const carpule = anesthLinks.find((l) => l.category === "anesthetic");
			assert.ok(carpule, "Карпула анестетика обязательна");
			assert.ok(carpule.unit.startsWith("карп"), "Единица измерения — карпула");
			assert.equal(carpule.quantityPerService, 1);
			assert.ok(carpule.itemName.toLowerCase().includes("артикаин"));

			const needle = anesthLinks.find((l) => l.unit === "шт" && l.itemName.includes("Игла"));
			assert.ok(needle, "Игла для карпульного шприца обязательна");
			assert.equal(needle.quantityPerService, 1);
		});
	});

	describe("2. Расчёт планового расхода материалов (calculateAutoVisitConsumables)", () => {
		it("автоматически добавляет базовый набор СИЗ (B01.065.001), если он не указан явно", () => {
			const rendered = [
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой",
					quantity: 1,
					toothNumber: 36,
				},
			];

			const planned = calculateAutoVisitConsumables(rendered);
			assert.ok(planned.length > 0);

			const ppeItems = planned.filter((p) => p.service804nCode === "B01.065.001");
			assert.ok(ppeItems.length >= 3, "Базовый СИЗ приёма должен автоматически включиться");
			assert.ok(ppeItems.some((p) => p.itemName.includes("Перчатки")));
			assert.ok(ppeItems.some((p) => p.itemName.includes("Слюноотсос")));
		});

		it("корректно масштабирует количество расходников при оказании нескольких услуг", () => {
			const rendered = [
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Проводниковая анестезия",
					quantity: 2,
					toothNumber: 46,
				},
			];

			const planned = calculateAutoVisitConsumables(rendered, { includeStandardPpe: false });
			const carpule = planned.find((p) => p.category === "anesthetic");
			assert.ok(carpule);
			assert.equal(carpule.requiredQuantity, 2, "При 2 анестезиях списываются 2 карпулы");
		});

		it("поддерживает сопоставление по базовому коду 804н (A16.07.002.001 -> A16.07.002)", () => {
			const rendered = [
				{
					serviceCode: "A16.07.002.001",
					serviceTitle: "Восстановление зуба пломбой I класс по Блэку",
					quantity: 1,
					toothNumber: 24,
				},
			];

			const planned = calculateAutoVisitConsumables(rendered, { includeStandardPpe: false });
			assert.ok(planned.length >= 4, "Должны подтянуться расходники кариеса по базовому коду");
			assert.ok(
				planned.some((p) => p.itemName.includes("нанокомпозит") || p.itemName.includes("Filtek")),
				"Композит должен входить в план списания",
			);
		});
	});

	describe("3. Мягкий овердрафт склада (Mandates 8e, 8n, 8s)", () => {
		it("при нулевом остатке на складе списание НЕ падает, а фиксирует отрицательный остаток и овердрафт", () => {
			const currentStockMap: Record<string, number> = {
				"mat-anes-art-100k": 0, // На складе 0 карпул
				"mat-anes-needle-30g": 10,
			};

			const result = executeAutoVisitBomDeduction({
				visitId: "VISIT-TEST-001",
				patientId: "PAT-001",
				doctorId: "DOC-001",
				renderedServices: [
					{
						serviceCode: "A11.07.012",
						serviceTitle: "Инфильтрационная анестезия",
						quantity: 1,
						toothNumber: 16,
					},
				],
				currentStockMap,
				allowOverdraft: true, // По умолчанию true
			});

			assert.equal(result.hasOverdraft, true, "Должен быть флаг овердрафта");
			assert.ok(result.softOverdrafts.length >= 1, "Должно быть предупреждение о мягком овердрафте");
			assert.ok(
				result.softOverdrafts[0]!.includes("Мандат 8e/8n: Мягкий овердрафт"),
				"Сообщение должно ссылаться на Мандат 8e/8n",
			);

			const carpuleItem = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
			assert.ok(carpuleItem);
			assert.equal(carpuleItem.isOverdraft, true);
			assert.equal(carpuleItem.remainingQty, -1, "Остаток должен стать -1");
			assert.ok(carpuleItem.overdraftWarning);

			// Проверяем, что регламентный акт А4 всё равно сгенерирован
			assert.ok(result.statutoryActText.includes("АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ"));
			assert.ok(result.statutoryActText.includes("Зафиксирован мягкий овердрафт"));
		});

		it("при allowOverdraft = false выбрасывает описательную ошибку дефицита", () => {
			assert.throws(
				() => {
					executeAutoVisitBomDeduction({
						visitId: "VISIT-TEST-002",
						patientId: "PAT-002",
						doctorId: "DOC-002",
						renderedServices: [
							{
								serviceCode: "A11.07.012",
								serviceTitle: "Инфильтрационная анестезия",
								quantity: 1,
							},
						],
						currentStockMap: { "mat-anes-art-100k": 0 },
						allowOverdraft: false,
					});
				},
				/Складской дефицит: недостаточно остатка позиции/,
			);
		});
	});

	describe("4. Распознавание медицинских отходов Класса Б (СанПиН 2.1.3684-21)", () => {
		it("точно классифицирует карпулы, колюще-режущие иглы/лезвия и загрязненные СИЗ", () => {
			const items = [
				{ itemName: "Артикаин 4% с адреналином 1.7 мл (карпула)", category: "anesthetic", unit: "карпула", deductedQty: 2 },
				{ itemName: "Игла стоматологическая карпульная 30G", unit: "шт", deductedQty: 2 },
				{ itemName: "Лезвие скальпеля хирургическое №15C", unit: "шт", deductedQty: 1 },
				{ itemName: "Перчатки нитриловые смотровые", unit: "пар", deductedQty: 1 },
				{ itemName: "Слюноотсос стоматологический", unit: "шт", deductedQty: 1 },
			];

			const waste = calculateClassBWasteFromItems(items);
			assert.equal(waste.wasteClass, "class_B");
			assert.equal(waste.carpulesCount, 2, "2 карпулы со стеклом");
			assert.equal(waste.sharpsCount, 3, "2 иглы + 1 лезвие = 3 колюще-режущих");
			assert.equal(waste.contaminatedItemsCount, 2, "2 загрязненных СИЗ");
			assert.equal(waste.packagingRecommended, "yellow_container_sharps");
			assert.ok(waste.sealNumber.startsWith("ПЛ-Б-"));
			assert.ok(waste.barcode.startsWith("WASTE-CLASS_B-DENT-"));
			assert.equal(waste.singlePersonApproval, true, "Единоличное списание без комиссии");
			assert.ok(waste.estimatedWeightKg >= 0.05, "Масса отходов рассчитана корректно");
		});
	});

	describe("5. 1-Клик сдача отходов Класса Б при закрытии смены", () => {
		it("формирует регламентный акт без эмодзи с пломбой и единоличным подтверждением", async () => {
			let postedPayload: unknown = null;
			const mockFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
				postedPayload = JSON.parse((init?.body as string) || "{}");
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			};

			let capturedToast = "";
			const result = await executeShiftCloseClassBWasteDisposal({
				accumulatedCarpulesCount: 12,
				accumulatedNeedlesCount: 12,
				accumulatedSharpsCount: 2,
				contaminatedItemsCount: 15,
				responsibleStaffName: "Иванова М. С.",
				responsibleStaffPosition: "Старшая медсестра",
				clinicName: "Стоматология «DENTE»",
				fetchFn: mockFetch as unknown as typeof fetch,
				onToast: (msg) => {
					capturedToast = msg;
				},
			});

			assert.equal(result.success, true);
			assert.equal(result.totalCarpulesCount, 12);
			assert.equal(result.totalSharpsCount, 14);
			assert.equal(result.singlePersonApproval, true);
			assert.ok(result.sealNumber.startsWith("ПЛ-Б-"));
			assert.ok(result.barcode.startsWith("WASTE-CLASS_B-DENT-"));
			assert.ok(capturedToast.includes("1-клик сдача отходов Класса Б"));

			// Проверка HTML акта
			assert.ok(result.actHtml.includes("АКТ НАКОПЛЕНИЯ И ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б"));
			assert.ok(result.actHtml.includes("СанПиН 2.1.3684-21"));
			assert.ok(result.actHtml.includes("без комиссии из 3 человек"));
			assert.ok(!EMOJI_REGEX.test(result.actHtml), "HTML акт не должен содержать эмодзи");

			// Проверка синхронизации с журналом медотходов
			assert.ok(postedPayload !== null);
			const payload = postedPayload as Record<string, unknown>;
			assert.equal(payload.wasteClass, "class_B");
			assert.equal(payload.responsibleStaffName, "Иванова М. С.");
		});

		it("formatShiftCloseClassBWasteActHtml генерирует строгий документ без эмодзи", () => {
			const html = formatShiftCloseClassBWasteActHtml(
				"АКТ-ОТХОД-001",
				"2026-09-25",
				"ПЛ-Б-2026-01234",
				"WASTE-CLASS_B-DENT-20260925-1234",
				10,
				10,
				0,
				0.35,
				0.15,
				0.2,
				"Петрова А. В.",
				"Медицинская сестра",
			);

			assert.ok(html.includes("ПЛ-Б-2026-01234"));
			assert.ok(!EMOJI_REGEX.test(html), "Запрещены эмодзи в официальном акте");
		});
	});

	describe("6. Веб-оркестратор списания (performAutoVisitBomDeduction)", () => {
		it("принимает различные форматы входящих услуг и сопоставляет остатки склада", async () => {
			const warehouseItems = [
				{
					id: "mat-anes-art-100k",
					name: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
					stockQuantity: 5,
					priceKopecks: 14500,
					minStock: 2,
					unit: "карпула",
					category: "anesthetic",
				},
				{
					id: "mat-anes-needle-30g",
					name: "Игла карпульная стоматологическая 30G евростандарт (25 мм)",
					stockQuantity: 20,
					priceKopecks: 2500,
					minStock: 5,
					unit: "шт",
					category: "anesthetic",
				},
				{
					id: "mat-anes-wipe",
					name: "Антисептическая спиртовая салфетка стерильная",
					stockQuantity: 50,
					priceKopecks: 500,
					minStock: 10,
					unit: "шт",
					category: "disinfectant",
				},
			];

			let toastCalled = false;
			let toastType = "";
			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-AUTO-01",
				patientId: "PAT-01",
				patientFullName: "Сидоров В. В.",
				doctorId: "DOC-01",
				doctorFullName: "Д-р Смирнов А. А.",
				renderedServices: [
					{
						serviceCode: "A11.07.012",
						serviceTitle: "Инфильтрационная анестезия",
						quantity: 1,
						toothNumber: 47,
					},
				],
				warehouseItems: warehouseItems as unknown as any,
				allowOverdraft: true,
				includeStandardPpe: false, // Изолированная проверка процедурного запаса
				onToast: (_msg, type) => {
					toastCalled = true;
					toastType = type;
				},
			});

			assert.equal(toastCalled, true);
			assert.equal(toastType, "success");
			assert.ok(result.totalDeductedItems >= 1);
			assert.equal(result.hasOverdraft, false);

			const deductedArticaine = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
			assert.ok(deductedArticaine);
			assert.equal(deductedArticaine.remainingQty, 4, "5 - 1 = 4");
		});

		it("при дефиците отправляет warning-уведомление без блокировки выполнения", async () => {
			let capturedType = "";
			let capturedMsg = "";

			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-AUTO-02",
				patientId: "PAT-02",
				doctorId: "DOC-02",
				renderedServices: [
					{
						code: "A11.07.012",
						name: "Анестезия",
						quantity: 3,
						toothNumber: "15",
					},
				],
				currentStockMap: {
					"mat-anes-art-100k": 1, // Нужно 3, есть 1 -> овердрафт -2
				},
				allowOverdraft: true,
				includeStandardPpe: false,
				onToast: (msg, type) => {
					capturedMsg = msg;
					capturedType = type;
				},
			});

			assert.equal(capturedType, "warning");
			assert.ok(capturedMsg.includes("Мягкий овердрафт"));
			assert.ok(capturedMsg.includes("Приём сохранён"));
			assert.equal(result.hasOverdraft, true);
		});

		it("при возникновении овердрафта отправляет alert на /api/inventory/:org/overdraft-alert", async () => {
			const postedRequests: Array<{ url: string; body: Record<string, unknown> | null }> = [];
			const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
				postedRequests.push({
					url: String(input),
					body: init?.body ? JSON.parse(String(init.body)) : null,
				});
				return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
			};

			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-AUTO-ALERT",
				patientId: "PAT-02",
				doctorId: "DOC-02",
				organizationId: "org-overdraft-test",
				cabinetId: "CAB-3",
				chairId: "CHAIR-1",
				renderedServices: [
					{
						code: "A11.07.012",
						name: "Анестезия",
						quantity: 2,
					},
				],
				currentStockMap: {
					"mat-anes-art-100k": 0, // Дефицит 2 шт
				},
				allowOverdraft: true,
				includeStandardPpe: false,
				fetchFn: mockFetch as unknown as typeof fetch,
			});

			assert.equal(result.hasOverdraft, true);
			const alertReq = postedRequests.find((r) => r.url.includes("/overdraft-alert"));
			assert.ok(alertReq, "Запрос на /overdraft-alert должен быть отправлен");
			assert.equal(alertReq.url, "/api/inventory/org-overdraft-test/overdraft-alert");
			assert.equal(alertReq.body?.visitId, "VIS-AUTO-ALERT");
			assert.equal(alertReq.body?.cabinetId, "CAB-3");
			assert.equal(alertReq.body?.chairId, "CHAIR-1");
			const alertItems = alertReq.body?.items as Array<{ deficitQty: number }>;
			assert.ok(alertItems && alertItems.length >= 1);
			assert.equal(alertItems[0]?.deficitQty, 2);
		});

		it("фоновая сетевая ошибка синхронизации не роняет процесс списания", async () => {
			const failingFetch = async (): Promise<Response> => {
				throw new Error("Сетевой сбой при отправке на склад");
			};

			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-AUTO-03",
				patientId: "PAT-03",
				doctorId: "DOC-03",
				renderedServices: [{ serviceCode: "A16.07.002", quantity: 1 }],
				organizationId: "org-test",
				fetchFn: failingFetch as unknown as typeof fetch,
				onToast: () => {},
			});

			assert.ok(result.totalDeductedItems > 0);
		});
	});

	describe("7. Интеграция с завершением визита врача (clinicalVisitWorkflow)", () => {
		it("завершение визита с лечением кариеса и анестезией генерирует смету и данные автосписания", async () => {
			// Врач завершает приём: зуб 2.6 кариес + анестезия
			const completionResult = completeClinicalVisitAndAssembleEstimate({
				visitId: "VIS-CLINICAL-100",
				patientId: "PAT-100",
				patientName: "Ковалев Игорь Семенович",
				doctorName: "Д-р Смирнова Е. П.",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				clinicName: "Клиника «DENTE»",
				diary: {
					anamnesis: "Жалобы на кратковременные боли от сладкого в зубе 2.6.",
					statusLocalis: "В зубе 2.6 на окклюзионной поверхности глубокая кариозная полость.",
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "26",
					treatmentDescription: "Инфильтрационная анестезия. Препарирование полости, наложение светоотверждаемой пломбы.",
				},
				completedPlanItems: [],
				additionalServices: [],
			});

			assert.ok(completionResult.items.length >= 2, "Должны распознаться анестезия и пломбирование");
			assert.ok(completionResult.totalNetRub > 0);

			// Выполняем фоновое автосписание материалов для сформированной сметы
			const bomResult = await performAutoVisitBomDeduction({
				visitId: completionResult.visitId,
				patientId: completionResult.patientId,
				doctorId: completionResult.doctorName,
				renderedServices: completionResult.items,
				allowOverdraft: true,
			});

			assert.ok(bomResult.totalDeductedItems >= 5, "Должны списаться анестезия, пломба и СИЗ");
			assert.ok(bomResult.classBWaste.carpulesCount >= 1, "Минимум 1 пустая карпула в отходы Класса Б");
			assert.ok(bomResult.classBWaste.sharpsCount >= 1, "Минимум 1 игла в отходы Класса Б");
			assert.equal(bomResult.classBWaste.singlePersonApproval, true, "1 лицо подписывает без комиссии");
			assert.ok(!EMOJI_REGEX.test(bomResult.statutoryActText), "Акт списания без эмодзи");
		});
	});
});
