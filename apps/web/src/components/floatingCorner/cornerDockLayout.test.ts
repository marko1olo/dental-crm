import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	CORNER_BAR_SLOTS,
	CORNER_SLOT_ORDER,
	type CornerRect,
	computeCornerBarClearance,
	computeCornerMaxLift,
	computeCornerReserve,
	cornerOverlapArea,
	cornerRectsOverlap,
	cornerSamplePoints,
	isCornerObstacle,
	isCornerSlotId,
	liftCornerRect,
	resolveCornerPlacement,
	sortCornerSlots,
} from "./cornerDockLayout.js";
import {
	VOICE_METER_BARS,
	VOICE_METER_FLOOR_SHARE,
	voiceMeterHeights,
} from "./voiceMeter.js";

function rect(
	left: number,
	top: number,
	right: number,
	bottom: number,
): CornerRect {
	return { left, top, right, bottom };
}

describe("порядок слотов плавающего угла", () => {
	it("накладка идёт выше панели, а микрофон стоит ближе всех к углу", () => {
		assert.deepEqual([...CORNER_SLOT_ORDER], [
			"notice",
			"search",
			"help",
			"voice",
		]);
		assert.deepEqual([...CORNER_BAR_SLOTS], ["search", "help", "voice"]);
	});

	it("порядок не зависит от порядка монтирования компонентов", () => {
		// VoiceAssistantUI монтируется в App.tsx раньше Omnibar, поэтому без
		// сортировки микрофон оказывался левее плашки поиска.
		assert.deepEqual(sortCornerSlots(["voice", "help", "search"]), [
			"search",
			"help",
			"voice",
		]);
		assert.deepEqual(sortCornerSlots(["voice", "notice"]), ["notice", "voice"]);
	});

	it("дубликаты слотов не удваивают панель", () => {
		assert.deepEqual(sortCornerSlots(["voice", "voice", "search"]), [
			"search",
			"voice",
		]);
	});

	it("посторонний идентификатор слотом угла не является", () => {
		assert.equal(isCornerSlotId("voice"), true);
		assert.equal(isCornerSlotId("notice"), true);
		assert.equal(isCornerSlotId("toast"), false);
	});
});

describe("пересечения прямоугольников", () => {
	it("касание границами пересечением не считается", () => {
		assert.equal(
			cornerRectsOverlap(rect(0, 0, 10, 10), rect(10, 0, 20, 10)),
			false,
		);
		assert.equal(cornerOverlapArea(rect(0, 0, 10, 10), rect(10, 0, 20, 10)), 0);
	});

	it("площадь пересечения считается по перекрытию", () => {
		assert.equal(cornerOverlapArea(rect(0, 0, 10, 10), rect(5, 5, 20, 20)), 25);
	});

	it("подъём сдвигает прямоугольник вверх, не меняя ширину", () => {
		assert.deepEqual(liftCornerRect(rect(100, 900, 300, 960), 40), {
			left: 100,
			right: 300,
			top: 860,
			bottom: 920,
		});
	});

	it("точек замера пять: четыре угла с волосяным отступом и центр", () => {
		const points = cornerSamplePoints(rect(100, 900, 300, 960));
		assert.equal(points.length, 5);
		assert.deepEqual(points[0], { x: 101, y: 901 });
		assert.deepEqual(points[3], { x: 299, y: 959 });
		assert.deepEqual(points[4], { x: 200, y: 930 });
	});
});

