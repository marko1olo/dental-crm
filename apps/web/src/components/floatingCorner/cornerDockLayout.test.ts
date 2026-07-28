import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	CORNER_BAR_SLOTS,
	CORNER_MAX_SOLVE_PASSES,
	CORNER_SLOT_ORDER,
	CORNER_STREAM_INTERVAL_MS,
	type CornerRect,
	computeCornerBarClearance,
	computeCornerMaxLift,
	computeCornerReserve,
	cornerOverlapArea,
	cornerSamplePoints,
	isCornerObstacle,
	liftCornerRect,
	resolveCornerPlacement,
	resolveCornerPlacementSampled,
	shouldRunCornerPass,
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
	// ЧТО ЗДЕСЬ НЕ ПРОВЕРЯЕТСЯ, чтобы это не выглядело покрытием, которым не
	// является: сам порядок узлов в DOM. Гарантию даёт цикл
	// `for (const slot of CORNER_BAR_SLOTS) bar.append(makeSlot(slot))` в
	// `CornerDock.tsx`, а DOM в node:test отсутствует. Ниже закреплён вход этого
	// цикла — массив, от которого порядок и зависит. Прежний тест сортировал
	// слоты функцией `sortCornerSlots`, которую продакшен не вызывал НИ РАЗУ, и
	// заявлял это как покрытие независимости от порядка монтирования; функция
	// удалена вместе с заявкой.
	it("накладка идёт выше панели, а микрофон стоит ближе всех к углу", () => {
		assert.deepEqual([...CORNER_SLOT_ORDER], [
			"notice",
			"search",
			"help",
			"voice",
		]);
		assert.deepEqual([...CORNER_BAR_SLOTS], ["search", "help", "voice"]);
	});

	it("накладка не входит в панель: её геометрия не участвует в резерве", () => {
		assert.equal(CORNER_BAR_SLOTS.includes("notice"), false);
		for (const slot of CORNER_BAR_SLOTS) {
			assert.equal(CORNER_SLOT_ORDER.includes(slot), true);
		}
	});
});

