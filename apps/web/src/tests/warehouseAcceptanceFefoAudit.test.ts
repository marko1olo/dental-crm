/**
 * warehouseAcceptanceFefoAudit.test.ts — Инспекционный аудит склада и зуботехники:
 * 1. Ликвидация дубликатов папок (lab vs laboratory)
 * 2. 1-кликовое списание по FEFO без бюрократических комиссий (Мандат 8k)
 * 3. Zero Dead-Ends: мягкий овердрафт при нулевом остатке расходников (Мандат 8n)
 * 4. 5 канонических статусов зуботехники (CANONICAL_5_CLINICAL_LAB_STATUSES) в 1 клик
 * 5. Контроль лимитов размера файлов (<800 строк)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapOrderStatusToCanonical5,
	mapCanonical5ToOrderStatus,
	getNextLabStatus,
	canTransitionLabStatus,
	DENTAL_LAB_STATUSES,
	DENTAL_LAB_CONSTRUCTIONS,
} from "../components/lab/dentalLabOrderEngine";

import {
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	type ExpiryTrafficLight,
} from "../components/inventory/NurseCarpuleDisposalModal";

import {
	handleOneClickPackageWriteOff,
} from "../components/inventory/warehousePackageWriteOffEngine";

import {
	calculateAutoVisitConsumables,
	performAutoVisitBomDeduction,
} from "../components/inventory/autoBomDeductionEngine";

import React from "react";
import { renderToString } from "react-dom/server";
import { WarehouseItemsTable } from "../components/warehouse/WarehouseItemsTable";
import { generateFormM11Html } from "../components/inventory/writeoff/clinicalWriteoffPrintForms";
import {
	createSampleDentalWaybill,
	reconcileOverdraftOnReceipt,
} from "../components/inventory/acceptanceWaybillsEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "..");

describe("Warehouse & Dental Lab Inquisitor Audit (Mandates 8k, 8n, 8s)", () => {
	describe("1. Ликвидация дублирующей папки laboratory/ и консолидация в lab/", () => {
		it("папка apps/web/src/components/laboratory/ физически ликвидирована", () => {
			const duplicateDir = path.join(webSrcDir, "components", "laboratory");
			assert.ok(
				!fs.existsSync(duplicateDir),
				"Дублирующая папка components/laboratory/ не должна существовать!",
			);
		});

		it("канонические модули ЗТЛ находятся в apps/web/src/components/lab/", () => {
			const labDir = path.join(webSrcDir, "components", "lab");
			assert.ok(fs.existsSync(path.join(labDir, "dentalLabOrderEngine.ts")), "dentalLabOrderEngine.ts must exist in lab/");
			assert.ok(fs.existsSync(path.join(labDir, "DentalLabOrdersTrackerModal.tsx")), "DentalLabOrdersTrackerModal.tsx must exist in lab/");
			assert.ok(fs.existsSync(path.join(labDir, "DentalLabOrderDrawer.tsx")), "DentalLabOrderDrawer.tsx must exist in lab/");
			assert.ok(fs.existsSync(path.join(labDir, "__tests__", "dentalLabOrderEngine.test.ts")), "dentalLabOrderEngine.test.ts must exist in lab/__tests__/");
		});

		it("новые и модифицированные файлы ЗТЛ строго укладываются в лимит <800 строк", () => {
			const labDir = path.join(webSrcDir, "components", "lab");
			const trackerLines = fs.readFileSync(path.join(labDir, "DentalLabOrdersTrackerModal.tsx"), "utf8").split("\n").length;
			const drawerLines = fs.readFileSync(path.join(labDir, "DentalLabOrderDrawer.tsx"), "utf8").split("\n").length;
			const engineLines = fs.readFileSync(path.join(labDir, "dentalLabOrderEngine.ts"), "utf8").split("\n").length;

			assert.ok(trackerLines < 800, `DentalLabOrdersTrackerModal.tsx имеет ${trackerLines} строк (лимит < 800)`);
			assert.ok(drawerLines < 800, `DentalLabOrderDrawer.tsx имеет ${drawerLines} строк (лимит < 800)`);
			assert.ok(engineLines < 800, `dentalLabOrderEngine.ts имеет ${engineLines} строк (лимит < 800)`);
		});
	});

	describe("2. FEFO-списание и светофор годности без комиссий (Мандат 8k)", () => {
		it("getFefoTrafficLight безошибочно рассчитывает приоритеты FEFO", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 90);
			const green = getFefoTrafficLight(futureDate.toISOString());
			assert.equal(green.status, "green");
			assert.equal(green.badgeText, "FEFO норма");

			const soonDate = new Date();
			soonDate.setDate(soonDate.getDate() + 15);
			const yellow = getFefoTrafficLight(soonDate.toISOString());
			assert.equal(yellow.status, "yellow");
			assert.equal(yellow.badgeText, "FEFO приоритет");

			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 5);
			const red = getFefoTrafficLight(pastDate.toISOString());
			assert.equal(red.status, "red");
			assert.equal(red.badgeText, "Просрочен");
		});

		it("1-кликовое пакетное списание выполняется без комиссии из 3 человек", async () => {
			const result = await handleOneClickPackageWriteOff({
				packageId: "anesthesia",
				doctorName: "Д-р Орлов А.В.",
				allowSoftOverdraft: true,
				currentStockMap: {
					"art_100k_carpule": 10,
					"dental_needle_30g": 10,
					"cotton_rolls_sterile": 20,
					"antiseptic_alcohol_wipe": 10,
				},
			});

			assert.ok(result.success);
			assert.ok(result.actNumber.includes("СПИС-"));
			assert.equal(result.isOverdraft, false);
		});
	});

	describe("3. Zero Dead-Ends: мягкий овердрафт при нулевом остатке расходников (Мандат 8n)", () => {
		it("при нулевом или отрицательном остатке на складе списание фиксирует мягкий овердрафт без падений", async () => {
			// На складе 0 карпул артикаина
			const stockMap: Record<string, number> = { "art-100": 0 };

			const result = await handleOneClickPackageWriteOff({
				packageId: "anesthesia",
				doctorName: "Д-р Орлов А.В.",
				allowSoftOverdraft: true,
				currentStockMap: stockMap,
			});

			assert.ok(result.success, "Списание должно пройти успешно даже при пустом складе");
			assert.equal(result.isOverdraft, true, "Должен быть зафиксирован флаг мягкого овердрафта");
		});

		it("автосписание материалов по 804н не блокирует приём пациента при дефиците ТМЦ", async () => {
			// Выполняем автосписание услуги с пустой картой склада
			const res = await performAutoVisitBomDeduction({
				visitId: "visit-test-overdraft-1",
				patientId: "patient-1",
				doctorId: "doctor-1",
				renderedServices: [
					{
						serviceCode: "A16.07.002",
						name: "Восстановление зуба пломбой",
						quantity: 1,
					},
				],
				currentStockMap: {}, // Пустой склад
				allowOverdraft: true,
			});

			assert.ok(res.totalDeductedItems > 0, "Приём пациента не должен блокироваться из-за отсутствия ТМЦ");
			assert.ok(res.hasOverdraft, "Флаг овердрафта должен быть true");
			assert.ok(res.softOverdrafts.length > 0, "Должны быть зафиксированы предупреждения мягкого овердрафта");
		});
	});

	describe("4. 5 канонических статусов зуботехники (CANONICAL_5_CLINICAL_LAB_STATUSES)", () => {
		it("содержит ровно 5 канонических клинических этапов (Оттиск -> В лаборатории -> Примерка -> Готово -> Фиксация)", () => {
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);

			const s1 = CANONICAL_5_CLINICAL_LAB_STATUSES[0];
			const s2 = CANONICAL_5_CLINICAL_LAB_STATUSES[1];
			const s3 = CANONICAL_5_CLINICAL_LAB_STATUSES[2];
			const s4 = CANONICAL_5_CLINICAL_LAB_STATUSES[3];
			const s5 = CANONICAL_5_CLINICAL_LAB_STATUSES[4];
			assert.ok(s1 && s2 && s3 && s4 && s5);

			assert.equal(s1.id, "sent");
			assert.equal(s1.step, 1);
			assert.ok(s1.shortLabelRu.includes("Отправлен") || s1.labelRu.includes("Отправлен"));

			assert.equal(s2.id, "in_progress");
			assert.equal(s2.step, 2);
			assert.ok(s2.shortLabelRu.includes("В работе") || s2.labelRu.includes("В работе"));

			assert.equal(s3.id, "fitting");
			assert.equal(s3.step, 3);
			assert.ok(s3.shortLabelRu.includes("Примерка") || s3.labelRu.includes("Примерка"));

			assert.equal(s4.id, "ready");
			assert.equal(s4.step, 4);
			assert.ok(s4.shortLabelRu.includes("Готов") || s4.labelRu.includes("Готов"));

			assert.equal(s5.id, "completed");
			assert.equal(s5.step, 5);
			assert.ok(s5.shortLabelRu.includes("Сдан") || s5.labelRu.includes("Сдан"));
		});

		it("1-клик продвижение статуса заказа через getNextLabStatus работает без визардов", () => {
			assert.equal(getNextLabStatus("sent_to_lab"), "in_progress");
			assert.equal(getNextLabStatus("in_progress"), "ready_in_clinic");
			assert.equal(getNextLabStatus("ready_in_clinic"), "try_in");
			assert.equal(getNextLabStatus("try_in"), "delivered_to_patient");
			assert.equal(getNextLabStatus("delivered_to_patient"), null);
		});

		it("взаимный маппинг между 5 каноническими статусами и статусами наряда ЗТЛ корректен", () => {
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

		it("свобода врача и администратора при смене статусов (canTransitionLabStatus)", () => {
			assert.ok(canTransitionLabStatus("sent_to_lab", "ready_in_clinic"));
			assert.ok(canTransitionLabStatus("delivered_to_patient", "warranty_rework"));
			assert.ok(canTransitionLabStatus("warranty_rework", "sent_to_lab"));
		});
	});

	describe("5. Складской FEFO-светофор getWarehouseFefoTrafficLight (Красный ≤30дн, Желтый ≤90дн, Зеленый >90дн)", () => {
		const refDate = new Date("2026-09-24T00:00:00Z");

		it("красный статус для критических партий с остатком ≤ 30 дней", () => {
			// 2026-10-10 от 2026-09-24: 16 дней остатка (≤ 30 дней) — на складе это КРАСНЫЙ (критический срок)
			const red = getWarehouseFefoTrafficLight("2026-10-10", refDate);
			assert.equal(red.status, "red");
			assert.equal(red.badgeText, "Критический срок (≤30 дн)");
			assert.equal(red.dotColor, "#ef4444");
			assert.equal(red.daysLeft, 16);
		});

		it("красный статус для просроченных партий (daysLeft < 0) и истекающих сегодня (daysLeft === 0)", () => {
			const expired = getWarehouseFefoTrafficLight("2026-08-01", refDate);
			assert.equal(expired.status, "red");
			assert.equal(expired.badgeText, "Просрочен");

			const today = getWarehouseFefoTrafficLight("2026-09-24", refDate);
			assert.equal(today.status, "red");
			assert.equal(today.badgeText, "Истекает сегодня");
		});

		it("желтый статус для партий с приближающимся сроком 31..90 дней (FEFO приоритет)", () => {
			// 2026-11-20 от 2026-09-24: 57 дней остатка (31..90 дней) — ЖЕЛТЫЙ (FEFO приоритет)
			const yellow = getWarehouseFefoTrafficLight("2026-11-20", refDate);
			assert.equal(yellow.status, "yellow");
			assert.equal(yellow.badgeText, "FEFO приоритет");
			assert.equal(yellow.dotColor, "#f59e0b");
			assert.equal(yellow.daysLeft, 57);
		});

		it("зеленый статус для свежих партий со сроком > 90 дней (FEFO норма)", () => {
			// 2027-06-15 от 2026-09-24: > 260 дней остатка (> 90 дней) — ЗЕЛЕНЫЙ
			const green = getWarehouseFefoTrafficLight("2027-06-15", refDate);
			assert.equal(green.status, "green");
			assert.equal(green.badgeText, "FEFO норма");
			assert.equal(green.dotColor, "#10b981");
			assert.ok(green.daysLeft > 90);
		});
	});

	describe("6. 7-колоночная каноническая таблица остатков склада (WarehouseItemsTable)", () => {
		const sampleItems = [
			{
				id: "w-item-1",
				name: "Артикаин 1:100 000 (Ультракаин Д-С Форте)",
				category: "anesthesia",
				stockQuantity: 45,
				criticalThreshold: 10,
				unitCostRub: "95.00",
				unit: "карп.",
				sku: "ART-100",
				lotNumber: "LOT-A2028",
				expirationDate: "2028-12-31",
				updatedAt: "2026-09-24T00:00:00.000Z",
			},
			{
				id: "w-item-2",
				name: "Ватные валики стоматологические стерильные",
				category: "disposables",
				stockQuantity: 0, // Нулевой остаток — овердрафт
				criticalThreshold: 5,
				unitCostRub: "120.00",
				unit: "упак.",
				sku: "ROL-500",
				lotNumber: "LOT-ROL",
				expirationDate: "2029-01-01",
				updatedAt: "2026-09-24T00:00:00.000Z",
			},
		];


		it("рендерит ровно 7 колонок: Наименование, Категория, Срок годности/Партия, Остаток, Мин. запас, Себестоимость, Действия", () => {
			const html = renderToString(
				React.createElement(WarehouseItemsTable, {
					items: sampleItems,
					isLoading: false,
					organizationId: "00000000-0000-0000-0000-000000000001",
					searchQuery: "",
					loadError: null,
					onSelectItem: () => {},
					onDeductItem: () => {},
					onReceiveItem: () => {},
					onDeleteItem: () => {},
					onEditItem: () => {},
					onOpenWaybills: () => {},
					onOpenAddModal: () => {},
					onRetry: () => {},
				})
			);

			// 7 заголовков колонок
			assert.ok(html.includes("Наименование"), "Заголовок 'Наименование' присутствует");
			assert.ok(html.includes("Категория"), "Заголовок 'Категория' присутствует");
			assert.ok(html.includes("Срок годности"), "Заголовок 'Срок годности' присутствует");
			assert.ok(html.includes("Партия / FEFO"), "Подзаголовок 'Партия / FEFO' присутствует");
			assert.ok(html.includes("Остаток"), "Заголовок 'Остаток' присутствует");
			assert.ok(html.includes("Мин. запас"), "Заголовок 'Мин. запас' присутствует");
			assert.ok(html.includes("Себестоимость"), "Заголовок 'Себестоимость' присутствует");
			assert.ok(html.includes("Действия"), "Заголовок 'Действия' присутствует");

			// Строки данных
			assert.ok(html.includes("stock-row-w-item-1"));
			assert.ok(html.includes("stock-row-w-item-2"));

			// Овердрафт при остатке 0 (Мандат 8n)
			assert.ok(html.includes('data-testid="soft-overdraft-badge-w-item-2"'));
			assert.ok(html.includes("Овердрафт"));
		});
	});

	describe("7. Накладные М-11 и приёмка ТМЦ (acceptanceWaybills & Form M-11)", () => {
		it("генерация типовой межотраслевой формы М-11 создает юридически корректный документ", () => {
			const sampleDoc: any = {
				actNumber: "СПИС-2026-0042",
				actDate: "2026-09-24",
				clinicName: "ООО «ДЕНТЕ» Стоматология",
				doctorName: "Д-р Воронов А.В.",
				doctorPosition: "Врач-стоматолог терапевт",
				statutoryFormType: "M11" as const,
				totals: {
					totalStandardCostKopecks: 95000,
					totalActualCostKopecks: 95000,
					totalCostKopecks: 95000,
					totalCostRubles: 950,
					totalMaterialsQuantity: 10,
					totalMaterialsCount: 1,
					costVarianceKopecks: 0,
					totalItemsCount: 1,
					overdraftItemsCount: 0,
				},
				lines: [
					{
						materialId: "m1",
						nameRu: "Артикаин 1:100 000",
						sku: "ART-100",
						category: "anesthesia",
						unit: "карп.",
						okeiCode: "796",
						standardQuantity: 10,
						actualQuantity: 10,
						unitCostKopecks: 9500,
						totalCostKopecks: 95000,
						lotNumber: "LOT-ART-2028",
						expiryDate: "2028-12-31",
					},
				],
			};

			const html = generateFormM11Html(sampleDoc);
			assert.ok(html.includes("Типовая межотраслевая форма № <strong>М-11</strong>"), "Должен содержать заголовок М-11");
			assert.ok(html.includes("0315003"), "Код по ОКУД 0315003 формы М-11 должен присутствовать");
			assert.ok(html.includes("ТРЕБОВАНИЕ-НАКЛАДНАЯ"), "Наименование ТРЕБОВАНИЕ-НАКЛАДНАЯ должно присутствовать");
			assert.ok(html.includes("Артикаин 1:100 000"), "Позиция номенклатуры должна быть в таблице");
			assert.ok(html.includes("950.00"), "Сумма накладной должна быть в документе");
		});

		it("reconcileOverdraftOnReceipt автоматически уменьшает дефицит при поступлении приходной накладной", () => {
			const reconciled = reconcileOverdraftOnReceipt(-5, 20);
			assert.equal(reconciled.overdraftResolved, true, "Дефицит валиков должен быть полностью погашен приходом");
			assert.equal(reconciled.clearedDeficit, 5, "Должно быть погашено 5 единиц овердрафта");
			assert.equal(reconciled.newStockQuantity, 15, "Новый остаток должен стать +15");
		});
	});
});
