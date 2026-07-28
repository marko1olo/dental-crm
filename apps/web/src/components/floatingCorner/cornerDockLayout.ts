/**
 * ПРАВИЛА ПЛАВАЮЩЕГО УГЛА (нижний правый). Единственный владелец региона.
 *
 * До этого модуля в углу жили три независимых `position: fixed` острова:
 * кнопка справки и кнопка микрофона портировались в `document.body` из
 * `VoiceAssistantUI`, плашка глобального поиска — из `Omnibar`, каждый со своим
 * z-index (50 и 9998) и своим отступом. Ни один не знал ни о другом, ни о
 * контенте страницы, поэтому микрофон физически накрывал кнопку «Сохранить»
 * панели плана лечения, а плашка поиска на узком экране налезала на нижнюю
 * навигацию.
 *
 * КОНТРАКТ РЕГИОНА
 * 1. В углу существует ровно один хост-элемент и ровно один stacking context.
 *    ЧЕСТНАЯ ОГОВОРКА (исправляет неверное утверждение, которое стояло здесь
 *    раньше — «никто больше не имеет права ставить `position: fixed` в правый
 *    нижний угол»): такого запрета в проекте нет и его нельзя объявить
 *    комментарием. На момент правки в этом же углу живут ещё два чужих
 *    `position: fixed`: `components/IncomingCallToast.tsx:67`
 *    (`bottom-6 right-6 z-[999999]`, шире дока и НАД ним по слою) и
 *    `components/schedule/WaitlistDrawer.tsx:188` (`bottom-4 right-4 z-50`).
 *    Оба находятся вне этого модуля, поэтому контракт обращается с ними как с
 *    обычным содержимым страницы: они попадают в список мишеней и панель им
 *    уступает подъёмом (см. п.5 и `INTERACTIVE_ROLES`, куда добавлены роли
 *    диалога — именно из-за тоста звонка).
 * 2. Хост состоит из двух частей:
 *    - ПАНЕЛЬ УПРАВЛЕНИЯ (`bar`) — постоянно видимая строка из слотов
 *      `search`, `help`, `voice` (слева направо; `voice` — основное действие и
 *      стоит ближе всех к углу). Только она участвует в геометрии: только её
 *      высота резервируется в потоке страницы и только её прямоугольник
 *      проверяется на пересечение с интерактивным контентом.
 *    - НАКЛАДКА (`notice`) — временные панели, вызванные самим пользователем:
 *      подсказки диктовки, расшифровка речи, чип выполненной команды. Они живут
 *      НАД панелью, исчезают сами и по контракту имеют право перекрывать
 *      контент, как любое всплывающее окно. В резерв и в проверку пересечений
 *      накладка не входит — иначе открытая подсказка на 70vh мгновенно
 *      добавляла бы странице 700px пустого низа.
 * 3. Порядок слотов задаётся здесь, а не порядком монтирования компонентов.
 * 4. Панель никогда не стоит на нижней навигации: её просвет измеряется по
 *    живому элементу навигации, а не задаётся числом. Раньше здесь было
 *    зашитое `--floating-corner-bottom: 4.5rem`, которое угадывало высоту
 *    навигации и на 720px угадывало неверно.
 * 5. Если под панелью оказался интерактивный элемент страницы, панель уступает:
 *    сначала поднимается на минимальную высоту, при которой пересечений нет,
 *    и только если такой высоты в пределах нижней половины экрана не
 *    существует — переходит в компактный режим (иконки без подписей), чтобы
 *    уменьшить собственный след.
 * 6. Мишени проверяются в ТОМ положении, которое панель займёт, а не только в
 *    исходном. Раньше список мишеней снимался один раз при подъёме 0, и
 *    выбранный подъём мог поставить панель на кнопку, которую никто не мерил:
 *    панель лечения — это СТОЛБИК кнопок, и уступив нижней, панель садилась на
 *    следующую. Поэтому решение ищется `resolveCornerPlacementSampled`:
 *    выбранное положение доснимается и, если там нашлась новая мишень, решение
 *    пересчитывается. Множество мишеней только растёт, число досъёмов ограничено
 *    `CORNER_MAX_SOLVE_PASSES`, поэтому процесс конечен и детерминирован.
 * 7. Резерв в потоке страницы применяется РОВНО ОДИН РАЗ и ровно к одному
 *    элементу — колонке контента (`.workspace`). Наложение двух резервов на
 *    вложенные боксы даёт двойной пустой низ, и именно за это пакет U4 вернули.
 *
 * Модуль намеренно не знает про DOM: здесь только арифметика и порядок, чтобы
 * их можно было проверить тестом (`cornerDockLayout.test.ts`).
 */