describe("пересечения прямоугольников", () => {
	it("касание границами пересечением не считается", () => {
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

	it("тост входящего звонка — мишень, хотя это div с tabindex -1", () => {
		// `IncomingCallToast.tsx:67` — `<div role="dialog" tabindex="-1">` шириной
		// 24rem, прибитый в тот же угол с z-index 999999, то есть ВЫШЕ дока. Пока
		// роль диалога не считалась мишенью, панель ему не уступала и тост просто
		// накрывал микрофон, справку и поиск на каждом входящем звонке.
		assert.equal(
			isCornerObstacle({
				...base,
				tagName: "DIV",
				role: "dialog",
				tabIndex: -1,
				width: 384,
				height: 220,
			}),
			true,
		);
		assert.equal(isCornerObstacle({ ...base, role: "alertdialog" }), true);
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
		// Вход взят по мотивам narrow_full.png (окно 720x1100): кромка навигации
		// на глаз около y=1036. Это ОЦЕНКА по картинке, а не замер DOM —
		// проверяется арифметика функции, а не реальная высота навигации.
		assert.equal(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: 1036 }),
			64,
		);
		// Смысл проверки: результат зависит от входа. Зашитые 4.5rem (72px)
		// давали бы одно и то же число при любой высоте навигации.
		assert.notEqual(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: 1036 }),
			72,
		);
		assert.equal(
			computeCornerBarClearance({ viewportHeight: 1100, bottomBarTop: 1010 }),
			90,
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
	// Входы ниже — НЕ выдумка: это значения, снятые с живой страницы
	// (scratch/probe-corner-reserve.mjs, экран #patients, тема light).
	// 390x844 и 840x900: высота панели 48px (все три кнопки 3rem после
	// f50f7f67d), отступ 1rem = 16px на <=840px, измеренная высота
	// `.dnt-bottom-nav` 64px. 1600x1100: отступ 1.5rem = 24px, навигации нет.
	it("резерв на 390x844 равен 144px", () => {
		assert.equal(
			computeCornerReserve({ barHeight: 48, gutter: 16, barClearance: 64 }),
			144,
		);
	});

	it("резерв на пороге 840px равен тем же 144px", () => {
		// Порог оболочки: навигация ещё есть, отступ ещё 1rem.
		assert.equal(
			computeCornerReserve({ barHeight: 48, gutter: 16, barClearance: 64 }),
			144,
		);
	});

	it("на широком экране навигации нет и резерв равен 96px", () => {
		assert.equal(
			computeCornerReserve({ barHeight: 48, gutter: 24, barClearance: 0 }),
			96,
		);
	});

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

	/**
	 * ГЛАВНАЯ ПРОВЕРКА ПАКЕТА V1.
	 *
	 * Арифметика резерва была верна и до правки — сломано было ЧИСЛО ПРИМЕНЕНИЙ.
	 * Одна и та же переменная стояла в двух правилах, попадающих во вложенные
	 * друг в друга боксы (`main` и `.workspace`), и пустой низ удваивался. Тест
	 * читает НАСТОЯЩИЕ файлы стилей и считает потребителей переменной: их должно
	 * быть ровно столько же, сколько элементов, а элемент один.
	 */
	it("переменную резерва читает ровно ОДНО правило во всех стилях проекта", () => {
		const stylesDir = fileURLToPath(new URL("../../styles", import.meta.url));
		const cornerDir = fileURLToPath(new URL(".", import.meta.url));
		const files: string[] = [];
		for (const dir of [stylesDir, cornerDir]) {
			for (const name of readdirSync(dir)) {
				if (name.endsWith(".css")) files.push(join(dir, name));
			}
		}
		assert.ok(files.length >= 2, "файлы стилей не найдены");

		const consumers: string[] = [];
		for (const file of files) {
			// Комментарии вырезаются: переменная упомянута в них по-русски не раз,
			// но упоминание не является применением.
			const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
			for (const line of css.split("\n")) {
				if (line.includes("var(--corner-dock-reserve-block")) {
					consumers.push(`${basename(file)}: ${line.trim()}`);
				}
			}
		}
		assert.equal(
			consumers.length,
			1,
			`резерв должен применяться один раз, найдено ${consumers.length}:\n${consumers.join("\n")}`,
		);
		// И применяется он к колонке контента, а не к внешней оболочке: оболочка
		// содержит колонку, поэтому два отступа сложились бы.
		assert.match(consumers[0] ?? "", /padding-bottom/);
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
	// Все координаты ниже — правдоподобная геометрия для окна 1600x1100, а не
	// замер живой страницы: проверяется решение функции, а не размеры кнопок в
	// браузере. Живую геометрию закрывает только прогон в браузере.
	// Панель угла: правый нижний угол, ширина 200, высота 60.
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
		// Сценарий с плиты light_duplicateAlert_ПУСТО.png: кнопка сохранения
		// панели плана лечения лежит под угловыми кнопками. Координаты
		// восстановлены по картинке приблизительно.
		const save = rect(1430, 1040, 1520, 1078);
		const placement = resolveCornerPlacement({
			footprint,
			obstacles: [save],
			maxLift: 470,
		});
		assert.deepEqual(placement, { lift: 36, compact: false });
		assert.equal(
			cornerOverlapArea(liftCornerRect(footprint, placement.lift), save),
			0,
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
				cornerOverlapArea(liftCornerRect(footprint, placement.lift), obstacle),
				0,
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

describe("проверка ВЫБРАННОГО положения, а не только исходного", () => {
	// Столбик кнопок панели плана лечения: нижняя кнопка видна из исходного
	// положения, верхняя — только когда панель уже поднялась. Именно этот случай
	// прежний код пропускал: список мишеней снимался один раз при подъёме 0,
	// поэтому подъём мог сесть ровно на вторую кнопку и вернуть compact: false с
	// нулевым РАСЧЁТНЫМ пересечением при реальном наложении.
	const footprint = rect(1376, 1016, 1576, 1076);
	const lower = rect(1430, 1040, 1520, 1078);
	const upper = rect(1430, 986, 1520, 1036);

	it("мишень, видимая только из поднятого положения, всё равно учитывается", () => {
		const asked: number[] = [];
		const result = resolveCornerPlacementSampled({
			footprint,
			maxLift: 470,
			sample: (lift) => {
				asked.push(lift);
				// Из исходного положения видна только нижняя кнопка.
				if (lift === 0) return [lower];
				// Стоит подняться — и в кадре замера появляется верхняя.
				return [upper];
			},
		});

		// Наивное решение по одному снимку дало бы ровно 36 и посадило панель на
		// верхнюю кнопку. Проверяем, что так НЕ вышло.
		const naive = resolveCornerPlacement({
			footprint,
			obstacles: [lower],
			maxLift: 470,
		});
		assert.deepEqual(naive, { lift: 36, compact: false });
		assert.notEqual(result.placement.lift, naive.lift);

		const finalRect = liftCornerRect(footprint, result.placement.lift);
		assert.equal(cornerOverlapArea(finalRect, lower), 0);
		assert.equal(cornerOverlapArea(finalRect, upper), 0);
		assert.equal(result.placement.compact, false);
		// Цепочка замеров целиком: исходное положение, положение по первому
		// решению, и положение по второму — последнее подтверждает, что там пусто.
		assert.deepEqual(asked, [0, 36, 90]);
		assert.equal(result.placement.lift, 90);
		assert.equal(result.sampleCount, 3);
		assert.equal(result.obstacles.length, 2);
		// Итоговое положение обязано быть среди измеренных, иначе гарантии нет.
		assert.ok(asked.includes(result.placement.lift));
	});

	it("свободный угол стоит ровно один снимок: платить за проверку не за что", () => {
		let calls = 0;
		const result = resolveCornerPlacementSampled({
			footprint,
			maxLift: 470,
			sample: () => {
				calls += 1;
				return [];
			},
		});
		assert.deepEqual(result.placement, { lift: 0, compact: false });
		// Подъём нулевой — это положение уже измерено, досъём не нужен.
		assert.equal(calls, 1);
		assert.equal(result.sampleCount, 1);
	});

	it("число снимков ограничено: бесконечно доснимать нельзя", () => {
		let calls = 0;
		// Худший вход: каждый снимок приносит НОВУЮ мишень прямо под панелью.
		const result = resolveCornerPlacementSampled({
			footprint,
			maxLift: 470,
			sample: (lift) => {
				calls += 1;
				return [rect(1376, 1016 - lift - 30, 1576, 1076 - lift)];
			},
		});
		assert.ok(
			calls <= CORNER_MAX_SOLVE_PASSES,
			`снимков ${calls} при пределе ${CORNER_MAX_SOLVE_PASSES}`,
		);
		assert.equal(result.sampleCount, calls);
		assert.ok(result.placement.lift <= 470);
	});

	it("повторный снимок без новых мишеней решение не меняет", () => {
		const result = resolveCornerPlacementSampled({
			footprint,
			maxLift: 470,
			// Одна и та же мишень в обоих снимках: список не растёт.
			sample: () => [lower],
		});
		assert.deepEqual(result.placement, { lift: 36, compact: false });
		assert.equal(result.obstacles.length, 1);
		assert.equal(result.sampleCount, 2);
	});

	it("детерминированность сохраняется: тот же вход — тот же выход", () => {
		const make = () =>
			resolveCornerPlacementSampled({
				footprint,
				maxLift: 470,
				sample: (lift) => (lift === 0 ? [lower] : [upper]),
			});
		assert.deepEqual(make().placement, make().placement);
	});
});

describe("цена проходов раскладки на прокрутке", () => {
	it("немедленный повод не ждёт никогда", () => {
		assert.deepEqual(
			shouldRunCornerPass({ now: 1000, lastRunAt: 999, trigger: "immediate" }),
			{ run: true, deferMs: 0 },
		);
	});

	it("первый проход потока идёт сразу", () => {
		assert.deepEqual(
			shouldRunCornerPass({ now: 0, lastRunAt: null, trigger: "stream" }),
			{ run: true, deferMs: 0 },
		);
	});

	it("проход потока внутри интервала откладывается на остаток", () => {
		const decision = shouldRunCornerPass({
			now: 1030,
			lastRunAt: 1000,
			trigger: "stream",
		});
		assert.equal(decision.run, false);
		assert.equal(decision.deferMs, CORNER_STREAM_INTERVAL_MS - 30);
	});

	it("после интервала проход потока разрешён", () => {
		assert.deepEqual(
			shouldRunCornerPass({
				now: 1000 + CORNER_STREAM_INTERVAL_MS,
				lastRunAt: 1000,
				trigger: "stream",
			}),
			{ run: true, deferMs: 0 },
		);
	});

	it("отложенная попытка всегда положительна: молчания в покое не будет", () => {
		const decision = shouldRunCornerPass({
			now: 1099.5,
			lastRunAt: 1000,
			trigger: "stream",
		});
		assert.equal(decision.run, false);
		assert.ok(decision.deferMs >= 1, `deferMs ${decision.deferMs}`);
	});

	/**
	 * ЧИСЛО, А НЕ МНЕНИЕ.
	 *
	 * Замер в браузере на HEAD 8ff0ba18e (390x844, список пациентов, 120 кадров
	 * прокрутки) дал 59 полных проходов и 295 вызовов
	 * `document.elementsFromPoint` — 2.46 попадания на кадр, на каждом экране у
	 * каждого пользователя. Здесь прогоняется та же длительность через политику и
	 * проверяется, что проходов стало кратно меньше.
	 */
	it("120 кадров прокрутки дают не 59 проходов, а не больше 21", () => {
		const frameMs = 1000 / 60;
		let lastRunAt: number | null = null;
		let passes = 0;
		for (let i = 0; i < 120; i += 1) {
			const now = i * frameMs;
			const decision = shouldRunCornerPass({
				now,
				lastRunAt,
				trigger: "stream",
			});
			if (decision.run) {
				passes += 1;
				lastRunAt = now;
			}
		}
		assert.ok(passes <= 21, `проходов ${passes}, ожидалось не больше 21`);
		assert.ok(passes >= 19, `проходов ${passes}: политика молчит слишком долго`);
		// Замеренная база — 59 проходов на те же 120 кадров.
		assert.ok(passes * 2 < 59, `сокращение меньше двух раз: ${passes} из 59`);
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
