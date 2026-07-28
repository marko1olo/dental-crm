import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./cornerDock.css";
import { cornerDockLabels } from "./cornerDockLabels.js";
import {
	CORNER_BAR_SLOTS,
	CORNER_SLOT_ORDER,
	type CornerObstacleCandidate,
	type CornerRect,
	type CornerSlotId,
	computeCornerBarClearance,
	computeCornerMaxLift,
	computeCornerReserve,
	cornerSamplePoints,
	isCornerObstacle,
	resolveCornerPlacement,
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
let resizeObserver: ResizeObserver | null = null;
let observedBar: Element | null = null;

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

function applyLayout(): void {
	const dom = dockDom;
	if (!dom) return;
	const { host, bar } = dom;
	const rootStyle = document.documentElement.style;

	const viewportHeight = window.innerHeight;
	const gutter = readGutterPx(host);
	const bottomBar = findBottomBar();
	const barClearance = computeCornerBarClearance({
		viewportHeight,
		bottomBarTop: bottomBar
			? bottomBar.getBoundingClientRect().top
			: null,
	});
	host.style.setProperty(VAR_BAR_CLEARANCE, `${barClearance}px`);

	// Замер всегда идёт от исходного положения: состояние угла — чистая функция
	// от текущей раскладки страницы, поэтому подъём не может сам себя раскачать.
	host.style.setProperty(VAR_LIFT, "0px");
	host.dataset.cornerDensity = "comfortable";

	let footprint = toRect(bar.getBoundingClientRect());
	let barHeight = footprint.bottom - footprint.top;
	if (barHeight <= 0) {
		// Панель пуста: угол ничего не занимает и ничего не резервирует.
		rootStyle.setProperty(VAR_RESERVE, "0px");
		return;
	}

	let maxLift = computeCornerMaxLift({
		viewportHeight,
		barHeight,
		gutter,
		barClearance,
	});
	let placement = resolveCornerPlacement({
		footprint,
		obstacles: collectObstacles(host, footprint, bottomBar),
		maxLift,
	});

	if (placement.compact) {
		// Один-единственный повторный проход: компактный режим уменьшает след,
		// после чего свободное положение может найтись. Дальше не идём — иначе
		// это уже цикл, а не решение.
		host.dataset.cornerDensity = "compact";
		footprint = toRect(bar.getBoundingClientRect());
		barHeight = footprint.bottom - footprint.top;
		maxLift = computeCornerMaxLift({
			viewportHeight,
			barHeight,
			gutter,
			barClearance,
		});
		placement = resolveCornerPlacement({
			footprint,
			obstacles: collectObstacles(host, footprint, bottomBar),
			maxLift,
		});
	}

	host.style.setProperty(VAR_LIFT, `${placement.lift}px`);
	rootStyle.setProperty(
		VAR_RESERVE,
		`${computeCornerReserve({ barHeight, gutter, barClearance })}px`,
	);
}

function schedule(): void {
	if (frame || !dockDom) return;
	frame = window.requestAnimationFrame(() => {
		frame = 0;
		applyLayout();
	});
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
	window.addEventListener("resize", schedule);
	// capture: страница прокручивается внутри `.workspace`, а не в окне, и
	// событие scroll от вложенного контейнера не всплывает.
	window.addEventListener("scroll", schedule, { capture: true, passive: true });
	resizeObserver = new ResizeObserver(schedule);
	resizeObserver.observe(dockDom.host);
	resizeObserver.observe(document.body);
	syncBarObservation();
	applyLayout();
}

function detach(): void {
	if (frame) {
		window.cancelAnimationFrame(frame);
		frame = 0;
	}
	window.removeEventListener("resize", schedule);
	window.removeEventListener("scroll", schedule, { capture: true });
	resizeObserver?.disconnect();
	resizeObserver = null;
	observedBar = null;
	document.documentElement.style.removeProperty(VAR_RESERVE);
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

/** Экспорт для тестов и для проверки контракта: полный список слотов угла. */
export const cornerDockSlots = CORNER_SLOT_ORDER;
