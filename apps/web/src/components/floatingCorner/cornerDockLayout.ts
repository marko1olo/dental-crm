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
 *    Никто больше не имеет права ставить `position: fixed` в правый нижний угол.
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

export function isCornerSlotId(value: string): value is CornerSlotId {
	return (CORNER_SLOT_ORDER as readonly string[]).includes(value);
}

/**
 * Сортирует произвольный набор слотов в порядке контракта. Порядок монтирования
 * компонентов на результат не влияет — это и есть смысл единственного владельца.
 */
export function sortCornerSlots(
	slots: readonly CornerSlotId[],
): CornerSlotId[] {
	const seen = new Set<CornerSlotId>(slots);
	return CORNER_SLOT_ORDER.filter((slot) => seen.has(slot));
}

export function cornerRectsOverlap(a: CornerRect, b: CornerRect): boolean {
	return (
		a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
	);
}

/** Площадь пересечения. Ноль, если прямоугольники не пересекаются. */
export function cornerOverlapArea(a: CornerRect, b: CornerRect): number {
	const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
	const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
	return width > 0 && height > 0 ? width * height : 0;
}

/** Поднимает прямоугольник на `lift` пикселей вверх. */
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

/** Роли ARIA, которыми размечают нативно неинтерактивные элементы. */
const INTERACTIVE_ROLES = new Set([
	"button",
	"checkbox",
	"combobox",
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
