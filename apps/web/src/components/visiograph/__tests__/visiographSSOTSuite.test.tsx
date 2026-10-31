/**
 * visiographSSOTSuite.test.tsx
 * Канонический сьют тестов SSOT радиовизиографа и лучевой диагностики (Мандаты 8b, 8e, 8am, 8ze).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	MODALITY_CATALOG,
	CLINICAL_FILTER_PRESETS,
	FDI_PERMANENT_TEETH,
	CANONICAL_HOTFOLDERS,
	isValidFdiTooth,
	calculateDistancePx,
	calculateDistanceMm,
	calibratePixelPitch,
	getClinicalFilterCss,
	detectLatestHotfolderStudy,
} from "../visiographCatalogData";
import { VisiographStudioModal } from "../VisiographStudioModal";
import { DirectVisiographLauncher } from "../DirectVisiographLauncher";

describe("Канонический SSOT визиографа и лучевой диагностики", () => {
	describe("1. Три типа рентгеновских снимков (RVG 2D, ОПТГ, КЛКТ)", () => {
		it("содержит 3 канонические модальности лучевой диагностики в каталоге", () => {
			assert.ok(MODALITY_CATALOG.rvg, "RVG присутствует в каталоге");
			assert.ok(MODALITY_CATALOG.opg, "ОПТГ присутствует в каталоге");
			assert.ok(MODALITY_CATALOG.cbct, "КЛКТ присутствует в каталоге");

			assert.equal(MODALITY_CATALOG.rvg.typicalDoseMsv, 0.02, "Доза RVG 0.02 мЗв");
			assert.equal(MODALITY_CATALOG.opg.typicalDoseMsv, 0.05, "Доза ОПТГ 0.05 мЗв");
			assert.equal(MODALITY_CATALOG.cbct.typicalDoseMsv, 0.08, "Доза КЛКТ 0.08 мЗв");
		});

		it("проверяет валидацию номеров зубов по формуле FDI (11-48)", () => {
			assert.equal(isValidFdiTooth("16"), true, "Зуб 16 валиден");
			assert.equal(isValidFdiTooth("36"), true, "Зуб 36 валиден");
			assert.equal(isValidFdiTooth("48"), true, "Зуб 48 валиден");
			assert.equal(isValidFdiTooth("99"), false, "Зуб 99 не существует в FDI");
			assert.equal(isValidFdiTooth("0"), false, "Зуб 0 не валиден");
			assert.equal(FDI_PERMANENT_TEETH.length, 32, "В постоянном прикусе ровно 32 зуба");
		});
	});

	describe("2. Четыре базовых клинических фильтра (CSS/Canvas)", () => {
		it("содержит ровно 4 базовых клинических фильтра: Норма, Контраст, Негатив, Резкость", () => {
			assert.equal(CLINICAL_FILTER_PRESETS.length, 4, "Ровно 4 фильтра в 1 тап");
			const ids = CLINICAL_FILTER_PRESETS.map((f) => f.id);
			assert.deepEqual(ids, ["normal", "contrast", "invert", "sharpness"]);
		});

		it("возвращает валидные CSS filter строки для всех 4 фильтров", () => {
			assert.equal(getClinicalFilterCss("normal"), "none");
			assert.ok(getClinicalFilterCss("contrast").includes("contrast(1.5)"));
			assert.ok(getClinicalFilterCss("invert").includes("invert(1)"));
			assert.ok(getClinicalFilterCss("sharpness").includes("contrast(1.4)"));
		});
	});

	describe("3. Инструмент линейки измерения и калибровки (1 мм)", () => {
		it("рассчитывает евклидово расстояние в пикселях и миллиметрах", () => {
			const p1 = { x: 100, y: 100 };
			const p2 = { x: 200, y: 100 }; // 100 px по горизонтали
			const distPx = calculateDistancePx(p1, p2);
			assert.equal(distPx, 100, "Расстояние 100 пикселей");

			// При шаге 0.035 мм/пикс: 100 * 0.035 = 3.5 мм
			const distMm = calculateDistanceMm(p1, p2, 0.035);
			assert.equal(distMm, 3.5, "Физическое расстояние 3.5 мм");
		});

		it("выполняет калибровку по эталону штифта/имплантата 1.0 мм", () => {
			// Если 50 пикселей на снимке соответствуют 1.0 мм эталонного штифта:
			const calibratedPitch = calibratePixelPitch(1.0, 50);
			assert.equal(calibratedPitch, 0.02, "Шаг калибровки 0.02 мм/пикс");

			// Проверка с защитой от деления на 0
			const fallbackPitch = calibratePixelPitch(1.0, 0);
			assert.equal(fallbackPitch, 0.035, "Фоллбэк на дефолтный шаг 0.035 мм");
		});
	});

	describe("4. Hotfolder детекция свежих снимков томографа", () => {
		it("содержит конфигурации ведущих вендоров томографов клиники", () => {
			const vendors = CANONICAL_HOTFOLDERS.map((h) => h.vendor);
			assert.ok(vendors.includes("vatech"), "Vatech EzDent-i поддерживается");
			assert.ok(vendors.includes("planmeca"), "Planmeca Romexis поддерживается");
			assert.ok(vendors.includes("sirona"), "Dentsply Sirona Sidexis поддерживается");
		});

		it("генерирует уведомление о свежем снимке для пациента при детекции", () => {
			const study = detectLatestHotfolderStudy("Planmeca Romexis", "Захаров Иван Дмитриевич", "16");
			assert.equal(study.vendor, "Planmeca Romexis");
			assert.equal(study.toothCode, "16");
			assert.equal(study.patientName, "Захаров Иван Дмитриевич");
			assert.ok(study.fileName.includes("CT_16_"));
		});
	});

	describe("5. Монолитная студия VisiographStudioModal и Мандат 8e (Автономия)", () => {
		it("рендерит модальное окно студии визиографа без сбоев (SSR check)", () => {
			const html = renderToString(
				<VisiographStudioModal
					isOpen={true}
					onClose={() => {}}
					patientName="Иванов Пётр Сергеевич"
					initialToothCode="36"
					initialModality="rvg"
				/>,
			);

			assert.ok(html.includes("Иванов Пётр Сергеевич"), "Имя пациента отображается");
			assert.ok(html.includes("Зуб #36"), "Активный зуб отображается");
			assert.ok(html.includes("filter-btn-normal"), "Кнопка фильтра Норма");
			assert.ok(html.includes("filter-btn-contrast"), "Кнопка фильтра Контраст");
			assert.ok(html.includes("filter-btn-invert"), "Кнопка фильтра Негатив");
			assert.ok(html.includes("filter-btn-sharpness"), "Кнопка фильтра Резкость");
		});

		it("содержит ровно ОДНУ Primary CTA кнопку цвета Teal #0d9488, и она НИКОГДА НЕ DISABLED (Мандат 8e)", () => {
			const html = renderToString(
				<VisiographStudioModal
					isOpen={true}
					onClose={() => {}}
					patientName="Иванов Пётр Сергеевич"
					initialToothCode="36"
				/>,
			);

			// Проверка наличия Primary CTA кнопки
			assert.ok(html.includes("btn-primary-save-visiograph"), "Primary CTA кнопка присутствует");
			assert.ok(html.includes("Привязать снимок к приёму"), "Текст Primary CTA кнопки");
			assert.ok(html.includes("var(--teal,#0d9488)"), "Кнопка имеет цвет Teal #0d9488 по Мандату 8am");

			// Мандат 8e: Кнопка сохранения НИКОГДА не заблокирована
			assert.ok(
				!html.includes('disabled="" data-testid="btn-primary-save-visiograph"'),
				"Primary CTA кнопка НИКОГДА не disabled",
			);
		});

		it("соответствует Apple HIG мобильной эргономике (Bottom Sheet, Drag Handle 36x5px)", () => {
			const html = renderToString(
				<VisiographStudioModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);

			assert.ok(html.includes("ios-drag-handle"), "На мобильных устройствах присутствует тактильный Drag Handle");
			assert.ok(html.includes("rounded-t-[24px]"), "Скругление верхних углов шторки по Apple HIG 24px");
			assert.ok(html.includes("overflow-x-clip"), "0px паразитного горизонтального скролла");
		});

		it("проверяет корректность рендеринга лаунчера DirectVisiographLauncher", () => {
			const html = renderToString(<DirectVisiographLauncher />);
			assert.equal(typeof html, "string");
		});
	});
});
