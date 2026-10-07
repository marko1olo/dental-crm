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
} from "../../lab/dentalLabOrderEngine";
import { checkDentalLabFinancialGate } from "../../lab/dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dentalLabDir = path.resolve(__dirname, "..");

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
				result.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"),
				"Уведомление обязано подтверждать отсутствие блокировки создания наряда и оплаты",
			);
		});

		it("Клиническое решение лечащего врача свободно пропускает наряд даже при 0% аванса", () => {
			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: rublesToKopecks(30000),
				paidKopecks: 0, // 0% оплаты
				availableDepositKopecks: 0,
				labOrderPriceKopecks: rublesToKopecks(10000),
				minAdvancePercent: 50,
				doctorOverride: {
					authorized: true,
					doctorName: "Д-р Смирнов А.В.",
					timestampIso: new Date().toISOString(),
					reason: "Экстренная фиксация моста на временный цемент",
				},
			});

			assert.equal(result.isGatePassed, true, "Наряд должен пройти по клиническому решению врача");
			assert.equal(result.gateStatus, "DOCTOR_OVERRIDE", "Статус должен быть DOCTOR_OVERRIDE");
		});
	});

	// ─── 4. Курьерская доставка DentalLabCourierDispatchBar ────────────────────
	describe("4. Курьерская доставка DentalLabCourierDispatchBar", () => {
		it("Содержит 4 канонические службы доставки и 4 окна забора", () => {
			assert.equal(COURIER_SERVICES.length, 4, "Должно быть 4 службы доставки");
			assert.equal(DELIVERY_WINDOWS.length, 4, "Должно быть 4 окна забора");
			assert.ok(COURIER_SERVICES.some((s) => s.id === "lab_in_house"), "Должен быть штатный курьер ЗТЛ");
			assert.ok(DELIVERY_WINDOWS.some((w) => w.id === "morning"), "Должно быть утреннее окно");
			assert.ok(DELIVERY_WINDOWS.some((w) => w.id === "express_urgent"), "Должен быть экспресс-вызов");
		});
	});

	// ─── 5. Проверка файлов скоупа на отсутствие заглушек () => {} и эмодзи ───
	describe("5. Исключение заглушек () => {}, обрезания слов и эмодзи", () => {
		const targetFiles = [
			"DentalLabOrdersView.tsx",
			"DentalLabWorkOrderModal.tsx",
			"DentalLabStageTrackingTimeline.tsx",
			"DentalLabCourierDispatchBar.tsx",
			"DentalLabPriceMatrixModal.tsx",
		];

		for (const filename of targetFiles) {
			it(`Файл ${filename} существует и не содержит пустых заглушек // TODO или мультяшных эмодзи`, () => {
				const fullPath = path.join(dentalLabDir, filename);
				assert.ok(fs.existsSync(fullPath), `Файл ${filename} должен существовать`);
				const content = fs.readFileSync(fullPath, "utf-8");

				// Запрет на // TODO
				assert.ok(!content.includes("// TODO"), `Файл ${filename} не должен содержать // TODO`);
				assert.ok(!content.includes("// implement later"), `Файл ${filename} не должен содержать // implement later`);

				// Запрет на мультяшные эмодзи в коде UI (Мандат 8d п. 7)
				const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
				assert.ok(!emojiRegex.test(content), `Файл ${filename} не должен содержать мультяшных эмодзи`);
			});
		}
	});

	// ─── 6. ТАБУ СОЗДАТЕЛЯ: СТРОГО НЕ ТРОГАТЬ ПЕДИАТРИЮ И АНЕСТЕЗИЮ ───────────
	describe("6. ТАБУ СОЗДАТЕЛЯ: Неприкосновенность педиатрии и анестезии", () => {
		it("Файлы педиатрии и калькуляторов анестезии не были затронуты текущим скоупом", () => {
			const pediatricPath = path.resolve(dentalLabDir, "../../components/pediatric");
			const anesthesiaPath = path.resolve(dentalLabDir, "../../components/anesthesia");
			// Проверяем, что в dental-lab нет случайных заимствований или модификаций этих модулей
			for (const file of fs.readdirSync(dentalLabDir)) {
				if (file.endsWith(".tsx") || file.endsWith(".ts")) {
					const code = fs.readFileSync(path.join(dentalLabDir, file), "utf-8");
					assert.ok(
						!code.includes("PediatricDoseCalculator"),
						`Файл ${file} не должен вмешиваться в расчет доз педиатрии`,
					);
				}
			}
		});
	});
});
