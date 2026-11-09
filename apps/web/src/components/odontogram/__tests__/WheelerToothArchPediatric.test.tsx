/**
 * apps/web/src/components/odontogram/__tests__/WheelerToothArchPediatric.test.tsx
 *
 * Тестовый сьют верификации детской одонтограммы Wheeler 2.5D, молочных моляров и сменного прикуса.
 * Мандаты 8ar, 8as, 8e, 8ba.
 */

import React from "react";
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WheelerToothArch } from "../WheelerToothArch";
import { AnatomicalTooth } from "../gate0/AnatomicalTooth";

describe("WheelerToothArch Pediatric & Mixed Dentition Suite", () => {
	test("В режиме dentitionMode='pediatric' рендерит 20 молочных зубов и динамические заголовки", () => {
		const html = renderToStaticMarkup(
			<WheelerToothArch
				dentitionMode="pediatric"
				mode="history"
				patientId="test-patient-123"
			/>
		);

		// Проверяем data-атрибуты
		assert.ok(html.includes('data-dentition-mode="pediatric"'), "Обязан быть data-dentition-mode='pediatric'");

		// Проверяем заголовки дуг
		assert.ok(html.includes("Верхняя молочная челюсть (55–65)"), "Обязан быть заголовок верхней молочной челюсти");
		assert.ok(html.includes("Нижняя молочная челюсть (85–75)"), "Обязан быть заголовок нижней молочной челюсти");
		assert.ok(html.includes("Историческая панорама Wheeler 2.5D (молочный прикус)"), "Обязан быть заголовок молочной панорамы");

		// Проверяем наличие всех 20 молочных зубов
		const pediatricTeeth = [
			55, 54, 53, 52, 51,
			61, 62, 63, 64, 65,
			85, 84, 83, 82, 81,
			71, 72, 73, 74, 75,
		];
		for (const t of pediatricTeeth) {
			assert.ok(
				html.includes(`data-tooth-number="${t}"`),
				`Молочный зуб ${t} обязан присутствовать в детской формуле`,
			);
		}

		// Постоянных зубов быть не должно
		assert.equal(html.includes('data-tooth-number="11"'), false, "Постоянный зуб 11 не должен рендериться в детском прикусе");
		assert.equal(html.includes('data-tooth-number="16"'), false, "Постоянный зуб 16 не должен рендериться в детском прикусе");
		assert.equal(html.includes('data-tooth-number="46"'), false, "Постоянный зуб 46 не должен рендериться в детском прикусе");
		assert.equal(html.includes('data-tooth-number="18"'), false, "Зуб мудрости 18 не должен рендериться в детском прикусе");
	});

	test("В режиме dentitionMode='mixed' рендерит сменный прикус (20 молочных + 4 постоянных моляра 16, 26, 36, 46)", () => {
		const html = renderToStaticMarkup(
			<WheelerToothArch
				dentitionMode="mixed"
				mode="interactive"
			/>
		);

		assert.ok(html.includes('data-dentition-mode="mixed"'), "Обязан быть data-dentition-mode='mixed'");
		assert.ok(html.includes("Верхняя челюсть (сменный прикус)"), "Обязан быть заголовок сменного верхнего прикуса");
		assert.ok(html.includes("Нижняя челюсть (сменный прикус)"), "Обязан быть заголовок сменного нижнего прикуса");

		// Постоянные первые моляры
		assert.ok(html.includes('data-tooth-number="16"'), "Первый верхний правый постоянный моляр 16 обязан быть");
		assert.ok(html.includes('data-tooth-number="26"'), "Первый верхний левый постоянный моляр 26 обязан быть");
		assert.ok(html.includes('data-tooth-number="46"'), "Первый нижний правый постоянный моляр 46 обязан быть");
		assert.ok(html.includes('data-tooth-number="36"'), "Первый нижний левый постоянный моляр 36 обязан быть");

		// Молочные зубы
		assert.ok(html.includes('data-tooth-number="55"'), "Молочный моляр 55 обязан быть");
		assert.ok(html.includes('data-tooth-number="85"'), "Молочный моляр 85 обязан быть");

		// Зубы мудрости отсутствуют
		assert.equal(html.includes('data-tooth-number="18"'), false);
		assert.equal(html.includes('data-tooth-number="48"'), false);
	});

	test("В режиме dentitionMode='adult' рендерит взрослую формулу (18–28, 48–38)", () => {
		const html = renderToStaticMarkup(
			<WheelerToothArch
				dentitionMode="adult"
				mode="history"
			/>
		);

		assert.ok(html.includes('data-dentition-mode="adult"'), "Обязан быть data-dentition-mode='adult'");
		assert.ok(html.includes("Верхняя челюсть (18–28)"), "Обязан быть заголовок взрослой верхней челюсти");
		assert.ok(html.includes("Нижняя челюсть (48–38)"), "Обязан быть заголовок взрослой нижней челюсти");
		assert.ok(html.includes('data-tooth-number="18"'));
		assert.ok(html.includes('data-tooth-number="11"'));
		assert.ok(html.includes('data-tooth-number="41"'));
		assert.ok(html.includes('data-tooth-number="48"'));
	});

	test("AnatomicalTooth корректно рендерит анатомию молочных моляров (3 корня сверху, 2 корня снизу)", () => {
		// Верхние молочные моляры 54, 55, 64, 65
		for (const toothNum of [54, 55, 64, 65]) {
			const html = renderToStaticMarkup(<AnatomicalTooth toothNumber={toothNum} />);
			// Верхние моляры содержат разметку трех корней (MB, DB, Palatal)
			assert.ok(
				html.includes("tooth16-root-palatal") || html.includes("palatal") || html.includes("buccalRoots"),
				`Верхний молочный моляр ${toothNum} обязан иметь нёбный корень (3 корня)`,
			);
			// Не должен содержать премолярный ID
			assert.equal(
				html.includes("tooth14-roots"),
				false,
				`Верхний молочный моляр ${toothNum} НЕ ДОЛЖЕН маппиться на премоляр 14`,
			);
			assert.equal(
				html.includes("tooth15-roots"),
				false,
				`Верхний молочный моляр ${toothNum} НЕ ДОЛЖЕН маппиться на премоляр 15`,
			);
		}

		// Нижние молочные моляры 74, 75, 84, 85
		for (const toothNum of [74, 75, 84, 85]) {
			const html = renderToStaticMarkup(<AnatomicalTooth toothNumber={toothNum} />);
			// Нижние моляры содержат двухкорневую систему (M, D)
			assert.ok(
				html.includes("tooth46-roots") || html.includes("tooth47-roots") || html.includes("buccalCervicalRidge"),
				`Нижний молочный моляр ${toothNum} обязан иметь анатомию нижнего моляра (2 корня)`,
			);
			// Не должен содержать премолярный ID
			assert.equal(
				html.includes("tooth44-roots"),
				false,
				`Нижний молочный моляр ${toothNum} НЕ ДОЛЖЕН маппиться на премоляр 44`,
			);
			assert.equal(
				html.includes("tooth45-roots"),
				false,
				`Нижний молочный моляр ${toothNum} НЕ ДОЛЖЕН маппиться на премоляр 45`,
			);
		}
	});
});
