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
	type ExpiryTrafficLight,
} from "../components/inventory/NurseCarpuleDisposalModal";

import {
	handleOneClickPackageWriteOff,
} from "../components/inventory/warehousePackageWriteOffEngine";

import {
	calculateAutoVisitConsumables,
	performAutoVisitBomDeduction,
} from "../components/inventory/autoBomDeductionEngine";

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
						serviceName: "Восстановление зуба пломбой",
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

			const [s1, s2, s3, s4, s5] = CANONICAL_5_CLINICAL_LAB_STATUSES;
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
});
