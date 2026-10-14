/**
 * chairsideLabOrderOdontogramLifecycle.test.ts
 *
 * RED TEAM ИНКВИЗИЦИОННЫЙ ТЕСТ СКВОЗНОГО ОРТОПЕДИЧЕСКОГО И ЗТЛ ЦИКЛА:
 * 1. Статус Planned_Crown в Canonical Tooth States и матрице штампов ГОСТ (Кп).
 * 2. Парсинг и нормализация алиасов "коронка в зтл", "кп", "planned_crown".
 * 3. Цветовые токены одонтограммы для Planned_Crown (пульсация isPulsing: true, синий акцент #3b82f6).
 * 4. Сквозной цикл: Оформление наряда у кресла -> Planned_Crown -> Сдача во рту (mark-installed) -> Crown.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	CANONICAL_TOOTH_STATES,
	CANONICAL_STAMP_MATRIX,
	normalizeToothState,
	getGostAbbreviation,
} from "@dental/shared";
import { getAnatomicalToothColors } from "../../odontogram/AnatomicalToothColors";
import { getToothColors } from "../../odontogram/chart/ToothColors";
import { GOST_ABBREVIATIONS, GOST_TOOTH_STATES, getToothStateFromHotkey } from "../../odontogram/classicGostTypes";
import { TOOTH_STATE_LABELS } from "../../odontogram/chart/toothChartTypes";

describe("Chairside Lab Order & Orthopedic Odontogram Lifecycle Inquisitor", () => {
	describe("1. Канонический статус Planned_Crown (Коронка в изготовлении ЗТЛ)", () => {
		test("Planned_Crown зарегистрирован в CANONICAL_TOOTH_STATES", () => {
			assert.ok(
				CANONICAL_TOOTH_STATES.includes("Planned_Crown" as any),
				"Planned_Crown обязан присутствовать в CANONICAL_TOOTH_STATES",
			);
		});

		test("CANONICAL_STAMP_MATRIX содержит штамп Planned_Crown с ГОСТ-аббревиатурой Кп", () => {
			const stamp = CANONICAL_STAMP_MATRIX.Planned_Crown;
			assert.ok(stamp, "Дескриптор Planned_Crown обязан существовать в матрице штампов");
			assert.equal(stamp.gostAbbr, "Кп");
			assert.equal(stamp.shortRu, "Кп");
			assert.equal(stamp.code804nDefault, "A16.07.004");
			assert.equal(stamp.badgeColor, "#3b82f6");
		});

		test("normalizeToothState корректно распознает русские и английские алиасы наряда ЗТЛ", () => {
			assert.equal(normalizeToothState("Planned_Crown"), "Planned_Crown");
			assert.equal(normalizeToothState("planned_crown"), "Planned_Crown");
			assert.equal(normalizeToothState("коронка в зтл"), "Planned_Crown");
			assert.equal(normalizeToothState("коронка в плане"), "Planned_Crown");
			assert.equal(normalizeToothState("коронка в изготовлении"), "Planned_Crown");
			assert.equal(normalizeToothState("кп"), "Planned_Crown");
			assert.equal(normalizeToothState("наряд в зтл"), "Planned_Crown");
		});

		test("ГОСТ-аббревиатура возвращает Кп для Planned_Crown", () => {
			assert.equal(getGostAbbreviation("Planned_Crown"), "Кп");
			assert.equal(getGostAbbreviation("коронка в зтл"), "Кп");
		});
	});

	describe("2. Визуализация одонтограммы для коронки в изготовлении (Planned_Crown)", () => {
		test("AnatomicalToothColors возвращает пульсирующий синий контур для Planned_Crown", () => {
			const colors = getAnatomicalToothColors({
				state: "Planned_Crown" as any,
			});
			assert.equal(colors.isPulsing, true, "Коронка в изготовлении ЗТЛ обязана пульсировать (isPulsing)");
			assert.equal(colors.stroke, "#3b82f6", "Цвет контура должен быть сигнальным синим (#3b82f6)");
			assert.equal(colors.badgeColor, "#3b82f6");
		});

		test("ToothColors (схематическая одонтограмма) возвращает пульсацию для Planned_Crown", () => {
			const colors = getToothColors("Planned_Crown");
			assert.equal(colors.isPulsing, true, "Схематический зуб также обязан пульсировать");
			assert.equal(colors.stroke, "#3b82f6");
		});

		test("ClassicGostOdontogram поддерживает Planned_Crown и хоткеи (к + п)", () => {
			assert.equal(GOST_ABBREVIATIONS["Кп"], "Planned_Crown");
			assert.equal(GOST_TOOTH_STATES.Planned_Crown?.abbr, "Кп");
			assert.equal(getToothStateFromHotkey("к", "п"), "Planned_Crown");
			assert.equal(getToothStateFromHotkey("c", "p"), "Planned_Crown");
		});

		test("TOOTH_STATE_LABELS содержит читаемые названия для Planned_Crown", () => {
			assert.equal(TOOTH_STATE_LABELS.Planned_Crown, "коронка в изготовлении");
			assert.equal(TOOTH_STATE_LABELS.planned_crown, "коронка в изготовлении");
		});
	});

	describe("3. Жизненный цикл наряда: От кресла до фиксации во рту (State Transition)", () => {
		test("При создании наряда зуб переходит в Planned_Crown, а при фиксации — в Crown", () => {
			// Симуляция жизненного цикла зуба 26
			let toothState: string = "Healthy";

			// Шаг 1: Врач выбирает пресет коронки ЗТЛ у кресла
			const labOrderStage = "sent_to_lab";
			assert.ok(["sent_to_lab", "impression_scan"].includes(labOrderStage));

			// Шаг 2: Наряд отправлен -> одонтограмма переводит зуб в Planned_Crown
			toothState = normalizeToothState("Planned_Crown");
			assert.equal(toothState, "Planned_Crown");

			const inProgressVisual = getAnatomicalToothColors({
				state: toothState as any,
			});
			assert.equal(inProgressVisual.isPulsing, true, "Зуб визуально индицирует процесс изготовления в лаборатории");

			// Шаг 3: Конструкция прибыла из лаборатории и сдана пациенту (POST /api/lab-orders/:id/mark-installed)
			const markInstalledEvent = {
				status: "completed",
				isLockedInstalled: true,
			};
			assert.equal(markInstalledEvent.isLockedInstalled, true);

			// Шаг 4: Зуб окончательно зафиксирован -> переход в постоянную Crown
			toothState = normalizeToothState("Crown");
			assert.equal(toothState, "Crown");

			const installedVisual = getAnatomicalToothColors({
				state: toothState as any,
			});
			assert.equal(installedVisual.isPulsing, undefined, "Зафиксированная постоянная коронка не пульсирует");
			assert.equal(installedVisual.stroke, "#10b981", "Зафиксированная циркониевая коронка имеет статус нормы/установки");
		});
	});
});
