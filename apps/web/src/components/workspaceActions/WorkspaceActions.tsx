import { Mic, X } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import "./workspaceActions.css";
import { workspaceActionsLabels } from "./workspaceActionsLabels.js";
import {
	resolveWorkspaceActionPlacement,
	WORKSPACE_ACTION_BAR_SLOTS,
	WORKSPACE_ACTION_HOST_ID,
	WORKSPACE_ACTION_NAV_SELECTOR,
	type WorkspaceActionPlacement,
	type WorkspaceActionSlotId,
	workspaceActionBarOrder,
} from "./workspaceActionsPlacement.js";

/**
 * ВЛАДЕЛЕЦ ГРУППЫ ДЕЙСТВИЙ РАБОЧЕЙ ОБЛАСТИ (поиск, голос, справка).
 *
 * ЧТО ЗАМЕНЕНО И ПОЧЕМУ. До этого модуля те же три кнопки жили в плавающем доке
 * `position: fixed` в правом нижнем углу. Док пытался не мешать странице: пять
 * раз за проход опрашивал DOM через `document.elementsFromPoint`, считал долю
 * перекрытия мишени и поднимался, если накрыл её не меньше чем на половину
 * площади. Порог недостижим: накрытая доля равна `ширина панели / ширина
 * мишени`, поэтому у главной кнопки продукта «Запись» (364x44) максимум был
 * 0.4615, и док не уступал ей никогда — зато садился на `<label>Email</label>`
 * формы пациента, и `document.elementFromPoint` в центре подписи возвращал
 * кнопку дока (арифметика и оба замера — в `workspaceActionsPlacement.ts` и в
 * `.agents/archon/packets/V1-corner-reserve-regression/review.md`).
 *
 * Вывод: механизм неисправим настройкой, потому что запрещён геометрией. Он
 * удалён целиком — вместе с выборкой помех, подъёмом, компактным режимом,
 * потоковыми проходами на прокрутке и резервом пустого низа
 * (`--corner-dock-reserve-block`). Ни одного слушателя `scroll`, ни одного
 * чтения `getBoundingClientRect`, ни одного попадания `elementsFromPoint` в
 * этом модуле больше нет: искать нечего, потому что группа не висит над
 * контентом.
 *
 * ГДЕ ОНА ЖИВЁТ ТЕПЕРЬ
 * - Широкий экран — строка действий топбара (`.top-actions`). Топбар и до этого
 *   страдал от шести несгруппированных кнопок, поэтому группа приходит туда
 *   ОДНИМ элементом `role="group"`, а не седьмым отдельным соседом.
 * - Узкий экран — нижняя навигация. Это лучше всего собранный элемент продукта
 *   (пять подписанных пунктов, крупные зоны нажатия), и трогать его состав
 *   нельзя: восемь пунктов на 390px дают 46px на пункт, и подпись «Пациенты»
 *   перестаёт влезать. Поэтому в навигацию добавляется РОВНО ОДИН пункт
 *   «Голос», а три действия лежат в панели, которую он открывает.
 *
 * ОДНА ТОЧКА МОНТАЖА НА ВЕСЬ ПРОЕКТ — `WorkspaceActionsMount`, и она стоит в
 * топбаре (`workspaceShell.tsx`). В нижнюю навигацию группа въезжает САМА:
 * вставляет туда свой контейнер и рисует в него портал. Так сделано не для
 * красоты — `<nav class="dnt-bottom-nav">` живёт в `App.tsx`, монолите на 4850
 * строк, который правят параллельно; вторая точка монтажа означала бы правку
 * этого файла и ещё один список, который можно забыть обновить. Селектор
 * навигации уже является контрактом разметки для этого модуля
 * (`WORKSPACE_ACTION_NAV_SELECTOR`), поэтому он читается, а не дублируется.
 *
 * ХОСТ ОДИН НА ДОКУМЕНТ и переезжает между двумя точками крепления. Слоты — те
 * же самые элементы в обеих раскладках, поэтому React-порталы жильцов при
 * переезде не пересоздаются и состояние диктовки не теряется.
 */

