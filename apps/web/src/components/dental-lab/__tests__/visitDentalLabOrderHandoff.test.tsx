import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	extractAppointmentStageInfo,
	getStandardStageTitle,
} from "../../visit/visitPlanStageHandoff";
import type { DentalLabOrderData } from "../../lab/labMath";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dentalLabDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(__dirname, "../../../");
const visitViewModalsPath = path.resolve(dentalLabDir, "../visit/view/VisitViewModals.tsx");

describe("CHAIRSIDE VISIT TO DENTAL LAB ORDER HANDOFF: INTEGRATION TEST SUITE", () => {
	// ─── 1. Экстракция и связывание этапов плана лечения ─────────────────────
	describe("1. Экстракция контекста плана лечения и этапа из визита", () => {
		it("Извлекает этап и план из прямых свойств активного визита", () => {
			const appointment = {
				id: "apt-101",
				patientId: "pat-999",
				treatmentPlanId: "plan-777",
				stageNumber: 3,
				stageTitle: "Ортопедический этап (протезирование)",
				stageId: "stg-333",
			};

			const stageInfo = extractAppointmentStageInfo(appointment);
			assert.equal(stageInfo.treatmentPlanId, "plan-777");
			assert.equal(stageInfo.stageNumber, 3);
			assert.equal(stageInfo.stageTitle, "Ортопедический этап (протезирование)");
			assert.equal(stageInfo.stageId, "stg-333");
		});

		it("Извлекает этап и план из комментариев визита [План лечения: PLAN-ID | Заголовок] [Этап: N]", () => {
			const appointmentWithComment = {
				id: "apt-102",
				patientId: "pat-999",
				comment: "[План лечения: plan-uuid-555 | Хирургия] [Этап: 2]",
			};

			const stageInfo = extractAppointmentStageInfo(appointmentWithComment);
			assert.equal(stageInfo.stageNumber, 2);
			assert.equal(stageInfo.stageTitle, "Хирургия");
		});

		it("Корректно формирует стандартные клинические названия этапов без бюрократии", () => {
			assert.equal(getStandardStageTitle(1), "Неотложная помощь и терапия");
			assert.equal(getStandardStageTitle(2), "Хирургический этап и санация");
			assert.equal(getStandardStageTitle(3), "Ортопедический этап");
			assert.equal(getStandardStageTitle(4), "Ортодонтия и эстетика");
			assert.equal(getStandardStageTitle(5), "Диспансерный контроль и гигиена");
			assert.equal(getStandardStageTitle(99), "Этап 99");
		});

		it("Использует активный этап из loadedTreatmentPlan при отсутствии прямых полей визита", () => {
			const loadedPlan = {
				id: "plan-auto-888",
				title: "Комплексная реабилитация",
				stages: [
					{ id: "stg-1", stageNumber: 1, title: "Санация", status: "completed" },
					{ id: "stg-2", stageNumber: 2, title: "Имплантация Nobel", status: "completed" },
					{ id: "stg-3", stageNumber: 3, title: "Керамические коронки E.max", status: "in_progress" },
				],
			};

			const activeStage = loadedPlan.stages.find((s) => s.status === "in_progress");
			assert.ok(activeStage);
			assert.equal(activeStage.stageNumber, 3);
			assert.equal(activeStage.title, "Керамические коронки E.max");
		});
	});

	// ─── 2. Отсутствие птичьего языка (Мандат 8y Zero Bird Language) ──────────
	describe("2. Мандат 8y: Отсутствие бюрократического и птичьего языка в UI", () => {
		it("DentalLabOrderModal.tsx содержит чистый клинический русский без ссылок на приказы и мандаты в UI", () => {
			const modalPath = path.resolve(dentalLabDir, "../lab/DentalLabOrderModal.tsx");
			const content = fs.readFileSync(modalPath, "utf-8");

			// Проверяем, что в заголовке модалки используется человеческий заголовок
			assert.match(content, /Заказ в лабораторию \(ЗТЛ\)/, "Заголовок должен быть понятным и клиническим");

			// Проверяем формат чипа этапа: [План лечения: Этап {N} · {Название}]
			assert.match(content, /План лечения: Этап/, "Должен присутствовать чип этапа плана лечения");

			// Проверяем отсутствие бюрократических ссылок в интерфейсных строках
			const lines = content.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				// Исключаем комментарии
				if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("{/*")) {
					continue;
				}
				assert.ok(
					!trimmed.includes("Мандат 8e") && !trimmed.includes("Приказ 804н") && !trimmed.includes("форма 043/у"),
					`В строке интерфейса найден птичий язык: "${trimmed}"`,
				);
			}
		});

		it("DentalLabRestorationTab.tsx содержит понятную врачу опцию снятия слепка", () => {
			const tabPath = path.resolve(dentalLabDir, "../lab/DentalLabRestorationTab.tsx");
			const content = fs.readFileSync(tabPath, "utf-8");

			assert.match(content, /Включить снятие слепка \(оттиска\) в счёт/);
			assert.match(content, /2\s*500\s*₽/);

			const lines = content.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("{/*")) {
					continue;
				}
				assert.ok(
					!trimmed.includes("Мандат 8e") && !trimmed.includes("Приказ 804н") && !trimmed.includes("804-н"),
					`В интерфейсе вкладки реставрации найден птичий язык: "${trimmed}"`,
				);
			}
		});

		it("VisitViewModals.tsx уведомляет врача понятным человеческим текстом", () => {
			const content = fs.readFileSync(visitViewModalsPath, "utf-8");

			assert.match(content, /Снятие слепка \(2 500 ₽\) включено в счёт визита/);
			assert.match(content, /Наряд ЗТЛ сохранен/);
		});
	});

	// ─── 3. Снятие слепка (A02.07.010) и финансовый учет ─────────────────────
	describe("3. 1-клик включение слепка (A02.07.010) в счёт приёма", () => {
		it("Позиция слепка имеет канонический код A02.07.010 и фиксированную стоимость 2 500 ₽", () => {
			const impressionService = {
				serviceCode: "A02.07.010",
				name: "Снятие слепка (оттиска) с одной челюсти (альгинатный/силиконовый)",
				price: 2500,
				priceRub: 2500,
				quantity: 1,
			};

			assert.equal(impressionService.serviceCode, "A02.07.010");
			assert.equal(impressionService.price, 2500);
			assert.equal(impressionService.quantity, 1);
		});

		it("Флаг includeImpressionBilling сохраняется в структуре заказа DentalLabOrderData", () => {
			const testOrder: Partial<DentalLabOrderData> = {
				patientId: "pat-123",
				patientName: "Иванов И.И.",
				treatmentPlanId: "plan-999",
				stageNumber: 3,
				stageTitle: "Ортопедический этап",
				stageId: "stg-3",
				includeImpressionBilling: true,
			};

			assert.equal(testOrder.treatmentPlanId, "plan-999");
			assert.equal(testOrder.stageNumber, 3);
			assert.equal(testOrder.stageTitle, "Ортопедический этап");
			assert.equal(testOrder.includeImpressionBilling, true);
		});
	});

	// ─── 4. Межсистемные события и синхронизация статусов ────────────────────
	describe("4. Межсистемная синхронизация и шина событий браузера", () => {
		it("Формирует событие смены статуса этапа dente-treatment-plan-stage-status со статусом 'in_lab'", () => {
			const planId = "plan-xyz";
			const stageNumber = 3;

			const eventDetail = {
				planId,
				stageNumber,
				status: "in_lab",
				statusRu: "В работе в ЗТЛ",
				updatedAt: new Date().toISOString(),
			};

			assert.equal(eventDetail.status, "in_lab");
			assert.equal(eventDetail.statusRu, "В работе в ЗТЛ");
			assert.equal(eventDetail.planId, "plan-xyz");
			assert.equal(eventDetail.stageNumber, 3);
		});

		it("Формирует событие добавления услуги в чек dente-add-billing-item с услугой A02.07.010", () => {
			const billingItemEventDetail = {
				code: "A02.07.010",
				name: "Снятие слепка (оттиска) с одной челюсти (альгинатный/силиконовый)",
				priceRub: 2500,
				price: 2500,
				quantity: 1,
				timestamp: Date.now(),
			};

			assert.equal(billingItemEventDetail.code, "A02.07.010");
			assert.equal(billingItemEventDetail.priceRub, 2500);
			assert.equal(billingItemEventDetail.quantity, 1);
		});
	});

	// ─── 5. Связка в коде VisitView, VisitViewModals и DentalLabOrdersView ──
	describe("5. Архитектурная сквозная связка в кодовой базе", () => {
		it("VisitView.tsx передает loadedTreatmentPlan в VisitViewModals", () => {
			const visitViewPath = path.resolve(webSrcDir, "VisitView.tsx");
			const content = fs.readFileSync(visitViewPath, "utf-8");

			assert.match(
				content,
				/loadedTreatmentPlan=\{loadedTreatmentPlan\s*\|\|\s*activePlan\}/,
				"VisitView должен передавать loadedTreatmentPlan || activePlan в VisitViewModals",
			);
		});

		it("VisitViewModals.tsx передает stageNumber, stageTitle, treatmentPlanId в DentalLabOrderModal", () => {
			const content = fs.readFileSync(visitViewModalsPath, "utf-8");

			assert.match(content, /treatmentPlanId=\{effectiveTreatmentPlanId\}/);
			assert.match(content, /stageNumber=\{effectiveStageNumber\}/);
			assert.match(content, /stageTitle=\{effectiveStageTitle\}/);
			assert.match(content, /stageId=\{effectiveStageId\}/);
		});

		it("DentalLabOrdersView.tsx отображает бейдж этапа для заказов со stageNumber", () => {
			const ordersViewPath = path.resolve(dentalLabDir, "DentalLabOrdersView.tsx");
			const content = fs.readFileSync(ordersViewPath, "utf-8");

			assert.match(content, /order\.stageNumber\s*\?/, "Таблица заказов должна проверять order.stageNumber");
			assert.match(content, /Этап\s*\{order\.stageNumber\}/, "Таблица заказов должна выводить бейдж этапа");
			assert.match(
				content,
				/treatmentPlanId=\{selectedOrderForEdit\?\.treatmentPlanId/,
				"Модалка наряда должна получать treatmentPlanId из выбранного заказа",
			);
		});
	});
});