describe("что считается мишенью под панелью", () => {
	const base = {
		tagName: "DIV",
		role: null,
		tabIndex: -1,
		disabled: false,
		hidden: false,
		width: 120,
		height: 40,
	};

	it("кнопка «Сохранить» — мишень, из-за неё угол и уступает", () => {
		assert.equal(isCornerObstacle({ ...base, tagName: "BUTTON" }), true);
	});

	it("обычный контейнер мишенью не является", () => {
		assert.equal(isCornerObstacle(base), false);
	});

	it("роль ARIA делает мишенью нативно неинтерактивный элемент", () => {
		assert.equal(isCornerObstacle({ ...base, role: "button" }), true);
		assert.equal(isCornerObstacle({ ...base, role: "heading" }), false);
	});

	it("положительный tabindex делает элемент мишенью", () => {
		assert.equal(isCornerObstacle({ ...base, tabIndex: 0 }), true);
	});

	it("выключенной и скрытой кнопке уступать нечего", () => {
		assert.equal(
			isCornerObstacle({ ...base, tagName: "BUTTON", disabled: true }),
			false,
		);
		assert.equal(
			isCornerObstacle({ ...base, tagName: "BUTTON", hidden: true }),
			false,
		);
	});

	it("элемент меньше минимальной мишени игнорируется", () => {
		assert.equal(
			isCornerObstacle({ ...base, tagName: "BUTTON", width: 4, height: 4 }),
			false,
		);
	});
});

describe("просвет над нижней навигацией", () => {
	it("на широком экране навигации нет и просвет равен нулю", () => {
		assert.equal(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: null }),
			0,
		);
	});

	it("просвет равен измеренной высоте навигации, а не зашитым 4.5rem", () => {
		// narrow_full.png: окно 720x1100, навигация начинается на y=1036.
		assert.equal(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: 1036 }),
			64,
		);
		// Если бы просвет остался зашитым (4.5rem = 72px), панель поиска стояла
		// бы на 8px выше кромки навигации — ровно то наложение, что на плите.
		assert.notEqual(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: 1036 }),
			72,
		);
	});

	it("навигация выше окна не даёт отрицательного просвета", () => {
		assert.equal(
			computeCornerBarClearance({ viewportHeight: 800, bottomBarTop: 900 }),
			0,
		);
	});
});

describe("резерв места в потоке страницы", () => {
	it("резерв покрывает панель, отступы и навигацию", () => {
		assert.equal(
			computeCornerReserve({ barHeight: 56, gutter: 24, barClearance: 0 }),
			104,
		);
		assert.equal(
			computeCornerReserve({ barHeight: 56, gutter: 16, barClearance: 64 }),
			152,
		);
	});

	it("пустая панель не резервирует ничего", () => {
		assert.equal(
			computeCornerReserve({ barHeight: 0, gutter: 24, barClearance: 64 }),
			0,
		);
	});
});

describe("предел подъёма панели", () => {
	it("панель остаётся в нижней половине экрана", () => {
		assert.equal(
			computeCornerMaxLift({
				viewportHeight: 1100,
				barHeight: 56,
				gutter: 24,
				barClearance: 0,
			}),
			470,
		);
	});

	it("при высокой навигации и низком экране подъёма не остаётся", () => {
		assert.equal(
			computeCornerMaxLift({
				viewportHeight: 400,
				barHeight: 56,
				gutter: 16,
				barClearance: 140,
			}),
			0,
		);
	});
});

