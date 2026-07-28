import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./cornerDock.css";
import { cornerDockLabels } from "./cornerDockLabels.js";
import {
	CORNER_BAR_SLOTS,
	type CornerObstacleCandidate,
	type CornerPassTrigger,
	type CornerRect,
	type CornerSlotId,
	computeCornerBarClearance,
	computeCornerMaxLift,
	computeCornerReserve,
	cornerSamplePoints,
	isCornerObstacle,
	liftCornerRect,
	resolveCornerPlacementSampled,
	shouldRunCornerPass,
} from "./cornerDockLayout.js";

/**
 * ВЛАДЕЛЕЦ ПРАВОГО НИЖНЕГО УГЛА.
 *
 * Хост создаётся один раз на весь документ, живёт по счётчику ссылок и сам
 * снимается, когда последний слот размонтирован. React-компонент здесь не
 * рендерит разметку хоста намеренно: угол обязан существовать независимо от
 * того, какой из его жильцов смонтировался первым, а `App.tsx` (монолит,
 * который правят параллельно) не должен ничего знать об этом регионе.
 *
 * Правила самого региона и вся арифметика — в `cornerDockLayout.ts`.
 */

const HOST_ID = "dente-corner-dock";

/**
 * Селектор нижней мобильной навигации. Это контракт разметки оболочки
 * (`.dnt-bottom-nav`), а не настройка: угол обязан измерить навигацию, чтобы
 * никогда на неё не наступать.
 */
const BOTTOM_BAR_SELECTOR = ".dnt-bottom-nav";

/** Имена публикуемых переменных. Их читает CSS угла и резерв в потоке страницы. */
const VAR_BAR_CLEARANCE = "--corner-dock-bar-clearance";
const VAR_LIFT = "--corner-dock-lift";
const VAR_RESERVE = "--corner-dock-reserve-block";

interface DockDom {
	readonly host: HTMLDivElement;
	readonly bar: HTMLDivElement;
	readonly slots: ReadonlyMap<CornerSlotId, HTMLDivElement>;
}

let dockDom: DockDom | null = null;
let refCount = 0;
let frame = 0;
let deferTimer: ReturnType<typeof setTimeout> | null = null;
let lastPassAt: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let contentObserver: ResizeObserver | null = null;
let observedBar: Element | null = null;

/**
 * Что уже записано в стили. Нужно, чтобы НЕ писать то же самое значение снова:
 * запись пользовательского свойства, от которого зависит `bottom`, помечает
 * layout грязным, и следующий `getBoundingClientRect()` в том же кадре
 * превращается в принудительный пересчёт. В покое здесь не пишется ничего.
 */
let appliedLift = 0;
let appliedClearance: number | null = null;
let appliedReserve: number | null = null;
let appliedCompact = false;

function buildDom(): DockDom {
	const host = document.createElement("div");
	host.id = HOST_ID;
	host.className = "corner-dock";
	host.dataset.cornerDensity = "comfortable";
	// Регион, а не диалог: скринридер должен объявлять его один раз и не
	// перехватывать фокус.
	host.setAttribute("role", "region");
	host.setAttribute("aria-label", cornerDockLabels.region);

	const slots = new Map<CornerSlotId, HTMLDivElement>();
	const makeSlot = (slot: CornerSlotId): HTMLDivElement => {
		const element = document.createElement("div");
		element.className = "corner-dock__slot";
		element.dataset.cornerSlot = slot;
		slots.set(slot, element);
		return element;
	};

	// Накладка идёт первой в потоке колонки, то есть визуально выше панели.
	const notice = makeSlot("notice");
	notice.classList.add("corner-dock__notice");
	host.append(notice);

	const bar = document.createElement("div");
	bar.className = "corner-dock__bar";
	// Порядок слотов панели задан контрактом, а не порядком монтирования.
	for (const slot of CORNER_BAR_SLOTS) bar.append(makeSlot(slot));
	host.append(bar);

	document.body.append(host);
	return { host, bar, slots };
}

