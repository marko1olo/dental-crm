/**
 * perioProfileStrip.test.tsx — Тесты анатомического профиля пародонтальных карманов
 * PerioProfileStrip, скоростной таблицы ввода PerioArchGrid и математики perioProfileMath.
 * (Мандаты 8a-8q, Supreme Law, THE HAMMER).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createDefaultPerioTeeth,
	type FurcationGrade,
	type MobilityGrade,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioToothRecord,
} from "@dental/shared";
import {
	buildBandPolygonPath,
	buildGridlines,
	buildPolylinePath,
	calculatePerioProfilePolylines,
	depthToY,
	getBaselineY,
	getOrderedSitesForTooth,
	getStripDirection,
	getToothLateralGeometry,
	getToothTransform,
	siteX,
	TOOTH_LATERAL_GEOMETRIES,
} from "../perioProfileMath";
import { PerioProfileStrip } from "../PerioProfileStrip";
import { PerioArchGrid } from "../PerioArchGrid";

describe("1. perioProfileMath: геометрические расчеты профиля карманов", () => {
	test("1.1. getStripDirection: корректные направления для челюстей и поверхностей", () => {
		// Верхняя челюсть: корень направлен вверх
		assert.equal(getStripDirection("upper", "buccal"), "depth-up");
		assert.equal(getStripDirection("upper", "lingual"), "depth-down");

		// Нижняя челюсть: корень направлен вниз
		assert.equal(getStripDirection("lower", "buccal"), "depth-down");
		assert.equal(getStripDirection("lower", "lingual"), "depth-up");
	});

	test("1.2. getBaselineY: вычисление базовой линии 0 мм (CEJ)", () => {
		const baseUp = getBaselineY("depth-up", 130);
		const baseDown = getBaselineY("depth-down", 130);

		assert.ok(baseUp > 65, "Для depth-up базовая линия должна быть в нижней половине (ок. 82px)");
		assert.ok(baseDown < 65, "Для depth-down базовая линия должна быть в верхней половине (ок. 48px)");
		assert.equal(baseUp, 82);
		assert.equal(baseDown, 48);
	});

	test("1.3. depthToY: точное линейное масштабирование миллиметров и clamping", () => {
		const base = 82;
		const scale = 4;

		// depth-up: глубина растет вверх (уменьшение Y в SVG)
		assert.equal(depthToY(0, base, "depth-up", scale), 82, "0 мм на базовой линии");
		assert.equal(depthToY(5, base, "depth-up", scale), 62, "5 мм = 82 - 20 = 62");
		assert.equal(depthToY(10, base, "depth-up", scale), 42, "10 мм = 82 - 40 = 42");
		assert.equal(depthToY(15, base, "depth-up", scale), 22, "15 мм = 82 - 60 = 22");

		// Рецессия (+GM) растет в сторону корня
		assert.equal(depthToY(3, base, "depth-up", scale), 70);

		// Гиперплазия / отек (-GM) спускается на коронку (увеличение Y)
		assert.equal(depthToY(-2, base, "depth-up", scale), 90);

		// Clamping за пределами допустимого диапазона
		assert.equal(depthToY(20, base, "depth-up", scale), 22, "Ограничение на 15 мм");
		assert.equal(depthToY(-10, base, "depth-up", scale), 102, "Ограничение на -5 мм");

		// depth-down: глубина растет вниз (увеличение Y в SVG)
		const baseDown = 48;
		assert.equal(depthToY(0, baseDown, "depth-down", scale), 48);
		assert.equal(depthToY(5, baseDown, "depth-down", scale), 68);
		assert.equal(depthToY(15, baseDown, "depth-down", scale), 108);
	});

	test("1.4. siteX: расчет горизонтальных координат сайтов на зубе", () => {
		const colW = 60;
		// Зуб 0: сайты на 20%, 50%, 80% от ширины 60px
		assert.equal(siteX(0, 0, colW), 12);
		assert.equal(siteX(0, 1, colW), 30);
		assert.equal(siteX(0, 2, colW), 48);

		// Зуб 1: смещение на 60px
		assert.equal(siteX(1, 0, colW), 72);
		assert.equal(siteX(1, 1, colW), 90);
		assert.equal(siteX(1, 2, colW), 108);
	});

	test("1.5. getOrderedSitesForTooth: анатомический порядок слева направо", () => {
		// Квадрант 1 (18..11, пациент справа): дистально -> медиально
		const q1Sites = getOrderedSitesForTooth(16, "buccal");
		assert.deepEqual(q1Sites, ["distoBuccal", "midBuccal", "mesioBuccal"]);

		// Квадрант 2 (21..28, пациент слева): медиально -> дистально
		const q2Sites = getOrderedSitesForTooth(26, "buccal");
		assert.deepEqual(q2Sites, ["mesioBuccal", "midBuccal", "distoBuccal"]);

		// Квадрант 4 (48..41): дистально -> медиально
		const q4Sites = getOrderedSitesForTooth(46, "lingual");
		assert.deepEqual(q4Sites, ["distoLingual", "midLingual", "mesioLingual"]);

		// Квадрант 3 (31..38): медиально -> дистально
		const q3Sites = getOrderedSitesForTooth(36, "lingual");
		assert.deepEqual(q3Sites, ["mesioLingual", "midLingual", "distoLingual"]);
	});

	test("1.6. buildPolylinePath и buildBandPolygonPath: генерация SVG path", () => {
		const ptsA = [
			{ x: 10, y: 50 },
			{ x: 20, y: 52 },
			{ x: 30, y: 48 },
		];
		const polyPath = buildPolylinePath(ptsA);
		assert.equal(polyPath, "M 10.0,50.0 L 20.0,52.0 L 30.0,48.0");

		const ptsB = [
			{ x: 10, y: 65 },
			{ x: 20, y: 70 },
			{ x: 30, y: 62 },
		];
		const bandPath = buildBandPolygonPath(ptsA, ptsB);
		// Замкнутый полигон: вперед по GM, назад по PD, затем Z
		assert.ok(bandPath.startsWith("M 10.0,50.0"));
		assert.ok(bandPath.includes("L 30.0,62.0 L 20.0,70.0 L 10.0,65.0 Z"));
		assert.ok(bandPath.endsWith("Z"));
	});

	test("1.7. buildGridlines: миллиметровая сетка с жирными линиями 0, 5, 10, 15", () => {
		const grid = buildGridlines(82, "depth-up", 4, 15);
		assert.equal(grid.length, 16, "16 линий от 0 до 15 мм");

		const boldLines = grid.filter((g) => g.isBold);
		assert.equal(boldLines.length, 4, "Ровно 4 жирные линии: 0, 5, 10, 15 мм");
		assert.deepEqual(
			boldLines.map((g) => g.mm),
			[0, 5, 10, 15]
		);

		assert.equal(grid[0]?.label, "0 (CEJ)");
		assert.equal(grid[5]?.label, "5 mm");
		assert.equal(grid[10]?.label, "10 mm");
		assert.equal(grid[15]?.label, "15 mm");
	});

	test("1.8. TOOTH_LATERAL_GEOMETRIES: анатомические силуэты для всех 8 позиций", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const geo = TOOTH_LATERAL_GEOMETRIES[pos];
			assert.ok(geo, `Геометрия позиции ${pos} должна существовать`);
			assert.ok(geo.crown.length > 50, `Коронка зуба ${pos} должна иметь валидный SVG path`);
			assert.ok(geo.roots.length >= 1, `Корни зуба ${pos} должны содержать минимум 1 корень`);
			assert.ok(geo.gumLine.length > 10, `CEJ зуба ${pos} должна иметь gumLine path`);
		}
	});

	test("1.9. getToothTransform: корректный расчет SVG transform", () => {
		const t11 = getToothTransform(11, "depth-up", 30, 82, 0.75);
		assert.ok(t11.includes("translate(30.0, 82.0)"));
		assert.ok(t11.includes("scale(0.750, 0.750)"));

		// Зуб 21 (левая сторона): отражен по горизонтали scaleX(-0.75)
		const t21 = getToothTransform(21, "depth-up", 90, 82, 0.75);
		assert.ok(t21.includes("scale(-0.750, 0.750)"));

		// Зуб 46 (нижняя челюсть): отражен по вертикали scaleY(-0.75)
		const t46 = getToothTransform(46, "depth-down", 30, 48, 0.75);
		assert.ok(t46.includes("scale(0.750, -0.750)"));
	});
});

describe("2. PerioProfileStrip: SVG компонент визуализации карманов", () => {
	const mockTeeth: PerioToothRecord[] = PERIO_UPPER_ARCH_TEETH.map((num, i) => ({
		toothNumber: num,
		isMissing: num === 18, // 18 зуб удален
		isImplant: num === 14, // 14 зуб — имплантат
		mobility: (num === 16 ? 1 : 0) as 0 | 1 | 2 | 3,
		furcation: 0 as 0 | 1 | 2 | 3,
		distoBuccal: { probingDepthMm: i % 2 === 0 ? 3 : 5, gingivalMarginMm: 0, bleedingOnProbing: i % 3 === 0, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: 4, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	}));

	test("2.1. Рендеринг SVG с фиксированной высотой (120-140px) и нулевым CLS", () => {
		const html = renderToString(
			<PerioProfileStrip
				teeth={mockTeeth}
				arch="upper"
				aspect="buccal"
				height={130}
				columnWidth={60}
			/>
		);

		// Габариты и нулевой сдвиг макета (CLS)
		assert.ok(html.includes('height:130px') || html.includes('height="130"'));
		assert.ok(html.includes('viewBox="0 0 960 130"'), "viewBox должен быть 960x130 (16 зубов * 60px)");
	});

	test("2.2. Наличие миллиметровой сетки и базовой линии 0 мм (CEJ)", () => {
		const html = renderToString(
			<PerioProfileStrip teeth={mockTeeth} arch="upper" aspect="buccal" />
		);

		assert.ok(html.includes("perio-grid-layer"), "Слой сетки должен присутствовать");
		assert.ok(html.includes("0 (CEJ)"), "Подпись CEJ должна присутствовать");
		assert.ok(html.includes("5 mm"), "Подпись 5 мм должна присутствовать");
		assert.ok(html.includes("10 mm"), "Подпись 10 мм должна присутствовать");
		assert.ok(html.includes("15 mm"), "Подпись 15 мм должна присутствовать");
	});

	test("2.3. Наличие полупрозрачного кармана bandPath с var(--danger) и альфой 0.25", () => {
		const html = renderToString(
			<PerioProfileStrip teeth={mockTeeth} arch="upper" aspect="buccal" />
		);

		assert.ok(html.includes("perio-pocket-band"), "Класс perio-pocket-band должен присутствовать");
		assert.ok(html.includes('fill="var(--danger,#ef4444)"'), "Заливка кармана токеном var(--danger)");
		assert.ok(html.includes('fill-opacity="0.25"'), "Альфа кармана строго 0.25");
	});

	test("2.4. Наличие синей линии края десны (GM) и красной линии дна карманов (PD)", () => {
		const html = renderToString(
			<PerioProfileStrip teeth={mockTeeth} arch="upper" aspect="buccal" />
		);

		assert.ok(html.includes("perio-gm-line"), "Линия GM должна присутствовать");
		assert.ok(html.includes("perio-pd-line"), "Линия PD должна присутствовать");
		assert.ok(html.includes('stroke="var(--primary,#0284c7)"'), "GM линия окрашена в синий");
		assert.ok(html.includes('stroke="var(--danger,#ef4444)"'), "PD линия окрашена в красный");
	});

	test("2.5. Рендеринг имплантата с витками резьбы и отсутствующего зуба", () => {
		const html = renderToString(
			<PerioProfileStrip teeth={mockTeeth} arch="upper" aspect="buccal" />
		);

		assert.ok(html.includes("implant-screw"), "Тело имплантата с резьбой должно присутствовать для зуба 14");
		assert.ok(html.includes("stroke-dasharray"), "Отсутствующий зуб 18 должен рендериться пунктиром");
	});

	test("2.6. Святость медицинских бланков: ноль мультяшных эмодзи (Мандат 8d)", () => {
		const html = renderToString(
			<PerioProfileStrip teeth={mockTeeth} arch="upper" aspect="buccal" />
		);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "Компонент PerioProfileStrip не должен содержать мультяшных эмодзи");
	});
});

describe("3. PerioArchGrid: скоростная таблица ввода и 1-клик пресеты", () => {
	const defaultTeeth = createDefaultPerioTeeth(2);

	test("3.1. Рендеринг таблицы со всеми 16 зубами дуги и колонками", () => {
		const html = renderToString(
			<PerioArchGrid teeth={defaultTeeth} arch="upper" />
		);

		assert.ok(html.includes("perio-arch-table"), "Таблица perio-arch-table должна рендериться");
		// Проверяем наличие всех 16 номеров зубов
		for (const num of PERIO_UPPER_ARCH_TEETH) {
			assert.ok(html.includes(`>${num}<`), `Зуб ${num} должен быть в шапке`);
		}
	});

	test("3.2. Наличие кнопки 1-клик пресета «Физиологическая норма» (Мандат 8e)", () => {
		const html = renderToString(
			<PerioArchGrid teeth={defaultTeeth} arch="upper" />
		);

		assert.ok(html.includes("Физиологическая норма"), "Кнопка «Физиологическая норма» должна быть на экране");
		assert.ok(!html.includes('disabled="" title="Установить норму'), "Кнопка нормы не должна быть disabled");
	});

	test("3.3. Наличие числовых полей ввода зондирования (PD) и края десны (GM)", () => {
		const html = renderToString(
			<PerioArchGrid teeth={defaultTeeth} arch="upper" />
		);

		assert.ok(html.includes('type="number"'), "Должны быть input type=number");
		assert.ok(html.includes("Зондирование (PD)"), "Метка Зондирование (PD) присутствует");
		assert.ok(html.includes("Край десны (GM)"), "Метка Край десны (GM) присутствует");
		assert.ok(html.includes("Кровоточивость (BOP)"), "Метка Кровоточивость (BOP) присутствует");
		assert.ok(html.includes("Налёт (PLQ)"), "Метка Налёт (PLQ) присутствует");
	});

	test("3.4. Рендеринг нижней челюсти (48..38)", () => {
		const html = renderToString(
			<PerioArchGrid teeth={defaultTeeth} arch="lower" />
		);

		assert.ok(html.includes("Нижняя челюсть (48..38)"));
		for (const num of PERIO_LOWER_ARCH_TEETH) {
			assert.ok(html.includes(`>${num}<`), `Зуб ${num} должен быть в шапке нижней челюсти`);
		}
	});

	test("3.5. Отсутствие эмодзи в интерфейсе (Мандат 8d)", () => {
		const html = renderToString(
			<PerioArchGrid teeth={defaultTeeth} arch="upper" />
		);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "Компонент PerioArchGrid не должен содержать мультяшных эмодзи");
	});
});