/** Слоты панели управления и накладки. Других слотов в углу не существует. */
export type CornerSlotId = "notice" | "search" | "help" | "voice";

/**
 * Порядок обхода слотов. Для панели управления это порядок слева направо,
 * то есть и порядок обхода табом: сначала поиск, потом справка, потом
 * микрофон вплотную к углу.
 */
export const CORNER_SLOT_ORDER: readonly CornerSlotId[] = [
	"notice",
	"search",
	"help",
	"voice",
];

/** Слоты, образующие постоянно видимую панель управления. */
export const CORNER_BAR_SLOTS: readonly CornerSlotId[] = [
	"search",
	"help",
	"voice",
];

/**
 * Доля высоты экрана, ниже которой панель обязана остаться при подъёме.
 * Панель — угловой элемент, а не всплывающее окно: уехав в середину экрана,
 * она перестаёт читаться как угол и начинает закрывать другой контент.
 */
export const CORNER_LIFT_VIEWPORT_SHARE = 0.5;

/**
 * Отступ точек замера от границ прямоугольника панели, в пикселях. Волосяная
 * величина: без неё точка на самой границе попадает в соседний элемент.
 */
export const CORNER_SAMPLE_INSET = 1;

/**
 * Минимальная сторона элемента, который считается настоящей мишенью. Меньше —
 * это декоративная обёртка или невидимый спан, уступать ему нечего.
 */
export const CORNER_OBSTACLE_MIN_SIZE = 8;

/** Прямоугольник в координатах вьюпорта. */
export interface CornerRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface CornerPoint {
	readonly x: number;
	readonly y: number;
}

