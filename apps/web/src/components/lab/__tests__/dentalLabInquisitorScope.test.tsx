import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	CANONICAL_LAB_PRICE_MATRIX,
	type LabPriceMatrixItem,
} from "../DentalLabPriceMatrixModal";
import {
	COURIER_SERVICES,
	DELIVERY_WINDOWS,
} from "../DentalLabCourierDispatchBar";
import {
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	checkFittingAppointmentCollision,
} from "../dentalLabOrderEngine";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");

describe("RED TEAM DENTAL LAB INQUISITOR: SCOPE AUDIT & ZERO-DEFECT GATE", () => {
	// ─── 1. Заказ коронок, элайнеров, бюгелей, виниров и протезов в ЗТЛ ───────
	describe("1. Заказ коронок, элайнеров, бюгелей, виниров и протезов", () => {
		it("Прайс-матрица ЗТЛ содержит все обязательные клинические типы ортопедических конструкций", () => {
			const matrixIds = CANONICAL_LAB_PRICE_MATRIX.map((item) => item.id);
			assert.ok(matrixIds.includes("crown_zirconia_katana"), "Должна быть коронка ZrO2 Katana ML");
			assert.ok(matrixIds.includes("crown_emax_press"), "Должна быть коронка / вкладка IPS e.max Press");
			assert.ok(matrixIds.includes("metal_ceramic_noritake"), "Должна быть металлокерамика Co-Cr Noritake");
			assert.ok(matrixIds.includes("veneer_emax_refractory"), "Должен быть керамический винир E.max");
			assert.ok(matrixIds.includes("clasp_denture_bredent"), "Должен быть бюгельный протез с замками Bredent");
			assert.ok(matrixIds.includes("removable_acry_free"), "Должен быть съемный протез Acry-Free");
			assert.ok(matrixIds.includes("ortho_aligners_pack"), "Должны быть ортодонтические элайнеры / каппы");
			assert.ok(matrixIds.includes("surgical_guide_implant"), "Должен быть хирургический шаблон под имплантацию");
		});

		it("Каждая позиция прайса имеет валидные сроки изготовления и целочисленные рубли", () => {
			for (const item of CANONICAL_LAB_PRICE_MATRIX) {
				assert.ok(item.turnaroundBusinessDays > 0, `Срок должен быть > 0 дней для ${item.id}`);
				assert.ok(item.suggestedCostRub > 0, `Себестоимость должна быть > 0 для ${item.id}`);
				assert.ok(item.suggestedPriceRub >= item.suggestedCostRub, `Цена клиники должна покрывать себестоимость для ${item.id}`);
				assert.ok(Number.isInteger(item.suggestedCostRub), `Себестоимость должна быть целым числом для ${item.id}`);
				assert.ok(Number.isInteger(item.suggestedPriceRub), `Цена клиники должна быть целым числом для ${item.id}`);
			}
		});
	});

	// ─── 2. Таймлайн этапов работы (слепок, каркас, примерка, фиксация) ───────
	describe("2. Таймлайн этапов работы (слепок, каркас, примерка, фиксация)", () => {
		it("Канонический жизненный цикл включает все 6 клинико-лабораторных этапов", () => {
			assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.length, 6);
			const stageIds = CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((s) => s.id);
			assert.deepEqual(stageIds, [
				"impression_taken",
				"courier_sent",
				"framework_fitting",
				"ceramic_layering",
				"ready_in_clinic",
				"patient_fixation",
			]);
		});

		it("Корректно определяет коллизию визита, если дата примерки раньше готовности ЗТЛ", () => {
			const today = new Date();
			const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
			const in2Days = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

			// Визит раньше дедлайна ЗТЛ -> коллизия!
			const collision = checkFittingAppointmentCollision(in5Days, in2Days);
			assert.equal(collision.hasCollision, true, "Должна быть обнаружена коллизия");
			assert.ok(collision.warningRu?.includes("раньше"), "Предупреждение должно объяснять причину коллизии");

			// Визит позже дедлайна ЗТЛ -> коллизии нет!
			const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
			const noCollision = checkFittingAppointmentCollision(in5Days, in7Days);
			assert.equal(noCollision.hasCollision, false, "Не должно быть коллизии, когда визит после сдачи");
		});
	});

	// ─── 3. Мандат 8e: 30 дней плана НЕ блокирует наряды ЗТЛ и оплату ─────────
	describe("3. Мандат 8e: Истечение 30 дней плана лечения НЕ блокирует наряд ЗТЛ", () => {
		it("При плане лечения старше 30 дней выдается мягкое предупреждение, но наряд НЕ блокируется", () => {
			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: rublesToKopecks(30000),
				paidKopecks: rublesToKopecks(20000), // > 50%
				availableDepositKopecks: 0,
				labOrderPriceKopecks: rublesToKopecks(10000),
				minAdvancePercent: 50,
				treatmentPlanAgeDays: 45, // > 30 дней!
			});

			assert.equal(result.isGatePassed, true, "Финансовый гейт должен пройти");
			assert.equal(result.gateStatus, "CLEARED", "Статус гейта должен быть CLEARED");
			assert.ok(result.isPlanExpiredNotice, "Должно быть мягкое уведомление");
			assert.ok(
				result.isPlanExpiredNotice.includes("не блокирует"),
				"Уведомление должно четко указывать на отсутствие блокировки по Мандату 8e",
			);
		});

		it("Специальное исключение для срочных временных работ (PMMA / mock-up) без аванса", () => {
			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: rublesToKopecks(50000),
				paidKopecks: 0, // 0 руб внесено!
				availableDepositKopecks: 0,
				labOrderPriceKopecks: rublesToKopecks(5000),
				minAdvancePercent: 50,
				isUrgentTemporary: true, // Временная коронка / мок-ап!
			});

			assert.equal(result.isGatePassed, true, "Срочная временная работа должна пройти без аванса");
			assert.equal(result.gateStatus, "CLEARED");
			assert.equal(result.isUrgentBypassed, true);
		});
	});

	// ─── 4. Доставка нарядов в лабораторию ────────────────────
	describe("4. Доставка нарядов в лабораторию", () => {
		it("Список каналов доставки включает штатную ЗТЛ и клинику без симуляторов", () => {
			const services = COURIER_SERVICES.map((s) => s.id);
			assert.ok(services.includes("lab_in_house"), "Должна быть доставка зуботехнической лаборатории");
			assert.ok(services.includes("clinic_express"), "Должна быть собственная доставка клиники");
		});

		it("Интервалы доставки включают утро, день, вечер и срочно", () => {
			const windows = DELIVERY_WINDOWS.map((w) => w.id);
			assert.deepEqual(windows, ["morning", "afternoon", "evening", "express_urgent"]);
		});
	});

	// ─── 5. Проверка архитектурных границ модуля ──────────────────
	describe("5. Архитектурная изоляция модуля ЗТЛ", () => {
		it("Все файлы модуля ЗТЛ находятся строго в components/lab/", () => {
			const files = fs.readdirSync(labDir);
			assert.ok(files.includes("DentalLabOrdersView.tsx"), "DentalLabOrdersView.tsx обязан существовать в components/lab/");
			assert.ok(files.includes("DentalLabOrderModal.tsx"), "DentalLabOrderModal.tsx обязан существовать в components/lab/");
			assert.ok(files.includes("DentalLabPriceMatrixModal.tsx"), "DentalLabPriceMatrixModal.tsx обязан существовать в components/lab/");
			assert.ok(files.includes("DentalLabStageTrackingTimeline.tsx"), "DentalLabStageTrackingTimeline.tsx обязан существовать в components/lab/");
		});
	});
});
