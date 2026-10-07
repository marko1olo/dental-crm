/**
 * nurseFefoAutonomyWave310.test.tsx
 *
 * БОЕВОЙ ТЕСТОВЫЙ НАБОР: Склад и медсестра без бюрократии (Мандаты 8e, 8n, 8v).
 * 1. 1-клик списание пустых карпул анестетиков и клинических пакетов (СанПиН 3.3686-21).
 * 2. Мягкий овердрафт склада (Zero Dead-Ends: задержка накладной не блокирует операцию).
 * 3. Автоматический FEFO-светофор срока годности (зеленый / желтый / красный).
 * 4. Защита от эмодзи (строго векторные Lucide-иконки) и профессиональная русская локализация.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	getFefoTrafficLight,
	NurseCarpuleDisposalModal,
	type FefoTrafficLightInfo,
} from "../NurseCarpuleDisposalModal";
import { COMMON_ANESTHETICS } from "../carpuleDisposalConstants.js";

describe("Wave 310: Inventory & Nurse Chairside FEFO Inquisitor (Mandates 8e, 8n, 8v)", () => {
	const refDate = new Date("2026-09-24T00:00:00Z");

	describe("1. Автоматический FEFO-светофор срока годности (getFefoTrafficLight)", () => {
		it("зеленый статус (green / FEFO норма) для свежих партий со сроком > 30 дней", () => {
			// 2027-06-30 от 2026-09-24 — более 9 месяцев запаса (> 30 дней)
			const fefo = getFefoTrafficLight("2027-06", refDate);
			assert.equal(fefo.status, "green");
			assert.equal(fefo.badgeText, "FEFO норма");
			assert.equal(fefo.dotColor, "#10b981");
			assert.ok(fefo.daysLeft > 30);
			assert.ok(fefo.tooltip.includes("FEFO OK"));
		});

		it("желтый статус (yellow / FEFO приоритет) для партий с истекающим сроком (1..30 дней)", () => {
			// 2026-10-15 от 2026-09-24 — осталось 21 день (<= 30 дней)
			const fefo = getFefoTrafficLight("2026-10-15", refDate);
			assert.equal(fefo.status, "yellow");
			assert.equal(fefo.badgeText, "FEFO приоритет");
			assert.equal(fefo.dotColor, "#f59e0b");
			assert.equal(fefo.daysLeft, 21);
			assert.equal(fefo.className, "inventory-expiry-soon");
			assert.ok(fefo.tooltip.includes("приоритет списания по регламенту FEFO"));
		});

		it("красный статус (red / Просрочен) для просроченных партий (daysLeft < 0)", () => {
			// 2026-08-01 от 2026-09-24 — просрочено на 54 дня
			const fefo = getFefoTrafficLight("2026-08-01", refDate);
			assert.equal(fefo.status, "red");
			assert.equal(fefo.badgeText, "Просрочен");
			assert.equal(fefo.dotColor, "#ef4444");
			assert.ok(fefo.daysLeft < 0);
			assert.equal(fefo.className, "inventory-expiry-expired");
			assert.ok(fefo.tooltip.includes("запрещено использовать на пациентах"));
		});

		it("красный статус (red / Истекает сегодня) при daysLeft === 0", () => {
			const fefo = getFefoTrafficLight("2026-09-24", refDate);
			assert.equal(fefo.status, "red");
			assert.equal(fefo.badgeText, "Истекает сегодня");
			assert.equal(fefo.daysLeft, 0);
			assert.equal(fefo.dotColor, "#ef4444");
			assert.ok(fefo.tooltip.includes("Использовать сегодня или списать в утиль"));
		});

		it("корректно парсит российский формат ДД.ММ.ГГГГ", () => {
			const fefoGreen = getFefoTrafficLight("31.12.2028", refDate);
			assert.equal(fefoGreen.status, "green");

			const fefoYellow = getFefoTrafficLight("10.10.2026", refDate);
			assert.equal(fefoYellow.status, "yellow");

			const fefoRed = getFefoTrafficLight("01.01.2025", refDate);
			assert.equal(fefoRed.status, "red");
		});

		it("безопасно обрабатывает пустые или некорректные строки без падений", () => {
			const fefoEmpty = getFefoTrafficLight("", refDate);
			assert.equal(fefoEmpty.status, "green");
			assert.equal(fefoEmpty.badgeText, "Без срока");

			const fefoNull = getFefoTrafficLight(null, refDate);
			assert.equal(fefoNull.status, "green");

			const fefoInvalid = getFefoTrafficLight("not-a-date", refDate);
			assert.equal(fefoInvalid.status, "green");
		});
	});

	describe("2. Списание карпул и пакетов в 1 клик (Мандаты 8e п. 10, 8v)", () => {
		it("отображает модальное окно с пакетами, карпулами и СанПиН 3.3686-21 без комиссии из 3 человек", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					initialNurseName="Смирнова А.В."
					initialDoctorName="Д-р Кузнецов М.С."
					initialDate="2026-09-24"
					currentStockAvailable={10}
				/>,
			);

			// Заголовок и регламент СанПиН 3.3686-21
			assert.ok(
				html.includes("Пакеты материалов: Учет карпул") ||
					html.includes("1-клик пакеты: Учет карпул"),
				"Должен быть заголовок учета карпул",
			);
			assert.ok(
				html.includes("СанПиН 3.3686-21 Быстрая утилизация врачом/админом (без комиссии из 3 человек)"),
				"Должно быть указание на ликвидацию комиссии из 3 человек",
			);

			// 4 канонических клинических пакета
			assert.ok(html.includes('data-testid="btn-writeoff-anesthesia-packet"'), "Кнопка пакета «Стандартная анестезия»");
			assert.ok(html.includes('data-testid="btn-writeoff-hygiene-packet"'), "Кнопка пакета «Профгигиена»");
			assert.ok(html.includes('data-testid="btn-writeoff-filling-packet"'), "Кнопка пакета «Пломба световая»");
			assert.ok(html.includes('data-testid="btn-writeoff-surgery-packet"'), "Кнопка пакета «Хирургия»");

			// Первичная кнопка списания карпул
			assert.ok(html.includes('data-testid="btn-nurse-submit-disposal"'), "Первичная кнопка списания карпул");
			assert.ok(html.includes("Списать карпулы (1 шт.)"), "Текст первичной кнопки списания");

			// Единоличное списание без комиссии
			assert.ok(
				html.includes("Списание использованных карпул анестетика (СанПиН 3.3686-21):") ||
					html.includes("Списание в 1 клик (СанПиН 3.3686-21):"),
				"Подтверждение списания без комиссии",
			);
		});

		it("отображает быстрые чипсы выбора количества карпул (1, 2, 5, 10, 15 вся смена)", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					currentStockAvailable={20}
				/>,
			);

			assert.ok(html.includes("1 шт."), "Чипс 1 шт.");
			assert.ok(html.includes("2 шт."), "Чипс 2 шт.");
			assert.ok(html.includes("5 шт."), "Чипс 5 шт.");
			assert.ok(html.includes("10 шт."), "Чипс 10 шт.");
			assert.ok(html.includes("Вся смена (15)"), "Чипс всей смены на 15 карпул");
		});

		it("включает фильтр-чипсы анестетиков по Закону Хика (34px)", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					currentStockAvailable={10}
				/>,
			);

			assert.ok(html.includes("Ультракаин Форте (1:100к)"), "Чипс Ультракаин Форте");
			assert.ok(html.includes("Ультракаин Д-С (1:200к)"), "Чипс Ультракаин Д-С");
			assert.ok(html.includes("Скандонест 3% (без адреналина)"), "Чипс Скандонест");
			assert.ok(html.includes("Септанест (1:100к)"), "Чипс Септанест");
		});
	});

	describe("3. Мягкий овердрафт склада (Мандат 8n, Zero Dead-Ends)", () => {
		it("при нехватке материала на складе активирует информационный баннер овердрафта", () => {
			// На складе 0 шт., требуется списать 1 шт.
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					currentStockAvailable={0}
					initialDate="2026-09-24"
				/>,
			);

			// Баннер мягкого овердрафта
			assert.ok(html.includes('data-testid="nurse-disposal-overdraft-banner"'), "Баннер овердрафта должен присутствовать");
			assert.ok(
				html.includes("Мягкий овердрафт склада активен (СанПиН / Спасение зуба)"),
				"Заголовок мягкого овердрафта должен отображаться",
			);
			assert.ok(
				html.includes("Задержка оприходования накладной поставщика не блокирует операцию!"),
				"Инвариант: операция не блокируется при задержке накладной",
			);
			assert.ok(
				html.includes("На складе числится 0 шт., списывается 1 шт."),
				"Информация о дефиците на складе",
			);

			// Кнопка списания НЕ заблокирована (autonomy invariant)
			assert.ok(
				!html.includes('data-testid="btn-nurse-submit-disposal" disabled=""') &&
				!html.includes('data-testid="btn-nurse-submit-disposal" disabled'),
				"Кнопка списания не должна быть disabled при овердрафте",
			);
		});

		it("динамически определяет овердрафт по карте остатков stockMap", () => {
			const stockMap = {
				articaine_100k: 5,
				mepivacaine_3: 0, // Дефицит мепивакаина
			};

			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					stockMap={stockMap}
					currentStockAvailable={0}
				/>,
			);

			// По умолчанию выбран articaine_100k, остаток 5 >= 1 -> овердрафта нет
			assert.ok(
				html.includes("Быстрое списание расходников (СанПиН 3.3686-21)"),
				"В штатном режиме отображается штатный статус",
			);
			assert.ok(
				!html.includes("Мягкий овердрафт склада активен"),
				"Баннер овердрафта не должен быть активен, когда товар есть на складе",
			);
		});
	});

	describe("4. FEFO-светофор в интерфейсе модалки (NurseCarpuleDisposalModal)", () => {
		it("рендерит плашку FEFO-светофора с корректными атрибутами и статусом", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					initialDate="2026-09-24"
					currentStockAvailable={10}
				/>,
			);

			// Плашка FEFO светофора
			assert.ok(html.includes('data-testid="nurse-fefo-traffic-light"'), "Плашка FEFO светофора");
			assert.ok(html.includes('data-fefo-status="green"'), "Статус FEFO green для стандартного препарата");
			assert.ok(html.includes('data-testid="nurse-fefo-badge"'), "Бейдж статуса FEFO");
			assert.ok(html.includes("FEFO: Норма"), "Текст статуса FEFO: Норма");

			// Точки светофора на чипсах быстрого выбора
			assert.ok(html.includes('data-fefo-dot="green"'), "Точка светофора на чипсе анестетика");
		});

		it("включает FEFO-маркировку в выпадающем списке select", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					initialDate="2026-09-24"
					currentStockAvailable={10}
				/>,
			);

			assert.ok(html.includes("[FEFO: FEFO норма]"), "FEFO статус в теге option");
		});
	});

	describe("5. Безупречная гигиена и отсутствие эмодзи (Mandate 8d п. 7)", () => {
		it("не содержит мультяшных эмодзи в разметке модалки", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={true}
					onClose={() => {}}
					currentStockAvailable={0}
				/>,
			);

			// Регулярное выражение для поиска эмодзи
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.equal(emojiRegex.test(html), false, "В разметке не должно быть мультяшных эмодзи");
		});

		it("не рендерит ничего при isOpen = false", () => {
			const html = renderToString(
				<NurseCarpuleDisposalModal
					isOpen={false}
					onClose={() => {}}
				/>,
			);
			assert.equal(html, "");
		});
	});
});