/** Площадь пересечения. Ноль, если прямоугольники не пересекаются. */
export function cornerOverlapArea(a: CornerRect, b: CornerRect): number {
	const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
	const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
	return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Поднимает прямоугольник на `lift` пикселей вверх. Отрицательный `lift` — точная
 * обратная операция: ею владелец региона восстанавливает исходное положение
 * панели из уже измеренного поднятого, вместо того чтобы обнулять подъём в
 * стилях и заново читать геометрию. Подъём задан только через `bottom`, то есть
 * является чистым переносом, поэтому обратная операция точна, а не приблизительна.
 */
export function liftCornerRect(rect: CornerRect, lift: number): CornerRect {
	return {
		left: rect.left,
		right: rect.right,
		top: rect.top - lift,
		bottom: rect.bottom - lift,
	};
}

/**
 * Точки замера: четыре угла с волосяным отступом внутрь плюс центр.
 * Через них панель узнаёт, что под ней лежит.
 */
export function cornerSamplePoints(
	rect: CornerRect,
	inset: number = CORNER_SAMPLE_INSET,
): CornerPoint[] {
	const left = rect.left + inset;
	const right = rect.right - inset;
	const top = rect.top + inset;
	const bottom = rect.bottom - inset;
	return [
		{ x: left, y: top },
		{ x: right, y: top },
		{ x: left, y: bottom },
		{ x: right, y: bottom },
		{ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 },
	];
}

/** Теги, которые сами по себе являются мишенью. */
const INTERACTIVE_TAGS = new Set([
	"a",
	"button",
	"details",
	"input",
	"label",
	"select",
	"summary",
	"textarea",
]);

/**
 * Роли ARIA, которыми размечают нативно неинтерактивные элементы.
 *
 * `dialog` и `alertdialog` здесь не для красоты. `IncomingCallToast.tsx:67` —
 * это `<div role="dialog" tabindex="-1">` шириной 24rem, прибитый в тот же угол
 * с `z-index: 999999`, то есть ВЫШЕ дока. Без этих двух ролей тост не считался
 * мишенью (`div` нет среди тегов, `tabIndex` -1), панель не уступала, и тост
 * просто накрывал микрофон, справку и поиск на каждом входящем звонке — ровно
 * тот отказ, ради устранения которого регион и заведён.
 */
const INTERACTIVE_ROLES = new Set([
	"alertdialog",
	"button",
	"checkbox",
	"combobox",
	"dialog",
	"link",
	"menuitem",
	"option",
	"radio",
	"switch",
	"tab",
	"textbox",
]);

export interface CornerObstacleCandidate {
	readonly tagName: string;
	readonly role: string | null;
	readonly tabIndex: number;
	readonly disabled: boolean;
	readonly hidden: boolean;
	readonly width: number;
	readonly height: number;
}

/**
 * Уступать нужно только тому, что пользователь может нажать. Заголовок,
 * абзац или фон перекрывать не запрещено — недоступной становится именно
 * кнопка, до которой нельзя дотянуться.
 */
export function isCornerObstacle(candidate: CornerObstacleCandidate): boolean {
	if (candidate.hidden || candidate.disabled) return false;
	if (
		candidate.width < CORNER_OBSTACLE_MIN_SIZE ||
		candidate.height < CORNER_OBSTACLE_MIN_SIZE
	) {
		return false;
	}
	if (INTERACTIVE_TAGS.has(candidate.tagName.toLowerCase())) return true;
	if (candidate.role && INTERACTIVE_ROLES.has(candidate.role.toLowerCase())) {
		return true;
	}
	return candidate.tabIndex >= 0;
}

/**
 * Сколько пикселей от низа вьюпорта занимает нижняя навигация.
 * `bottomBarTop === null` — навигации на этой ширине нет.
 */
export function computeCornerBarClearance(input: {
	readonly viewportHeight: number;
	readonly bottomBarTop: number | null;
}): number {
	if (input.bottomBarTop === null) return 0;
	return Math.max(0, Math.round(input.viewportHeight - input.bottomBarTop));
}

/**
 * Сколько места по вертикали страница обязана оставить под угол, чтобы любой
 * её элемент можно было прокрутить выше панели. Считается по панели управления;
 * временная накладка сюда не входит.
 *
 * ЭТО ЧИСЛО ПРИМЕНЯЕТСЯ РОВНО ОДИН РАЗ, к одному элементу — колонке контента.
 * Значение публикуется в `--corner-dock-reserve-block`, и в CSS проекта есть
 * ровно один потребитель этой переменной (`dente-redesign.css`, правило
 * `.app-shell.dente-redesign .workspace`). Если потребителей станет два и они
 * окажутся вложенными друг в друга, пустой низ удвоится: `box-sizing:
 * border-box` у внешнего бокса срежет видимую высоту внутреннего на `reserve`,
 * а внутренний добавит ещё `reserve` своего отступа.
 *
 * Подъём (`lift`) в резерв НЕ входит намеренно. Подъём — это ответ на живую
 * мишень под панелью: то, что оказалось под ПОДНЯТОЙ панелью, уже проверено
 * `resolveCornerPlacementSampled` и мишенью не является, а перекрывать текст и
 * фон контракт разрешает (п.5). Включение `lift` в резерв раздуло бы хвостовой
 * отступ на величину до `computeCornerMaxLift` на каждом экране, где внизу есть
 * закреплённый элемент.
 */
export function computeCornerReserve(input: {
	readonly barHeight: number;
	readonly gutter: number;
	readonly barClearance: number;
}): number {
	if (input.barHeight <= 0) return 0;
	return Math.ceil(input.barHeight + input.gutter * 2 + input.barClearance);
}

/**
 * Максимальный подъём: панель обязана остаться в нижней половине экрана.
 */
export function computeCornerMaxLift(input: {
	readonly viewportHeight: number;
	readonly barHeight: number;
	readonly gutter: number;
	readonly barClearance: number;
	readonly viewportShare?: number;
}): number {
	const share = input.viewportShare ?? CORNER_LIFT_VIEWPORT_SHARE;
	const budget = input.viewportHeight * share;
	const occupied = input.barHeight + input.gutter + input.barClearance;
	return Math.max(0, Math.floor(budget - occupied));
}

export interface CornerPlacementInput {
	/** Прямоугольник панели без подъёма. */
	readonly footprint: CornerRect;
	/** Прямоугольники интерактивных элементов страницы под панелью. */
	readonly obstacles: readonly CornerRect[];
	/** Верхняя граница подъёма из `computeCornerMaxLift`. */
	readonly maxLift: number;
}

export interface CornerPlacement {
	/** На сколько пикселей поднять панель. */
	readonly lift: number;
	/**
	 * Перейти в компактный режим: свободного положения в пределах нижней
	 * половины экрана не нашлось, панель уменьшает собственный след.
	 */
	readonly compact: boolean;
}

/**
 * Ищет минимальный подъём, при котором панель не накрывает ни одну мишень.
 *
 * Кандидаты — ноль и «встать ровно над верхней границей каждой помехи».
 * Функция детерминирована и зависит только от переданной геометрии: она не
 * помнит предыдущее состояние, поэтому не может зациклиться на самой себе.
 * Если ни один кандидат не свободен, выбирается кандидат с наименьшей площадью
 * пересечения (при равенстве — наименьший подъём) и запрашивается компактный
 * режим.
 */
export function resolveCornerPlacement(
	input: CornerPlacementInput,
): CornerPlacement {
	const maxLift = Math.max(0, input.maxLift);
	if (input.obstacles.length === 0) return { lift: 0, compact: false };

	const candidates = new Set<number>([0]);
	for (const obstacle of input.obstacles) {
		const needed = Math.ceil(input.footprint.bottom - obstacle.top);
		if (needed > 0 && needed <= maxLift) candidates.add(needed);
	}

	const ordered = [...candidates].sort((a, b) => a - b);
	let fallbackLift = 0;
	let fallbackArea = Number.POSITIVE_INFINITY;

	for (const lift of ordered) {
		const shifted = liftCornerRect(input.footprint, lift);
		let area = 0;
		for (const obstacle of input.obstacles) {
			area += cornerOverlapArea(shifted, obstacle);
		}
		if (area === 0) return { lift, compact: false };
		if (area < fallbackArea) {
			fallbackArea = area;
			fallbackLift = lift;
		}
	}

	return { lift: fallbackLift, compact: true };
}

/**
 * Сколько раз за одно решение разрешено снимать мишени. Первый снимок — в
 * исходном положении, остальные — проверка выбранного положения.
 */
export const CORNER_MAX_SOLVE_PASSES = 3;

/** Ключ прямоугольника: одна и та же мишень не должна попасть в список дважды. */
function cornerRectKey(rect: CornerRect): string {
	return `${rect.left}:${rect.top}:${rect.right}:${rect.bottom}`;
}

export interface CornerSampledSolveInput {
	/** Прямоугольник панели без подъёма. */
	readonly footprint: CornerRect;
	/** Верхняя граница подъёма из `computeCornerMaxLift`. */
	readonly maxLift: number;
	/**
	 * Снять мишени для панели, поднятой на `lift`. Вызывающий (слой DOM) сам
	 * решает, как их искать; здесь важно только то, что снимок берётся ИМЕННО в
	 * том положении, которое проверяется.
	 */
	readonly sample: (lift: number) => readonly CornerRect[];
}

export interface CornerSampledSolveResult {
	readonly placement: CornerPlacement;
	/** Сколько раз вызвана `sample`. Это и есть цена решения в попаданиях. */
	readonly sampleCount: number;
	/** Итоговый список мишеней — для проверки и отладки контракта. */
	readonly obstacles: readonly CornerRect[];
}

/**
 * Решение с ПРОВЕРКОЙ ВЫБРАННОГО ПОЛОЖЕНИЯ.
 *
 * Было: мишени снимались один раз при подъёме 0, и `resolveCornerPlacement`
 * перебирал все подъёмы по этому одному списку. Всё, что висело выше угла и не
 * попало ни в одну точку замера, было невидимо — подъём мог поставить панель
 * ровно на другую кнопку и вернуть `compact: false` с нулевым расчётным
 * пересечением.
 *
 * Стало: выбранное положение доснимается. Найденные там новые мишени добавляются
 * в список, решение пересчитывается. Множество мишеней только растёт, значит
 * подъём монотонен, а число досъёмов ограничено `CORNER_MAX_SOLVE_PASSES` —
 * зацикливание невозможно. При `lift === 0` досъёма нет вообще: это положение
 * уже измерено, и в подавляющем большинстве кадров цена остаётся прежней.
 *
 * ОСТАТОЧНЫЙ ПРЕДЕЛ, честно: если каждый новый снимок открывает ещё одну ранее
 * невидимую мишень, цикл упирается в `CORNER_MAX_SOLVE_PASSES` и возвращает
 * положение, которое доснять уже не успел. Такой вход — не столбик кнопок, а
 * непрерывная лестница мишеней с шагом в высоту панели; в этом случае решение
 * остаётся приблизительным, но конечным, и `sampleCount` показывает, что предел
 * был достигнут (`sampleCount === CORNER_MAX_SOLVE_PASSES`). Альтернатива —
 * снимать всю полосу подъёма сразу — стоит десятки попаданий на кадр на КАЖДОМ
 * экране ради входа, который на реальных страницах не встречается.
 */
export function resolveCornerPlacementSampled(
	input: CornerSampledSolveInput,
): CornerSampledSolveResult {
	const obstacles: CornerRect[] = [];
	const seen = new Set<string>();
	const add = (rects: readonly CornerRect[]): number => {
		let added = 0;
		for (const rect of rects) {
			const key = cornerRectKey(rect);
			if (seen.has(key)) continue;
			seen.add(key);
			obstacles.push(rect);
			added += 1;
		}
		return added;
	};

	add(input.sample(0));
	let sampleCount = 1;
	let placement = resolveCornerPlacement({
		footprint: input.footprint,
		obstacles,
		maxLift: input.maxLift,
	});

	while (sampleCount < CORNER_MAX_SOLVE_PASSES && placement.lift > 0) {
		const added = add(input.sample(placement.lift));
		sampleCount += 1;
		if (added === 0) break;
		const next = resolveCornerPlacement({
			footprint: input.footprint,
			obstacles,
			maxLift: input.maxLift,
		});
		if (next.lift === placement.lift && next.compact === placement.compact) {
			placement = next;
			break;
		}
		placement = next;
	}

	return { placement, sampleCount, obstacles };
}

/**
 * Как часто разрешено пересчитывать раскладку по потоковым событиям.
 *
 * Прокрутка — единственный код-путь угла, гарантированно живой на каждом экране
 * у каждого пользователя. Замерено в браузере на HEAD 8ff0ba18e (окно 390x844,
 * список пациентов, 120 кадров прокрутки): 59 полных проходов, 295 вызовов
 * `document.elementsFromPoint`, то есть 2.46 попадания на кадр, и каждый проход
 * писал `--corner-dock-lift` перед чтением `getBoundingClientRect()`, то есть
 * заказывал принудительный пересчёт layout.
 *
 * 100 мс = не чаще 10 Гц. Компромисс осознанный: посреди прокрутки контент и так
 * едет, и панель имеет право на 100 мс устаревшего решения; зато после остановки
 * прокрутки отложенный проход обязательно случается (см. `deferMs`), поэтому в
 * покое решение всегда точное. Изменения размера окна и самой панели идут как
 * `immediate` и ждать не обязаны.
 */
export const CORNER_STREAM_INTERVAL_MS = 100;

export type CornerPassTrigger = "immediate" | "stream";

export interface CornerPassDecision {
	/** Считать раскладку сейчас (в ближайшем кадре анимации). */
	readonly run: boolean;
	/**
	 * Если считать сейчас нельзя — через сколько миллисекунд вернуться к решению.
	 * Ноль при `run: true`. Именно это поле даёт проход «после остановки
	 * прокрутки»: последнее событие потока планирует отложенную попытку, и она
	 * срабатывает, когда поток стих.
	 */
	readonly deferMs: number;
}

/**
 * Пускать ли проход раскладки. Чистая функция от времени — поэтому её можно
 * проверить тестом, а не профилировщиком.
 */
export function shouldRunCornerPass(input: {
	readonly now: number;
	readonly lastRunAt: number | null;
	readonly trigger: CornerPassTrigger;
	readonly intervalMs?: number;
}): CornerPassDecision {
	if (input.trigger === "immediate") return { run: true, deferMs: 0 };
	if (input.lastRunAt === null) return { run: true, deferMs: 0 };
	const interval = input.intervalMs ?? CORNER_STREAM_INTERVAL_MS;
	const elapsed = input.now - input.lastRunAt;
	if (elapsed >= interval) return { run: true, deferMs: 0 };
	return { run: false, deferMs: Math.max(1, Math.ceil(interval - elapsed)) };
}