function readGutterPx(host: HTMLElement): number {
	// `right` у хоста задан токеном `--corner-dock-gutter` в rem. Единственный
	// источник истины — CSS; сюда приходит уже вычисленное значение в px, чтобы
	// в коде не появилось второе, зашитое.
	const raw = Number.parseFloat(window.getComputedStyle(host).right);
	return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

function toRect(rect: DOMRect): CornerRect {
	return {
		left: rect.left,
		top: rect.top,
		right: rect.right,
		bottom: rect.bottom,
	};
}

function describeCandidate(
	element: Element,
	rect: DOMRect,
): CornerObstacleCandidate {
	const tabIndexAttribute = element.getAttribute("tabindex");
	const parsedTabIndex = tabIndexAttribute
		? Number.parseInt(tabIndexAttribute, 10)
		: Number.NaN;
	const tabIndex = Number.isFinite(parsedTabIndex)
		? parsedTabIndex
		: element instanceof HTMLElement
			? element.tabIndex
			: -1;
	return {
		tagName: element.tagName,
		role: element.getAttribute("role"),
		tabIndex,
		disabled:
			element.hasAttribute("disabled") ||
			element.getAttribute("aria-disabled") === "true",
		hidden:
			element.hasAttribute("hidden") ||
			element.getAttribute("aria-hidden") === "true",
		width: rect.width,
		height: rect.height,
	};
}

function findBottomBar(): HTMLElement | null {
	const element = document.querySelector<HTMLElement>(BOTTOM_BAR_SELECTOR);
	if (!element) return null;
	return window.getComputedStyle(element).display === "none" ? null : element;
}

/** Собирает мишени страницы, которые сейчас лежат под панелью. */
function collectObstacles(
	host: HTMLElement,
	footprint: CornerRect,
	bottomBar: HTMLElement | null,
): CornerRect[] {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const seen = new Set<Element>();
	const obstacles: CornerRect[] = [];
	for (const point of cornerSamplePoints(footprint)) {
		if (point.x < 0 || point.y < 0) continue;
		if (point.x > viewportWidth || point.y > viewportHeight) continue;
		for (const element of document.elementsFromPoint(point.x, point.y)) {
			if (seen.has(element)) continue;
			seen.add(element);
			if (host.contains(element)) continue;
			// Навигацию угол обходит просветом, а не подъёмом.
			if (bottomBar?.contains(element)) continue;
			const rect = element.getBoundingClientRect();
			if (!isCornerObstacle(describeCandidate(element, rect))) continue;
			obstacles.push(toRect(rect));
		}
	}
	return obstacles;
}

/**
 * Восстанавливает исходное (не поднятое) положение панели из уже измеренного.
 * Подъём задан только через `bottom`, поэтому вычитание — точная обратная
 * операция. Раньше здесь стояла запись `--corner-dock-lift: 0px` перед чтением
 * геометрии: она помечала layout грязным и делала следующий
 * `getBoundingClientRect()` принудительным пересчётом в каждом кадре прокрутки.
 * Смысл замера «всегда от исходного положения» сохранён полностью — изменился
 * только способ его получить.
 */
function measureRestingFootprint(bar: HTMLElement): CornerRect {
	return liftCornerRect(toRect(bar.getBoundingClientRect()), -appliedLift);
}

function applyLayout(): void {
	const dom = dockDom;
	if (!dom) return;
	const { host, bar } = dom;
	const rootStyle = document.documentElement.style;
	lastPassAt = performance.now();

	const viewportHeight = window.innerHeight;
	const gutter = readGutterPx(host);
	const bottomBar = findBottomBar();
	const barClearance = computeCornerBarClearance({
		viewportHeight,
		bottomBarTop: bottomBar ? bottomBar.getBoundingClientRect().top : null,
	});
	if (barClearance !== appliedClearance) {
		host.style.setProperty(VAR_BAR_CLEARANCE, `${barClearance}px`);
		appliedClearance = barClearance;
	}

	// Компактный режим меняет РАЗМЕР панели, а не только её положение, поэтому
	// обратной арифметикой его не снять: здесь запись действительно нужна. Она
	// делается только когда угол уже сжат, то есть в редком случае.
	if (appliedCompact) {
		host.dataset.cornerDensity = "comfortable";
		appliedCompact = false;
	}

	let footprint = measureRestingFootprint(bar);
	let barHeight = footprint.bottom - footprint.top;
	if (barHeight <= 0) {
		// Панель пуста: угол ничего не занимает и ничего не резервирует.
		if (appliedReserve !== 0) {
			rootStyle.setProperty(VAR_RESERVE, "0px");
			appliedReserve = 0;
		}
		return;
	}

	const solve = (): ReturnType<typeof resolveCornerPlacementSampled> =>
		resolveCornerPlacementSampled({
			footprint,
			maxLift: computeCornerMaxLift({
				viewportHeight,
				barHeight,
				gutter,
				barClearance,
			}),
			// Мишени снимаются в ТОМ положении, которое проверяется, а не только в
			// исходном: иначе подъём мог сесть на кнопку, которую никто не мерил.
			sample: (lift) =>
				collectObstacles(host, liftCornerRect(footprint, lift), bottomBar),
		});

	let placement = solve().placement;

	if (placement.compact) {
		// Один-единственный повторный проход: компактный режим уменьшает след,
		// после чего свободное положение может найтись. Дальше не идём — иначе
		// это уже цикл, а не решение.
		host.dataset.cornerDensity = "compact";
		appliedCompact = true;
		// Подъём в стилях сейчас соответствует appliedLift, обратная арифметика
		// по-прежнему верна: сжатие меняет высоту панели, но не её `bottom`.
		footprint = measureRestingFootprint(bar);
		barHeight = footprint.bottom - footprint.top;
		placement = solve().placement;
	}

	if (placement.lift !== appliedLift) {
		host.style.setProperty(VAR_LIFT, `${placement.lift}px`);
		appliedLift = placement.lift;
	}
	const reserve = computeCornerReserve({ barHeight, gutter, barClearance });
	if (reserve !== appliedReserve) {
		rootStyle.setProperty(VAR_RESERVE, `${reserve}px`);
		appliedReserve = reserve;
	}
}

function runPass(): void {
	frame = 0;
	applyLayout();
}

/**
 * Планирует проход раскладки.
 *
 * `immediate` — изменение размера окна, панели или состава слотов: пользователь
 * ждёт немедленной реакции.
 * `stream` — прокрутка и рост содержимого страницы: поток событий частотой в
 * кадр. Такие проходы ограничены `CORNER_STREAM_INTERVAL_MS`, а последний
 * обязательно догоняется отложенной попыткой, поэтому в покое решение точное.
 */
function schedule(trigger: CornerPassTrigger = "immediate"): void {
	if (!dockDom) return;
	const decision = shouldRunCornerPass({
		now: performance.now(),
		lastRunAt: lastPassAt,
		trigger,
	});
	if (!decision.run) {
		if (deferTimer !== null) return;
		deferTimer = setTimeout(() => {
			deferTimer = null;
			schedule(trigger);
		}, decision.deferMs);
		return;
	}
	if (frame) return;
	frame = window.requestAnimationFrame(runPass);
}

function scheduleStream(): void {
	schedule("stream");
}

function scheduleImmediate(): void {
	schedule("immediate");
}

function syncBarObservation(): void {
	if (!resizeObserver) return;
	const bar = document.querySelector(BOTTOM_BAR_SELECTOR);
	if (bar === observedBar) return;
	if (observedBar) resizeObserver.unobserve(observedBar);
	observedBar = bar;
	if (bar) resizeObserver.observe(bar);
}

function attach(): void {
	if (dockDom) return;
	dockDom = buildDom();
	appliedLift = 0;
	appliedClearance = null;
	appliedReserve = null;
	appliedCompact = false;
	lastPassAt = null;
	window.addEventListener("resize", scheduleImmediate);
	// capture: прокрутка внутри вложенного контейнера не всплывает до window, а
	// какой именно контейнер везёт страницу, у разных экранов по-разному:
	// замерено, что `.workspace` объявляет `overflow-y: auto`, но не ограничен по
	// высоте (scrollHeight == clientHeight), и на списке пациентов прокручивается
	// сам документ. Слушать в фазе перехвата — единственный способ не зависеть от
	// этого различия.
	window.addEventListener("scroll", scheduleStream, {
		capture: true,
		passive: true,
	});
	// Размер самой панели и высота навигации — немедленная реакция: их меняет
	// пользователь, а не поток прокрутки.
	resizeObserver = new ResizeObserver(scheduleImmediate);
	resizeObserver.observe(dockDom.host);
	syncBarObservation();
	// Рост содержимого страницы — тот же поток, что и прокрутка.
	contentObserver = new ResizeObserver(scheduleStream);
	contentObserver.observe(document.body);
	applyLayout();
}

function detach(): void {
	if (frame) {
		window.cancelAnimationFrame(frame);
		frame = 0;
	}
	if (deferTimer !== null) {
		clearTimeout(deferTimer);
		deferTimer = null;
	}
	window.removeEventListener("resize", scheduleImmediate);
	window.removeEventListener("scroll", scheduleStream, { capture: true });
	resizeObserver?.disconnect();
	resizeObserver = null;
	contentObserver?.disconnect();
	contentObserver = null;
	observedBar = null;
	lastPassAt = null;
	document.documentElement.style.removeProperty(VAR_RESERVE);
	appliedReserve = null;
	dockDom?.host.remove();
	dockDom = null;
}

/**
 * Возвращает элемент слота для портала. Хост появляется при первом жильце и
 * снимается вместе с последним: teardown гарантирован тем же счётчиком, что и
 * создание, поэтому подписки и наблюдатели не могут пережить регион.
 */
export function useCornerDockSlot(slot: CornerSlotId): HTMLElement | null {
	const [target, setTarget] = useState<HTMLElement | null>(null);

	useEffect(() => {
		refCount += 1;
		attach();
		syncBarObservation();
		setTarget(dockDom?.slots.get(slot) ?? null);
		schedule();
		return () => {
			setTarget(null);
			refCount -= 1;
			if (refCount <= 0) {
				refCount = 0;
				detach();
			} else {
				schedule();
			}
		};
	}, [slot]);

	return target;
}

export interface CornerDockSlotProps {
	readonly slot: CornerSlotId;
	readonly children: React.ReactNode;
}

/**
 * Единственный разрешённый способ поселиться в правом нижнем углу.
 * Жилец не задаёт ни координат, ни z-index — их задаёт владелец региона.
 */
export function CornerDockSlot({
	slot,
	children,
}: CornerDockSlotProps): React.ReactElement | null {
	const target = useCornerDockSlot(slot);
	if (!target) return null;
	return createPortal(children, target);
}