interface ActionsHostDom {
	readonly host: HTMLDivElement;
	readonly bar: HTMLDivElement;
	readonly slots: ReadonlyMap<WorkspaceActionSlotId, HTMLDivElement>;
}

let hostDom: ActionsHostDom | null = null;

function buildHost(): ActionsHostDom {
	const host = document.createElement("div");
	host.id = WORKSPACE_ACTION_HOST_ID;
	host.className = "dnt-actions";
	// Группа, а не диалог: программа чтения с экрана объявляет её один раз и не
	// перехватывает фокус.
	host.setAttribute("role", "group");
	host.setAttribute("aria-label", workspaceActionsLabels.region);

	const slots = new Map<WorkspaceActionSlotId, HTMLDivElement>();
	const makeSlot = (slot: WorkspaceActionSlotId): HTMLDivElement => {
		const element = document.createElement("div");
		element.className = "dnt-actions__slot";
		element.dataset.dntSlot = slot;
		slots.set(slot, element);
		return element;
	};

	// Накладка идёт первой: она обязана стоять выше строки кнопок.
	const notice = makeSlot("notice");
	notice.classList.add("dnt-actions__notice");
	host.append(notice);

	const bar = document.createElement("div");
	bar.className = "dnt-actions__bar";
	for (const slot of WORKSPACE_ACTION_BAR_SLOTS) bar.append(makeSlot(slot));
	host.append(bar);

	return { host, bar, slots };
}

function ensureHost(): ActionsHostDom {
	if (!hostDom) hostDom = buildHost();
	return hostDom;
}

/**
 * Показать группу, когда она открыла накладку.
 *
 * ЧЕСТНАЯ ПРИЧИНА, А НЕ УКРАШЕНИЕ. Группа больше не плавает над страницей, и это
 * имеет цену: в топбаре она едет вместе со страницей. Замерено по CSS —
 * `.topbar` объявлен `flex-shrink: 0` без `position: sticky`
 * (`styles/dente-redesign.css:379-385`), а прокручивается документ, а не
 * `.workspace` (у неё `scrollHeight == clientHeight`, замер ревьюера V1).
 * Значит, человек, пролиставший длинный список пациентов и нажавший «Справка»,
 * увидел бы пустоту: панель раскрылась бы выше видимой области.
 *
 * `block: "nearest"` — минимальная прокрутка: если группа и так видна, не
 * происходит ничего. Ни слушателей, ни замеров геометрии, ни повторных проходов
 * здесь нет — один вызов на открытие накладки.
 */