describe("уступание интерактивному контенту", () => {
	// Панель угла на 1600x1100: правый нижний угол, ширина 200, высота 60.
	const footprint = rect(1376, 1016, 1576, 1076);

	it("без мишеней панель стоит на месте", () => {
		assert.deepEqual(
			resolveCornerPlacement({ footprint, obstacles: [], maxLift: 470 }),
			{ lift: 0, compact: false },
		);
	});

	it("мишень рядом, но не под панелью — подъёма нет", () => {
		assert.deepEqual(
			resolveCornerPlacement({
				footprint,
				obstacles: [rect(200, 1016, 400, 1076)],
				maxLift: 470,
			}),
			{ lift: 0, compact: false },
		);
	});

	it("кнопка «Сохранить» под панелью поднимает панель ровно над ней", () => {
		// Плита light_duplicateAlert_ПУСТО.png: кнопка сохранения панели плана
		// лечения лежит под угловыми кнопками.
		const save = rect(1430, 1040, 1520, 1078);
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [save],
			maxLift: 470,
		});
		assert.deepEqual(placement, { lift: 36, compact: false });
		assert.equal(
			cornerRectsOverlap(liftCornerRect(footprint, placement.lift), save),
			false,
		);
	});

	it("две мишени: панель встаёт выше обеих", () => {
		const save = rect(1430, 1040, 1520, 1078);
		const sign = rect(1380, 1000, 1428, 1038);
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [save, sign],
			maxLift: 470,
		});
		for (const obstacle of [save, sign]) {
			assert.equal(
				cornerRectsOverlap(liftCornerRect(footprint, placement.lift), obstacle),
				false,
			);
		}
		assert.equal(placement.compact, false);
	});

	it("подъём выбирается минимальный из свободных", () => {
		const near = rect(1400, 1060, 1500, 1080);
		const far = rect(1400, 700, 1500, 760);
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [near, far],
			maxLift: 470,
		});
		assert.deepEqual(placement, { lift: 16, compact: false });
	});

	it("если свободного места нет — компактный режим, а не наложение поверх", () => {
		// Столбец мишеней сплошняком выше предела подъёма: свободного положения
		// в пределах нижней половины экрана не существует.
		const obstacles: CornerRect[] = [];
		for (let top = 400; top < 1080; top += 20) {
			obstacles.push(rect(1376, top, 1576, top + 20));
		}
		const placement = resolveCornerPlacement({
			footprint,
			obstacles,
			maxLift: 470,
		});
		assert.equal(placement.compact, true);
	});

	it("подъём никогда не выходит за предел", () => {
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [rect(1376, 400, 1576, 1080)],
			maxLift: 100,
		});
		assert.ok(placement.lift <= 100, `подъём ${placement.lift} превысил предел`);
		assert.equal(placement.compact, true);
	});

	it("нулевой предел подъёма не даёт отрицательных значений", () => {
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [rect(1430, 1040, 1520, 1078)],
			maxLift: 0,
		});
		assert.equal(placement.lift, 0);
		assert.equal(placement.compact, true);
	});

	it("решение детерминировано: тот же вход — тот же выход", () => {
		const obstacles = [rect(1430, 1040, 1520, 1078), rect(1380, 900, 1500, 960)];
		const first = resolveCornerPlacement({ footprint, obstacles, maxLift: 470 });
		const second = resolveCornerPlacement({
			footprint,
			obstacles: [...obstacles].reverse(),
			maxLift: 470,
		});
		assert.deepEqual(first, second);
	});
});

describe("индикатор уровня записи", () => {
	it("в тишине все полоски на полу шкалы, а не пляшут", () => {
		const heights = voiceMeterHeights(0);
		assert.equal(heights.length, VOICE_METER_BARS);
		const floor = Math.round(VOICE_METER_FLOOR_SHARE * 1000) / 10;
		for (const height of heights) assert.equal(height, floor);
	});

	it("одинаковый уровень даёт одинаковый силуэт", () => {
		assert.deepEqual(voiceMeterHeights(120), voiceMeterHeights(120));
	});

	it("центр реагирует на уровень сильнее краёв", () => {
		const heights = voiceMeterHeights(255);
		const first = heights[0];
		const middle = heights[Math.floor(VOICE_METER_BARS / 2)];
		assert.ok(first !== undefined && middle !== undefined);
		assert.ok(middle > first, `центр ${middle} не выше края ${first}`);
		assert.ok(middle <= 100, `центр ${middle} вышел за 100%`);
	});

	it("рост уровня поднимает полоски", () => {
		const quiet = voiceMeterHeights(40)[6];
		const loud = voiceMeterHeights(200)[6];
		assert.ok(quiet !== undefined && loud !== undefined);
		assert.ok(loud > quiet, `${loud} не выше ${quiet}`);
	});

	it("значения вне шкалы и NaN не ломают индикатор", () => {
		const floor = Math.round(VOICE_METER_FLOOR_SHARE * 1000) / 10;
		for (const height of voiceMeterHeights(Number.NaN)) {
			assert.equal(height, floor);
		}
		for (const height of voiceMeterHeights(-50)) assert.equal(height, floor);
		for (const height of voiceMeterHeights(4000)) assert.ok(height <= 100);
	});
});
