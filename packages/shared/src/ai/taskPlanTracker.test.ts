/**
 * @file packages/shared/src/ai/taskPlanTracker.test.ts
 * @description Изолированные глубокие Red Team тесты для TaskPlanTracker.
 * Проверяют создание плана, иммутабельные переходы состояний, детекцию циклов,
 * валидацию зависимостей blockedBy, расчет доступных шагов и форматирование промпта.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	TaskPlanTracker,
	addTaskPlanItem,
	createTaskPlan,
	detectPlanCycles,
	formatPlanForSystemPrompt,
	formatPlanSummary,
	getNextActionableItems,
	getPlanProgress,
	hasFailedItems,
	isPlanComplete,
	updateTaskPlanItemStatus,
	validateTaskPlanItems,
} from "./taskPlanTracker.js";

describe("TaskPlanTracker Core Engine", () => {
	it("1. Успешно создает валидный план задач и нормализует дефолтные статусы", () => {
		const plan = createTaskPlan(
			"Первичная настройка расписания и кабинетов клиники",
			[
				{ id: "step_1", title: "Инвентаризация рабочих мест" },
				{
					id: "step_2",
					title: "Настройка графиков врачей",
					blockedBy: ["step_1"],
				},
				{
					id: "step_3",
					title: "Тестовая запись пациента",
					blockedBy: ["step_2"],
				},
			],
			"plan_custom_101",
		);

		assert.equal(plan.taskId, "plan_custom_101");
		assert.equal(
			plan.goal,
			"Первичная настройка расписания и кабинетов клиники",
		);
		assert.equal(plan.items.length, 3);
		assert.equal(plan.items[0].status, "pending");
		assert.deepEqual(plan.items[0].blockedBy, []);
		assert.deepEqual(plan.items[1].blockedBy, ["step_1"]);
		assert.ok(plan.createdAt > 0);
		assert.ok(plan.updatedAt >= plan.createdAt);
	});

	it("2. Блокирует создание плана с пустой целью или пустым массивом задач", () => {
		assert.throws(
			() => createTaskPlan("", [{ id: "s1", title: "Шаг 1" }]),
			/Цель плана задач не может быть пустой/,
		);

		assert.throws(
			() => createTaskPlan("Цель", []),
			/План задач обязан содержать как минимум один шаг/,
		);
	});

	it("3. Иммутабельно обновляет статус шага и заметки, фиксируя свежий updatedAt", () => {
		const originalPlan = createTaskPlan("Аудит медицинской документации", [
			{ id: "audit_1", title: "Проверка согласий" },
			{ id: "audit_2", title: "Проверка карточек приёма" },
		]);

		const initialUpdatedAt = originalPlan.updatedAt;
		// Небольшая задержка для проверки изменения updatedAt
		const updatedPlan = updateTaskPlanItemStatus(
			originalPlan,
			"audit_1",
			"in_progress",
			"Проверено 10 бланков, замечаний нет",
		);

		// Оригинальный объект не мутировал
		assert.equal(originalPlan.items[0].status, "pending");
		assert.equal(originalPlan.items[0].notes, undefined);

		// Новый объект обновился
		assert.equal(updatedPlan.items[0].status, "in_progress");
		assert.equal(
			updatedPlan.items[0].notes,
			"Проверено 10 бланков, замечаний нет",
		);
		assert.equal(updatedPlan.items[1].status, "pending");
		assert.ok(updatedPlan.updatedAt >= initialUpdatedAt);

		// Бросает исключение при обновлении несуществующего шага
		assert.throws(
			() =>
				updateTaskPlanItemStatus(
					updatedPlan,
					"non_existent_id",
					"completed",
				),
			/Шаг 'non_existent_id' не найден в плане задач/,
		);
	});

	it("4. Вычисляет следующие доступные к исполнению шаги (getNextActionableItems) с учетом графа blockedBy", () => {
		let plan = createTaskPlan("Комплексная санация полости рта", [
			{ id: "diag", title: "Диагностика и фотопротокол" },
			{
				id: "hygiene",
				title: "Профессиональная гигиена",
				blockedBy: ["diag"],
			},
			{
				id: "caries_16",
				title: "Лечение кариеса 1.6",
				blockedBy: ["hygiene"],
			},
			{
				id: "caries_26",
				title: "Лечение кариеса 2.6",
				blockedBy: ["hygiene"],
			},
			{
				id: "crown_16",
				title: "Керамическая накладка 1.6",
				blockedBy: ["caries_16"],
			},
		]);

		// Изначально доступен только шаг "diag"
		let actionable = getNextActionableItems(plan);
		assert.equal(actionable.length, 1);
		assert.equal(actionable[0].id, "diag");

		// Завершаем "diag"
		plan = updateTaskPlanItemStatus(plan, "diag", "completed");
		actionable = getNextActionableItems(plan);
		assert.equal(actionable.length, 1);
		assert.equal(actionable[0].id, "hygiene");

		// Переводим "hygiene" в in_progress — он всё ещё actionable (активный шаг)
		plan = updateTaskPlanItemStatus(plan, "hygiene", "in_progress");
		actionable = getNextActionableItems(plan);
		assert.equal(actionable.length, 1);
		assert.equal(actionable[0].id, "hygiene");

		// Завершаем "hygiene" — теперь параллельно доступны оба кариеса (1.6 и 2.6)
		plan = updateTaskPlanItemStatus(plan, "hygiene", "completed");
		actionable = getNextActionableItems(plan);
		assert.equal(actionable.length, 2);
		assert.deepEqual(
			actionable.map((a) => a.id),
			["caries_16", "caries_26"],
		);

		// Пропуск шага caries_16 ('skipped') также разблокирует crown_16
		plan = updateTaskPlanItemStatus(
			plan,
			"caries_16",
			"skipped",
			"Полость закрыта временной пломбой ранее",
		);
		actionable = getNextActionableItems(plan);
		assert.equal(actionable.length, 2);
		assert.ok(actionable.some((a) => a.id === "caries_26"));
		assert.ok(actionable.some((a) => a.id === "crown_16"));
	});

	it("5. Корректно определяет завершенность плана (isPlanComplete) и наличие сбоев (hasFailedItems)", () => {
		let plan = createTaskPlan("Стерилизация наконечников", [
			{ id: "clean", title: "Очистка и смазка" },
			{ id: "pack", title: "Упаковка в крафт-пакет", blockedBy: ["clean"] },
			{ id: "autoclave", title: "Автоклавирование", blockedBy: ["pack"] },
		]);

		assert.equal(isPlanComplete(plan), false);
		assert.equal(hasFailedItems(plan), false);

		plan = updateTaskPlanItemStatus(plan, "clean", "completed");
		plan = updateTaskPlanItemStatus(plan, "pack", "completed");
		assert.equal(isPlanComplete(plan), false);

		// Завершаем последний шаг
		plan = updateTaskPlanItemStatus(plan, "autoclave", "completed");
		assert.equal(isPlanComplete(plan), true);
		assert.equal(hasFailedItems(plan), false);

		// Если один шаг с ошибкой (failed) — план не завершен
		plan = updateTaskPlanItemStatus(
			plan,
			"autoclave",
			"failed",
			"Сбой датчика давления автоклава",
		);
		assert.equal(isPlanComplete(plan), false);
		assert.equal(hasFailedItems(plan), true);
	});

	it("6. Red Team: Обнаруживает прямые и косвенные циклические зависимости в графе", () => {
		// Самоблокировка A -> A
		assert.throws(
			() =>
				validateTaskPlanItems([
					{ id: "task_a", title: "Шаг А", blockedBy: ["task_a"] },
				]),
			/Обнаружена циклическая зависимость: шаг 'task_a' зависит сам от себя/,
		);

		// Прямой взаимный цикл A -> B -> A
		const directCycleItems = [
			{ id: "task_a", title: "Шаг А", blockedBy: ["task_b"] },
			{ id: "task_b", title: "Шаг Б", blockedBy: ["task_a"] },
		];
		const cycle1 = detectPlanCycles(directCycleItems);
		assert.ok(cycle1 !== null);
		assert.throws(
			() => validateTaskPlanItems(directCycleItems),
			/Обнаружена циклическая зависимость в плане задач/,
		);

		// Косвенный цикл 3 узлов: A -> B -> C -> A
		const indirectCycleItems = [
			{ id: "task_1", title: "Шаг 1", blockedBy: ["task_3"] },
			{ id: "task_2", title: "Шаг 2", blockedBy: ["task_1"] },
			{ id: "task_3", title: "Шаг 3", blockedBy: ["task_2"] },
		];
		const cycle2 = detectPlanCycles(indirectCycleItems);
		assert.ok(cycle2 !== null);
		assert.throws(
			() => validateTaskPlanItems(indirectCycleItems),
			/Обнаружена циклическая зависимость в плане задач/,
		);
	});

	it("7. Red Team: Отлавливает ссылки на несуществующие шаги и дубликаты идентификаторов", () => {
		// Дубликаты ID
		assert.throws(
			() =>
				validateTaskPlanItems([
					{ id: "step_same", title: "Первый" },
					{ id: "step_same", title: "Второй" },
				]),
			/Обнаружен дубликат идентификатора шага/,
		);

		// Ссылка на несуществующий шаг
		assert.throws(
			() =>
				validateTaskPlanItems([
					{ id: "step_1", title: "Первый" },
					{
						id: "step_2",
						title: "Второй",
						blockedBy: ["ghost_step_999"],
					},
				]),
			/Шаг плана 'step_2' зависит от несуществующего шага 'ghost_step_999'/,
		);
	});

	it("8. Динамически добавляет новый шаг в план (addTaskPlanItem) с перевалидацией", () => {
		let plan = createTaskPlan("Подготовка к операции", [
			{ id: "prep", title: "Премедикация" },
			{ id: "anesthesia", title: "Инфильтрационная анестезия" },
		]);

		assert.equal(plan.items.length, 2);

		// Добавляем шаг динамически
		plan = addTaskPlanItem(plan, {
			id: "hemostasis",
			title: "Гемостаз операционного поля",
			blockedBy: ["anesthesia"],
			notes: "Приготовить гемостатическую губку",
		});

		assert.equal(plan.items.length, 3);
		assert.equal(plan.items[2].id, "hemostasis");
		assert.deepEqual(plan.items[2].blockedBy, ["anesthesia"]);

		// Попытка добавить шаг с дублирующимся ID отвергается
		assert.throws(
			() =>
				addTaskPlanItem(plan, {
					id: "prep",
					title: "Повторная премедикация",
				}),
			/Обнаружен дубликат идентификатора шага/,
		);
	});

	it("9. Форматирует компактный Markdown для системного промпта и краткое резюме без бюрократического канцелярита", () => {
		let plan = createTaskPlan("Настройка фискального регистратора", [
			{ id: "check_usb", title: "Проверка USB-подключения кассы" },
			{
				id: "driver_test",
				title: "Тест драйвера ККМ",
				blockedBy: ["check_usb"],
			},
			{
				id: "sample_receipt",
				title: "Печать пробного нулевого чека",
				blockedBy: ["driver_test"],
			},
		]);

		plan = updateTaskPlanItemStatus(
			plan,
			"check_usb",
			"completed",
			"Порт COM3 обнаружен",
		);
		plan = updateTaskPlanItemStatus(
			plan,
			"driver_test",
			"in_progress",
			"Ожидание ответа эмулятора",
		);

		const promptBlock = formatPlanForSystemPrompt(plan);
		assert.ok(
			promptBlock.includes(
				'### 📋 ПЛАН ВЫПОЛНЕНИЯ ЗАДАЧИ: "Настройка фискального регистратора"',
			),
		);
		assert.ok(promptBlock.includes("[x] #1 [check_usb]"));
		assert.ok(promptBlock.includes("[>] #2 [driver_test]"));
		assert.ok(promptBlock.includes("⚡ ТЕКУЩИЙ ШАГ"));
		assert.ok(promptBlock.includes("Примечание: Порт COM3 обнаружен"));
		assert.ok(
			promptBlock.includes("Доступно к выполнению прямо сейчас: 'driver_test'"),
		);

		const summary = formatPlanSummary(plan);
		assert.ok(summary.includes("Настройка фискального регистратора"));
		assert.ok(summary.includes("Активен: 'Тест драйвера ККМ'"));

		const progress = getPlanProgress(plan);
		assert.equal(progress.total, 3);
		assert.equal(progress.completed, 1);
		assert.equal(progress.inProgress, 1);
		assert.equal(progress.pending, 1);
		assert.equal(progress.percent, 33);
	});

	it("10. Класс TaskPlanTracker предоставляет чистый fluent-интерфейс и JSON-сериализацию", () => {
		const tracker = TaskPlanTracker.create(
			"Формирование дневника визита",
			[
				{ id: "anamnesis", title: "Сбор анамнеза и жалоб" },
				{
					id: "examination",
					title: "Осмотр зубов",
					blockedBy: ["anamnesis"],
				},
				{
					id: "diagnosis",
					title: "Постановка диагноза",
					blockedBy: ["examination"],
				},
			],
			"plan_diary_555",
		);

		assert.equal(tracker.isComplete(), false);
		assert.equal(tracker.getNextActionable().length, 1);
		assert.equal(tracker.getNextActionable()[0].id, "anamnesis");

		// Цепочка fluent-вызовов
		tracker
			.updateStatus("anamnesis", "completed")
			.updateStatus("examination", "completed")
			.updateStatus("diagnosis", "completed", "Кариес эмали 2.1");

		assert.equal(tracker.isComplete(), true);
		assert.equal(tracker.hasFailures(), false);

		// Сериализация и восстановление из JSON
		const jsonString = tracker.toJson();
		assert.ok(jsonString.includes("plan_diary_555"));

		const restoredTracker = TaskPlanTracker.fromJson(jsonString);
		assert.equal(restoredTracker.getPlan().taskId, "plan_diary_555");
		assert.equal(restoredTracker.isComplete(), true);
		assert.equal(
			restoredTracker.getPlan().items[2].notes,
			"Кариес эмали 2.1",
		);
	});
});