export function revealWorkspaceActions(): void {
	hostDom?.host.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * Порядок кнопок задаётся контрактом раскладки, а не порядком монтирования
 * жильцов: слоты переставляются в самом хосте.
 */
function applyBarOrder(
	dom: ActionsHostDom,
	placement: WorkspaceActionPlacement,
): void {
	for (const slot of workspaceActionBarOrder(placement)) {
		const element = dom.slots.get(slot);
		if (element) dom.bar.append(element);
	}
}

/**
 * Контейнер группы внутри живой нижней навигации.
 *
 * `display: contents` (см. CSS) — принципиально: кнопка обязана быть flex-элементом
 * САМОЙ навигации, иначе она не получит ни её `flex: 1`, ни выравнивание, ни
 * общую с соседями ширину. Контейнер — единственный узел, который группа
 * добавляет в чужую разметку; детей навигации она не трогает, поэтому
 * реконсиляция `App.tsx` с ней не спорит.
 */
let navSlotDom: HTMLDivElement | null = null;

function ensureNavSlot(): HTMLDivElement | null {
	const nav = document.querySelector(WORKSPACE_ACTION_NAV_SELECTOR);
	if (!nav) return null;
	if (!navSlotDom) {
		navSlotDom = document.createElement("div");
		navSlotDom.className = "dnt-actions-nav-slot";
	}
	if (navSlotDom.parentElement !== nav) nav.append(navSlotDom);
	return navSlotDom;
}

/* ─────────────── КУДА САДИТСЯ ГРУППА ───────────────
   Порог ширины принадлежит CSS: навигация появляется правилом
   `.dnt-bottom-nav` на `max-width: 840px`. Здесь он не дублируется числом —
   вопрос задаётся самой навигации. Одно чтение вычисленного стиля на изменение
   размера окна: ни геометрии, ни попаданий по точкам, ни слушателя прокрутки. */

type PlacementListener = () => void;

const placementListeners = new Set<PlacementListener>();
let cachedPlacement: WorkspaceActionPlacement | null = null;
let resizeBound = false;

function readPlacement(): WorkspaceActionPlacement {
	const nav = document.querySelector(WORKSPACE_ACTION_NAV_SELECTOR);
	const bottomNavDisplayed = nav
		? window.getComputedStyle(nav).display !== "none"
		: false;
	return resolveWorkspaceActionPlacement({ bottomNavDisplayed });
}

function refreshPlacement(): void {
	const next = readPlacement();
	if (next === cachedPlacement) return;
	cachedPlacement = next;
	for (const listener of placementListeners) listener();
}

function subscribePlacement(listener: PlacementListener): () => void {
	placementListeners.add(listener);
	if (!resizeBound) {
		window.addEventListener("resize", refreshPlacement);
		resizeBound = true;
	}
	/*
	 * ПЕРЕЧИТАТЬ РАСКЛАДКУ ПОСЛЕ МОНТАЖА — ЭТО НЕ СТРАХОВКА, А ЕДИНСТВЕННЫЙ
	 * МОМЕНТ, КОГДА ОТВЕТ ВООБЩЕ МОЖЕТ БЫТЬ ВЕРНЫМ.
	 *
	 * `placementSnapshot()` вызывается во время рендера, а нижняя навигация
	 * рендерится в ТОМ ЖЕ коммите: `document.querySelector(".dnt-bottom-nav")`
	 * при первом чтении возвращает null, и раскладка получается «header» даже на
	 * телефоне. Без этого перечитывания на узком экране пункт «Голос» не
	 * появлялся бы вообще до первого изменения размера окна, то есть на телефоне
	 * — никогда. `subscribe` выполняется как пассивный эффект, то есть уже после
	 * коммита, когда навигация в документе есть.
	 */
	refreshPlacement();
	return () => {
		placementListeners.delete(listener);
		if (placementListeners.size === 0 && resizeBound) {
			window.removeEventListener("resize", refreshPlacement);
			resizeBound = false;
			// Кэш сбрасывается вместе с подпиской: следующий монтаж обязан
			// прочитать раскладку заново, а не поверить прошлой сессии.
			cachedPlacement = null;
		}
	};
}

function placementSnapshot(): WorkspaceActionPlacement {
	// Первое чтение — живое, поэтому на узком экране группа не мигает один кадр
	// в топбаре перед переездом в навигацию.
	if (cachedPlacement === null) cachedPlacement = readPlacement();
	return cachedPlacement;
}

function useWorkspaceActionPlacement(): WorkspaceActionPlacement {
	return useSyncExternalStore(subscribePlacement, placementSnapshot);
}

/**
 * Пункт навигации «Голос» и панель над ней. Узкие экраны.
 *
 * Панель закрывается только осознанно — своей кнопкой, повторным нажатием
 * пункта или Escape. Закрытия по нажатию мимо здесь НЕТ намеренно: диктовка
 * живёт внутри панели, и случайный тап по экрану оставил бы включённый микрофон
 * без единого признака на экране.
 */
function WorkspaceActionsNavSheet(): React.ReactElement {
	const [expanded, setExpanded] = useState(false);
	const sheetId = useId();
	const anchorRef = useRef<HTMLDivElement | null>(null);
	const trigger = workspaceActionsLabels.navTrigger;

	const close = useCallback(() => setExpanded(false), []);

	useEffect(() => {
		const anchor = anchorRef.current;
		if (!anchor) return;
		const dom = ensureHost();
		dom.host.dataset.placement = "nav";
		applyBarOrder(dom, "nav");
		anchor.append(dom.host);
		return () => {
			// Хост мог уже переехать в топбар: снимаем только СВОЙ.
			if (dom.host.parentElement === anchor) dom.host.remove();
		};
	}, []);

	useEffect(() => {
		if (!expanded) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setExpanded(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [expanded]);

	return (
		<>
			<button
				type="button"
				className={`dnt-actions__trigger${expanded ? " dnt-actions__trigger--open" : ""}`}
				aria-expanded={expanded}
				aria-controls={sheetId}
				title={expanded ? trigger.titleOpen : trigger.titleClosed}
				onClick={() => setExpanded((previous) => !previous)}
			>
				<Mic aria-hidden="true" />
				<span>{trigger.label}</span>
			</button>
			<div
				className="dnt-actions__sheet"
				id={sheetId}
				hidden={!expanded}
				aria-label={workspaceActionsLabels.panel.heading}
			>
				<div className="dnt-actions__sheet-head">
					<h2 className="dnt-actions__sheet-title">
						{workspaceActionsLabels.panel.heading}
					</h2>
					<button
						type="button"
						className="dnt-actions__sheet-close"
						onClick={close}
						aria-label={workspaceActionsLabels.panel.close}
						title={workspaceActionsLabels.panel.close}
					>
						<X aria-hidden="true" />
					</button>
				</div>
				{/* Хост переезжает СЮДА: слоты те же элементы, что и в топбаре,
				    поэтому порталы жильцов не пересоздаются и диктовка не рвётся.
				    `hidden` на панели прячет её через display, но НЕ размонтирует
				    жильцов — включённый микрофон переживает закрытие панели. */}
				<div className="dnt-actions__sheet-body" ref={anchorRef} />
			</div>
		</>
	);
}

/**
 * ЕДИНСТВЕННАЯ ТОЧКА МОНТАЖА ГРУППЫ. Рендерится один раз, в строке действий
 * топбара (`workspaceShell.tsx`).
 *
 * На широком экране группа стоит прямо здесь. На узком — этот же компонент
 * вставляет свой контейнер в живую нижнюю навигацию и рисует в него портал,
 * поэтому `App.tsx` (монолит, который правят параллельно) о группе ничего не
 * знает и его править не нужно.
 */
export function WorkspaceActionsMount(): React.ReactElement {
	const placement = useWorkspaceActionPlacement();
	const headerAnchorRef = useRef<HTMLDivElement | null>(null);
	const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (placement !== "header") return;
		const anchor = headerAnchorRef.current;
		if (!anchor) return;
		const dom = ensureHost();
		dom.host.dataset.placement = "header";
		applyBarOrder(dom, "header");
		anchor.append(dom.host);
		return () => {
			if (dom.host.parentElement === anchor) dom.host.remove();
		};
	}, [placement]);

	useEffect(() => {
		if (placement !== "nav") return;
		setNavSlot(ensureNavSlot());
		return () => {
			setNavSlot(null);
			navSlotDom?.remove();
		};
	}, [placement]);

	return (
		<>
			<div
				className="dnt-actions-mount dnt-actions-mount--header"
				ref={headerAnchorRef}
			/>
			{navSlot ? createPortal(<WorkspaceActionsNavSheet />, navSlot) : null}
		</>
	);
}

/**
 * Возвращает элемент слота для портала жильца. Хост создаётся при первом
 * обращении и живёт до конца сессии страницы: он не подписан ни на что, поэтому
 * ни утечь, ни пережить свои подписки не может — все подписки живут в точке
 * монтажа и снимаются её уборкой.
 */
export function useWorkspaceActionSlot(
	slot: WorkspaceActionSlotId,
): HTMLElement | null {
	const [target, setTarget] = useState<HTMLElement | null>(null);
	useEffect(() => {
		setTarget(ensureHost().slots.get(slot) ?? null);
		return () => setTarget(null);
	}, [slot]);
	return target;
}

export interface WorkspaceActionsSlotProps {
	readonly slot: WorkspaceActionSlotId;
	readonly children: React.ReactNode;
}

/**
 * Единственный разрешённый способ поселиться в группе действий. Жилец не задаёт
 * ни координат, ни `position`, ни z-index — их задаёт владелец.
 */
export function WorkspaceActionsSlot({
	slot,
	children,
}: WorkspaceActionsSlotProps): React.ReactElement | null {
	const target = useWorkspaceActionSlot(slot);
	if (!target) return null;
	return createPortal(children, target);
}
